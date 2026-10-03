import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect } from "@playwright/test";

// Run after npm run build. Linux needs a graphical session or xvfb-run.
const userData = await mkdtemp(join(tmpdir(), "computador-smoke-"));
const desktop = await electron.launch({
  args: ["."],
  timeout: 30_000,
  env: {
    ...process.env,
    NODE_ENV: "test",
    COMPUTADOR_TEST_USER_DATA: userData,
    COMPUTADOR_TEST_WORKSPACE: userData,
    COMPUTADOR_FAKE_LLM: "1",
  },
});
let previousClipboard;
try {
  const window = await desktop.firstWindow();
  await window.waitForLoadState("domcontentloaded");
  await window.locator("#root > *").first().waitFor();
  assert.deepEqual(
    await window.evaluate(() => Object.keys(globalThis.desktop).sort()),
    ["backend", "edit", "onCommand", "setLocale"],
  );
  assert.equal(
    await window.evaluate(() => typeof globalThis.require),
    "undefined",
  );
  await expect(window.locator(".menubar")).toHaveCount(0);
  assert.ok(await desktop.evaluate(({ Menu }) => Menu.getApplicationMenu()));
  if (process.platform !== "darwin") {
    assert.equal(
      await desktop.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].isMenuBarVisible(),
      ),
      true,
      "Native menu must be visible inside the desktop window",
    );
  }
  await window.evaluate(async () => { await globalThis.desktop.backend.openWorkspace(); await globalThis.desktop.backend.createSession(); });
  const composer = window.locator("textarea").first();
  await composer.fill("Native edit command");
  await composer.focus();
  await window.evaluate(() => globalThis.desktop.edit("selectAll"));
  await expect
    .poll(() =>
      composer.evaluate(
        (element) => element.selectionEnd - element.selectionStart,
      ),
    )
    .toBe("Native edit command".length);
  await composer.press("Backspace");
  await expect(composer).toHaveValue("");
  previousClipboard = await desktop.evaluate(
    async ({ clipboard, ClipboardItem }) => {
      const current = await clipboard.read();
      globalThis.__computadorSmokeClipboard = await Promise.all(
        current
          .filter((item) => item.types.length > 0)
          .map(async (item) => {
            const entries = await Promise.all(
              item.types.map(async (type) => [type, await item.getType(type)]),
            );
            return new ClipboardItem(Object.fromEntries(entries));
          }),
      );
      return true;
    },
  );
  await composer.fill("Native clipboard round trip");
  await composer.focus();
  const editMenu = async (role) => {
    await desktop.evaluate(({ Menu, BrowserWindow }, action) => {
      const flatten = (items) =>
        items.flatMap((item) => [
          item,
          ...(item.submenu ? flatten(item.submenu.items) : []),
        ]);
      const item = flatten(Menu.getApplicationMenu().items).find(
        (item) => item.role?.toLowerCase() === action.toLowerCase(),
      );
      if (!item) throw new Error(`Missing native edit role: ${action}`);
      const focused = BrowserWindow.getAllWindows()[0];
      item.click({}, focused, focused.webContents);
    }, role);
  };
  await editMenu("selectAll");
  await editMenu("copy");
  await expect
    .poll(() => desktop.evaluate(({ clipboard }) => clipboard.readText()))
    .toBe("Native clipboard round trip");
  await composer.fill("");
  await composer.focus();
  await editMenu("paste");
  await expect(composer).toHaveValue("Native clipboard round trip");
  for (const [locale, expectedLabel] of [
    ["en", "File"],
    ["pt-BR", "Arquivo"],
  ]) {
    await window.evaluate(
      (language) => globalThis.desktop.setLocale(language),
      locale,
    );
    await expect
      .poll(() =>
        desktop.evaluate(
          ({ Menu }, label) =>
            Menu.getApplicationMenu().items.some(
              (item) => item.label === label,
            ),
          expectedLabel,
        ),
      )
      .toBe(true);
  }
  if (process.platform !== "darwin") {
    assert.equal(
      await desktop.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].isMenuBarVisible(),
      ),
      true,
      "Changing language must preserve native menu visibility",
    );
  }
  await desktop.evaluate(({ Menu }) => {
    const flatten = (items) =>
      items.flatMap((item) => [
        item,
        ...(item.submenu ? flatten(item.submenu.items) : []),
      ]);
    flatten(Menu.getApplicationMenu().items)
      .find((item) => item.label === "Preferências…")
      .click();
  });
  await window.getByRole("dialog").waitFor();
  assert.equal(
    await desktop.evaluate(({ BrowserWindow }) => {
      const prefs =
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return prefs.contextIsolation && prefs.sandbox && !prefs.nodeIntegration;
    }),
    true,
  );
  console.log(
    "Electron smoke passed: built renderer, isolated preload, localized native menus, clipboard editing and preferences command.",
  );
} finally {
  try {
    if (previousClipboard)
      await desktop.evaluate(async ({ clipboard }) => {
        const previous = globalThis.__computadorSmokeClipboard;
        if (previous?.length) await clipboard.write(previous);
        else clipboard.clear();
        delete globalThis.__computadorSmokeClipboard;
      });
  } finally {
    await desktop.close();
    await rm(userData, { recursive: true, force: true });
  }
}
