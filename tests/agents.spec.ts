import { expect, test } from "@playwright/test";

test("agents settings provide a temporary browser preview", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Configurações" });
  await settings.getByRole("tab", { name: "Agentes", exact: true }).click();
  await expect(settings).toContainText("Alterações são temporárias");
  const before = await settings.locator(".agent-preview-list > div").count();
  await settings
    .getByRole("button", { name: "Novo agente temporário · Usuário" })
    .click();
  const agents = settings.locator(".agent-preview-list > div");
  await expect(agents).toHaveCount(before + 1);
  const created = agents.last();
  const name = created.getByRole("textbox").first();
  await expect(name).toHaveValue("Novo agente");
  await name.fill("Agente de revisão");
  await expect(name).toHaveValue("Agente de revisão");
  await created.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(agents).toHaveCount(before);
});

test("subagent is a dockable panel available from View", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Exibir", exact: true }).click();
  await page.getByRole("menuitem", { name: /Subagente/ }).click();
  await expect(page.getByRole("tab", { name: "Subagente", exact: true })).toBeVisible();
  await expect(page.locator(".panel-subagent")).toContainText(
    "Subagentes simulados aparecerão aqui.",
  );
});
