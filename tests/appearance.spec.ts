import { test, expect } from "@playwright/test";
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
