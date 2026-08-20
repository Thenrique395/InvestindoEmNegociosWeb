import { test } from '@playwright/test';

const EMAIL = 'e2e.basic@teste.com';
const SENHA = 'Teste@2026';

test('explora despesas com conta Basic', async ({ page }) => {
  test.setTimeout(120000);
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ' + m.text().slice(0, 160)); });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: /e-mail|email/i }).fill(EMAIL);
  await page.getByRole('textbox', { name: /senha/i }).fill(SENHA);
  await page.getByRole('button', { name: /entrar/i }).first().click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30000 });
  console.log('URL apos login: ' + page.url());

  await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  console.log('URL despesas: ' + page.url());

  const info = await page.evaluate(() => ({
    titulo: document.querySelector('.app-period-hero__title')?.textContent?.trim(),
    linhas: document.querySelectorAll('tbody tr').length,
    botoes: [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 25),
    temImportarFatura: !!document.body.textContent?.includes('Importar fatura'),
    perfil: document.querySelector('.sidebar__profile-plan')?.textContent?.trim(),
    alerta: document.querySelector('.global-alert')?.textContent?.trim()
  }));
  console.log('INFO ' + JSON.stringify(info, null, 1));
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-henriquesantos-Desktop-Codes-InvestindoEmNegocios/e4a7ece5-3ebc-46dc-b1a7-3ea255e82b4f/scratchpad/basic-despesas.png', fullPage: true });
});
