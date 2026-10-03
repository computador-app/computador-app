import { expect, test, type Page } from '@playwright/test';

async function chooseView(page: Page, item: string) {
  await page.getByRole('button', { name: 'Exibir', exact: true }).click();
  await page.getByRole('menuitem', { name: item, exact: true }).click();
}

const counter = (page: Page) => page.frameLocator('iframe[title="Contador"]:visible').first();

test('custom panel instances keep independent visual state across layout restoration', async ({ page }) => {
  await page.goto('/');
  await chooseView(page, 'Contador');
  await expect(counter(page).getByTestId('count')).toHaveText('0');
  await counter(page).getByRole('button', { name: 'Incrementar', exact: true }).click();
  await counter(page).getByRole('button', { name: 'Incrementar', exact: true }).click();
  await expect(counter(page).getByTestId('count')).toHaveText('2');
  const firstId = await page.locator('section[data-panel-instance]').filter({ has: page.locator('iframe[title="Contador"]') }).getAttribute('data-panel-instance');
  const firstCounter = page.locator(`[data-panel-instance="${firstId}"]`).frameLocator('iframe');
  await chooseView(page, 'Contador');
  await expect(page.getByRole('tab', { name: 'Contador', exact: true })).toHaveCount(2);
  await expect(counter(page).getByTestId('count')).toHaveText('0');
  await counter(page).getByRole('button', { name: 'Incrementar', exact: true }).click();
  await expect(counter(page).getByTestId('count')).toHaveText('1');
  const secondId = await page.locator(`section[data-panel-instance]:not([data-panel-instance="${firstId}"])`).filter({ has: page.locator('iframe[title="Contador"]') }).getAttribute('data-panel-instance');
  const secondCounter = page.locator(`[data-panel-instance="${secondId}"]`).frameLocator('iframe');
  await expect(firstCounter.getByTestId('count')).toHaveText('2');
  await expect(secondCounter.getByTestId('count')).toHaveText('1');
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Contador', exact: true })).toHaveCount(2);
  await expect(firstCounter.getByTestId('count')).toHaveText('2');
  await expect(secondCounter.getByTestId('count')).toHaveText('1');
});

test('disabling an extension retains its panel state and removes its menu contribution', async ({ page }) => {
  await page.goto('/');
  await chooseView(page, 'Contador');
  await counter(page).getByRole('button', { name: 'Incrementar', exact: true }).click();
  await expect(counter(page).getByTestId('count')).toHaveText('1');
  await chooseView(page, 'Extensões');
  const manager = page.getByRole('dialog', { name: 'Extensões', exact: true });
  await expect(manager).toContainText('Painel de exemplo');
  await manager.getByRole('button', { name: 'Desativar', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Painel indisponível', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Exibir', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Contador', exact: true })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Extensões', exact: true }).click();
  await manager.getByRole('button', { name: 'Ativar', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(counter(page).getByTestId('count')).toHaveText('1');
});

test('panel SDK receives locale, theme and workspace events and dispatches allowed commands', async ({ page }) => {
  await page.goto('/');
  await chooseView(page, 'Contador');
  const frame = counter(page);
  const sessions = await page.locator('.session-row').count();
  await frame.getByRole('button', { name: 'Nova sessão pelo SDK', exact: true }).click();
  await expect(page.locator('.session-row')).toHaveCount(sessions + 1);
  await page.getByRole('button', { name: 'Alternar tema', exact: true }).click();
  await expect(frame.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Arquivo', exact: true }).click();
  await page.getByRole('menuitem', { name: /research-lab/ }).click();
  await expect(frame.locator('#workspace')).toHaveText('Workspace: research-lab');
  await page.getByRole('button', { name: 'PT-BR', exact: true }).click();
  await page.getByLabel('Idioma da interface').selectOption('en');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const englishFrame = page.frameLocator('iframe[title="Counter"]').first();
  await expect(englishFrame.locator('html')).toHaveAttribute('lang', 'en');
  await expect(englishFrame.getByRole('button', { name: 'New session through SDK', exact: true })).toBeVisible();
  await expect(englishFrame.getByRole('alert')).toBeEmpty();
});
