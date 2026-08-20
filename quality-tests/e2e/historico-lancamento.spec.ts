import { expect, test, type Page } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { BaseDespesas } from './support/despesas-backend';

/**
 * Gaveta de histórico do lançamento.
 *
 * Duas formas, decididas pelo tipo do lançamento: série mostra PARCELAS +
 * EVENTOS; recorrente mostra só EVENTOS, porque ocorrência mensal sem fim não
 * é uma série com começo e término.
 */

const gaveta = (page: Page) => page.locator('.lh__panel');

async function abrir(page: Page, base: BaseDespesas, nome: string): Promise<void> {
  await setupAuthenticatedApp(page, { role: 'Advanced' });
  await base.instalar(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.locator('tbody tr').filter({ hasText: nome }).first().getByRole('button', { name: 'Histórico' }).click();
}

function serieDe12(base: BaseDespesas): void {
  base.addPlano(
    { title: 'Seguro do carro', amount: 389.4, schedule: 'Installments', installmentsCount: 12 },
    Array.from({ length: 12 }, (_, i) => ({
      installmentNo: i + 1,
      status: i < 6 ? 'Paid' : i === 6 ? 'PartiallyPaid' : 'Open'
    }))
  );
}

test.describe('histórico do lançamento', () => {
  test('série mostra as parcelas com o progresso da quitação', async ({ page }) => {
    const base = new BaseDespesas();
    serieDe12(base);
    await abrir(page, base, 'Seguro do carro');

    await expect(gaveta(page).getByRole('heading', { name: 'Seguro do carro' })).toBeVisible();

    // A série inteira vem do servidor: a tela só tem o mês aberto em memória.
    await expect(gaveta(page).locator('.lh__parcela')).toHaveCount(12);
    await expect(gaveta(page).getByText('6 de 12 parcelas pagas')).toBeVisible();
    await expect(gaveta(page).getByText('Parcela 1/12')).toBeVisible();
    await expect(gaveta(page).getByText('Parcela 12/12')).toBeVisible();
  });

  test('parcialmente paga não conta como paga no progresso', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano(
      { title: 'Curso', amount: 100, schedule: 'Installments', installmentsCount: 2 },
      [{ installmentNo: 1, status: 'PartiallyPaid' }, { installmentNo: 2, status: 'Open' }]
    );
    await abrir(page, base, 'Curso');

    await expect(gaveta(page).getByText('0 de 2 parcelas pagas')).toBeVisible();
  });

  test('recorrente mostra só a linha do tempo', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Plano de saúde', amount: 892, schedule: 'Recurring', installmentsCount: null }, [{}]);
    await abrir(page, base, 'Plano de saúde');

    await expect(gaveta(page).getByText('Eventos')).toBeVisible();
    await expect(gaveta(page).locator('.lh__parcela')).toHaveCount(0);
    await expect(gaveta(page).getByText(/parcelas pagas/)).toHaveCount(0);
  });

  test('cada evento diz o que mudou, quando e quem fez', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Plano de saúde', amount: 892, schedule: 'Recurring', installmentsCount: null }, [{}]);
    base.eventos = [
      { type: 'Created', occurredAt: '2026-08-01T09:14:00', actorName: 'Henrique Santos', derived: false },
      {
        type: 'AmountChanged',
        occurredAt: '2026-08-03T18:42:00',
        actorName: 'Henrique Santos',
        oldValue: '860.00',
        newValue: '892.00',
        derived: false
      },
      { type: 'CategoryChanged', occurredAt: '2026-08-03T18:43:00', actorName: 'Henrique Santos', newValue: 'Saúde', derived: false },
      { type: 'DueDatePassed', occurredAt: '2026-08-02T00:00:00', actorName: null, derived: true }
    ];
    await abrir(page, base, 'Plano de saúde');

    const eventos = gaveta(page).locator('.lh__evento');
    await expect(eventos).toHaveCount(4);

    await expect(eventos.filter({ hasText: 'Lançamento criado' })).toContainText('01/08/2026 · 09:14 · Henrique Santos');
    await expect(eventos.filter({ hasText: 'Valor alterado' })).toContainText('de R$ 860,00 para R$ 892,00');
    await expect(eventos.filter({ hasText: 'Categoria definida' })).toContainText('Saúde');
    // Vencimento que passou não é ação de ninguém.
    await expect(eventos.filter({ hasText: 'Vencimento ultrapassado' })).toContainText('sistema');
  });

  test('estorno e comprovante aparecem só na parcela paga', async ({ page }) => {
    const base = new BaseDespesas();
    serieDe12(base);
    await abrir(page, base, 'Seguro do carro');

    const paga = gaveta(page).locator('.lh__parcela').filter({ hasText: 'Parcela 1/12' });
    await expect(paga.getByRole('button', { name: 'Estornar' })).toBeVisible();
    await expect(paga.getByRole('button', { name: 'Comprovante' })).toBeVisible();

    const emAberto = gaveta(page).locator('.lh__parcela').filter({ hasText: 'Parcela 12/12' });
    await expect(emAberto.getByRole('button', { name: 'Estornar' })).toHaveCount(0);
  });

  test('falha ao carregar avisa em vez de mostrar gaveta vazia', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Aluguel', amount: 2400 });
    base.falhaNoHistorico = true;
    await abrir(page, base, 'Aluguel');

    await expect(gaveta(page).getByText(/Histórico indisponível|Não foi possível carregar/i)).toBeVisible();
  });

  test('fecha pelo rodapé e pelo X', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Aluguel', amount: 2400 });
    await abrir(page, base, 'Aluguel');

    await gaveta(page).getByRole('button', { name: 'Fechar', exact: true }).click();
    await expect(gaveta(page)).toHaveCount(0);

    await page.locator('tbody tr').first().getByRole('button', { name: 'Histórico' }).click();
    await gaveta(page).getByRole('button', { name: 'Fechar histórico' }).click();
    await expect(gaveta(page)).toHaveCount(0);
  });

  test('estorna o pagamento pela gaveta e a parcela volta a ficar em aberto', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Assinatura', amount: 120 });
    await setupAuthenticatedApp(page, { role: 'Basic' });
    await base.instalar(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);

    // Paga primeiro: o estorno precisa de um pagamento para reverter.
    await page.locator('tbody tr').filter({ hasText: 'Assinatura' }).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Marcar como pago' }).click();
    await page.waitForTimeout(1500);
    expect(base.parcelaDe('Assinatura')?.status).toBe('Paid');

    await page.locator('tbody tr').filter({ hasText: 'Assinatura' }).first()
      .getByRole('button', { name: 'Histórico' }).click();
    await expect(gaveta(page)).toBeVisible();

    await gaveta(page).getByRole('button', { name: 'Estornar' }).first().click();
    await page.waitForTimeout(2000);

    expect(base.parcelaDe('Assinatura')?.status).toBe('Open');
  });

  test('Receitas usa a mesma gaveta, sem estorno', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano(
      { title: 'Consultoria', amount: 1500, type: 'Income', schedule: 'Installments', installmentsCount: 2 },
      [{ installmentNo: 1, status: 'Paid' }, { installmentNo: 2, status: 'Open' }]
    );

    await setupAuthenticatedApp(page, { role: 'Advanced' });
    await base.instalar(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/receitas', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    await page.locator('tbody tr').filter({ hasText: 'Consultoria' }).first()
      .getByRole('button', { name: 'Histórico' }).click();

    await expect(gaveta(page).getByRole('heading', { name: 'Consultoria' })).toBeVisible();
    await expect(gaveta(page).getByText('1 de 2 parcelas pagas')).toBeVisible();

    // Receitas não tem fluxo de estorno; comprovante continua disponível.
    const paga = gaveta(page).locator('.lh__parcela').filter({ hasText: 'Parcela 1/2' });
    await expect(paga.getByRole('button', { name: 'Estornar' })).toHaveCount(0);
    await expect(paga.getByRole('button', { name: 'Comprovante' })).toBeVisible();
  });
});
