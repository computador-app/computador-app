const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");

test("native catalog updates require the application main frame and valid payload", () => {
  const ipcMain = new EventEmitter();
  let window;
  let menu;
  let updates = 0;
  class BrowserWindow extends EventEmitter {
    constructor() {
      super();
      window = this;
      this.webContents = new EventEmitter();
      Object.assign(this.webContents, {
        mainFrame: {},
        setWindowOpenHandler() {},
        session: { setPermissionRequestHandler() {}, setPermissionCheckHandler() {} },
      });
    }
    static getAllWindows() { return window ? [window] : []; }
    setMenu() {}
    setAutoHideMenuBar() {}
    setMenuBarVisibility() {}
    loadURL() {}
  }
  const electron = {
    BrowserWindow, ipcMain,
    app: { setName() {}, setAboutPanelOptions() {}, on() {}, whenReady: () => ({ then: (callback) => callback() }) },
    Menu: { buildFromTemplate: (template) => template, getApplicationMenu: () => menu,
      setApplicationMenu: (value) => { menu = value; updates++; } },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "main.cjs"), "utf8"), {
    __dirname, process: { platform: "linux", env: {} },
    require: (name) => name === "electron" ? electron : require(name),
  });
  const entries = [{ id: "example.notes", title: "Notes", multiple: true }];
  const trusted = { sender: window.webContents, senderFrame: window.webContents.mainFrame };
  for (const event of [{ sender: {}, senderFrame: trusted.senderFrame },
    { sender: trusted.sender, senderFrame: {} }]) ipcMain.emit("desktop:panels", event, entries);
  ipcMain.emit("desktop:panels", trusted, [{ ...entries[0], multiple: "yes" }]);
  assert.equal(updates, 1);
  ipcMain.emit("desktop:panels", trusted, entries);
  assert.equal(updates, 2);
  const panels = () => menu.find((item) => item.label === "Exibir").submenu[0].submenu;
  assert.equal(panels()[0].label, "Notes");
  ipcMain.emit("desktop:panels", trusted, []);
  assert.equal(panels().length, 0);
});
