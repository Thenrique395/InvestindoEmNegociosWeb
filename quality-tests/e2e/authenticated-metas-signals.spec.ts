import { expect, test, type Route } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * A9 — verificação da migração de `MetasComponent` para signals.
 *
 * `metas` foi o caso em que a conversão parcial (só `loading`) NÃO resolveu o
 * artefato headless. Aqui migramos o estado assíncrono por completo (views/summary
 * via computed, loading/showForm/saving/... via signal) e comprovamos:
 *  1) a lista de metas (carga assíncrona → `views()`) renderiza no headless;
 *  2) o modal de criação fecha a partir do callback assíncrono do POST
 *     (`showForm.set(false)` fora da zona) e a nova meta aparece na lista.
 *
 * Backend mockado (setupAuthenticatedApp) + rotas de `/goals` sobrescritas no teste
 * (o harness não mocka metas por padrão).
 */

function makeGoal(id: string, title: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title,
    targetAmount: 10000,
    currentAmount: 2000,
    year: 2026,
    description: null,
    status: 'InProgress',
    kind: 'Investment',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    expectedMonthly: 500,
    targetDate: '2026-12-31',
    mode: 'RecurringContribution',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    recurrence: 'Monthly',
    warningThreshold: 80,
    criticalThreshold: 100,
    ...overrides
  };
}

