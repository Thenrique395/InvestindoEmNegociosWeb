import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('authenticated error flows', () => {
  test('mostra erro ao falhar transferencia entre contas', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: '/api/v1/accounts/transfers',
          method: 'POST',
          status: 400,
          body: { detail: 'Saldo insuficiente para a transferência.' }
        }
      ]
    });

    await page.goto('/contas', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Conta origem').selectOption({ label: 'Conta principal' });
    await page.getByLabel('Conta destino').selectOption({ label: 'Reserva' });
    await page.getByLabel('Valor', { exact: true }).fill('99999');
    await page.getByRole('button', { name: 'Transferir agora' }).click();

    await expect(page.getByText('Falha ao transferir entre contas.')).toBeVisible();
  });

  test('mostra erro ao falhar extracao de OFX', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: '/api/v1/accounts/ofx/extract',
          method: 'POST',
          status: 422,
          body: { detail: 'Arquivo OFX inválido.' }
        }
      ]
    });

    await page.goto('/contas', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Extrato' }).first().click();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'broken.ofx',
      mimeType: 'application/x-ofx',
      buffer: Buffer.from('BROKEN OFX')
    });

    await expect(page.getByText('Arquivo OFX inválido.')).toBeVisible();
  });

  test('mostra erro ao falhar importacao de CSV', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: '/api/v1/accounts/csv/import',
          method: 'POST',
          status: 409,
          body: { detail: 'Importação CSV bloqueada por duplicidade detectada.' }
        }
      ]
    });

    await page.goto('/contas', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Extrato' }).first().click();
    await page.locator('input[type="file"]').nth(1).setInputFiles({
      name: 'sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('data;descricao;valor;tipo')
    });
    await page.getByRole('button', { name: 'Importar CSV' }).click();

    await expect(page.getByText('Falha ao importar CSV.')).toBeVisible();
  });

  test('mostra erro ao falhar criacao de conta', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: '/api/v1/accounts',
          method: 'POST',
          status: 400,
          body: { detail: 'Nome da conta é obrigatório.' }
        }
      ]
    });

    await page.goto('/contas', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Nome da conta').fill('Conta com erro');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Falha ao salvar conta.')).toBeVisible();
  });

  test('mostra erro ao falhar edicao de conta', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: /\/api\/v1\/accounts\/[^/]+$/,
          method: 'PUT',
          status: 400,
          body: { detail: 'Não foi possível atualizar a conta.' }
        }
      ]
    });

    await page.goto('/contas', { waitUntil: 'domcontentloaded' });
    const contaPrincipal = page.locator('article').filter({ hasText: 'Conta principal' });
    await contaPrincipal.getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Nome da conta').fill('Conta principal alterada');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Falha ao salvar conta.')).toBeVisible();
  });
});
