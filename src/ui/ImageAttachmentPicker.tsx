import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Plus } from "lucide-react";
import type { Locale } from "../i18n";
import type { ImageAttachment } from "../shared/protocol";

const supportedTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const maxImageBytes = 10 * 1024 * 1024;

export function ImageAttachmentPicker({
  locale,
  disabled,
  onAdd,
  onError,
}: {
  locale: Locale;
  disabled: boolean;
  onAdd: (image: ImageAttachment) => void;
  onError: (message: string) => void;
}) {
  const pt = locale === "pt-BR";
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const read = async (file?: File) => {
    if (!file) return;
    if (!supportedTypes.has(file.type)) {
      onError(
        pt
          ? "Use uma imagem PNG, JPEG, WebP ou GIF."
          : "Use a PNG, JPEG, WebP, or GIF image.",
      );
      return;
    }
    if (file.size > maxImageBytes) {
      onError(
        pt
          ? "A imagem deve ter no máximo 10 MB."
          : "The image must be at most 10 MB.",
      );
      return;
    }
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
      reader.readAsDataURL(file);
    });
    onAdd({
      name: file.name,
      mimeType: file.type,
      data: url.slice(url.indexOf(",") + 1),
    });
    onError("");
  };

  return (
    <div
      className="attachment-control"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="attachment-trigger"
        aria-label={pt ? "Adicionar" : "Add"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <Plus size={16} />
      </button>
      {open && (
        <div className="attachment-menu" id={id} role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              input.current?.click();
            }}
          >
            <ImagePlus size={15} />
            {pt ? "Adicionar imagem" : "Add image"}
          </button>
        </div>
      )}
      <input
        ref={input}
        className="attachment-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          void read(event.target.files?.[0]).catch(() =>
            onError(
              pt
                ? "Não foi possível ler a imagem."
                : "The image could not be read.",
            ),
          );
          event.target.value = "";
        }}
      />
    </div>
  );
}
