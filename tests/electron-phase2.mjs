import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect } from "@playwright/test";
const dir = await mkdtemp(join(tmpdir(), "computador-phase2-"));
const project = join(dir, "project");
await mkdir(project);
let desktop;
const launch = async () => {
  desktop = await electron.launch({
    args: ["."],
    env: {
      ...process.env,
      NODE_ENV: "test",
      COMPUTADOR_TEST_USER_DATA: join(dir, "data"),
      COMPUTADOR_TEST_WORKSPACE: project,
      COMPUTADOR_FAKE_LLM: "1",
    },
  });
  const page = await desktop.firstWindow();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => console.error("Renderer:", error));
  await page.locator("#root > *").waitFor();
  return page;
};
try {
  let page = await launch();
  await page.getByRole("button", { name: "Abrir pasta", exact: true }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  await page.getByRole("tab", { name: "Provedores", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Provedor", exact: true })
    .selectOption("test");
  await page
    .getByRole("button", {
      name: "Conectar com chave / configuração",
      exact: true,
    })
    .click();
  await page.getByLabel("Test credential").fill("secret-test-key");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText("Configurado", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Modelo", exact: true }).click();
  await page
    .getByRole("button", { name: "Modelo padrão", exact: true })
    .click();
  await expect(page.getByRole("menuitem")).toHaveCount(1);
  await page
    .getByRole("menuitem", { name: "Test provider", exact: true })
    .click();
  await page.getByRole("menuitemradio", { name: "Fast", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Modelo padrão", exact: true }),
  ).toHaveText("Test provider · Fast");
  await page
    .getByRole("switch", { name: "Mostrar Fast", exact: true })
    .uncheck();
  await expect(
    page.getByRole("switch", { name: "Mostrar Fast", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Modelo padrão", exact: true }),
  ).toHaveText("Test provider · Fast");
  await page.getByRole("button", { name: "Concluído", exact: true }).click();
  await page
    .getByRole("button", { name: "Nova conversa", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Modelo", exact: true }),
  ).toHaveText("Test provider · Fast");
  await page.getByRole("button", { name: "Modelo", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Test provider", exact: true })
    .click();
  await expect(
    page.getByRole("menuitemradio", { name: "Fast", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("menuitemradio", { name: "Reasoning", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.locator(".composer textarea").fill("tools");
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Status da execução" }),
  ).toHaveText("Concluído");
  assert.equal(
    await readFile(join(project, "agent-test.txt"), "utf8"),
    "hello",
  );
  await expect(page.locator(".tool-card")).toHaveCount(3);
  const originalId = await page.evaluate(
    async () => (await window.desktop.backend.snapshot()).activeSessionId,
  );
  await page.locator(".composer textarea").fill("slow");
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await page.evaluate(() => window.desktop.backend.createSession());
  const newId = await page.evaluate(
    async () => (await window.desktop.backend.snapshot()).activeSessionId,
  );
  assert.notEqual(newId, originalId);
  await page.evaluate(
    (id) => window.desktop.backend.selectSession(id),
    originalId,
  );
  await expect(
    page.getByRole("status", { name: "Status da execução" }),
  ).toHaveText("Trabalhando");
  await page.reload();
  await expect(
    page.getByRole("status", { name: "Status da execução" }),
  ).toHaveText("Trabalhando");
  await page
    .getByRole("button", { name: "Interromper resposta", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Status da execução" }),
  ).toHaveText("Cancelado");
  await page
    .getByRole("button", { name: "Renomear: tools", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Título da sessão", exact: true })
    .fill("Persistent project chat");
  await page
    .getByRole("textbox", { name: "Título da sessão", exact: true })
    .press("Enter");
  await expect(page.locator(".chat-top")).toContainText(
    "Persistent project chat",
  );
  await desktop.close();
  desktop = undefined;
  page = await launch();
  await expect(page.locator(".chat-top")).toContainText(
    "Persistent project chat",
  );
  await expect(page.locator(".tool-card")).toHaveCount(3);
  const snapshot = await page.evaluate(() => window.desktop.backend.snapshot());
  assert.equal(snapshot.workspace.path, project);
  assert.equal(snapshot.defaultModel.modelId, "fast");
  assert.ok(snapshot.hiddenModels.includes(JSON.stringify(["test", "fast"])));
  assert.ok(!JSON.stringify(snapshot).includes("secret-test-key"));
  // Exercise subscription's device-code/manual-code bridge through the same UI.
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  await page.getByRole("tab", { name: "Provedores", exact: true }).click();
  await page.getByRole("button", { name: "Reconectar", exact: true }).click();
  await page.getByRole("button", { name: "Subscription", exact: true }).click();
  await expect(page.getByText("TEST-CODE", { exact: true })).toBeVisible();
  await page.getByLabel("Test credential").fill("oauth-code");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText("Configurado", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/phase2-providers.png" });
  await page.getByRole("tab", { name: "Modelo", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Mostrar Fast", exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("searchbox", { name: "Buscar modelos", exact: true })
    .fill("fast");
  await expect(page.getByRole("switch")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Ocultar todos", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Buscar modelos", exact: true })
    .fill("");
  await expect(
    page.getByRole("switch", { name: "Mostrar Reasoning", exact: true }),
  ).not.toBeChecked();
  // All models hidden must not shrink or move the popover under the pointer.
  await page
    .getByRole("button", { name: "Modelo padrão", exact: true })
    .click();
  const emptyBefore = await page.locator(".model-picker").boundingBox();
  await page
    .getByRole("menuitem", { name: "Test provider", exact: true })
    .click();
  await expect(
    page.getByText("Todos os modelos estão ocultos", { exact: true }),
  ).toBeVisible();
  const emptyAfter = await page.locator(".model-picker").boundingBox();
  assert.deepEqual(emptyAfter, emptyBefore);
  assert.equal(emptyAfter.width, 500);
  assert.equal(emptyAfter.height, 360);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Mostrar todos", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Mostrar Fast", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Mostrar Reasoning", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("searchbox", { name: "Buscar modelos", exact: true })
    .fill("nonexistent");
  await expect(
    page.getByText("Nenhum modelo encontrado. Tente outro nome."),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Buscar modelos", exact: true })
    .fill("");
  await page.screenshot({ path: "test-results/phase2-models.png" });
  await page
    .getByRole("button", { name: "Modelo padrão", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Test provider", exact: true })
    .click();
  await page.screenshot({ path: "test-results/model-menu-dark.png" });
  const dark = await page
    .locator(".model-picker")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Aparência", exact: true }).click();
  await page.getByRole("radio", { name: "Claro", exact: true }).check();
  await page.getByRole("tab", { name: "Modelo", exact: true }).click();
  await page
    .getByRole("button", { name: "Modelo padrão", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Test provider", exact: true })
    .click();
  const light = await page
    .locator(".model-picker")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.notEqual(light, dark);
  await page.screenshot({ path: "test-results/model-menu-light.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Concluído", exact: true }).click();
  await page.screenshot({ path: "test-results/phase2-chat.png" });
  console.log(
    "Phase 2 Electron E2E passed: API key and subscription flows, model exclusion, tools, streaming, cancel, reload, rename and restart persistence.",
  );
} finally {
  if (desktop) await desktop.close();
  await rm(dir, { recursive: true, force: true });
}
