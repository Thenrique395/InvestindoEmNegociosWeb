import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

const mes = (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`; })();

test('probe delete', async ({ page }) => {
  const plans: any[] = [{ id: 'plan-1', userId: 'u1', type: 'Expense', title: 'Farmácia', amount: 300, schedule: 'OneTime', categoryId: 'cat-default-expense-1', cardId: null, installmentsCount: 1, startDate: `${mes}-05`, status: 'Active' }];
  const insts: any[] = [{ id: 'inst-1', planId: 'plan-1', installmentNo: 1, dueDate: `${mes}-05`, amount: 300, status: 'Open' }];

  await setupAuthenticatedApp(page, { role: 'Advanced' });
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR: ' + m.text().slice(0, 200)); });
  page.on('request', (r) => { if (r.url().includes('/api/v1/plans') || r.url().includes('/api/v1/installments')) console.log('REQ ' + r.method() + ' ' + r.url()); });
  page.on('response', (r) => { if (r.request().method() !== 'GET' && r.url().includes('/api/')) console.log('RES ' + r.status() + ' ' + r.url()); });

  await page.route('**/api/v1/plans**', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') { await route.fulfill({ json: plans }); return; }
    await route.fulfill({ status: 204, body: '' });
  });
  await page.route('**/api/v1/installments**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'GET' && url.pathname.endsWith('/installments')) { await route.fulfill({ json: insts }); return; }
    if (req.method() === 'DELETE') {
      const id = url.pathname.split('/').pop();
      const i = insts.findIndex((x) => x.id === id);
      if (i >= 0) insts.splice(i, 1);
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.locator('tbody tr').first().getByRole('button', { name: /excluir|remover/i }).first().click();
  console.log('--- clique em excluir ---');
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.waitForTimeout(1200);
  console.log('RESTANTES ' + insts.length);
  console.log('LINHAS ' + await page.locator('tbody tr').count());
  console.log('ALERTA ' + (await page.locator('.global-alert').allTextContents()).join(' | '));
});
