import { test, expect, type Page } from '@playwright/test';

async function chooseMenu(page: Page, menu: string, item: string) {
  await page.getByRole('button', { name: menu, exact: true }).click();
  await page.getByRole('menuitem', { name: item }).click();
}

test('workspace starts in Portuguese with mock chat and opens sample folders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Arquivo', exact: true })).toBeVisible();
  await expect(page.getByText('Pricing Engine', { exact: true }).first()).toBeVisible();
  await chooseMenu(page, 'Arquivo', 'Abrir pasta…');
  const picker = page.getByRole('dialog');
  await expect(picker).toContainText('Nenhum arquivo do computador será acessado');
  await picker.getByRole('button', { name: /research/i }).click();
  await picker.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expect(page.getByText('research-lab', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('core-api', { exact: true }).first()).toBeVisible();
});

test('layout presets and panel placement can be saved, restored and reopened', async ({ page }) => {
  await page.goto('/');
  await chooseMenu(page, 'Layouts', 'Foco');
  await expect(page.getByRole('tab', { name: 'Chat', exact: true })).toBeVisible();
  await chooseMenu(page, 'Exibir', 'Arquivos');
  await expect(page.getByRole('tab', { name: 'Arquivos', exact: true })).toBeVisible();
  for (const direction of ['left', 'right', 'above', 'below']) {
    await page.locator('.panel-files').getByLabel('Mover painel').selectOption(direction);
    await expect.poll(async () => {
      const files = await page.locator('.panel-files').boundingBox();
      const chat = await page.locator('.panel-chat').boundingBox();
      if (!files || !chat) return false;
      if (direction === 'left') return files.x + files.width <= chat.x;
      if (direction === 'right') return files.x >= chat.x + chat.width;
      if (direction === 'above') return files.y + files.height <= chat.y;
      return files.y >= chat.y + chat.height;
    }).toBe(true);
  }
  const filesAreBelowChat = async () => {
    const files = await page.locator('.panel-files').boundingBox();
    const chat = await page.locator('.panel-chat').boundingBox();
    return !!files && !!chat && files.y >= chat.y + chat.height;
  };
  await expect.poll(filesAreBelowChat).toBe(true);
  await chooseMenu(page, 'Layouts', 'Salvar layout');
  await chooseMenu(page, 'Layouts', 'Foco');
  await expect(page.getByRole('tab', { name: 'Arquivos', exact: true })).toHaveCount(0);
  await chooseMenu(page, 'Layouts', 'Restaurar layout salvo');
  await expect(page.getByRole('tab', { name: 'Arquivos', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Arquivos', exact: true })).toBeVisible();
  await expect.poll(filesAreBelowChat).toBe(true);
  await page.getByRole('button', { name: 'Close Arquivos', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Arquivos', exact: true })).toHaveCount(0);
  await chooseMenu(page, 'Exibir', 'Arquivos');
  await expect(page.getByRole('tab', { name: 'Arquivos', exact: true })).toBeVisible();
  await chooseMenu(page, 'Layouts', 'Revisão');
  await expect(page.getByRole('tab', { name: 'Markdown', exact: true })).toBeVisible();
});

test('language and appearance persist across reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Preferências', exact: true }).click();
  let settings = page.getByRole('dialog', { name: 'Configurações' });
  await settings.getByLabel('Idioma da interface').selectOption('en');
  settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByRole('tab', { name: 'Appearance' }).click();
  await settings.getByRole('radio', { name: 'Light', exact: true }).click();
  await settings.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.getByRole('button', { name: 'File', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  await expect(page.getByLabel('Interface language')).toHaveValue('en');
});

test('chat streams mock responses, preserves sessions in memory and resets on reload', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Pergunte algo sobre seu projeto…').fill('Teste de conversa temporária');
  await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Interromper resposta' })).toBeVisible();
  await expect(page.getByLabel('Status da execução')).toHaveText('Concluído');
  await expect(page.getByText(/Esta é uma resposta simulada/)).toBeVisible();
  await page.getByRole('button', { name: /API review.*Reviewer/ }).click();
  await expect(page.getByRole('heading', { name: 'Por onde vamos começar?' })).toBeVisible();
  await page.getByRole('button', { name: /Pricing Engine.*Architect/ }).click();
  await expect(page.getByText('Teste de conversa temporária', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Teste de conversa temporária', { exact: true })).toHaveCount(0);
});

test('file tree opens read-only source and rendered Markdown', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /PricingController.php/ }).click();
  await expect(page.locator('.panel-viewer')).toContainText('class PricingController extends Controller');
  await expect(page.locator('.panel-viewer')).toContainText('Somente leitura · arquivo mock');
  await page.getByRole('button', { name: /README.md/ }).click();
  await expect(page.getByRole('heading', { name: 'Core API', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Architecture', exact: true })).toBeVisible();
});

test('mock permission, cancellation and failure states are interactive', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Cenário mock').selectOption('permission');
  await page.getByLabel('Pergunte algo sobre seu projeto…').fill('Leia os arquivos');
  await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
  await expect(page.locator('.panel-chat').getByRole('alert')).toContainText('O acesso é apenas simulado');
  await page.getByRole('button', { name: 'Negar', exact: true }).click();
  await expect(page.getByLabel('Status da execução')).toHaveText('Cancelado');
  await page.getByLabel('Cenário mock').selectOption('failure');
  await page.getByLabel('Pergunte algo sobre seu projeto…').fill('Simule uma falha');
  await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
  await expect(page.locator('.panel-chat').getByRole('alert')).toContainText('O provedor simulado falhou');
  await page.getByLabel('Cenário mock').selectOption('success');
  await page.getByLabel('Pergunte algo sobre seu projeto…').fill('Tente novamente');
  await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
  await expect(page.getByLabel('Status da execução')).toHaveText('Concluído');
});

test('panels resize with the divider and can share a tab group', async ({ page }) => {
  await page.goto('/');
  await chooseMenu(page, 'Layouts', 'Foco');
  await chooseMenu(page, 'Exibir', 'Arquivos');
  const files = page.locator('.panel-files');
  const before = await files.boundingBox();
  const sash = await page.locator('.dv-sash:visible').first().boundingBox();
  expect(before).not.toBeNull();
  expect(sash).not.toBeNull();
  await page.mouse.move(sash!.x + sash!.width / 2, sash!.y + sash!.height / 2);
  await page.mouse.down();
  await page.mouse.move(sash!.x + sash!.width / 2 + 80, sash!.y + sash!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await files.boundingBox())!.width).toBeGreaterThan(before!.width + 50);
  await files.getByLabel('Mover painel').selectOption('center');
  await expect(page.getByRole('tablist')).toHaveCount(1);
  await expect(page.getByRole('tab', { name: 'Chat', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Arquivos', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await expect(page.getByLabel('Pergunte algo sobre seu projeto…')).toBeVisible();
});

test('corrupted layouts recover and an empty workspace can restore its panels', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('computador.layout.v1', '{invalid'));
  await page.goto('/');
  await expect(page.getByText('Layout inválido. O layout padrão foi restaurado.', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Chat', exact: true })).toBeVisible();
  while (await page.getByRole('tab').count()) {
    await page.getByRole('tab').first().getByRole('button').click();
  }
  await expect(page.getByRole('heading', { name: 'Seu espaço, do seu jeito' })).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar layout padrão', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Chat', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Arquivos', exact: true })).toBeVisible();
});

test('panels can still move when chat is closed and grouping reopens chat', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Close Chat',exact:true}).click();
  await page.locator('.panel-files').getByLabel('Mover painel').selectOption('right');
  await expect(page.locator('.panel-files')).toBeVisible();
  await page.locator('.panel-files').getByLabel('Mover painel').selectOption('center');
  await expect(page.getByRole('tab',{name:'Chat',exact:true})).toBeVisible();
  const group = page.locator('.dv-groupview').filter({has:page.getByRole('tab',{name:'Arquivos',exact:true})});
  await expect(group.getByRole('tab',{name:'Chat',exact:true})).toBeVisible();
});
