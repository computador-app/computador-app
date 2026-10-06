const { contextBridge, ipcRenderer } = require("electron");

const backend = {};
for (const name of [
  "snapshot",
  "openWorkspace",
  "createSession",
  "selectSession",
  "updateSession",
  "deleteSession",
  "sendMessage",
  "cancelRun",
  "login",
  "answerAuth",
  "cancelAuth",
  "removeProvider",
  "setDefault",
  "setHidden",
  "refreshModels",
  "saveAgent",
  "deleteAgent",
  "setDefaultAgent",
  "cancelSubagent",
  "listFiles",
  "readFile",
]) {
  backend[name] = (...args) =>
    ipcRenderer.invoke("backend:request", name, args);
}
backend.onEvent = (callback) => {
  if (typeof callback !== "function") throw new TypeError("Expected callback");
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on("backend:event", listener);
  return () => ipcRenderer.removeListener("backend:event", listener);
};
contextBridge.exposeInMainWorld("desktop", {
  backend,
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
