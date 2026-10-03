import { test, expect } from "@playwright/test";
test("agent editor supplies root agents and models without persisting domain data", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Exibir", exact: true }).click();
  await page.getByRole("menuitem", { name: "Agentes", exact: true }).click();
  const panel = page.locator(".panel-agents");
  await panel
    .getByRole("button", { name: "Criar agente", exact: true })
    .click();
  await panel.getByLabel("Nome", { exact: true }).fill("Test specialist");
  await panel
    .getByLabel("Descrição", { exact: true })
    .fill("Review mock test cases");
  await panel
    .getByLabel("Instruções", { exact: true })
    .fill("Review edge cases.");
  await panel.getByLabel("Modelo", { exact: true }).selectOption("Mock · Fast");
  await panel
    .getByRole("button", { name: "Salvar agente", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Editar agente: Test specialist" }),
  ).toBeVisible();
  const chat = page.locator(".panel-chat");
  await chat
    .getByLabel("Agente", { exact: true })
    .selectOption({ label: "Test specialist" });
  await expect(chat.getByLabel("Modelo", { exact: true })).toHaveValue(
    "Mock · Fast",
  );
  await page.reload();
  await expect(
    page
      .locator(".panel-chat")
      .getByLabel("Agente", { exact: true })
      .locator("option"),
  ).not.toContainText(["Test specialist"]);
  await expect(
    page
      .locator(".panel-agents")
      .getByRole("button", { name: "Editar agente: Test specialist" }),
  ).toHaveCount(0);
});
test("font size changes reading text and terminal stays a mock", async ({
  page,
}) => {
  await page.goto("/");
  const message = page.locator(".message-content").first();
  const before = await message.evaluate(
    (node) => getComputedStyle(node).fontSize,
  );
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  await page.getByRole("tab", { name: "Aparência", exact: true }).click();
  const slider = page.getByLabel("Tamanho do texto");
  await slider.fill("18");
  await page.getByRole("button", { name: "Concluído", exact: true }).click();
  await expect
    .poll(() => message.evaluate((node) => getComputedStyle(node).fontSize))
    .not.toBe(before);
  await page
    .getByRole("button", { name: "Abrir Terminal", exact: true })
    .click();
  await expect(page.locator(".panel-terminal")).toContainText(
    "execução de processos indisponível",
  );
});
