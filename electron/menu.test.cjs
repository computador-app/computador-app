const test = require("node:test");
const assert = require("node:assert/strict");
const { createMenuTemplate } = require("./menu.cjs");

function flatten(items) {
  return items.flatMap((item) => [
    item,
    ...(item.submenu ? flatten(item.submenu) : []),
  ]);
}

test("native menu dispatches every supported mock workspace and layout command", () => {
  const received = [];
  const items = flatten(
    createMenuTemplate("en", (command) => received.push(command), "linux"),
  );
  items.filter((item) => item.click).forEach((item) => item.click());
  assert.deepEqual(received, [
    "session.new",
    "workspace.open",
    "workspace.recent.demo",
    "workspace.recent.research",
    "preferences.open",
    "panel.chat",
    "panel.sessions",
    "panel.files",
    "panel.viewer",
    "panel.markdown",
    "panel.agents",
    "panel.activity",
    "panel.terminal",
    "layout.default",
    "layout.focus",
    "layout.review",
    "layout.save",
    "layout.restore",
    "extensions.open",
  ]);
});

test("native menu uses real clipboard/edit roles and localized labels", () => {
  const english = flatten(createMenuTemplate("en", () => {}, "linux"));
  const portuguese = flatten(createMenuTemplate("pt", () => {}, "linux"));
  for (const role of ["copy", "paste", "cut", "undo", "redo", "selectAll"]) {
    assert.ok(english.some((item) => item.role === role));
  }
  assert.equal(english.find((item) => item.role === "copy").label, "Copy");
  assert.equal(portuguese.find((item) => item.role === "copy").label, "Copiar");
  assert.equal(
    createMenuTemplate("pt-BR", () => {}, "linux")[0].label,
    "Arquivo",
  );
  assert.equal(
    createMenuTemplate("future-locale", () => {}, "linux")[0].label,
    "File",
  );
});

test("macOS places preferences in the application menu exactly once", () => {
  const menu = createMenuTemplate("pt", () => {}, "darwin");
  assert.equal(menu[0].label, "Computador");
  assert.ok(menu[0].submenu.some((item) => item.accelerator === "CmdOrCtrl+,"));
  assert.equal(
    flatten(menu).filter((item) => item.accelerator === "CmdOrCtrl+,").length,
    1,
  );
});

test("macOS includes standard system application and window actions", () => {
  const menu = createMenuTemplate("en", () => {}, "darwin");
  for (const role of [
    "about",
    "services",
    "hide",
    "hideOthers",
    "unhide",
    "quit",
  ]) {
    assert.ok(menu[0].submenu.some((item) => item.role === role));
  }
  assert.ok(flatten(menu).some((item) => item.role === "front"));
  assert.equal(
    flatten(createMenuTemplate("en", () => {}, "linux")).some(
      (item) => item.role === "services",
    ),
    false,
  );
});

test("dynamic panels replace the fallback menu and escape native mnemonics", () => {
  const received = [];
  const entries = [{ id: "example.notes", title: "Notes & tasks", multiple: true }];
  const items = flatten(createMenuTemplate("en", (id) => received.push(id), "linux", entries));
  const panel = items.find((item) => item.label === "Notes && tasks");
  panel.click();
  panel.click();
  assert.deepEqual(received, ["panel.example.notes", "panel.example.notes"]);
  assert.equal(items.some((item) => item.label === "Chat"), false);
  const empty = createMenuTemplate("en", () => {}, "linux", []);
  assert.deepEqual(empty.find((item) => item.label === "View").submenu[0].submenu, []);
});
