import { describe, expect, it } from "vitest";
import { PanelRegistry, panels } from "./registry";

describe("PanelRegistry", () => {
  it("registers definitions in insertion order and resolves them by id", () => {
    const registry = new PanelRegistry();
    const component = () => null;
    const first = { id: "first", title: "chat" as const, component, location: "left" as const };
    const second = { id: "second", title: "files" as const, component, location: "right" as const };
    registry.register(first);
    registry.register(second);
    expect(registry.list()).toEqual([first, second]);
    expect(registry.get("second")).toBe(second);
    expect(registry.get("missing")).toBeUndefined();
  });

  it("rejects duplicate ids and exposes every built-in panel", () => {
    const registry = new PanelRegistry();
    const definition = {
      id: "chat",
      title: "chat" as const,
      component: () => null,
      location: "within" as const,
    };
    registry.register(definition);
    expect(() => registry.register(definition)).toThrow("Duplicate panel");
    expect(panels.list().map((panel) => panel.id)).toEqual([
      "chat",
      "files",
      "sessions",
      "viewer",
      "markdown",
      "terminal",
      "subagent",
    ]);
  });
});
