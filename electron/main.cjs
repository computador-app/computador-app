// KDE can advertise a global menu registrar without a visible menu widget.
// Keep the native Electron menu in the Linux window instead of exporting it.
if (process.platform === "linux") {
  process.env.ELECTRON_FORCE_WINDOW_MENU_BAR = "1";
}

const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createMenuTemplate } = require("./menu.cjs");

app.setName("Computador");
if (process.env.NODE_ENV === "test" && process.env.COMPUTADOR_TEST_USER_DATA) {
  app.setPath("userData", process.env.COMPUTADOR_TEST_USER_DATA);
}
app.setAboutPanelOptions({
  applicationName: "Computador",
  applicationVersion: "0.1.0",
  comments: "Frontend preview · mock services / serviços simulados",
});
let mainWindow;
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
      createMenuTemplate(locale, (command) => {
        if (mainWindow && !mainWindow.isDestroyed())
          mainWindow.webContents.send("desktop:command", command);
      }),
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

app.whenReady().then(() => {
  updateMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
