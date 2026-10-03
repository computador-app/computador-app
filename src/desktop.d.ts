export {};
declare global {
  interface Window {
    desktop?: {
      onCommand(callback: (command: string) => void): () => void;
      edit(
        action: "undo" | "redo" | "cut" | "copy" | "paste" | "selectAll",
      ): void;
      setPanels(items: Array<{ id: string; title: string; multiple: boolean }>): void;
      setLocale(locale: "pt-BR" | "en"): void;
    };
  }
}
