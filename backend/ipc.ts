import type { Application } from "./application.js";
import type {
  AgentDefinition,
  AgentRef,
  AgentRuntimeConfig,
  AgentScope,
  ThinkingLevel,
} from "../src/shared/protocol.js";
const str = (v: unknown, max = 1024) => {
  if (typeof v !== "string" || v.length > max || v.includes("\0"))
    throw new Error("Invalid text");
  return v;
};
const obj = (v: unknown) => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("Invalid object");
  return v as Record<string, unknown>;
};
const model = (v: unknown) => {
  const o = obj(v);
  return { provider: str(o.provider), modelId: str(o.modelId) };
};
const thinkingLevels = new Set([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);
const thinkingLevel = (v: unknown) => {
  const value = str(v, 16);
  if (!thinkingLevels.has(value)) throw new Error("Invalid thinking level");
  return value as
    | "off"
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | "xhigh"
    | "max";
};
const agentRef = (v: unknown) => {
  const value = str(v, 80);
  if (!/^(user|project):[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value))
    throw new Error("Invalid agent reference");
  return value as AgentRef;
};
const agentDefinition = (v: unknown): AgentDefinition => {
  const value = obj(v);
  const allowed = new Set([
    "version",
    "id",
    "name",
    "description",
    "model",
    "thinkingLevel",
    "systemPrompt",
    "runtime",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key)) || value.version !== 1)
    throw new Error("Invalid agent");
  let runtime: AgentRuntimeConfig | undefined;
  if (value.runtime !== undefined) {
    const source = obj(value.runtime);
    const keys = [
      "maxDelegationDepth",
      "maxConcurrentSubagents",
      "maxTurns",
      "maxToolCalls",
      "timeoutSeconds",
    ] as const;
    if (Object.keys(source).some((key) => !keys.includes(key as never)))
      throw new Error("Invalid runtime");
    runtime = {};
    for (const key of keys)
      if (source[key] !== undefined) {
        if (!Number.isInteger(source[key])) throw new Error("Invalid runtime");
        runtime[key] = source[key] as number;
      }
  }
  return {
    version: 1,
    id: str(value.id, 64),
    name: str(value.name, 80),
    description: str(value.description, 280),
    systemPrompt: str(value.systemPrompt, 100_000),
    ...(value.model !== undefined ? { model: model(value.model) } : {}),
    ...(value.thinkingLevel !== undefined
      ? { thinkingLevel: thinkingLevel(value.thinkingLevel) }
      : {}),
    ...(runtime && Object.keys(runtime).length ? { runtime } : {}),
  };
};
const images = (v: unknown) => {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 4) throw new Error("Invalid images");
  let total = 0;
  return v.map((entry) => {
    const image = obj(entry);
    const mimeType = str(image.mimeType, 64);
    if (!/^image\/(png|jpeg|webp|gif)$/.test(mimeType))
      throw new Error("Unsupported image type");
    const data = str(image.data, 14_000_000);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data))
      throw new Error("Invalid image data");
    total += data.length;
    if (total > 20_000_000) throw new Error("Images too large");
    return { name: str(image.name, 255), data, mimeType };
  });
};
export async function dispatch(
  app: Application,
  method: unknown,
  args: unknown,
) {
  if (!Array.isArray(args) || args.length > 4)
    throw new Error("Invalid arguments");
  switch (method) {
    case "snapshot":
      return app.snapshot();
    case "openWorkspace":
      return app.openWorkspace(
        args[0] === undefined ? undefined : str(args[0]),
      );
    case "createSession":
      return app.createSession();
    case "selectSession":
      return app.selectSession(str(args[0]));
    case "deleteSession":
      return app.deleteSession(str(args[0]));
    case "updateSession": {
      const p = obj(args[1]);
      if (
        Object.keys(p).some(
          (k) =>
            k !== "title" &&
            k !== "model" &&
            k !== "thinkingLevel" &&
            k !== "agentRef",
        )
      )
        throw new Error("Invalid patch");
      return app.updateSession(str(args[0]), {
        ...(p.title !== undefined ? { title: str(p.title, 200) } : {}),
        ...(p.model !== undefined ? { model: model(p.model) } : {}),
        ...(p.thinkingLevel !== undefined
          ? { thinkingLevel: thinkingLevel(p.thinkingLevel) }
          : {}),
        ...(p.agentRef !== undefined ? { agentRef: agentRef(p.agentRef) } : {}),
      });
    }
    case "sendMessage": {
      const text = str(args[1], 1024 * 1024).trim();
      const attachments = images(args[3]);
      if (!text && !attachments.length) throw new Error("Empty message");
      return app.sendMessage(
        str(args[0]),
        text,
        args[2] === "en" ? "en" : "pt-BR",
        attachments,
      );
    }
    case "cancelRun":
      return app.cancelRun(str(args[0]));
    case "login":
      if (args[1] !== "api_key" && args[1] !== "oauth")
        throw new Error("Invalid auth method");
      return app.login(str(args[0]), args[1]);
    case "answerAuth":
      return app.answerAuth(str(args[0]), str(args[1], 16384));
    case "cancelAuth":
      return app.cancelAuth();
    case "removeProvider":
      return app.removeProvider(str(args[0]));
    case "setDefault":
      return app.setDefault(
        model(args[0]),
        args[1] === undefined ? undefined : thinkingLevel(args[1]),
      );
    case "setHidden":
      if (
        !Array.isArray(args[0]) ||
        args[0].length > 20000 ||
        typeof args[1] !== "boolean"
      )
        throw new Error("Invalid model filter");
      return app.setHidden(
        args[0].map((k) => {
          const key = str(k, 4096);
          const ref = JSON.parse(key);
          if (!Array.isArray(ref) || ref.length !== 2)
            throw new Error("Invalid model key");
          str(ref[0]);
          str(ref[1]);
          return key;
        }),
        args[1],
      );
    case "refreshModels":
      return app.refreshModels();
    case "saveAgent": {
      const input = obj(args[0]);
      if (
        Object.keys(input).some(
          (key) =>
            key !== "scope" &&
            key !== "definition" &&
            key !== "expectedRevision",
        )
      )
        throw new Error("Invalid agent input");
      if (input.scope !== "user" && input.scope !== "project")
        throw new Error("Invalid agent scope");
      return app.saveAgent({
        scope: input.scope as AgentScope,
        definition: agentDefinition(input.definition),
        ...(input.expectedRevision !== undefined
          ? { expectedRevision: str(input.expectedRevision, 128) }
          : {}),
      });
    }
    case "deleteAgent":
      return app.deleteAgent(agentRef(args[0]));
    case "setDefaultAgent":
      return app.setDefaultAgent(agentRef(args[0]));
    case "cancelSubagent":
      return app.cancelSubagent(str(args[0]));
    case "listFiles":
      return app.listFiles();
    case "readFile":
      return app.readFile(str(args[0], 4096));
    default:
      throw new Error("Unknown operation");
  }
}
