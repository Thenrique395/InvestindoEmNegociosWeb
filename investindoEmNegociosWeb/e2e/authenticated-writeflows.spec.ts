import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('authenticated write flows', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page);
  });

  test('cria uma nova conta e reflete na listagem', async ({ page }) => {
    await page.goto('/contas', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Nome').fill('Conta teste E2E');
    await page.getByLabel('Saldo inicial').fill('1500');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page.getByRole('heading', { level: 3, name: 'Conta teste E2E' })).toBeVisible();
    await expect(page.getByText('Saldo atual:').filter({ hasText: 'R$ 1.500,00' })).toBeVisible();
  });

  test('cria um novo cartao e reflete na listagem', async ({ page }) => {
    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Adicionar cartão' }).click();
    await page.getByLabel('Número do cartão').fill('5555 4444 3333 2222');
    await page.getByLabel('Nome impresso no cartão').fill('Cartao E2E');
    await page.getByLabel('Banco (opcional)').fill('Banco Teste');
    await page.getByLabel('Limite de crédito').fill('8000');
    await page.getByLabel('Dia do fechamento').fill('12');
    await page.getByLabel('Dia do vencimento').fill('20');
    await page.getByRole('button', { name: 'Salvar cartão' }).click();

    await expect(page.getByText('Cartao E2E')).toBeVisible();
    await expect(page.getByText('•••• 2222')).toBeVisible();
  });

  test('importa OFX pela interface e atualiza o extrato', async ({ page }) => {
    await page.goto('/contas', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Ver extrato' }).first().click();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'sample.ofx',
      mimeType: 'application/x-ofx',
      buffer: Buffer.from('OFX SAMPLE')
    });

    await expect(page.getByText('2 movimentação(ões) encontradas.')).toBeVisible();
    await expect(page.getByText('Prontas para importar:').filter({ hasText: '2' })).toBeVisible();

    await page.getByRole('button', { name: 'Importar OFX' }).click();

    await expect(page.getByRole('cell', { name: 'PIX SALARIO' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Mercado bairro' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Extrato bancário' }).first()).toBeVisible();
  });

  test('importa CSV pela interface e atualiza o extrato', async ({ page }) => {
    await page.goto('/contas', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Ver extrato' }).first().click();
    await page.locator('input[type="file"]').nth(1).setInputFiles({
      name: 'sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('data;descricao;valor;tipo')
    });

    await expect(page.getByText('2 movimentação(ões) encontradas.')).toBeVisible();
    await expect(page.getByText('Prontas para importar:').filter({ hasText: '2' })).toBeVisible();

    await page.getByRole('button', { name: 'Importar CSV' }).click();

    await expect(page.getByRole('cell', { name: 'Padaria central' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Freelance cliente' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Extrato bancário' }).first()).toBeVisible();
  });

  test('transfere saldo entre contas e reflete nos saldos e extrato', async ({ page }) => {
    await page.goto('/contas', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Conta origem').selectOption({ label: 'Conta principal' });
    await page.getByLabel('Conta destino').selectOption({ label: 'Reserva' });
    await page.getByLabel('Valor').fill('300');
    await page.getByLabel('Descrição (opcional)').fill('Reserva automática');
    await page.getByRole('button', { name: 'Transferir agora' }).click();

    const contaPrincipal = page.locator('article').filter({ hasText: 'Conta principal' });
    const reserva = page.locator('article').filter({ hasText: 'Reserva' });
    await expect(contaPrincipal.getByText('Saldo atual:').filter({ hasText: 'R$ 3.080,00' })).toBeVisible();
    await expect(reserva.getByText('Saldo atual:').filter({ hasText: 'R$ 5.500,00' })).toBeVisible();

    await contaPrincipal.getByRole('button', { name: 'Ver extrato' }).click();
    await expect(page.getByRole('cell', { name: 'Reserva automática' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Transferência' }).first()).toBeVisible();
  });

  test('edita uma conta existente e atualiza a listagem', async ({ page }) => {
    await page.goto('/contas', { waitUntil: 'domcontentloaded' });

    const contaPrincipal = page.locator('article').filter({ hasText: 'Conta principal' });
    await contaPrincipal.getByRole('button', { name: 'Editar' }).click();

    await page.getByLabel('Nome').fill('Conta principal ajustada');
    await page.getByLabel('Saldo inicial').fill('4100');
    await page.getByRole('button', { name: 'Atualizar conta' }).click();

    await expect(page.getByRole('heading', { level: 3, name: 'Conta principal ajustada' })).toBeVisible();
    await expect(page.getByText('Saldo atual:').filter({ hasText: 'R$ 4.100,00' })).toBeVisible();
  });

  test('remove uma conta criada na interface', async ({ page }) => {
    await page.goto('/contas', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Nome').fill('Conta descartável');
    await page.getByLabel('Saldo inicial').fill('250');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Conta descartável' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    const descartavel = page.locator('article').filter({ hasText: 'Conta descartável' });
    await descartavel.getByRole('button', { name: 'Remover' }).click();

    await expect(page.getByRole('heading', { level: 3, name: 'Conta descartável' })).toHaveCount(0);
  });

  test('edita um cartao existente e reflete na listagem', async ({ page }) => {
    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });

    const cartao = page.locator('article').filter({ hasText: 'Cartao principal' });
    await cartao.getByRole('button', { name: 'Editar' }).click();

    await page.getByLabel('Número do cartão').fill('9999 8888 7777 9876');
    await page.getByLabel('Nome impresso no cartão').fill('Cartao principal premium');
    await page.getByLabel('Banco (opcional)').fill('Banco Atualizado');
    await page.getByLabel('Limite de crédito').fill('9500');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(page.getByText('Cartao principal premium')).toBeVisible();
    await expect(page.getByText('•••• 9876')).toBeVisible();
  });

  test('remove um cartao existente da listagem', async ({ page }) => {
    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });

    const cartaoPrincipal = page.locator('article').filter({ hasText: 'Cartao principal' });
    await expect(cartaoPrincipal).toBeVisible();
    await page.waitForTimeout(1600);
    await cartaoPrincipal.getByRole('button', { name: 'Remover' }).click();

    await expect(page.getByText('Cartao principal')).toHaveCount(0, { timeout: 10000 });
  });
});
