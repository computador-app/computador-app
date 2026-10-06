import { expect, test, type Page } from "@playwright/test";

async function openModelCatalog(page: Page) {
  const selector = page
    .locator(".panel-chat")
    .getByRole("button", { name: "Modelo", exact: true });
  await selector.click();
  await page
    .getByRole("menuitem", { name: "OpenRouter (mock)", exact: true })
    .click();
  await expect(page.locator(".model-picker.with-submenu")).toBeVisible();
}

test("model catalog matches the approved dark and light appearances", async ({
  page,
}) => {
  await page.goto("/");
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        caret-color: transparent !important;
        font-family: Arial, sans-serif !important;
        transition: none !important;
      }
    `,
  });

  await openModelCatalog(page);
  await expect(page.locator(".model-picker")).toHaveScreenshot(
    "model-catalog-dark.png",
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  await page.getByRole("tab", { name: "Aparência", exact: true }).click();
  await page.getByRole("radio", { name: "Claro", exact: true }).check();
  await page.getByRole("button", { name: "Concluído", exact: true }).click();

  await openModelCatalog(page);
  await expect(page.locator(".model-picker")).toHaveScreenshot(
    "model-catalog-light.png",
  );
});
