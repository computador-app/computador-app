import type { PanelDefinition } from "./types";
import { cloneState, PANEL_ID } from "./validation";
function freezeState<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezeState(child);
    Object.freeze(value);
  }
  return value;
}
export class PanelRegistry {
  private definitions = new Map<string, PanelDefinition>();
  private snapshot: readonly PanelDefinition[] = [];
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  list = () => this.snapshot;
  get = (id: string) => this.definitions.get(id);
  register(definition: PanelDefinition) {
    return this.registerMany([definition]);
  }
  /** Batch validation prevents a broken extension from partially registering. */
  registerMany(definitions: PanelDefinition[]) {
    const ids = new Set<string>();
    if (this.definitions.size + definitions.length > 64)
      throw new Error("Panel registry limit reached");
    const prepared = definitions.map((definition) => {
      if (
        !PANEL_ID.test(definition.id) ||
        ids.has(definition.id) ||
        this.definitions.has(definition.id)
      )
        throw new Error(`Invalid or duplicate panel: ${definition.id}`);
      ids.add(definition.id);
      const titles =
        typeof definition.title === "string"
          ? [definition.title]
          : Object.values(definition.title);
      if (
        !titles.length ||
        titles.some((t) => typeof t !== "string" || !t.trim() || t.length > 100)
      )
        throw new Error("Invalid panel title");
      if (typeof definition.title !== "string" && !definition.title.en)
        throw new Error("English fallback required");
      if (
        !["left", "right", "above", "below", "within"].includes(
          definition.location,
        )
      )
        throw new Error("Invalid panel location");
      if (typeof definition.component !== "function")
        throw new Error("Panel component is required");
      if (
        definition.stateVersion !== undefined &&
        (!Number.isInteger(definition.stateVersion) ||
          definition.stateVersion < 1)
      )
        throw new Error("Invalid state version");
      return Object.freeze({
        ...definition,
        title:
          typeof definition.title === "string"
            ? definition.title
            : Object.freeze({ ...definition.title }),
        defaultState: freezeState(cloneState(definition.defaultState || {})),
      });
    });
    for (const definition of prepared)
      this.definitions.set(definition.id, definition);
    this.notify();
    return () => {
      for (const definition of prepared)
        if (this.definitions.get(definition.id) === definition)
          this.definitions.delete(definition.id);
      this.notify();
    };
  }
  unregister(id: string) {
    if (this.definitions.delete(id)) this.notify();
  }
  private notify() {
    this.snapshot = Object.freeze([...this.definitions.values()]);
    for (const listener of [...this.listeners]) listener();
  }
}
