// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ModelVisibility } from "./ModelVisibility";
import { modelKey, type AppSnapshot } from "../shared/protocol";

afterEach(cleanup);

const state = (): AppSnapshot => ({
  revision: 1,
  workspace: null,
  recent: [],
  sessions: [],
  activeSessionId: "",
  providers: [
    { id: "a", name: "Alpha", configured: true, status: "configured", methods: [] },
    { id: "b", name: "Beta", configured: false, status: "disconnected", methods: [] },
  ],
  models: [
    { provider: "a", modelId: "fast", name: "Fast", contextWindow: 1, input: ["text"], thinkingLevels: ["off"] },
    { provider: "a", modelId: "vision", name: "Vision", contextWindow: 1, input: ["text", "image"], thinkingLevels: ["off"] },
  ],
  defaultModel: null,
  defaultThinkingLevel: "off",
  hiddenModels: [modelKey({ provider: "a", modelId: "vision" })],
  auth: null,
  secureStorage: false,
  agents: [],
  agentProblems: [],
  defaultAgentRef: "user:default",
  subagentRuns: [],
});

describe("ModelVisibility", () => {
  it("shows only configured providers and toggles individual and bulk visibility", () => {
    const onHidden = vi.fn();
    render(
      <ModelVisibility state={state()} pt busy={false} onHidden={onHidden} onRefresh={vi.fn()} />,
    );
    expect(screen.getByRole("region", { name: "Alpha" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Beta" })).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: "Mostrar Vision" }));
    expect(onHidden).toHaveBeenCalledWith(
      [modelKey({ provider: "a", modelId: "vision" })],
      false,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ocultar todos" }));
    expect(onHidden).toHaveBeenLastCalledWith(
      [
        modelKey({ provider: "a", modelId: "fast" }),
        modelKey({ provider: "a", modelId: "vision" }),
      ],
      true,
    );
  });

  it("searches names, ids and providers and reports an empty result", () => {
    render(
      <ModelVisibility state={state()} pt={false} busy={false} onHidden={vi.fn()} onRefresh={vi.fn()} />,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Search models" }), {
      target: { value: "vision" },
    });
    const group = screen.getByRole("region", { name: "Alpha" });
    expect(within(group).getByText("Vision")).toBeTruthy();
    expect(within(group).queryByText("Fast")).toBeNull();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search models" }), {
      target: { value: "missing" },
    });
    expect(screen.getByText("No models found. Try another name.")).toBeTruthy();
  });

  it("disables mutations while busy and refreshes on demand", () => {
    const onRefresh = vi.fn();
    const view = render(
      <ModelVisibility state={state()} pt={false} busy={false} onHidden={vi.fn()} onRefresh={onRefresh} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh catalog" }));
    expect(onRefresh).toHaveBeenCalledOnce();
    view.rerender(
      <ModelVisibility state={state()} pt={false} busy onHidden={vi.fn()} onRefresh={onRefresh} />,
    );
    expect(screen.getByRole("button", { name: "Refresh catalog" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Show Fast" })).toBeDisabled();
  });
});
