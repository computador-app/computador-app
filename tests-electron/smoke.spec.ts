import { test, expect } from "./fixture";

test("renderer stays isolated and native commands reach the focused window", async ({
  electronApp,
  appWindow,
}) => {
  expect(
    await appWindow.evaluate(() => Object.keys(globalThis.desktop).sort()),
  ).toEqual(["backend", "edit", "onCommand", "setLocale"]);
  expect(await appWindow.evaluate(() => typeof globalThis.require)).toBe(
    "undefined",
  );
  await expect(appWindow.locator(".menubar")).toHaveCount(0);
  expect(await electronApp.evaluate(({ Menu }) => !!Menu.getApplicationMenu())).toBe(
    true,
  );
  expect(
    await electronApp.evaluate(({ BrowserWindow }) => {
      const prefs =
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return prefs.contextIsolation && prefs.sandbox && !prefs.nodeIntegration;
    }),
  ).toBe(true);

  await appWindow.evaluate(async () => {
    await globalThis.desktop.backend.openWorkspace();
    await globalThis.desktop.backend.createSession();
  });
  const composer = appWindow.locator("textarea").first();
  await composer.fill("Native edit command");
  await composer.focus();
  await appWindow.evaluate(() => globalThis.desktop.edit("selectAll"));
  await expect
    .poll(() =>
      composer.evaluate(
        (element) => element.selectionEnd - element.selectionStart,
      ),
    )
    .toBe("Native edit command".length);
  await composer.press("Backspace");
  await expect(composer).toHaveValue("");

  for (const [locale, expectedLabel] of [
    ["en", "File"],
    ["pt-BR", "Arquivo"],
  ] as const) {
    await appWindow.evaluate(
      (language) => globalThis.desktop.setLocale(language),
      locale,
    );
    await expect
      .poll(() =>
        electronApp.evaluate(
          ({ Menu }, label) =>
            Menu.getApplicationMenu()!.items.some(
              (item) => item.label === label,
            ),
          expectedLabel,
        ),
      )
      .toBe(true);
  }

  await electronApp.evaluate(({ Menu }) => {
    const flatten = (items: Electron.MenuItem[]): Electron.MenuItem[] =>
      items.flatMap((item) => [
        item,
        ...(item.submenu ? flatten(item.submenu.items) : []),
      ]);
    flatten(Menu.getApplicationMenu()!.items)
      .find((item) => item.label === "Preferências…")!
      .click();
  });
  await expect(
    appWindow.getByRole("dialog", { name: "Configurações" }),
  ).toBeVisible();
});

test("native clipboard roles copy and paste in an isolated display", async ({
  electronApp,
  appWindow,
}) => {
  test.skip(process.platform === "darwin", "macOS automation does not own the global clipboard focus");
  await appWindow.evaluate(async () => {
    await globalThis.desktop.backend.openWorkspace();
    await globalThis.desktop.backend.createSession();
  });
  const composer = appWindow.locator("textarea").first();
  await composer.fill("Native clipboard round trip");
  await composer.focus();
  const editMenu = async (role: string) => {
    await electronApp.evaluate(({ Menu, BrowserWindow }, action) => {
      const flatten = (items: Electron.MenuItem[]): Electron.MenuItem[] =>
        items.flatMap((item) => [
          item,
          ...(item.submenu ? flatten(item.submenu.items) : []),
        ]);
      const item = flatten(Menu.getApplicationMenu()!.items).find(
        (entry) => entry.role?.toLowerCase() === action.toLowerCase(),
      );
      if (!item) throw new Error(`Missing native role: ${action}`);
      const focused = BrowserWindow.getAllWindows()[0];
      focused.focus();
      focused.webContents.focus();
      item.click({}, focused, focused.webContents);
    }, role);
  };
  await editMenu("selectAll");
  await editMenu("copy");
  await expect
    .poll(() => electronApp.evaluate(({ clipboard }) => clipboard.readText()))
    .toBe("Native clipboard round trip");
  await composer.fill("");
  await composer.focus();
  await editMenu("paste");
  await expect(composer).toHaveValue("Native clipboard round trip");
});
