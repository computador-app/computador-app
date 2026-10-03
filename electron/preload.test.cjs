const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");

function loadBridge() {
  let api;
  const ipc = new EventEmitter();
  const sent = [];
  ipc.send = (...args) => sent.push(args);
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "preload.cjs"), "utf8"),
    {
      require: (name) => {
        assert.equal(name, "electron");
        return {
          ipcRenderer: ipc,
          contextBridge: {
            exposeInMainWorld: (name, value) => {
              assert.equal(name, "desktop");
              api = value;
            },
          },
        };
      },
    },
  );
  return { api, ipc, sent };
}

test("preload exposes only the narrow methods and strips Electron events", () => {
  const { api, ipc } = loadBridge();
  assert.deepEqual(Object.keys(api).sort(), ["edit", "onCommand", "setLocale"]);
  const received = [];
  const unsubscribe = api.onCommand((...args) => received.push(args));
  ipc.emit("desktop:command", { sender: "privileged" }, "session.new");
  ipc.emit("desktop:command", {}, { unexpected: "payload" });
  assert.deepEqual(received, [["session.new"]]);
  unsubscribe();
  ipc.emit("desktop:command", {}, "preferences.open");
  assert.equal(received.length, 1);
  assert.equal(ipc.listenerCount("desktop:command"), 0);
});

test("preload refuses invalid locale values and invalid subscribers", () => {
  const { api, sent } = loadBridge();
  api.setLocale("pt");
  api.setLocale("pt-BR");
  api.setLocale("en");
  api.setLocale("arbitrary-channel");
  api.setLocale({ locale: "pt" });
  assert.deepEqual(sent, [
    ["desktop:locale", "pt"],
    ["desktop:locale", "pt-BR"],
    ["desktop:locale", "en"],
  ]);
  assert.throws(() => api.onCommand(null), /Expected a command callback/);
});

test("preload edit only dispatches native editing actions", () => {
  const { api, sent } = loadBridge();
  for (const action of ["undo", "redo", "cut", "copy", "paste", "selectAll"])
    api.edit(action);
  api.edit("executeJavaScript");
  api.edit("__proto__");
  api.edit({ action: "copy" });
  assert.deepEqual(
    sent,
    ["undo", "redo", "cut", "copy", "paste", "selectAll"].map((action) => [
      "desktop:edit",
      action,
    ]),
  );
});
