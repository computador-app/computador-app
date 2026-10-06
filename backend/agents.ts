import fs from "node:fs/promises";
import { existsSync, watch, type FSWatcher } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseDocument, stringify, type Document } from "yaml";
import type { Store } from "./store.js";
import type {
  AgentDefinition,
  AgentProblem,
  AgentRecord,
  AgentRef,
  AgentRuntimeConfig,
  AgentScope,
  ModelRef,
  ThinkingLevel,
} from "../src/shared/protocol.js";

const MAX_AGENT_BYTES = 256 * 1024;
const allowedThinking = new Set<ThinkingLevel>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);
const topKeys = new Set([
  "version",
  "id",
  "name",
  "description",
  "model",
  "thinking_level",
  "system_prompt",
  "runtime",
]);
const runtimeFields: Record<keyof AgentRuntimeConfig, [string, number, number]> = {
  maxDelegationDepth: ["max_delegation_depth", 0, 8],
  maxConcurrentSubagents: ["max_concurrent_subagents", 1, 4],
  maxTurns: ["max_turns", 1, 100],
  maxToolCalls: ["max_tool_calls", 1, 500],
  timeoutSeconds: ["timeout_seconds", 10, 3600],
};
const initialAgent: AgentDefinition = {
  version: 1,
  id: "personal",
  name: "Computador",
  description: "Agente pessoal para tarefas gerais.",
  systemPrompt: "Você é o agente pessoal do usuário.\n",
};