function makeProgress(goalId: string) {
  if (goalId === 'g-expense') {
    return {
      goalId,
      kind: 'Expense',
      mode: 'Limit',
      target: 1200,
      realized: 900,
      pending: 0,
      percent: 75,
      remaining: 300,
      state: 'Attention',
      forecast: null,
      daysRemaining: 80,
      start: '2026-01-01',
      end: '2026-03-31'
    };
  }

  return {
    goalId,
    kind: 'Investment',
    mode: 'RecurringContribution',
    target: 10000,
    realized: 2000,
    pending: 1500,
    percent: 20,
    remaining: 8000,
    forecast: null,
    daysRemaining: 300,
    start: '2026-01-01',
    end: '2026-12-31'
  };
}

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('metas — carga e criação (verificação A9: OnPush + signals)', () => {
  test('renderiza a lista assíncrona e fecha o modal de criação no headless', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Intermediate',
      categories: [
        { id: 'cat-food', name: 'Alimentação', appliesTo: 'Expense', isDefault: true, isActive: true },
        { id: 'cat-salary', name: 'Salário', appliesTo: 'Income', isDefault: true, isActive: true }
      ]
    });

    const goals: ReturnType<typeof makeGoal>[] = [
      makeGoal('g1', 'Reserva de emergência'),
      makeGoal('g-expense', 'Alimentação do trimestre', {
        targetAmount: 1200,
        currentAmount: 900,
        kind: 'Expense',
        mode: 'Limit',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        recurrence: 'Quarterly',
        warningThreshold: 70,
        criticalThreshold: 95,
        scopes: [{ scopeType: 'Category', refId: 'cat-food' }]
      })
    ];
    let contributionPayload: any = null;
    let archiveAttempts = 0;
    let deleteAttempts = 0;

    // Um handler único para todas as rotas /goals (registrado após o catch-all → vence).
    await page.route('**/api/v1/goals**', async (route) => {
      const req = route.request();
      const method = req.method();
      const path = new URL(req.url()).pathname;

      if (method === 'GET' && path.endsWith('/progress')) {
        const id = path.split('/').slice(-2)[0];
        return json(route, makeProgress(id));
      }
      if (method === 'GET' && path.endsWith('/occurrences')) {
        return json(route, [
          {
            id: 'occ-1',
            sequence: 1,
            periodStart: '2026-01-01',
            periodEnd: '2026-01-31',
            targetAmount: 1000,
            realized: 400,
            percent: 40,
            status: 'Closed',
            isCurrent: false
          },
          {
            id: 'occ-2',
            sequence: 2,
            periodStart: '2026-02-01',
            periodEnd: '2026-02-28',
            targetAmount: 1000,
            realized: 650,
            percent: 65,
            status: 'Open',
            isCurrent: true
          }
        ]);
      }
      if (method === 'GET' && path.endsWith('/goals')) {
        return json(route, goals);
      }
      if (method === 'POST' && path.endsWith('/contributions')) {
        contributionPayload = JSON.parse(req.postData() || '{}');
        return json(route, { id: 'contrib-1', goalId: 'g1', ...contributionPayload });
      }
      if (method === 'POST' && /\/goals\/[^/]+\/(pause|resume|archive)$/.test(path)) {
        const [, goalId, action] = path.match(/\/goals\/([^/]+)\/(pause|resume|archive)$/) ?? [];
        if (goalId === 'g-expense' && action === 'archive' && archiveAttempts++ === 0) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Conclua ou pause a meta antes de arquivar.' })
          });
          return;
        }
        const goal = goals.find((item) => item.id === goalId);
        if (goal) {
          goal.status = action === 'pause' ? 'Paused' : action === 'archive' ? 'Archived' : 'InProgress';
        }
        return json(route, goal ?? {});
      }
      if (method === 'DELETE' && /\/goals\/[^/]+$/.test(path)) {
        const [, goalId] = path.match(/\/goals\/([^/]+)$/) ?? [];
        if (goalId === 'g1' && deleteAttempts++ === 0) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Esta meta possui aportes vinculados.' })
          });
          return;
        }
        const index = goals.findIndex((item) => item.id === goalId);
        if (index >= 0) goals.splice(index, 1);
        return json(route, {});
      }
      if (method === 'POST' && path.endsWith('/goals')) {
        const payload = JSON.parse(req.postData() || '{}');
        const created = makeGoal('g2', payload.title || 'Nova');
        goals.push(created);
        return json(route, created);
      }
      return json(route, {});
    });

    await page.goto('/metas', { waitUntil: 'domcontentloaded' });

    // 1) A carga assíncrona renderizou a meta (views() signal) — sem ficar preso em "Carregando".
    await expect(page.getByText('Reserva de emergência')).toBeVisible();
    await expect(page.getByText('Alimentação do trimestre')).toBeVisible();
    await expect(page.getByText('Mensal').first()).toBeVisible();
    await expect(page.getByText('2 metas neste filtro')).toBeVisible();
    await page.getByRole('radiogroup', { name: 'Filtrar metas' }).getByRole('radio', { name: 'Despesas' }).click();
    await expect(page.getByText('1 meta neste filtro')).toBeVisible();
    await page.getByRole('radiogroup', { name: 'Filtrar metas' }).getByRole('radio', { name: 'Receitas' }).click();
    await expect(page.getByText('0 metas neste filtro')).toBeVisible();
    await expect(page.getByText('Nenhuma meta neste filtro')).toBeVisible();
    await page.getByRole('button', { name: 'Ver todas as metas' }).click();
    await expect(page.getByText('2 metas neste filtro')).toBeVisible();
    await page.getByRole('button', { name: 'Ações da meta Alimentação do trimestre' }).click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    const editModal = page.getByRole('dialog', { name: /Editar meta/ });
    await expect(editModal.getByLabel('Nome')).toHaveValue('Alimentação do trimestre');
    await expect(editModal.getByRole('combobox', { name: 'Recorrência' })).toContainText('Trimestral');
    await expect(editModal.getByRole('combobox', { name: 'Categoria da meta' })).toContainText('Alimentação');
    await expect(editModal.getByLabel('Alerta de atenção (%)')).toHaveValue('70');
    await expect(editModal.getByLabel('Alerta crítico (%)')).toHaveValue('95');
    await editModal.getByRole('button', { name: 'Cancelar' }).click();
    let expenseCard = page.locator('app-goal-card').filter({ hasText: 'Alimentação do trimestre' });
    await expenseCard.getByRole('button', { name: 'Ações da meta Alimentação do trimestre' }).click();
    await page.getByRole('menuitem', { name: 'Pausar' }).click();
    await expect(expenseCard.getByText('Pausada')).toBeVisible();
    await expenseCard.getByRole('button', { name: 'Ações da meta Alimentação do trimestre' }).click();
    await expect(page.getByRole('menuitem', { name: 'Reativar' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Reativar' }).click();
    await expect(expenseCard.getByText('Em atenção')).toBeVisible();
    await expenseCard.getByRole('button', { name: 'Ações da meta Alimentação do trimestre' }).click();
    await page.getByRole('menuitem', { name: 'Arquivar' }).click();
    await expect(page.getByText('Conclua ou pause a meta antes de arquivar.')).toBeVisible();
    await expect(expenseCard).toBeVisible();
    await expect(expenseCard.getByText('Em atenção')).toBeVisible();
    await expenseCard.getByRole('button', { name: 'Ações da meta Alimentação do trimestre' }).click();
    await page.getByRole('menuitem', { name: 'Arquivar' }).click();
    await expect(page.getByText('1 meta neste filtro')).toBeVisible();
    await expect(expenseCard).toHaveCount(0);
    await page.getByRole('radiogroup', { name: 'Filtrar metas' }).getByRole('radio', { name: 'Arquivadas' }).click();
    expenseCard = page.locator('app-goal-card').filter({ hasText: 'Alimentação do trimestre' });
    await expect(expenseCard).toBeVisible();
    await expect(expenseCard.getByText('Arquivada')).toBeVisible();
    await page.getByRole('radiogroup', { name: 'Filtrar metas' }).getByRole('radio', { name: 'Todas' }).click();
    await expect(page.getByText(/Precisa de R\$\s*800,00 por mês para chegar no prazo\./)).toBeVisible();
    await expect(page.getByText(/Previsto \(não contabilizado\): R\$\s*1\.500,00/)).toBeVisible();
    await expect(page.getByText('Carregando metas...')).toHaveCount(0);
    const investmentCard = page.locator('app-goal-card').filter({ hasText: 'Reserva de emergência' });
    await investmentCard.getByRole('button', { name: 'Ações da meta Reserva de emergência' }).click();
    await expect(page.getByRole('menuitem', { name: 'Concluir' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Fechar menu' }).click();
    await investmentCard.getByRole('button', { name: 'Ver detalhes' }).click();
    const detailsModal = page.getByRole('dialog', { name: /Reserva de emergência/ });
    await expect(detailsModal.getByText(/Previsto \(não contabilizado\): R\$\s*1\.500,00/)).toBeVisible();
    await expect(detailsModal.getByText(/Precisa de R\$\s*800,00 por mês para chegar no prazo\./)).toBeVisible();
    await expect(detailsModal.getByText('2026-01-01 — 2026-01-31')).toBeVisible();
    await expect(detailsModal.getByText('2026-02-01 — 2026-02-28')).toBeVisible();
    await expect(detailsModal.getByRole('progressbar', { name: /Evolução de 2026-01-01 a 2026-01-31: 40%/ })).toHaveAttribute('aria-valuenow', '40');
    await expect(detailsModal.getByRole('progressbar', { name: /Evolução de 2026-02-01 a 2026-02-28: 65%/ })).toHaveAttribute('aria-valuenow', '65');
    await detailsModal.getByRole('button', { name: 'Fechar', exact: true }).click();
    await investmentCard.getByRole('button', { name: 'Ações da meta Reserva de emergência' }).click();
    await page.getByRole('menuitem', { name: 'Registrar aporte' }).click();
    const contributionModal = page.getByRole('dialog', { name: /Registrar aporte/ });
    await expect(contributionModal.getByRole('button', { name: /R\$\s*800,00/ })).toBeVisible();
    await contributionModal.getByRole('button', { name: /R\$\s*2\.000,00/ }).click();
    await expect(contributionModal.getByRole('progressbar', { name: /Progresso previsto após este aporte: 40%/ })).toHaveAttribute('aria-valuenow', '40');
    await expect(contributionModal.getByText(/Depois\s*R\$\s*4\.000,00/)).toBeVisible();
    await expect(contributionModal.getByText(/Falta\s*R\$\s*6\.000,00/)).toBeVisible();
    await contributionModal.getByRole('button', { name: 'Registrar' }).click();
    await expect(contributionModal).toHaveCount(0);
    expect(contributionPayload?.amount).toBe(2000);
    await investmentCard.getByRole('button', { name: 'Ações da meta Reserva de emergência' }).click();
    await page.getByRole('menuitem', { name: 'Excluir' }).click();
    const deleteDialog = page.getByRole('dialog', { name: 'Excluir meta?' });
    await expect(deleteDialog.getByText("Excluir a meta 'Reserva de emergência'? Esta ação não pode ser desfeita.")).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Excluir meta' }).click();
    await expect(page.getByText('Esta meta possui aportes vinculados.')).toBeVisible();
    await expect(investmentCard).toBeVisible();
    await investmentCard.getByRole('button', { name: 'Ações da meta Reserva de emergência' }).click();
    await page.getByRole('menuitem', { name: 'Excluir' }).click();
    await page.getByRole('dialog', { name: 'Excluir meta?' }).getByRole('button', { name: 'Excluir meta' }).click();
    await expect(investmentCard).toHaveCount(0);
    await expect(page.getByText('Nenhuma meta neste filtro')).toBeVisible();

    // 2) Abrir criação, preencher e salvar → o modal fecha via callback assíncrono do POST.
    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByRole('button', { name: /Nova meta/ }).first().click();
    const createModal = page.getByRole('dialog', { name: /Nova meta/ });
    await expect(createModal.getByText('Objetivo')).toBeVisible();
    await expect(createModal.getByText('Período')).toBeVisible();
    await expect(createModal.getByText('Regras')).toBeVisible();
    await expect(page.getByLabel('Nome')).toBeVisible();
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.getByRole('radiogroup', { name: 'Tipo de meta' }).getByRole('radio', { name: 'Investimento', exact: true }).click();
    await expect(page.getByText('Metas de investimento acompanham aportes e evolução patrimonial.')).toBeVisible();
    await page.getByLabel('Nome').fill('Viagem 2027');
    await page.getByLabel('Meta de aporte (R$)').fill('5000');
    await page.getByRole('button', { name: 'Criar meta' }).click();

    // A nova meta aparece (loadGoals assíncrono re-renderizou a lista via signal)...
    await expect(page.getByText('Viagem 2027')).toBeVisible();

    // ...e o modal fechou (showForm.set(false) veio do callback assíncrono, fora da zona).
    const showForm = await page.locator('app-metas').evaluate((el: any) => {
      const cmp = (window as any).ng.getComponent(el);
      return cmp.showForm();
    });
    expect(showForm).toBe(false);
    await expect(page.getByLabel('Nome')).toHaveCount(0);
  });
});
