import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Store } from "./store.js";
import {
  HostRuntime,
  ToolService,
  clip,
  delegationTool,
  toolDefinitions,
  type ToolDefinition,
} from "./tools.js";
import { AgentManager, runtimeFor } from "./agents.js";
import type { LLMService, ToolCall } from "./llm.js";
import {
  modelKey,
  type AppSnapshot,
  type AgentDefinition,
  type AgentRef,
  type AgentScope,
  type AuthState,
  type ChatSession,
  type ImageAttachment,
  type ModelRef,
  type RuntimeEvent,
  type SubagentRun,
  type ThinkingLevel,
} from "../src/shared/protocol.js";
export class Application {
  private sessions: ChatSession[];
  private workspace: AppSnapshot["workspace"] = null;
  private activeSessionId = "";
  private revision = 0;
  private catalog: Pick<AppSnapshot, "providers" | "models"> = {
    providers: [],
    models: [],
  };
  private runs = new Map<
    string,
    { id: string; controller: AbortController; done: Promise<void> }
  >();
  private auth: AuthState | null = null;
  private authController?: AbortController;
  private authDone?: Promise<void>;
  private pendingAnswer?: { id: string; resolve: (s: string) => void };
  private listeners = new Set<(event: RuntimeEvent) => void>();
  private mutatingProviders = new Set<string>();
  private agents: AgentManager;
  private subagentRuns: SubagentRun[];
  private subagentControllers = new Map<string, AbortController>();
  private activeExecutions = 0;
  constructor(
    readonly store: Store,
    private llm: LLMService,
    private options: {
      secureStorage: () => boolean;
      openFolder: () => Promise<string | undefined>;
      openExternal: (url: string) => Promise<void>;
      maxTurns?: number;
      maxTools?: number;
      runTimeout?: number;
      agentsDirectory?: string;
      trashItem?: (file: string) => Promise<void>;
    },
  ) {
    this.sessions = store.sessions().map((session) => ({
      ...session,
      thinkingLevel: session.thinkingLevel ?? "off",
      agentRef: session.agentRef ?? ("user:personal" as AgentRef),
    }));
    this.subagentRuns = store.subagentRuns();
    this.agents = new AgentManager(
      store,
      options.agentsDirectory ?? path.join(path.dirname(store.path), "agents"),
      () => this.onAgentsChanged(),
      options.trashItem ?? (async (file) => fs.unlink(file)),
      (model) => this.modelIsAvailable(model),
      !!options.agentsDirectory,
    );
    if (!store.get("installationId", ""))
      store.set("installationId", randomUUID());
  }
  async init() {
    this.workspace =
      this.store
        .workspaces()
        .find((w) => w.id === this.store.get("workspace", "")) ?? null;
    if (
      this.workspace &&
      !(await fs
        .stat(this.workspace.path)
        .then((s) => s.isDirectory())
        .catch(() => false))
    )
      this.workspace = null;
    await this.agents.init(this.workspace?.path);
    const defaultAgentRef = this.agents.defaultRef();
    for (const session of this.sessions) {
      if (!session.agentSnapshot) {
        const definition =
          this.agents.get(session.agentRef) ?? this.agents.get(defaultAgentRef)!;
        session.agentRef = this.agents.get(session.agentRef)
          ? session.agentRef
          : defaultAgentRef;
        session.agentSnapshot = definition;
        this.store.saveSession(session);
      }
    }
    this.activeSessionId = this.store.get("activeSessionId", "");
    if (
      !this.sessions.some(
        (s) =>
          s.id === this.activeSessionId && s.workspaceId === this.workspace?.id,
      )
    )
      this.activeSessionId = "";
    for (const session of this.sessions)
      this.store.saveTranscript(
        session.id,
        this.llm.recover(this.store.transcript(session.id)),
      );
    await this.refreshCatalog();
  }
  private async refreshCatalog() {
    this.catalog = await this.llm.catalog();
    for (const session of this.sessions) {
      if (!session.model) continue;
      const level = this.resolveThinkingLevel(
        session.model,
        session.thinkingLevel,
      );
      if (level !== session.thinkingLevel) {
        session.thinkingLevel = level;
        this.store.saveSession(session);
      }
    }
    const defaultModel = this.store.get<ModelRef | null>("defaultModel", null);
    if (defaultModel) {
      const stored = this.store.get<ThinkingLevel>(
        "defaultThinkingLevel",
        "off",
      );
      const level = this.resolveThinkingLevel(defaultModel, stored);
      if (level !== stored) this.store.set("defaultThinkingLevel", level);
    }
    this.emit();
  }
  snapshot = (): AppSnapshot => ({
    revision: this.revision,
    workspace: this.workspace,
    recent: this.store.workspaces(),
    sessions: [...this.sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    activeSessionId: this.activeSessionId,
    ...this.catalog,
    providers: this.catalog.providers.map((p) =>
      this.auth?.provider === p.id
        ? { ...p, status: this.authController ? "pending" : "error" }
        : p,
    ),
    defaultModel: this.store.get<ModelRef | null>("defaultModel", null),
    defaultThinkingLevel: this.resolveThinkingLevel(
      this.store.get<ModelRef | null>("defaultModel", null),
      this.store.get<ThinkingLevel>("defaultThinkingLevel", "off"),
    ),
    hiddenModels: this.store.get<string[]>("hiddenModels", []),
    auth: this.auth,
    secureStorage: this.options.secureStorage(),
    agents: this.agents.list(),
    agentProblems: this.agents.errors(),
    defaultAgentRef: this.agents.defaultRef(),
    subagentRuns: this.subagentRuns,
  });
  subscribe(listener: (event: RuntimeEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(sessionId?: string, runId?: string) {
    this.revision++;
    const event = {
      sequence: this.revision,
      sessionId,
      runId,
      snapshot: this.snapshot(),
    };
    this.listeners.forEach((fn) => fn(event));
  }
  private onAgentsChanged() {
    const fallback = this.agents.defaultRef();
    for (const session of this.sessions) {
      if (session.agentSnapshot || this.agents.get(session.agentRef)) continue;
      session.agentRef = fallback;
      this.store.saveSession(session);
    }
    this.emit();
  }
  private session(id: string) {
    const s = this.sessions.find((s) => s.id === id);
    if (!s) throw new Error("Sessão não encontrada / Session not found");
    return s;
  }
  private save(s: ChatSession, runId?: string) {
    this.store.saveSession(s);
    this.emit(s.id, runId);
  }
  private validModel(ref: ModelRef) {
    if (
      this.mutatingProviders.has(ref.provider) ||
      !this.catalog.providers.some(
        (p) =>
          p.id === ref.provider && p.configured && p.status === "configured",
      ) ||
      !this.catalog.models.some((m) => modelKey(m) === modelKey(ref))
    )
      throw new Error(
        "Selecione um modelo de um provedor conectado / Select a model from a connected provider",
      );
  }
  private modelIsAvailable(ref: ModelRef) {
    return (
      !this.mutatingProviders.has(ref.provider) &&
      this.catalog.providers.some(
        (provider) =>
          provider.id === ref.provider &&
          provider.configured &&
          provider.status === "configured",
      ) &&
      this.catalog.models.some((model) => modelKey(model) === modelKey(ref))
    );
  }
  private modelDescriptor(ref: ModelRef) {
    return this.catalog.models.find((model) => modelKey(model) === modelKey(ref));
  }
  private resolveThinkingLevel(
    ref: ModelRef | null,
    requested?: ThinkingLevel,
  ): ThinkingLevel {
    const levels = ref ? this.modelDescriptor(ref)?.thinkingLevels : undefined;
    if (!levels?.length) return requested ?? "off";
    if (requested && levels.includes(requested)) return requested;
    if (levels.includes("medium")) return "medium";
    if (levels.includes("off")) return "off";
    return levels[0];
  }
  private validThinkingLevel(ref: ModelRef, level: ThinkingLevel) {
    const descriptor = this.modelDescriptor(ref);
    if (!descriptor?.thinkingLevels.includes(level))
      throw new Error(
        "Nível de pensamento indisponível para este modelo / Thinking level unavailable for this model",
      );
  }
  private initialSettings(agent: AgentDefinition) {
    const preferredAvailable = !!agent.model && this.modelIsAvailable(agent.model);
    const model = preferredAvailable
      ? agent.model!
      : this.store.get<ModelRef | null>("defaultModel", null);
    const requested =
      agent.thinkingLevel ??
      this.store.get<ThinkingLevel>("defaultThinkingLevel", "off");
    const thinkingLevel = this.resolveThinkingLevel(model, requested);
    const notices: string[] = [];
    if (agent.model && !preferredAvailable)
      notices.push(
        "Modelo preferido do agente indisponível; usando o padrão / Preferred agent model unavailable; using default",
      );
    if (agent.thinkingLevel && thinkingLevel !== agent.thinkingLevel)
      notices.push(
        "Nível de pensamento preferido incompatível; usando uma opção disponível / Preferred thinking level incompatible; using an available option",
      );
    return {
      model,
      thinkingLevel,
      ...(notices.length ? { modelNotice: notices.join(" · ") } : {}),
    };
  }
  async openWorkspace(id?: string) {
    const selected = id
      ? this.store.workspaces().find((w) => w.id === id)?.path
      : await this.options.openFolder();
    if (!selected) return;
    const canonical = await fs.realpath(selected);
    if (!(await fs.stat(canonical)).isDirectory())
      throw new Error("Not a directory");
    this.workspace = this.store.workspace(canonical, path.basename(canonical));
    await this.agents.setWorkspace(canonical);
    this.store.set("workspace", this.workspace.id);
    this.activeSessionId =
      this.sessions
        .filter((s) => s.workspaceId === this.workspace!.id)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? "";
    this.store.set("activeSessionId", this.activeSessionId);
    this.emit();
  }
  createSession() {
    if (!this.workspace)
      throw new Error("Abra uma pasta primeiro / Open a folder first");
    const remembered = this.store.get<Record<string, AgentRef>>(
      "lastAgentByWorkspace",
      {},
    )[this.workspace.id];
    const agentRef =
      (remembered && this.agents.get(remembered) ? remembered : undefined) ??
      this.agents.defaultRef();
    const agent = this.agents.get(agentRef)!;
    const initial = this.initialSettings(agent);
    const s: ChatSession = {
      id: randomUUID(),
      workspaceId: this.workspace.id,
      title: "",
      agentRef,
      ...initial,
      messages: [],
      status: "idle",
      updatedAt: Date.now(),
    };
    this.sessions.push(s);
    this.activeSessionId = s.id;
    this.store.set("activeSessionId", s.id);
    this.save(s);
    return s.id;
  }
  async selectSession(id: string) {
    const s = this.session(id);
    this.workspace =
      this.store.workspaces().find((w) => w.id === s.workspaceId) ?? null;
    this.store.set("workspace", this.workspace?.id ?? "");
    await this.agents.setWorkspace(this.workspace?.path);
    this.activeSessionId = id;
    this.store.set("activeSessionId", id);
    this.emit();
  }
  updateSession(
    id: string,
    patch: {
      title?: string;
      model?: ModelRef;
      thinkingLevel?: ThinkingLevel;
      agentRef?: AgentRef;
    },
  ) {
    const s = this.session(id);
    if (patch.agentRef) {
      if (s.messages.length || s.agentSnapshot)
        throw new Error(
          "O agente só pode ser alterado antes da primeira mensagem / Agent can only be changed before the first message",
        );
      if (this.runs.has(id)) throw new Error("Run active");
      const agent = this.agents.get(patch.agentRef);
      if (!agent) throw new Error("Agente indisponível / Agent unavailable");
      s.agentRef = patch.agentRef;
      const initial = this.initialSettings(agent);
      s.model = initial.model;
      s.thinkingLevel = initial.thinkingLevel;
      s.modelNotice = initial.modelNotice;
      s.modelOverridden = false;
      const remembered = this.store.get<Record<string, AgentRef>>(
        "lastAgentByWorkspace",
        {},
      );
      remembered[s.workspaceId] = patch.agentRef;
      this.store.set("lastAgentByWorkspace", remembered);
    }
    if (patch.model) {
      if (this.runs.has(id)) throw new Error("Run active");
      this.validModel(patch.model);
      if (patch.thinkingLevel)
        this.validThinkingLevel(patch.model, patch.thinkingLevel);
      s.model = patch.model;
      s.modelNotice = undefined;
      s.modelOverridden = true;
      s.thinkingLevel = this.resolveThinkingLevel(
        patch.model,
        patch.thinkingLevel,
      );
    } else if (patch.thinkingLevel) {
      if (this.runs.has(id)) throw new Error("Run active");
      if (!s.model) throw new Error("Model unavailable");
      this.validThinkingLevel(s.model, patch.thinkingLevel);
      s.thinkingLevel = patch.thinkingLevel;
      s.modelOverridden = true;
    }
    if (patch.title !== undefined) s.title = patch.title.trim().slice(0, 200);
    s.updatedAt = Date.now();
    this.save(s);
  }
  async deleteSession(id: string) {
    await this.cancelRun(id);
    this.store.deleteSession(id);
    this.llm.cleanup(id);
    this.sessions = this.sessions.filter((s) => s.id !== id);
    if (this.activeSessionId === id) {
      this.activeSessionId = "";
      this.store.set("activeSessionId", "");
    }
    this.emit();
  }
  async setDefault(model: ModelRef, thinkingLevel?: ThinkingLevel) {
    this.validModel(model);
    const previous = this.store.get<ModelRef | null>("defaultModel", null);
    const requested =
      thinkingLevel ??
      (previous && modelKey(previous) === modelKey(model)
        ? this.store.get<ThinkingLevel>("defaultThinkingLevel", "off")
        : undefined);
    const level = this.resolveThinkingLevel(model, requested);
    if (thinkingLevel) this.validThinkingLevel(model, thinkingLevel);
    this.store.set("defaultModel", model);
    this.store.set("defaultThinkingLevel", level);
    this.emit();
  }
  setHidden(keys: string[], hidden: boolean) {
    const set = new Set(this.store.get<string[]>("hiddenModels", []));
    keys.forEach((key) => (hidden ? set.add(key) : set.delete(key)));
    this.store.set("hiddenModels", [...set]);
    this.emit();
  }
  async refreshModels() {
    try {
      await this.llm.refresh();
    } finally {
      await this.refreshCatalog();
    }
  }
  async saveAgent(input: {
    scope: AgentScope;
    definition: AgentDefinition;
    expectedRevision?: string;
  }) {
    await this.agents.save(
      input.scope,
      input.definition,
      input.expectedRevision,
    );
  }
  async deleteAgent(ref: AgentRef) {
    await this.agents.delete(ref);
  }
  setDefaultAgent(ref: AgentRef) {
    this.agents.setDefault(ref);
  }
  async cancelSubagent(id: string) {
    const controller = this.subagentControllers.get(id);
    if (!controller) throw new Error("Subagente não está executando");
    controller.abort();
  }
  async listFiles() {
    if (!this.workspace) return [];
    const result = await new HostRuntime(this.workspace.path).list();
    return result.paths;
  }
  async readFile(file: string) {
    if (!this.workspace) throw new Error("No workspace");
    return new HostRuntime(this.workspace.path).read(file);
  }
  async cancelRun(id: string) {
    const run = this.runs.get(id);
    if (run) {
      run.controller.abort();
      await run.done;
    }
  }
  async sendMessage(
    id: string,
    text: string,
    locale: string,
    images: ImageAttachment[] = [],
  ) {
    const s = this.session(id);
    text = text.trim();
    if (!text && !images.length) throw new Error("Empty message");
    if (images.length > 4) throw new Error("Too many images");
    if (this.runs.has(id)) throw new Error("Run active");
    if (this.activeExecutions >= 4)
      throw new Error(
        "Limite de quatro execuções simultâneas / Four runs already active",
      );
    if (!s.agentSnapshot) {
      const selected = this.agents.get(s.agentRef);
      if (selected) s.agentSnapshot = selected;
      else {
        s.agentRef = this.agents.defaultRef();
        s.agentSnapshot = this.agents.get(s.agentRef)!;
      }
      if (!s.modelOverridden) {
        const initial = this.initialSettings(s.agentSnapshot);
        s.model = initial.model;
        s.thinkingLevel = initial.thinkingLevel;
        s.modelNotice = initial.modelNotice;
      }
      this.store.saveSession(s);
    }
    if (!s.model)
      throw new Error(
        "Selecione um modelo nas preferências / Select a model in preferences",
      );
    this.validModel(s.model);
    this.validThinkingLevel(s.model, s.thinkingLevel);
    if (images.length && !this.modelDescriptor(s.model)?.input.includes("image"))
      throw new Error(
        "Este modelo não aceita imagens / This model does not accept images",
      );
    const workspace = this.store
      .workspaces()
      .find((w) => w.id === s.workspaceId);
    if (!workspace) throw new Error("Workspace unavailable");
    if (!(await fs.stat(workspace.path)).isDirectory())
      throw new Error("Workspace unavailable");
    if (!this.sessions.includes(s)) throw new Error("Session was deleted");
    if (this.runs.has(id)) throw new Error("Run active");
    if (this.activeExecutions >= 4) throw new Error("Four runs already active");
    this.validModel(s.model);
    const runId = randomUUID();
    const controller = new AbortController();
    s.messages.push({
      id: randomUUID(),
      role: "user",
      text,
      ...(images.length ? { images } : {}),
      createdAt: Date.now(),
    });
    if (!s.title)
      s.title =
        text.replace(/\s+/g, " ").slice(0, 80) || images[0]?.name || "Imagem";
    s.status = "running";
    s.error = undefined;
    s.updatedAt = Date.now();
    this.save(s, runId);
    const history = this.store.transcript(id);
    history.push(this.llm.user(text, images));
    this.store.saveTranscript(id, history);
    this.store.db
      .prepare("INSERT INTO runs VALUES(?,?,?, ?,NULL)")
      .run(runId, id, "running", Date.now());
    // Register synchronously before scheduling work, preventing concurrent duplicate sends.
    this.activeExecutions++;
    const done = Promise.resolve().then(() =>
      this.run(s, workspace.path, history, controller, runId, locale),
    );
    this.runs.set(id, { id: runId, controller, done });
  }
  private agentTools(
    depth: number,
    agent: AgentDefinition,
    depthLimit = runtimeFor(agent).maxDelegationDepth,
  ): ToolDefinition[] {
    const runtime = runtimeFor(agent);
    if (depth >= Math.min(runtime.maxDelegationDepth, depthLimit))
      return toolDefinitions;
    const available = this.agents
      .list()
      .map((item) => `${item.ref} — ${item.name}: ${item.description}`)
      .join("\n");
    return [
      ...toolDefinitions,
      delegationTool(
        `Delegate one self-contained task to a synchronous subagent. Omit agent to use a snapshot of yourself. Available named agents:\n${available || "(none)"}`,
      ),
    ];
  }
  private systemPrompt(
    agent: AgentDefinition,
    root: string,
    locale: string,
    depth: number,
  ) {
    return [
      "You are an agent running inside Computador.",
      "Internal rules take precedence over the selected agent instructions.",
      `Reply in ${locale === "en" ? "English" : "Brazilian Portuguese"}.`,
      `Workspace: ${root}.`,
      "Tools execute immediately without approval. Read files before editing. Use tools when needed; never claim actions you did not perform.",
      `Delegation depth: ${depth}.`,
      "--- SELECTED AGENT INSTRUCTIONS ---",
      agent.systemPrompt,
      "--- END SELECTED AGENT INSTRUCTIONS ---",
    ].join("\n");
  }
  private async run(
    s: ChatSession,
    root: string,
    history: unknown[],
    controller: AbortController,
    runId: string,
    locale: string,
  ) {
    const signal = controller.signal;
    const agent = s.agentSnapshot!;
    const runtime = runtimeFor(agent);
    let timedOut = false;
    const timer = setTimeout(() => {
      if (!signal.aborted) {
        timedOut = true;
        controller.abort();
      }
    }, this.options.runTimeout ?? runtime.timeoutSeconds * 1000);
    const tools = new ToolService(new HostRuntime(root));
    let toolCount = 0;
    let lastSave = 0;
    const checkpoint = () => {
      if (Date.now() - lastSave >= 150) {
        lastSave = Date.now();
        this.save(s, runId);
      }
    };
    const persist = () => {
      this.store.saveTranscript(s.id, history);
      this.save(s, runId);
    };
    try {
      for (
        let turn = 0;
        turn < (this.options.maxTurns ?? runtime.maxTurns);
        turn++
      ) {
        signal.throwIfAborted();
        const message: ChatSession["messages"][number] = {
          id: randomUUID(),
          role: "assistant",
          text: "",
          incomplete: true,
          model: { ...s.model! },
          createdAt: Date.now(),
        };
        s.messages.push(message);
        this.save(s, runId);
        const result = await this.llm.stream(
          s.model!,
          this.systemPrompt(agent, root, locale, 0),
          history,
          signal,
          s.id,
          s.thinkingLevel,
          (text) => {
            message.text = text;
            checkpoint();
          },
          this.agentTools(0, agent, runtime.maxDelegationDepth),
        );
        signal.throwIfAborted();
        message.text = result.text;
        message.usage = result.usage;
        message.incomplete = false;
        history.push(result.transcript);
        persist();
        if (!result.calls.length) {
          s.status = "completed";
          break;
        }
        // Every persisted call must receive a result, even if cancellation/limits skip it.
        for (const call of result.calls) {
          const toolMessage: ChatSession["messages"][number] = {
            id: randomUUID(),
            role: "tool",
            text: "",
            createdAt: Date.now(),
            tool: {
              id: call.id,
              name: call.name,
              arguments: call.arguments,
              status: "running",
            },
          };
          s.messages.push(toolMessage);
          this.save(s, runId);
          let output = "";
          let isError = false;
          try {
            signal.throwIfAborted();
            if (++toolCount > (this.options.maxTools ?? runtime.maxToolCalls))
              throw new Error("Tool call limit reached");
            if (call.name === "delegate_task") {
              const delegated = await this.delegate({
                call,
                session: s,
                root,
                parentRunId: runId,
                callerAgent: agent,
                callerModel: s.model!,
                callerThinking: s.thinkingLevel,
                depth: 1,
                runtimeLimit: runtime,
                locale,
                parentSignal: signal,
              });
              output = delegated.output;
              isError = delegated.isError;
              toolMessage.tool!.subagentRunId = delegated.id;
            } else
              output = await tools.execute(
                call.name,
                call.arguments,
                signal,
                (text) => {
                  toolMessage.tool!.result = text;
                  checkpoint();
                },
              );
            if (signal.aborted) isError = true;
          } catch (e) {
            isError = true;
            output = signal.aborted
              ? "Cancelled / Cancelado"
              : String((e as Error).message);
          }
          toolMessage.tool!.status = isError ? "failed" : "completed";
          toolMessage.tool!.result = clip(output);
          history.push(this.llm.tool(call, clip(output), isError));
          this.store.db
            .prepare("INSERT OR REPLACE INTO tool_runs VALUES(?,?,?)")
            .run(toolMessage.id, runId, JSON.stringify(toolMessage));
          persist();
        }
        signal.throwIfAborted();
        if (toolCount > (this.options.maxTools ?? runtime.maxToolCalls))
          throw new Error(
            "Limite de ferramentas atingido / Tool call limit reached",
          );
        if (turn === (this.options.maxTurns ?? runtime.maxTurns) - 1)
          throw new Error(
            "Limite de chamadas ao modelo atingido / Model call limit reached",
          );
      }
    } catch (e) {
      s.status = signal.aborted && !timedOut ? "cancelled" : "failed";
      s.error = timedOut
        ? "Tempo máximo de execução atingido / Run timeout"
        : signal.aborted
          ? undefined
          : (e as Error).message;
    } finally {
      clearTimeout(timer);
      s.updatedAt = Date.now();
      this.store.db
        .prepare("UPDATE runs SET status=?,ended=? WHERE id=?")
        .run(s.status, Date.now(), runId);
      this.save(s, runId);
      this.runs.delete(s.id);
      this.activeExecutions--;
      this.llm.cleanup(s.id);
    }
  }
  private async delegate(input: {
    call: ToolCall;
    session: ChatSession;
    root: string;
    parentRunId: string;
    parentSubagentRunId?: string;
    callerAgent: AgentDefinition;
    callerModel: ModelRef;
    callerThinking: ThinkingLevel;
    depth: number;
    depthLimit?: number;
    runtimeLimit?: ReturnType<typeof runtimeFor>;
    locale: string;
    parentSignal: AbortSignal;
  }) {
    const task = input.call.arguments.task;
    const requestedAgent = input.call.arguments.agent;
    const context = input.call.arguments.context;
    if (typeof task !== "string" || !task.trim())
      throw new Error("delegate_task requires a non-empty task");
    if (requestedAgent !== undefined && typeof requestedAgent !== "string")
      throw new Error("delegate_task agent must be a string");
    if (context !== undefined && typeof context !== "string")
      throw new Error("delegate_task context must be a string");
    const inheritedLimit =
      input.depthLimit ?? runtimeFor(input.callerAgent).maxDelegationDepth;
    if (input.depth > inheritedLimit)
      throw new Error("Delegation depth limit reached");
    if (this.activeExecutions >= 4)
      throw new Error("Global concurrent execution limit reached");
    let agent = input.callerAgent;
    let agentRef = input.session.agentRef;
    let model = input.callerModel;
    let thinkingLevel = input.callerThinking;
    if (requestedAgent) {
      if (!/^(user|project):[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(requestedAgent))
        throw new Error("Unknown delegated agent");
      const ref = requestedAgent as AgentRef;
      const selected = this.agents.get(ref);
      if (!selected) throw new Error("Delegated agent is unavailable");
      agent = selected;
      agentRef = ref;
      model =
        selected.model && this.modelIsAvailable(selected.model)
          ? selected.model
          : this.store.get<ModelRef | null>("defaultModel", null)!;
      if (!model)
        throw new Error("No model is available for the delegated agent");
      thinkingLevel = this.resolveThinkingLevel(
        model,
        selected.thinkingLevel ??
          this.store.get<ThinkingLevel>("defaultThinkingLevel", "off"),
      );
    }
    this.validModel(model);
    const callerRuntime = input.runtimeLimit ?? runtimeFor(input.callerAgent);
    const selectedRuntime = runtimeFor(agent);
    const effectiveRuntime = {
      maxDelegationDepth: Math.min(
        callerRuntime.maxDelegationDepth,
        selectedRuntime.maxDelegationDepth,
      ),
      maxConcurrentSubagents: Math.min(
        callerRuntime.maxConcurrentSubagents,
        selectedRuntime.maxConcurrentSubagents,
      ),
      maxTurns: Math.min(callerRuntime.maxTurns, selectedRuntime.maxTurns),
      maxToolCalls: Math.min(
        callerRuntime.maxToolCalls,
        selectedRuntime.maxToolCalls,
      ),
      timeoutSeconds: Math.min(
        callerRuntime.timeoutSeconds,
        selectedRuntime.timeoutSeconds,
      ),
    };
    const run: SubagentRun = {
      id: randomUUID(),
      sessionId: input.session.id,
      parentRunId: input.parentRunId,
      ...(input.parentSubagentRunId
        ? { parentSubagentRunId: input.parentSubagentRunId }
        : {}),
      agentRef,
      agentName: agent.name,
      depth: input.depth,
      task: task.trim(),
      ...(context?.trim() ? { context: context.trim() } : {}),
      model,
      thinkingLevel,
      status: "running",
      messages: [
        {
          id: randomUUID(),
          role: "user",
          text: context?.trim()
            ? `${task.trim()}\n\nContext:\n${context.trim()}`
            : task.trim(),
          createdAt: Date.now(),
        },
      ],
      startedAt: Date.now(),
    };
    this.subagentRuns.unshift(run);
    this.store.saveSubagentRun(run);
    this.emit(input.session.id, run.id);
    const ownController = new AbortController();
    this.subagentControllers.set(run.id, ownController);
    const signal = AbortSignal.any([input.parentSignal, ownController.signal]);
    this.activeExecutions++;
    try {
      await this.runSubagent({
        run,
        agent,
        root: input.root,
        locale: input.locale,
        signal,
        depthLimit: Math.min(
          inheritedLimit,
          effectiveRuntime.maxDelegationDepth,
        ),
        runtime: effectiveRuntime,
      });
    } finally {
      this.activeExecutions--;
      this.subagentControllers.delete(run.id);
      this.llm.cleanup(run.id);
    }
    return {
      id: run.id,
      output:
        run.status === "completed"
          ? run.messages.filter((message) => message.role === "assistant").at(-1)
              ?.text || "Completed without text output"
          : run.error || `Subagent ${run.status}`,
      isError: run.status !== "completed",
    };
  }

  private async runSubagent(input: {
    run: SubagentRun;
    agent: AgentDefinition;
    root: string;
    locale: string;
    signal: AbortSignal;
    depthLimit: number;
    runtime: ReturnType<typeof runtimeFor>;
  }) {
    const { run, agent, root, locale, signal, depthLimit, runtime } = input;
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), runtime.timeoutSeconds * 1000);
    const combined = AbortSignal.any([signal, timeout.signal]);
    const tools = new ToolService(new HostRuntime(root));
    const history: unknown[] = [this.llm.user(run.messages[0].text)];
    let toolCount = 0;
    let lastSave = 0;
    const persist = () => {
      this.store.saveSubagentRun(run);
      this.emit(run.sessionId, run.id);
    };
    const checkpoint = () => {
      if (Date.now() - lastSave < 150) return;
      lastSave = Date.now();
      persist();
    };
    try {
      for (let turn = 0; turn < runtime.maxTurns; turn++) {
        combined.throwIfAborted();
        const message: SubagentRun["messages"][number] = {
          id: randomUUID(),
          role: "assistant",
          text: "",
          incomplete: true,
          model: run.model,
          createdAt: Date.now(),
        };
        run.messages.push(message);
        persist();
        const result = await this.llm.stream(
          run.model,
          this.systemPrompt(agent, root, locale, run.depth),
          history,
          combined,
          run.id,
          run.thinkingLevel,
          (text) => {
            message.text = text;
            checkpoint();
          },
          this.agentTools(run.depth, agent, depthLimit),
        );
        message.text = result.text;
        message.usage = result.usage;
        message.incomplete = false;
        history.push(result.transcript);
        persist();
        if (!result.calls.length) {
          run.status = "completed";
          break;
        }
        for (const call of result.calls) {
          const toolMessage: SubagentRun["messages"][number] = {
            id: randomUUID(),
            role: "tool",
            text: "",
            createdAt: Date.now(),
            tool: {
              id: call.id,
              name: call.name,
              arguments: call.arguments,
              status: "running",
            },
          };
          run.messages.push(toolMessage);
          persist();
          let output = "";
          let isError = false;
          try {
            if (++toolCount > runtime.maxToolCalls)
              throw new Error("Tool call limit reached");
            if (call.name === "delegate_task") {
              const child = await this.delegate({
                call,
                session: this.session(run.sessionId),
                root,
                parentRunId: run.parentRunId,
                parentSubagentRunId: run.id,
                callerAgent: agent,
                callerModel: run.model,
                callerThinking: run.thinkingLevel,
                depth: run.depth + 1,
                depthLimit,
                runtimeLimit: runtime,
                locale,
                parentSignal: combined,
              });
              output = child.output;
              isError = child.isError;
              toolMessage.tool!.subagentRunId = child.id;
            } else
              output = await tools.execute(call.name, call.arguments, combined, (text) => {
                toolMessage.tool!.result = text;
                checkpoint();
              });
          } catch (error) {
            isError = true;
            output = combined.aborted
              ? "Cancelled / Cancelado"
              : (error as Error).message;
          }
          toolMessage.tool!.status = isError ? "failed" : "completed";
          toolMessage.tool!.result = clip(output);
          history.push(this.llm.tool(call, clip(output), isError));
          persist();
        }
        combined.throwIfAborted();
        if (turn === runtime.maxTurns - 1) throw new Error("Model call limit reached");
      }
    } catch (error) {
      run.status = combined.aborted ? "cancelled" : "failed";
      run.error = timeout.signal.aborted
        ? "Tempo máximo de execução atingido / Run timeout"
        : combined.aborted
          ? "Cancelado / Cancelled"
          : (error as Error).message;
    } finally {
      clearTimeout(timer);
      run.endedAt = Date.now();
      persist();
    }
  }
  async login(provider: string, method: "api_key" | "oauth") {
    if (this.authController) throw new Error("Login already active");
    if (
      !this.catalog.providers.some(
        (p) => p.id === provider && p.methods.some((m) => m.type === method),
      )
    )
      throw new Error("Unknown authentication method");
    const controller = new AbortController();
    this.authController = controller;
    this.auth = { provider };
    this.emit();
    this.mutatingProviders.add(provider);
    this.authDone = (async () => {
      try {
        await Promise.all(
          [...this.runs.keys()]
            .filter((id) => this.session(id).model?.provider === provider)
            .map((id) => this.cancelRun(id)),
        );
        controller.signal.throwIfAborted();
        await this.llm.login(provider, method, {
          signal: controller.signal,
          prompt: async (prompt) => {
            const signal = prompt.signal
              ? AbortSignal.any([controller.signal, prompt.signal])
              : controller.signal;
            signal.throwIfAborted();
            const id = randomUUID();
            this.auth = {
              ...this.auth!,
              prompt: {
                id,
                type: prompt.type,
                message: prompt.message,
                placeholder: prompt.placeholder,
                options: prompt.options,
              },
            };
            this.emit();
            return new Promise<string>((resolve, reject) => {
              const abort = () => {
                if (this.pendingAnswer?.id === id) {
                  this.pendingAnswer = undefined;
                  if (this.auth)
                    this.auth = { ...this.auth, prompt: undefined };
                  this.emit();
                }
                reject(new Error("Cancelled"));
              };
              signal.addEventListener("abort", abort, { once: true });
              this.pendingAnswer = {
                id,
                resolve: (answer) => {
                  signal.removeEventListener("abort", abort);
                  resolve(answer);
                },
              };
            });
          },
          notify: (event) => {
            const url = event.url ?? event.verificationUri;
            this.auth = {
              ...this.auth!,
              message: event.message ?? event.instructions,
              url: url ?? this.auth?.url,
              userCode: event.userCode ?? this.auth?.userCode,
            };
            this.emit();
            if (url && /^https?:\/\//.test(url))
              void this.options.openExternal(url).catch(() => {});
          },
        });
        this.auth = null;
      } catch {
        this.auth = controller.signal.aborted
          ? null
          : {
              provider,
              message:
                "Não foi possível conectar. Verifique as credenciais e tente novamente / Unable to connect. Check credentials and try again",
            };
      } finally {
        this.authController = undefined;
        this.pendingAnswer = undefined;
        this.mutatingProviders.delete(provider);
        await this.refreshCatalog();
      }
    })();
  }
  answerAuth(id: string, answer: string) {
    if (!this.pendingAnswer || this.pendingAnswer.id !== id)
      throw new Error("Login prompt expired");
    const pending = this.pendingAnswer;
    this.pendingAnswer = undefined;
    if (this.auth) this.auth = { ...this.auth, prompt: undefined };
    pending.resolve(answer);
    this.emit();
  }
  async cancelAuth() {
    this.authController?.abort();
    await this.authDone;
    this.auth = null;
    this.emit();
  }
  async removeProvider(provider: string) {
    this.mutatingProviders.add(provider);
    try {
      if (this.auth?.provider === provider) await this.cancelAuth();
      this.mutatingProviders.add(provider);
      await Promise.all(
        [...this.runs.keys()]
          .filter((id) => this.session(id).model?.provider === provider)
          .map((id) => this.cancelRun(id)),
      );
      await this.llm.logout(provider);
      await this.refreshCatalog();
    } finally {
      this.mutatingProviders.delete(provider);
    }
  }
  async close() {
    await this.cancelAuth();
    await Promise.all([...this.runs.keys()].map((id) => this.cancelRun(id)));
    await this.agents.close();
    this.store.close();
  }
}
