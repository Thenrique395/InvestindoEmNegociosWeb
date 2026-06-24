import { expect, test } from '@playwright/test';
import { AdminUsersPage } from './support/page-objects/admin-users.page';
import { ExpensesPage } from './support/page-objects/expenses.page';
import { InvestmentsPage } from './support/page-objects/investments.page';
import { InvoiceImportPage } from './support/page-objects/invoice-import.page';
import { getMissingLiveCredentialReason, loginWithSeededProfile } from './support/live-auth';
import { LIVE_API_BASE_URL, liveApi } from './support/live-api';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function buildLiveInvoicePdf(description: string) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'invoice-live-'));
  const txtPath = path.join(tempDir, 'invoice.txt');
  const pdfPath = path.join(tempDir, 'invoice.pdf');
  const rawText = `FATURA BRADESCOvencimento 10/03/2026fechamento 02/03/2026Total a pagar R$ 33,20Pagamento minimo R$ 10,0005/03 ${description} 33,20`;
  writeFileSync(txtPath, rawText);
  const pdfBuffer = execFileSync('/usr/sbin/cupsfilter', ['-m', 'application/pdf', txtPath], {
    stdio: ['ignore', 'pipe', 'ignore']
  });
  writeFileSync(pdfPath, pdfBuffer);
  return pdfPath;
}

test.describe('live role write flows', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('Intermediate cria categoria real e a usa no fluxo de importação de fatura', async ({ page }) => {
    test.setTimeout(120000);
    test.skip(!!getMissingLiveCredentialReason('intermediate'), getMissingLiveCredentialReason('intermediate')!);

    await loginWithSeededProfile(page, 'intermediate');
    const expensesPage = new ExpensesPage(page);
    const invoiceImportPage = new InvoiceImportPage(page);
    const suffix = `${Date.now()}`.slice(-6);
    const description = `FARMACIA LIVE ${suffix}`;
    const fixturePath = buildLiveInvoicePdf(description);

    const expenseCategories = await liveApi<Array<{ id: string; name: string }>>(page, '/categories?appliesTo=Expense');
    const category = expenseCategories.find((item) => item.name === 'Farmácias');
    expect(category).toBeTruthy();

    await expensesPage.goto();
    await expensesPage.openInvoiceImport();
    await invoiceImportPage.expectOpen();
    await invoiceImportPage.uploadPdf(fixturePath);
    await invoiceImportPage.expectExtractedPreview('R$ 33,20', '10/03/2026', [description]);
    const selectedCardId = await invoiceImportPage.selectedCardId();
    expect(selectedCardId).toBeTruthy();
    await invoiceImportPage.selectDefaultCategory(category!.name);
    await invoiceImportPage.expectSaveEnabled();
    await invoiceImportPage.save();

    await expect(page.getByText('Importação concluída: 1 lançamento(s) criado(s) e 0 ignorado(s).')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { level: 2, name: 'Importar fatura (PDF)' })).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(expensesPage.rowByName(description)).toBeVisible({ timeout: 20000 });

    await expect.poll(async () => {
      const importedExpenses = await liveApi<Array<{
        title?: string;
        amount?: number;
        startDate?: string;
        categoryId?: string | null;
        cardId?: string | null;
      }>>(page, '/plans?type=Expense');
      return importedExpenses.find((item) =>
        item.title === description
        && item.amount === 33.2
        && item.startDate === '2026-03-05'
        && item.categoryId === category!.id) ?? null;
    }, {
      timeout: 15000
    }).not.toBeNull();

    const importedExpenses = await liveApi<Array<{
      title?: string;
      amount?: number;
      startDate?: string;
      categoryId?: string | null;
      cardId?: string | null;
    }>>(page, '/plans?type=Expense');
    const importedExpense = importedExpenses.find((item) =>
      item.title === description
      && item.amount === 33.2
      && item.startDate === '2026-03-05'
      && item.categoryId === category!.id);
    expect(importedExpense).toBeTruthy();
    expect(importedExpense!.cardId).toBe(selectedCardId);

    await expensesPage.openInvoiceImport();
    await invoiceImportPage.expectOpen();
    await invoiceImportPage.uploadPdf(fixturePath);
    await invoiceImportPage.expectExtractedPreview('R$ 33,20', '10/03/2026', [description]);
    await invoiceImportPage.selectDefaultCategory(category!.name);
    await invoiceImportPage.save();
    await expect(page.getByText('Importação concluída: 0 lançamento(s) criado(s) e 1 ignorado(s).')).toBeVisible({ timeout: 20000 });

    const statements = await liveApi<Array<{ itemsCount: number; totalAmount: number }>>(page, `/cards/${selectedCardId}/statements?year=2026&month=3`);
    expect(statements.length).toBeGreaterThan(0);
    expect(statements[0]?.itemsCount).toBeGreaterThanOrEqual(1);
    expect(statements[0]?.totalAmount).toBeGreaterThan(0);
  });

  test('Advanced cria um lançamento real em investimentos', async ({ page }) => {
    test.setTimeout(120000);
    test.skip(!!getMissingLiveCredentialReason('advanced'), getMissingLiveCredentialReason('advanced')!);

    await loginWithSeededProfile(page, 'advanced');
    const suffix = `${Date.now()}`.slice(-6);
    const assetName = `TESOURO LIVE ${suffix}`;
    const investmentsPage = new InvestmentsPage(page);

    await investmentsPage.goto();
    await investmentsPage.createPosition(assetName);

    // access_token agora é cookie httpOnly — page.request reaproveita o cookie jar do browser.
    const positionsResponse = await page.request.fetch(`${LIVE_API_BASE_URL}/investments/positions`);
    expect(positionsResponse.ok()).toBeTruthy();
    const positions = await positionsResponse.json() as Array<{ asset?: string }>;
    expect(positions.some((position) => position.asset === assetName)).toBeTruthy();
  });

  test('Admin altera o role de um usuário real e restaura no fim do fluxo', async ({ page }) => {
    test.setTimeout(120000);
    test.skip(!!getMissingLiveCredentialReason('admin'), getMissingLiveCredentialReason('admin')!);

    await loginWithSeededProfile(page, 'admin');
    const adminUsersPage = new AdminUsersPage(page);

    await adminUsersPage.goto();
    await adminUsersPage.expectRole('codex.intermediate.live@example.com', 'Intermediate');

    try {
      await adminUsersPage.changeRole('codex.intermediate.live@example.com', 'Advanced');
      await adminUsersPage.expectRole('codex.intermediate.live@example.com', 'Advanced');
    } finally {
      const roleSelect = adminUsersPage.rowByEmail('codex.intermediate.live@example.com').locator('select').first();
      const currentValue = await roleSelect.inputValue().catch(() => '');
      if (currentValue !== 'Intermediate') {
        await adminUsersPage.changeRole('codex.intermediate.live@example.com', 'Intermediate');
        await adminUsersPage.expectRole('codex.intermediate.live@example.com', 'Intermediate');
      }
    }
  });
});
