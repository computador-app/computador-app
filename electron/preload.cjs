const { contextBridge, ipcRenderer } = require("electron");

// Sandboxed preloads cannot load local modules; keep validation aligned with menu.cjs.
function validatePanels(items) {
  if (!Array.isArray(items) || items.length > 64) return false;
  const ids = new Set();
  return items.every((item) => {
    if (!item || typeof item !== "object" ||
        typeof item.id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(item.id) ||
        typeof item.title !== "string" || item.title.trim().length === 0 || item.title.length > 100 ||
        /[\x00-\x1f\x7f]/.test(item.title) || typeof item.multiple !== "boolean" || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}

contextBridge.exposeInMainWorld("desktop", {
  onCommand(callback) {
    if (typeof callback !== "function")
      throw new TypeError("Expected a command callback");
    const listener = (_event, command) => {
      if (typeof command === "string") callback(command);
    };
    ipcRenderer.on("desktop:command", listener);
    return () => ipcRenderer.removeListener("desktop:command", listener);
  },
  edit(action) {
    if (["undo", "redo", "cut", "copy", "paste", "selectAll"].includes(action))
      ipcRenderer.send("desktop:edit", action);
  },
  setPanels(items) {
    if (validatePanels(items))
      ipcRenderer.send("desktop:panels", items.map(({ id, title, multiple }) => ({ id, title, multiple })));
  },
  setLocale(locale) {
    if (locale === "en" || locale === "pt" || locale === "pt-BR")
      ipcRenderer.send("desktop:locale", locale);
  },
});
