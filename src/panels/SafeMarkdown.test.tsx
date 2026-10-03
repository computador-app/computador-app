// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { DomainProvider } from "../domain/context";
import { SafeMarkdown } from "./SafeMarkdown";
afterEach(cleanup);
describe("safe mock Markdown rendering", () => {
  const show = (markdown: string, onCommand = vi.fn()) =>
    render(
      <DomainProvider locale="en" onCommand={onCommand}>
        <SafeMarkdown>{markdown}</SafeMarkdown>
      </DomainProvider>,
    );
  it("omits raw HTML and external image resources", () => {
    const { container } = show(
      '<script>alert(1)</script>\n\n![tracking](https://example.org/pixel.png)\n\n<iframe src="https://example.org"/>',
    );
    expect(container.querySelector("script,iframe,img")).toBeNull();
    expect(screen.getByText("[tracking]")).toBeTruthy();
  });
  it("renders external and unsafe links as inert text", () => {
    const { container } = show(
      "[external](https://example.org) [unsafe](javascript:alert)",
    );
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText(/external/)).toBeTruthy();
  });
  it("routes known workspace links through the command interface", () => {
    const command = vi.fn();
    show("[Readme](README.md)", command);
    fireEvent.click(screen.getByRole("link", { name: "Readme" }));
    expect(command).toHaveBeenCalledWith("file.open", { path: "README.md" });
  });
});