type Loaded = AgentRecord & { document: Document; source: string };

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} deve ser um objeto / must be an object`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "string" || value.length < min || value.length > max)
    throw new Error(`${label} deve ter entre ${min} e ${max} caracteres`);
  return value;
}
function validateDefinition(value: unknown): AgentDefinition {
  const data = object(value, "Agente");
  const unknown = Object.keys(data).filter((key) => !topKeys.has(key));
  if (unknown.length) throw new Error(`Chave desconhecida: ${unknown.join(", ")}`);
  if (data.version !== 1) throw new Error("Versão de agente não suportada");
  const id = text(data.id, "id", 1, 64);
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(id))
    throw new Error("id deve usar letras minúsculas, números e hífens");
  const name = text(data.name, "name", 1, 80).trim();
  const description = text(data.description, "description", 1, 280).trim();
  if (!name) throw new Error("name não pode ficar vazio");
  if (!description) throw new Error("description não pode ficar vazia");
  const definition: AgentDefinition = {
    version: 1,
    id,
    name,
    description,
    systemPrompt: text(data.system_prompt, "system_prompt", 1, 100_000),
  };
  if (data.model !== undefined) {
    const model = object(data.model, "model");
    if (Object.keys(model).some((key) => key !== "provider" && key !== "id"))
      throw new Error("Chave desconhecida em model");
    definition.model = {
      provider: text(model.provider, "model.provider", 1, 200),
      modelId: text(model.id, "model.id", 1, 500),
    };
  }
  if (data.thinking_level !== undefined) {
    if (
      typeof data.thinking_level !== "string" ||
      !allowedThinking.has(data.thinking_level as ThinkingLevel)
    )
      throw new Error("thinking_level inválido");
    definition.thinkingLevel = data.thinking_level as ThinkingLevel;
  }
  if (data.runtime !== undefined) {
    const raw = object(data.runtime, "runtime");
    const known = new Set(Object.values(runtimeFields).map(([key]) => key));
    const extra = Object.keys(raw).filter((key) => !known.has(key));
    if (extra.length)
      throw new Error(`Chave desconhecida em runtime: ${extra.join(", ")}`);
    const runtime: AgentRuntimeConfig = {};
    for (const [field, [key, min, max]] of Object.entries(runtimeFields) as [
      keyof AgentRuntimeConfig,
      [string, number, number],
    ][]) {
      const number = raw[key];
      if (number === undefined) continue;
      if (!Number.isInteger(number) || (number as number) < min || (number as number) > max)
        throw new Error(`${key} deve estar entre ${min} e ${max}`);
      runtime[field] = number as number;
    }
    if (Object.keys(runtime).length) definition.runtime = runtime;
  }
  return definition;
}

function diskValue(definition: AgentDefinition) {
  return {
    version: 1,
    id: definition.id,
    name: definition.name,
    description: definition.description,
    ...(definition.model
      ? { model: { provider: definition.model.provider, id: definition.model.modelId } }
      : {}),
    ...(definition.thinkingLevel
      ? { thinking_level: definition.thinkingLevel }
      : {}),
    system_prompt: definition.systemPrompt,
    ...(definition.runtime
      ? {
          runtime: Object.fromEntries(
            (Object.entries(runtimeFields) as [
              keyof AgentRuntimeConfig,
              [string, number, number],
            ][])
              .filter(([field]) => definition.runtime?.[field] !== undefined)
              .map(([field, [key]]) => [key, definition.runtime![field]]),
          ),
        }
      : {}),
  };
}

function revision(source: string) {
  return createHash("sha256").update(source).digest("hex");
}

export class AgentManager {
  private agents = new Map<AgentRef, Loaded>();
  private problems: AgentProblem[] = [];
  private watchers: FSWatcher[] = [];
  private workspaceRoot?: string;
  private scanPromise = Promise.resolve();
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private store: Store,
    readonly userDirectory: string,
    private onChange: () => void,
    private trash: (file: string) => Promise<void>,
    private modelAvailable: (model: ModelRef) => boolean,
    private watchEnabled = true,
  ) {}

  async init(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot;
    await fs.mkdir(this.userDirectory, { recursive: true });
    await this.scan(true);
    if (this.watchEnabled) this.watchDirectories();
  }

  async setWorkspace(root?: string) {
    this.workspaceRoot = root;
    await this.scan(true);
    if (this.watchEnabled) this.watchDirectories();
  }

  list() {
    const defaultRef = this.store.get<AgentRef | "">("defaultAgentRef", "");
    return [...this.agents.values()]
      .map(({ document: _document, source: _source, ...agent }) => ({
        ...agent,
        modelAvailable: !agent.model || this.modelAvailable(agent.model),
        isDefault: agent.ref === defaultRef,
      }))
      .sort((a, b) =>
        a.scope === b.scope
          ? a.name.localeCompare(b.name)
          : a.scope === "user"
            ? -1
            : 1,
      );
  }

  errors() {
    return [...this.problems];
  }

  get(ref: AgentRef): AgentDefinition | undefined {
    const agent = this.agents.get(ref);
    if (!agent) return;
    const { ref: _ref, scope: _scope, path: _path, revision: _revision, isDefault: _default, modelAvailable: _available, document: _document, source: _source, ...definition } = agent;
    return structuredClone(definition);
  }

  defaultRef(): AgentRef {
    const stored = this.store.get<AgentRef | "">("defaultAgentRef", "");
    if (stored && this.agents.get(stored)?.scope === "user") return stored;
    const next = [...this.agents.values()]
      .filter((agent) => agent.scope === "user")
      .sort((a, b) => a.name.localeCompare(b.name))[0]?.ref;
    if (!next) throw new Error("Nenhum agente de usuário válido");
    this.store.set("defaultAgentRef", next);
    return next;
  }

  setDefault(ref: AgentRef) {
    const agent = this.agents.get(ref);
    if (!agent || agent.scope !== "user")
      throw new Error("O agente padrão deve ser do usuário");
    this.store.set("defaultAgentRef", ref);
    this.onChange();
  }

  async save(
    scope: AgentScope,
    input: AgentDefinition,
    expectedRevision?: string,
  ) {
    const definition = validateDefinition(diskValue(input));
    const ref = `${scope}:${definition.id}` as AgentRef;
    const existing = this.agents.get(ref);
    if (existing && !expectedRevision) throw new Error("Este ID já existe neste escopo");
    if (!existing && expectedRevision) throw new Error("O agente não existe mais");
    if (existing && existing.revision !== expectedRevision)
      throw new Error("O arquivo mudou no disco. Recarregue antes de salvar.");
    const directory = this.directory(scope, true);
    await fs.mkdir(directory, { recursive: true });
    const target = existing?.path ?? path.join(directory, `${definition.id}.yaml`);
    let source: string;
    if (existing) {
      const document = existing.document.clone();
      const value = diskValue(definition) as Record<string, unknown>;
      for (const key of topKeys) {
        if (value[key] === undefined) document.delete(key);
        else document.set(key, value[key]);
      }
      source = document.toString({ lineWidth: 0 });
    } else {
      source = stringify(diskValue(definition), { lineWidth: 0 });
    }
    const temporary = path.join(directory, `.computador-${definition.id}-${process.pid}.tmp`);
    await fs.writeFile(temporary, source, { flag: "wx", mode: 0o644 });
    try {
      await fs.rename(temporary, target);
    } finally {
      await fs.unlink(temporary).catch(() => {});
    }
    await this.scan(true);
    if (this.watchEnabled) this.watchDirectories();
  }

  async delete(ref: AgentRef) {
    const agent = this.agents.get(ref);
    if (!agent) throw new Error("Agente não encontrado");
    if (
      agent.scope === "user" &&
      this.list().filter((item) => item.scope === "user").length <= 1
    )
      throw new Error("Pelo menos um agente de usuário deve existir");
    await this.trash(agent.path);
    await this.scan(true);
  }

  async close() {
    if (this.timer) clearTimeout(this.timer);
    this.watchers.forEach((watcher) => watcher.close());
    this.watchers = [];
  }

  private directory(scope: AgentScope, writing = false) {
    if (scope === "user") return this.userDirectory;
    if (!this.workspaceRoot)
      throw new Error("Abra um projeto antes de criar um agente de projeto");
    const directory = path.join(this.workspaceRoot, ".computador", "agents");
    if (!writing) return directory;
    return directory;
  }

  private scheduleScan() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(
      () =>
        void this.scan(true).then(() => {
          if (this.watchEnabled) this.watchDirectories();
        }),
      100,
    );
  }

  private watchDirectories() {
    this.watchers.forEach((watcher) => watcher.close());
    this.watchers = [];
    const directories = [
      this.userDirectory,
      ...(this.workspaceRoot ? [this.directory("project")] : []),
    ];
    if (this.workspaceRoot && !existsSync(this.directory("project"))) {
      const computador = path.join(this.workspaceRoot, ".computador");
      directories.push(existsSync(computador) ? computador : this.workspaceRoot);
    }
    for (const directory of directories) {
      try {
        const watcher = watch(directory, () => this.scheduleScan());
        watcher.on("error", () => watcher.close());
        this.watchers.push(watcher);
      } catch {
        /* Project directory is intentionally absent until first creation. */
      }
    }
  }

  private async scan(notify: boolean) {
    this.scanPromise = this.scanPromise.catch(() => {}).then(async () => {
      const agents = new Map<AgentRef, Loaded>();
      const problems: AgentProblem[] = [];
      for (const scope of ["user", "project"] as const) {
        let directory: string;
        try {
          directory = this.directory(scope);
        } catch {
          continue;
        }
        const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
        const loaded: Loaded[] = [];
        for (const entry of entries) {
          if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;
          const file = path.join(directory, entry.name);
          try {
            const stat = await fs.lstat(file);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_AGENT_BYTES)
              throw new Error("Arquivo inválido ou maior que 256 KiB");
            const source = await fs.readFile(file, "utf8");
            const document = parseDocument(source, { uniqueKeys: true });
            if (document.errors.length) throw new Error(document.errors[0].message);
            const definition = validateDefinition(document.toJS({ maxAliasCount: 0 }));
            loaded.push({
              ...definition,
              ref: `${scope}:${definition.id}` as AgentRef,
              scope,
              path: file,
              revision: revision(source),
              isDefault: false,
              modelAvailable: !definition.model || this.modelAvailable(definition.model),
              document,
              source,
            });
          } catch (error) {
            problems.push({ scope, path: file, error: (error as Error).message });
          }
        }
        const counts = new Map<string, number>();
        loaded.forEach((agent) => counts.set(agent.id, (counts.get(agent.id) ?? 0) + 1));
        for (const agent of loaded) {
          if ((counts.get(agent.id) ?? 0) > 1) {
            problems.push({
              scope,
              path: agent.path,
              error: `ID duplicado no escopo: ${agent.id}`,
            });
          } else agents.set(agent.ref, agent);
        }
      }
      if (![...agents.values()].some((agent) => agent.scope === "user")) {
        let id = initialAgent.id;
        let suffix = 2;
        const names = new Set(
          (await fs.readdir(this.userDirectory).catch(() => [])).map((name) =>
            name.toLowerCase(),
          ),
        );
        while (names.has(`${id}.yaml`) || names.has(`${id}.yml`))
          id = `${initialAgent.id}-${suffix++}`;
        const definition = { ...initialAgent, id };
        const file = path.join(this.userDirectory, `${id}.yaml`);
        const source = stringify(diskValue(definition), { lineWidth: 0 });
        await fs.writeFile(
          file,
          source,
          { flag: "wx", mode: 0o644 },
        );
        const document = parseDocument(source, { uniqueKeys: true });
        agents.set(`user:${id}`, {
          ...definition,
          ref: `user:${id}`,
          scope: "user",
          path: file,
          revision: revision(source),
          isDefault: false,
          modelAvailable: true,
          document,
          source,
        });
      }
      this.agents = agents;
      this.problems = problems;
      this.defaultRef();
      if (notify) this.onChange();
    });
    await this.scanPromise;
  }
}

export const agentRuntimeDefaults = {
  maxDelegationDepth: 3,
  maxConcurrentSubagents: 4,
  maxTurns: 20,
  maxToolCalls: 100,
  timeoutSeconds: 600,
} satisfies Required<AgentRuntimeConfig>;

export function runtimeFor(agent: AgentDefinition) {
  return { ...agentRuntimeDefaults, ...agent.runtime };
}

export function validateAgentInput(value: unknown) {
  return validateDefinition(value);
}
