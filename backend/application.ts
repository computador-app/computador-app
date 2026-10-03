import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Store } from "./store.js";
import { HostRuntime, ToolService, clip } from "./tools.js";
import type { LLMService } from "./llm.js";
import {
  modelKey,
  type AppSnapshot,
  type AuthState,
  type ChatSession,
  type ModelRef,
  type RuntimeEvent,
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
    },
  ) {
    this.sessions = store.sessions();
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
    hiddenModels: this.store.get<string[]>("hiddenModels", []),
    auth: this.auth,
    secureStorage: this.options.secureStorage(),
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
  async openWorkspace(id?: string) {
    const selected = id
      ? this.store.workspaces().find((w) => w.id === id)?.path
      : await this.options.openFolder();
    if (!selected) return;
    const canonical = await fs.realpath(selected);
    if (!(await fs.stat(canonical)).isDirectory())
      throw new Error("Not a directory");
    this.workspace = this.store.workspace(canonical, path.basename(canonical));
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
    const s: ChatSession = {
      id: randomUUID(),
      workspaceId: this.workspace.id,
      title: "",
      model: this.store.get("defaultModel", null),
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
  selectSession(id: string) {
    const s = this.session(id);
    this.workspace =
      this.store.workspaces().find((w) => w.id === s.workspaceId) ?? null;
    this.store.set("workspace", this.workspace?.id ?? "");
    this.activeSessionId = id;
    this.store.set("activeSessionId", id);
    this.emit();
  }
  updateSession(id: string, patch: { title?: string; model?: ModelRef }) {
    const s = this.session(id);
    if (patch.model) {
      if (this.runs.has(id)) throw new Error("Run active");
      this.validModel(patch.model);
      s.model = patch.model;
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
  async setDefault(model: ModelRef) {
    this.validModel(model);
    this.store.set("defaultModel", model);
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
  async sendMessage(id: string, text: string, locale: string) {
    const s = this.session(id);
    if (this.runs.has(id)) throw new Error("Run active");
    if (this.runs.size >= 4)
      throw new Error(
        "Limite de quatro execuções simultâneas / Four runs already active",
      );
    if (!s.model)
      throw new Error(
        "Selecione um modelo nas preferências / Select a model in preferences",
      );
    this.validModel(s.model);
    const workspace = this.store
      .workspaces()
      .find((w) => w.id === s.workspaceId);
    if (!workspace) throw new Error("Workspace unavailable");
    if (!(await fs.stat(workspace.path)).isDirectory())
      throw new Error("Workspace unavailable");
    if (!this.sessions.includes(s)) throw new Error("Session was deleted");
    if (this.runs.has(id)) throw new Error("Run active");
    if (this.runs.size >= 4) throw new Error("Four runs already active");
    this.validModel(s.model);
    const runId = randomUUID();
    const controller = new AbortController();
    s.messages.push({
      id: randomUUID(),
      role: "user",
      text,
      createdAt: Date.now(),
    });
    if (!s.title) s.title = text.replace(/\s+/g, " ").slice(0, 80);
    s.status = "running";
    s.error = undefined;
    s.updatedAt = Date.now();
    this.save(s, runId);
    const history = this.store.transcript(id);
    history.push(this.llm.user(text));
    this.store.saveTranscript(id, history);
    this.store.db
      .prepare("INSERT INTO runs VALUES(?,?,?, ?,NULL)")
      .run(runId, id, "running", Date.now());
    // Register synchronously before scheduling work, preventing concurrent duplicate sends.
    const done = Promise.resolve().then(() =>
      this.run(s, workspace.path, history, controller, runId, locale),
    );
    this.runs.set(id, { id: runId, controller, done });
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
    let timedOut = false;
    const timer = setTimeout(() => {
      if (!signal.aborted) {
        timedOut = true;
        controller.abort();
      }
    }, this.options.runTimeout ?? 600000);
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
      for (let turn = 0; turn < (this.options.maxTurns ?? 20); turn++) {
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
          `You are Computador, a general project assistant. Reply in ${locale === "en" ? "English" : "Brazilian Portuguese"}. Workspace: ${root}. Tools execute immediately without approval. Read files before editing. Use tools when needed; do not claim actions you did not perform.`,
          history,
          signal,
          s.id,
          (text) => {
            message.text = text;
            checkpoint();
          },
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
            if (++toolCount > (this.options.maxTools ?? 50))
              throw new Error("Tool call limit reached");
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
        if (toolCount > (this.options.maxTools ?? 50))
          throw new Error(
            "Limite de ferramentas atingido / Tool call limit reached",
          );
        if (turn === (this.options.maxTurns ?? 20) - 1)
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
      this.llm.cleanup(s.id);
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
    this.store.close();
  }
}
