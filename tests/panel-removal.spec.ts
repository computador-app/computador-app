import { test, expect } from "@playwright/test";

test("retired panels disappear from menus and old layouts preserve remaining panels", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Layouts", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Salvar layout", exact: true })
    .click();
  await page.evaluate(() => {
    const snapshot = JSON.parse(
      localStorage.getItem("computador.layout.saved.v1")!,
    );
    const source = Object.values(snapshot.dock.panels)[0] as object;
    const findLeaf = (node: any): any =>
      node.type === "leaf" ? node : node.data.map(findLeaf).find(Boolean);
    const leaf = findLeaf(snapshot.dock.grid.root);
    for (const type of ["agents", "activity"]) {
      const id = `panel-${type}`;
      snapshot.dock.panels[id] = {
        ...source,
        id,
        title: type,
        params: { type },
      };
      leaf.data.views.push(id);
      leaf.data.activeView = id;
    }
    localStorage.setItem("computador.layout.v1", JSON.stringify(snapshot));
    localStorage.setItem(
      "computador.layout.saved.v1",
      JSON.stringify(snapshot),
    );
  });
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Chat", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Arquivos", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Markdown", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".panel-agents,.panel-activity")).toHaveCount(0);
  await expect(
    page.getByText("Layout inválido. O layout padrão foi restaurado.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Layouts", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Restaurar layout salvo", exact: true })
    .click();
  await expect(page.locator(".panel-agents,.panel-activity")).toHaveCount(0);
  await page.getByRole("button", { name: "Exibir", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: /^(Agentes|Atividade)$/ }),
  ).toHaveCount(0);
});

test("directories show folder icons and still expand and collapse", async ({
  page,
}) => {
  await page.goto("/");
  const directory = page
    .locator(".panel-files")
    .getByRole("button", { name: "app", exact: true });
  await expect(directory.locator("svg.lucide-folder-open")).toHaveCount(1);
  await directory.click();
  await expect(directory).toHaveAttribute("aria-expanded", "false");
  await expect(directory.locator("svg.lucide-folder")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "PricingController.php", exact: true }),
  ).toHaveCount(0);
  await directory.click();
  await expect(directory).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: "PricingController.php", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".workspace-folder svg.lucide-folder-open"),
  ).toHaveCount(1);
});
