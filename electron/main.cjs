// KDE can advertise a global menu registrar without a visible menu widget.
// Keep the native Electron menu in the Linux window instead of exporting it.
if (process.platform === "linux") {
  process.env.ELECTRON_FORCE_WINDOW_MENU_BAR = "1";
}

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  shell,
  safeStorage,
} = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createMenuTemplate } = require("./menu.cjs");

app.setName("Computador");
if (process.env.NODE_ENV === "test" && process.env.COMPUTADOR_TEST_USER_DATA) {
  app.setPath("userData", process.env.COMPUTADOR_TEST_USER_DATA);
}
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();
app.on("second-instance", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
app.setAboutPanelOptions({
  applicationName: "Computador",
  applicationVersion: "0.2.0",
  comments: "Computador · Agente de projetos",
});
let mainWindow;
let backend;
let dispatch;
let shuttingDown = false;
let locale = "pt-BR";

function attachWindowMenu(window) {
  if (process.platform === "darwin") return;
  window.setMenu(Menu.getApplicationMenu());
  window.setAutoHideMenuBar(false);
  window.setMenuBarVisibility(true);
}

function updateMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(
      createMenuTemplate(
        locale,
        (command) => {
          if (mainWindow && !mainWindow.isDestroyed())
            mainWindow.webContents.send("desktop:command", command);
        },
        process.platform,
        backend?.snapshot().recent ?? [],
      ),
    ),
  );
  for (const window of BrowserWindow.getAllWindows()) attachWindowMenu(window);
}

function createWindow() {
  const productionURL = pathToFileURL(
    path.join(__dirname, "../dist/index.html"),
  ).href;
  const applicationURL = process.env.VITE_DEV_SERVER_URL || productionURL;
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 900,
    minHeight: 640,
    title: "Computador",
    backgroundColor: "#121418",
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  attachWindowMenu(mainWindow);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, target) => {
    if (target !== applicationURL) event.preventDefault();
  });
  mainWindow.webContents.on("will-redirect", (event) => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.loadURL(applicationURL);
}

ipcMain.on("desktop:edit", (event, action) => {
  if (
    !mainWindow ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame
  )
    return;
  if (!["undo", "redo", "cut", "copy", "paste", "selectAll"].includes(action))
    return;
  mainWindow.webContents[action]();
});

ipcMain.on("desktop:locale", (event, nextLocale) => {
  if (
    !mainWindow ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame
  )
    return;
  if (nextLocale !== "pt-BR" && nextLocale !== "pt" && nextLocale !== "en")
    return;
  locale = nextLocale;
  updateMenu();
});

app.whenReady().then(async () => {
  if (!hasInstanceLock) return;
  const module = await import("../dist-electron/backend/index.js");
  dispatch = module.dispatch;
  backend = await module.createBackend({
    userData: app.getPath("userData"),
    home:
      process.env.NODE_ENV === "test"
        ? app.getPath("userData")
        : app.getPath("home"),
    trashItem: (file) => shell.trashItem(file),
    fake:
      process.env.NODE_ENV === "test" &&
      process.env.COMPUTADOR_FAKE_LLM === "1",
    encryption: {
      available: () =>
        safeStorage.isEncryptionAvailable() &&
        (process.platform !== "linux" ||
          safeStorage.getSelectedStorageBackend() !== "basic_text"),
      encrypt: (value) => safeStorage.encryptString(value),
      decrypt: (value) => safeStorage.decryptString(Buffer.from(value)),
    },
    openFolder: async () => {
      if (
        process.env.NODE_ENV === "test" &&
        process.env.COMPUTADOR_TEST_WORKSPACE
      )
        return process.env.COMPUTADOR_TEST_WORKSPACE;
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"],
      });
      return result.canceled ? undefined : result.filePaths[0];
    },
    openExternal: async (url) => {
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol))
        throw new Error("Invalid URL");
      if (process.env.NODE_ENV !== "test") await shell.openExternal(url);
    },
  });
  let recentIds = "";
  backend.subscribe((event) => {
    const next = event.snapshot.recent.map((w) => w.id).join(",");
    if (next !== recentIds) {
      recentIds = next;
      updateMenu();
    }
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send("backend:event", event);
  });
  ipcMain.handle("backend:request", async (event, method, args) => {
    if (
      !mainWindow ||
      event.sender !== mainWindow.webContents ||
      event.senderFrame !== mainWindow.webContents.mainFrame
    )
      throw new Error("Unauthorized sender");
    return dispatch(backend, method, args);
  });
  updateMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("before-quit", (event) => {
  if (backend && !shuttingDown) {
    event.preventDefault();
    shuttingDown = true;
    backend.close().finally(() => app.quit());
  }
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
