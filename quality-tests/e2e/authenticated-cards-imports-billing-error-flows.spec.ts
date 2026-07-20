import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('cartões — cenários de erro', () => {
  test('mostra aviso ao tentar criar cartão já existente (409)', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: '/api/v1/cards',
          method: 'POST',
          status: 409,
          body: { detail: 'Já existe um cartão com esse número cadastrado.' }
        }
      ]
    });

    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Adicionar cartão|Registrar um/i }).first().click();

    const brandSelect = page.getByLabel('Bandeira');
    if (await brandSelect.isVisible().catch(() => false)) {
      const firstBrand = await brandSelect.locator('option').first().getAttribute('value');
      if (firstBrand) await brandSelect.selectOption(firstBrand);
    }

    await page.getByLabel('Número do cartão').fill('5555 4444 3333 9999');
    await page.getByLabel(/Nome( impresso)? (do|no) cartão/).fill('Cartao Duplicado');
    await page.getByLabel(/Banco( \(opcional\))?/).fill('Banco Teste');
    await page.getByLabel('Limite de crédito').fill('3000');
    await page.getByLabel('Dia do fechamento').fill('10');
    await page.getByLabel('Dia do vencimento').fill('20');
    await page.getByRole('button', { name: 'Salvar cartão' }).click();

    await expect(page.getByText('Já existe um cartão com esse número cadastrado.')).toBeVisible();
  });

  test('mostra erro ao falhar edição de cartão', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: /\/api\/v1\/cards\/[^/]+$/,
          method: 'PUT',
          status: 400,
          body: { detail: 'Não foi possível atualizar o cartão.' }
        }
      ]
    });

    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });
    await page.locator('[title="Editar cartão"]').first().click();
    await page.getByLabel('Número do cartão').fill('5555 4444 3333 1234');
    await page.getByLabel(/Nome( impresso)? (do|no) cartão/).fill('Nome Alterado');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(page.getByText('Não foi possível atualizar o cartão.')).toBeVisible();
  });

  test('mostra erro ao falhar remoção de cartão pela API', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: /\/api\/v1\/cards\/[^/]+$/,
          method: 'DELETE',
          status: 409,
          body: { detail: 'Não é possível remover o cartão; ele possui faturas em aberto.' }
        }
      ]
    });

    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });
    await page.locator('[title="Remover cartão"]').first().click();
    // A exclusão pede confirmação (ConfirmSheet) antes de disparar o DELETE.
    await page.locator('button.btn-danger').filter({ hasText: 'Remover cartão' }).click();

    await expect(page.getByText('Falha ao remover cartão.')).toBeVisible();
  });
});

test.describe('importações OFX/CSV — cenários de erro adicionais', () => {
  test('mostra erro ao falhar importação OFX após confirmação do preview', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: '/api/v1/accounts/ofx/import',
          method: 'POST',
          status: 500,
          body: { detail: 'Falha ao persistir transações do extrato OFX.' }
        }
      ]
    });

    await page.goto('/contas', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Extrato' }).first().click();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'sample.ofx',
      mimeType: 'application/x-ofx',
      buffer: Buffer.from('OFX SAMPLE')
    });

    await expect(page.getByText('2 itens')).toBeVisible();
    await page.getByRole('button', { name: 'Importar OFX' }).click();

    await expect(page.getByText('Falha ao importar OFX.')).toBeVisible();
  });

  test('mostra erro ao falhar extração de CSV com arquivo inválido', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: '/api/v1/accounts/csv/extract',
          method: 'POST',
          status: 422,
          body: { detail: 'Não foi possível interpretar o arquivo CSV enviado.' }
        }
      ]
    });

    await page.goto('/contas', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Extrato' }).first().click();
    await page.locator('input[type="file"]').nth(1).setInputFiles({
      name: 'broken.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('INVALID;CONTENT;HERE')
    });

    await expect(page.getByText('Não foi possível interpretar o arquivo CSV enviado.')).toBeVisible();
  });
});

