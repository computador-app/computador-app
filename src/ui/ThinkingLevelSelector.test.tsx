// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { preferredThinkingLevel, ThinkingLevelSelector } from "./ThinkingLevelSelector";

afterEach(cleanup);

describe("ThinkingLevelSelector", () => {
  it("chooses a supported fallback deterministically", () => {
    expect(preferredThinkingLevel(["off", "medium"], "high")).toBe("medium");
    expect(preferredThinkingLevel(["off", "high"], "low")).toBe("off");
    expect(preferredThinkingLevel(["high"], "low")).toBe("high");
    expect(preferredThinkingLevel([], "high")).toBe("off");
  });

  it("localizes options, emits changes and disables a single choice", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ThinkingLevelSelector value="off" levels={["off", "high"]} locale="pt-BR" label="Pensamento" onChange={onChange} />,
    );
    const select = screen.getByRole("combobox", { name: "Pensamento" });
    expect(screen.getByRole("option", { name: "Alto" })).toBeTruthy();
    fireEvent.change(select, { target: { value: "high" } });
    expect(onChange).toHaveBeenCalledWith("high");
    rerender(
      <ThinkingLevelSelector value="off" levels={["off"]} locale="en" label="Thinking" onChange={onChange} />,
    );
    expect(screen.getByRole("combobox", { name: "Thinking" })).toBeDisabled();
  });
});
