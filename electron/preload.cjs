const { contextBridge, ipcRenderer } = require("electron");

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
  setLocale(locale) {
    if (locale === "en" || locale === "pt" || locale === "pt-BR")
      ipcRenderer.send("desktop:locale", locale);
  },
});