test.describe('billing — cenários de erro', () => {
  test('mostra erro ao falhar cancelamento de renovação', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      apiFailures: [
        {
          path: '/api/v1/subscriptions/cancel',
          method: 'POST',
          status: 400,
          body: {}
        }
      ]
    });

    // Sobrepõe o catálogo para simular assinatura paga com renovação ativa (showCancelButton = true)
    await page.route('**/api/v1/subscriptions/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current: {
            planCode: 'intermediate',
            planName: 'Intermediate',
            role: 'Intermediate',
            status: 'Active',
            billingCycle: 'Monthly',
            priceAmount: 2990,
            currency: 'BRL',
            autoRenew: true,
            startedAt: '2026-03-01T10:00:00Z',
            renewsAt: '2026-07-01T10:00:00Z',
            cancelledAt: null
          },
          plans: [
            {
              code: 'basic',
              name: 'Basic',
              role: 'Basic',
              description: 'Plano inicial',
              monthlyPrice: 0,
              yearlyPrice: 0,
              recommended: false,
              current: false,
              features: ['Dashboard'],
              limits: {}
            },
            {
              code: 'intermediate',
              name: 'Intermediate',
              role: 'Intermediate',
              description: 'Plano intermediário',
              monthlyPrice: 29.9,
              yearlyPrice: 299,
              recommended: true,
              current: true,
              features: ['Importação de fatura'],
              limits: { categorias: 'Ilimitadas' }
            }
          ],
          notes: ['Mudança de plano atualiza a sessão imediatamente.']
        })
      });
    });

    await page.goto('/assinatura', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Cancelar renovação/i }).first().click();
    // O cancelamento agora exige confirmação num diálogo.
    await page.getByRole('dialog').getByRole('button', { name: /Cancelar renovação/i }).click();

    await expect(page.getByText('Falha ao cancelar o plano.')).toBeVisible();
  });

  test('mostra erro ao falhar downgrade de plano para Basic', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Intermediate',
      apiFailures: [
        {
          path: '/api/v1/subscriptions/change',
          method: 'POST',
          status: 500,
          body: {}
        }
      ]
    });

    // Sobrepõe o catálogo: Intermediate é atual, Basic disponível para downgrade via API
    await page.route('**/api/v1/subscriptions/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current: {
            planCode: 'intermediate',
            planName: 'Intermediate',
            role: 'Intermediate',
            status: 'Active',
            billingCycle: 'Monthly',
            priceAmount: 2990,
            currency: 'BRL',
            autoRenew: true,
            startedAt: '2026-03-01T10:00:00Z',
            renewsAt: '2026-07-01T10:00:00Z',
            cancelledAt: null
          },
          plans: [
            {
              code: 'basic',
              name: 'Basic',
              role: 'Basic',
              description: 'Plano inicial',
              monthlyPrice: 0,
              yearlyPrice: 0,
              recommended: false,
              current: false,
              features: ['Dashboard'],
              limits: {}
            },
            {
              code: 'intermediate',
              name: 'Intermediate',
              role: 'Intermediate',
              description: 'Plano intermediário',
              monthlyPrice: 29.9,
              yearlyPrice: 299,
              recommended: true,
              current: true,
              features: ['Importação de fatura'],
              limits: { categorias: 'Ilimitadas' }
            }
          ],
          notes: ['Mudança de plano atualiza a sessão imediatamente.']
        })
      });
    });

    await page.goto('/assinatura', { waitUntil: 'domcontentloaded' });

    // Downgrade para Basic chama a API (não navega para checkout)
    await page.getByRole('button', { name: /Trocar para este plano/i }).first().click();

    await expect(page.getByText('Falha ao alterar plano.')).toBeVisible();
  });

  test('mostra erro ao falhar tentativa de pagamento em atraso', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Intermediate',
      apiFailures: [
        {
          path: '/api/v1/subscriptions/retry-payment',
          method: 'POST',
          status: 402,
          body: {}
        }
      ]
    });

    // Sobrepõe o catálogo para simular assinatura em atraso (showRetryButton = true)
    await page.route('**/api/v1/subscriptions/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current: {
            planCode: 'intermediate',
            planName: 'Intermediate',
            role: 'Intermediate',
            status: 'PastDue',
            billingCycle: 'Monthly',
            priceAmount: 2990,
            currency: 'BRL',
            autoRenew: true,
            startedAt: '2026-03-01T10:00:00Z',
            renewsAt: '2026-07-01T10:00:00Z',
            cancelledAt: null
          },
          plans: [
            {
              code: 'basic',
              name: 'Basic',
              role: 'Basic',
              description: 'Plano inicial',
              monthlyPrice: 0,
              yearlyPrice: 0,
              recommended: false,
              current: false,
              features: ['Dashboard'],
              limits: {}
            },
            {
              code: 'intermediate',
              name: 'Intermediate',
              role: 'Intermediate',
              description: 'Plano intermediário',
              monthlyPrice: 29.9,
              yearlyPrice: 299,
              recommended: true,
              current: true,
              features: ['Importação de fatura'],
              limits: { categorias: 'Ilimitadas' }
            }
          ],
          notes: ['Mudança de plano atualiza a sessão imediatamente.']
        })
      });
    });

    await page.goto('/assinatura', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Tentar novamente/i }).first().click();

    await expect(page.getByText('Não foi possível processar o pagamento.')).toBeVisible();
  });
});
