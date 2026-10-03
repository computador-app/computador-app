import type { Application } from "./application.js";
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
export async function dispatch(
  app: Application,
  method: unknown,
  args: unknown,
) {
  if (!Array.isArray(args) || args.length > 3)
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
      if (Object.keys(p).some((k) => k !== "title" && k !== "model"))
        throw new Error("Invalid patch");
      return app.updateSession(str(args[0]), {
        ...(p.title !== undefined ? { title: str(p.title, 200) } : {}),
        ...(p.model !== undefined ? { model: model(p.model) } : {}),
      });
    }
    case "sendMessage": {
      const text = str(args[1], 1024 * 1024).trim();
      if (!text) throw new Error("Empty message");
      return app.sendMessage(
        str(args[0]),
        text,
        args[2] === "en" ? "en" : "pt-BR",
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
      return app.setDefault(model(args[0]));
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
    case "listFiles":
      return app.listFiles();
    case "readFile":
      return app.readFile(str(args[0], 4096));
    default:
      throw new Error("Unknown operation");
  }
}
