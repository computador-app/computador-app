import { readFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import { test, expect, launchDesktop } from "./fixture";

async function connect(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Abrir pasta", exact: true }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  await page.getByRole("tab", { name: "Provedores", exact: true }).click();
  await page.getByRole("combobox", { name: "Provedor", exact: true }).selectOption("test");
  await page.getByRole("button", { name: "Conectar com chave / configuração", exact: true }).click();
  await page.getByLabel("Test credential").fill("secret");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("tab", { name: "Modelo", exact: true }).click();
  await page.getByRole("button", { name: "Modelo padrão", exact: true }).click();
  await page.getByRole("menuitem", { name: "Test provider", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Fast", exact: true }).click();
  await page.getByRole("button", { name: "Concluído", exact: true }).click();
  await page.getByRole("button", { name: "Nova conversa", exact: true }).click();
}

test("tools, images and cancellation work through the real backend", async ({
  appWindow: page,
  projectDir,
}) => {
  await connect(page);
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: "Adicionar imagem", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });
  await page.locator(".composer textarea").fill("tools");
  await page.getByRole("button", { name: "Enviar mensagem", exact: true }).click();
  await expect(page.getByRole("status", { name: "Status da execução" })).toHaveText("Concluído");
  expect(await readFile(join(projectDir, "agent-test.txt"), "utf8")).toBe("hello");
  await expect(page.locator(".tool-card")).toHaveCount(3);
  await expect(page.locator(".message-images img")).toHaveCount(1);
  await page.locator(".composer textarea").fill("slow");
  await page.getByRole("button", { name: "Enviar mensagem", exact: true }).click();
  await expect(page.getByRole("status", { name: "Status da execução" })).toHaveText("Trabalhando");
  await page.getByRole("button", { name: "Interromper resposta", exact: true }).click();
  await expect(page.getByRole("status", { name: "Status da execução" })).toHaveText("Cancelado");
});

test("session title, messages and workspace survive an application restart", async ({
  rootDir,
  projectDir,
}) => {
  let desktop = await launchDesktop(rootDir, projectDir);
  await connect(desktop.window);
  await desktop.window.locator(".composer textarea").fill("tools");
  await desktop.window.getByRole("button", { name: "Enviar mensagem", exact: true }).click();
  await expect(desktop.window.getByRole("status", { name: "Status da execução" })).toHaveText("Concluído");
  await desktop.window.getByRole("button", { name: "Renomear: tools", exact: true }).click();
  await desktop.window.getByRole("textbox", { name: "Título da sessão", exact: true }).fill("Persistent project chat");
  await desktop.window.getByRole("textbox", { name: "Título da sessão", exact: true }).press("Enter");
  await desktop.app.close();

  desktop = await launchDesktop(rootDir, projectDir);
  try {
    await expect(desktop.window.locator(".chat-top")).toContainText("Persistent project chat");
    await expect(desktop.window.locator(".tool-card")).toHaveCount(3);
    const state = await desktop.window.evaluate(() => globalThis.desktop.backend.snapshot());
    expect(state.workspace?.path).toBe(await realpath(projectDir));
    expect(JSON.stringify(state)).not.toContain("secret");
  } finally {
    await desktop.app.close();
  }
});
