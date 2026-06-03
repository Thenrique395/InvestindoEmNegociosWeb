import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { AccountsPage } from './support/page-objects/accounts.page';
import { CardsPage } from './support/page-objects/cards.page';

test.describe('authenticated write flows', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page);
  });

  test('cria uma nova conta e reflete na listagem', async ({ page }) => {
    const accountsPage = new AccountsPage(page);

    await accountsPage.goto();
    await accountsPage.createAccount('Conta teste E2E', '1500');
    await accountsPage.expectAccountBalance('Conta teste E2E', 1500);
  });

  test('cria um novo cartao e reflete na listagem', async ({ page }) => {
    const cardsPage = new CardsPage(page);

    await cardsPage.goto();
    await cardsPage.createCard('Cartao E2E', '2222');
    await cardsPage.expectCardVisible('Cartao E2E', '2222');
  });

  test('importa OFX pela interface e atualiza o extrato', async ({ page }) => {
    await page.goto('/contas', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Extrato' }).first().click();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'sample.ofx',
      mimeType: 'application/x-ofx',
      buffer: Buffer.from('OFX SAMPLE')
    });

    await expect(page.getByText('2 itens • 0 duplicados • 0 categorizados automaticamente')).toBeVisible();

    await page.getByRole('button', { name: 'Importar OFX' }).click();

    await expect(page.getByRole('cell', { name: 'PIX SALARIO' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Mercado bairro' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Extrato bancário' }).first()).toBeVisible();
  });

  test('importa CSV pela interface e atualiza o extrato', async ({ page }) => {
    await page.goto('/contas', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Extrato' }).first().click();
    await page.locator('input[type="file"]').nth(1).setInputFiles({
      name: 'sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('data;descricao;valor;tipo')
    });

    await expect(page.getByText('2 itens • 0 categorizados automaticamente')).toBeVisible();

    await page.getByRole('button', { name: 'Importar CSV' }).click();

    await expect(page.getByRole('cell', { name: 'Padaria central' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Freelance cliente' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Extrato bancário' }).first()).toBeVisible();
  });

  test('transfere saldo entre contas e reflete nos saldos e extrato', async ({ page }) => {
    const accountsPage = new AccountsPage(page);

    await accountsPage.goto();
    await accountsPage.transfer('Conta principal', 'Reserva', '300', 'Reserva automática');
    await accountsPage.expectAccountBalance('Conta principal', 3080, 10000);
    await accountsPage.expectAccountBalance('Reserva', 5500, 10000);

    await accountsPage.openStatement('Conta principal');
    await expect(page.getByRole('cell', { name: 'Reserva automática' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Transferência' }).first()).toBeVisible();
  });

  test('edita uma conta existente e atualiza a listagem', async ({ page }) => {
    const accountsPage = new AccountsPage(page);

    await accountsPage.goto();
    await accountsPage.editAccount('Conta principal', 'Conta principal ajustada', '4100');
    await accountsPage.expectAccountBalance('Conta principal ajustada', 4100);
  });

  test('remove uma conta criada na interface', async ({ page }) => {
    const accountsPage = new AccountsPage(page);

    await accountsPage.goto();
    await accountsPage.createAccount('Conta descartável', '250');
    await accountsPage.removeAccount('Conta descartável');
  });

  test('edita um cartao existente e reflete na listagem', async ({ page }) => {
    const cardsPage = new CardsPage(page);

    await cardsPage.goto();
    await cardsPage.editCard('Cartao principal', 'Cartao principal premium', '9876');
  });

  test('remove um cartao existente da listagem', async ({ page }) => {
    const cardsPage = new CardsPage(page);

    await cardsPage.goto();
    await cardsPage.removeCard('Cartao principal');
  });
});
