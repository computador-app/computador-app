import type { BackendAPI } from "./shared/protocol";
export {};
declare global {
  interface Window {
    desktop?: {
      backend: BackendAPI;
      onCommand(callback: (command: string) => void): () => void;
      edit(
        action: "undo" | "redo" | "cut" | "copy" | "paste" | "selectAll",
      ): void;
      setLocale(locale: "pt-BR" | "en"): void;
    };
  }
}
