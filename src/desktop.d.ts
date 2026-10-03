export {};
declare global {
  interface Window {
    desktop?: {
      onCommand(callback: (command: string) => void): () => void;
      edit(
        action: "undo" | "redo" | "cut" | "copy" | "paste" | "selectAll",
      ): void;
      setLocale(locale: "pt-BR" | "en"): void;
    };
  }
}
