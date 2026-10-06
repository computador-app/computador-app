import { test, expect } from "./fixture";

test("provider login configures the default model and image capability", async ({
  appWindow: page,
}) => {
  await page.getByRole("button", { name: "Abrir pasta", exact: true }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  await page.getByRole("tab", { name: "Provedores", exact: true }).click();
  await page.getByRole("combobox", { name: "Provedor", exact: true }).selectOption("test");
  await page.getByRole("button", { name: "Conectar com chave / configuração", exact: true }).click();
  await page.getByLabel("Test credential").fill("secret-test-key");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText("Configurado", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Modelo", exact: true }).click();
  await page.getByRole("button", { name: "Modelo padrão", exact: true }).click();
  await page.getByRole("menuitem", { name: "Test provider", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Fast", exact: true }).click();
  await expect(page.getByRole("button", { name: "Modelo padrão", exact: true })).toHaveText("Test provider · Fast");
  await page.getByRole("button", { name: "Concluído", exact: true }).click();
  await page.getByRole("button", { name: "Nova conversa", exact: true }).click();
  await expect(page.getByRole("button", { name: "Modelo", exact: true })).toHaveText("Test provider · Fast");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Adicionar imagem", exact: true })).toBeVisible();
});

test("model visibility filters, hides and restores the catalog", async ({
  appWindow: page,
}) => {
  await page.getByRole("button", { name: "Abrir pasta", exact: true }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  await page.getByRole("tab", { name: "Provedores", exact: true }).click();
  await page.getByRole("combobox", { name: "Provedor", exact: true }).selectOption("test");
  await page.getByRole("button", { name: "Conectar com chave / configuração", exact: true }).click();
  await page.getByLabel("Test credential").fill("secret");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("tab", { name: "Modelo", exact: true }).click();
  await page.getByRole("searchbox", { name: "Buscar modelos", exact: true }).fill("fast");
  await expect(page.getByRole("switch")).toHaveCount(1);
  await page.getByRole("button", { name: "Ocultar todos", exact: true }).click();
  await page.getByRole("searchbox", { name: "Buscar modelos", exact: true }).fill("");
  await expect(page.getByRole("switch", { name: "Mostrar Fast", exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Mostrar todos", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Mostrar Fast", exact: true })).toBeChecked();
  await page.getByRole("searchbox", { name: "Buscar modelos", exact: true }).fill("nonexistent");
  await expect(page.getByText("Nenhum modelo encontrado. Tente outro nome.")).toBeVisible();
});
