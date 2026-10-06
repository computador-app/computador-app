// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImageAttachmentPicker } from "./ImageAttachmentPicker";

afterEach(cleanup);

function renderPicker(locale: "pt-BR" | "en" = "en") {
  const onAdd = vi.fn();
  const onError = vi.fn();
  const view = render(
    <ImageAttachmentPicker locale={locale} disabled={false} onAdd={onAdd} onError={onError} />,
  );
  const input = view.container.querySelector("input[type=file]") as HTMLInputElement;
  return { onAdd, onError, input };
}

describe("ImageAttachmentPicker", () => {
  it("encodes supported images and clears prior errors", async () => {
    const { onAdd, onError, input } = renderPicker();
    const file = new File(["pixel"], "pixel.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    await vi.waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      name: "pixel.png",
      mimeType: "image/png",
    });
    expect(onAdd.mock.calls[0][0].data).toBe("cGl4ZWw=");
    expect(onError).toHaveBeenLastCalledWith("");
  });

  it("rejects unsupported and oversized files with localized errors", () => {
    const { onAdd, onError, input } = renderPicker("pt-BR");
    fireEvent.change(input, {
      target: { files: [new File(["x"], "file.svg", { type: "image/svg+xml" })] },
    });
    expect(onError).toHaveBeenLastCalledWith("Use uma imagem PNG, JPEG, WebP ou GIF.");
    const huge = new File(["x"], "huge.png", { type: "image/png" });
    Object.defineProperty(huge, "size", { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [huge] } });
    expect(onError).toHaveBeenLastCalledWith("A imagem deve ter no máximo 10 MB.");
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("opens and closes an accessible menu", () => {
    renderPicker();
    const trigger = screen.getByRole("button", { name: "Add" });
    fireEvent.click(trigger);
    expect(screen.getByRole("menuitem", { name: "Add image" })).toBeTruthy();
    fireEvent.keyDown(trigger.parentElement!, { key: "Escape" });
    expect(screen.queryByRole("menuitem", { name: "Add image" })).toBeNull();
  });
});
