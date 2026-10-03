import type { JsonValue } from "./types";
export class PanelEventBus {
  private listeners = new Map<string, Set<(payload: JsonValue) => void>>();
  subscribe = (event: string, handler: (payload: JsonValue) => void) => {
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(handler);
    this.listeners.set(event, listeners);
    return () => {
      listeners.delete(handler);
      if (!listeners.size && this.listeners.get(event) === listeners)
        this.listeners.delete(event);
    };
  };
  emit(event: string, payload: JsonValue) {
    for (const handler of [...(this.listeners.get(event) || [])]) {
      try {
        handler(structuredClone(payload));
      } catch (error) {
        console.error("Panel event handler failed", error);
      }
    }
  }
}
/** Owns per-instance subscriptions, including subscriptions created after mount. */
export class PanelScope {
  private disposers = new Set<() => void>();
  active = true;
  activate() {
    this.active = true;
  }
  track(dispose: () => void) {
    if (!this.active) {
      dispose();
      return () => {};
    }
    this.disposers.add(dispose);
    return () => {
      if (this.disposers.delete(dispose)) dispose();
    };
  }
  dispose() {
    this.active = false;
    for (const dispose of [...this.disposers]) {
      this.disposers.delete(dispose);
      try {
        dispose();
      } catch (error) {
        console.error("Panel cleanup failed", error);
      }
    }
  }
}
export const panelEvents = new PanelEventBus();
