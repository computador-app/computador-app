import type { PanelState, JsonValue } from "./types";
export const PANEL_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/;
/** State is bounded JSON only. Never accept functions, prototypes or arbitrary objects. */
export function cloneState(value: unknown): PanelState {
  const ancestors = new Set<object>();
  let nodes = 0;
  function visit(item: unknown, depth: number): JsonValue {
    if (++nodes > 5000 || depth > 12)
      throw new Error("Panel state is too complex");
    if (item === null || typeof item === "boolean" || typeof item === "string")
      return item;
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item !== "object" || !item || ancestors.has(item))
      throw new Error("Panel state must be JSON");
    ancestors.add(item);
    let result: JsonValue;
    if (Array.isArray(item))
      result = Array.from(item, (v) => visit(v, depth + 1));
    else {
      if (
        Object.getPrototypeOf(item) !== Object.prototype &&
        Object.getPrototypeOf(item) !== null
      )
        throw new Error("Invalid state object");
      const entries = Object.entries(item);
      if (
        entries.some(([key]) =>
          ["__proto__", "constructor", "prototype"].includes(key),
        )
      )
        throw new Error("Invalid state key");
      result = Object.fromEntries(
        entries.map(([key, v]) => [key, visit(v, depth + 1)]),
      );
    }
    ancestors.delete(item);
    return result;
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Panel state must be an object");
  const result = visit(value, 0) as PanelState;
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > 65536)
    throw new Error("Panel state exceeds 64 KiB");
  return result;
}
