import { test, expect } from "@playwright/test";
test("model selector groups providers and scrolls a large catalog without flattening it", async ({
  page,
}) => {
  await page.goto("/");
  const selector = page
    .locator(".panel-chat")
    .getByRole("button", { name: "Modelo", exact: true });
  await selector.click();
  await expect(
    page
      .getByRole("menu", { name: "Provedores", exact: true })
      .getByRole("menuitem"),
  ).toHaveCount(3);
  await expect(
    page.getByRole("menuitemradio", { name: "Demo 24" }),
  ).toHaveCount(0);
  await page
    .getByRole("menuitem", { name: "OpenRouter (mock)", exact: true })
    .click();
  const last = page.getByRole("menuitemradio", {
    name: "Demo 24",
    exact: true,
  });
  await last.scrollIntoViewIfNeeded();
  await last.click();
  await expect(selector).toHaveText("OpenRouter · Demo 24");
  await expect(selector).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await selector.click();
  await page
    .getByRole("menuitem", { name: "Local (mock)", exact: true })
    .click();
  await expect(page.getByRole("menuitemradio")).toHaveCount(1);
  await page.getByRole("menuitemradio", { name: "Local", exact: true }).click();
  await expect(selector).toHaveText("Mock · Local");
});
test("model submenus support keyboard navigation and English labels", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  await page.getByLabel("Idioma da interface").selectOption("en");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const selector = page
    .locator(".panel-chat")
    .getByRole("button", { name: "Model", exact: true });
  await selector.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "Mock", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitemradio", { name: "Reasoning", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(selector).toHaveText("Mock · Fast");
  await selector.click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("menuitem", { name: "Mock", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(selector).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.getByRole("button", { name: "Open Agents", exact: true }).click();
  await page.getByRole("button", { name: "Create agent", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "User", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("option", { name: "Global", exact: true }),
  ).toHaveCount(0);
});
