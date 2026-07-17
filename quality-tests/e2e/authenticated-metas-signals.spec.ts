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

function makeGoal(id: string, title: string) {
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
    criticalThreshold: 100
  };
}

function makeProgress(goalId: string) {
  return {
    goalId,
    kind: 'Investment',
    mode: 'RecurringContribution',
    target: 10000,
    realized: 2000,
    pending: 0,
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
    await setupAuthenticatedApp(page, { role: 'Intermediate' });

    const goals: ReturnType<typeof makeGoal>[] = [makeGoal('g1', 'Reserva de emergência')];

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
        return json(route, []);
      }
      if (method === 'GET' && path.endsWith('/goals')) {
        return json(route, goals);
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
    await expect(page.getByText('Carregando metas...')).toHaveCount(0);

    // 2) Abrir criação, preencher e salvar → o modal fecha via callback assíncrono do POST.
    await page.getByRole('button', { name: /Nova meta/ }).first().click();
    await expect(page.getByLabel('Nome')).toBeVisible();
    await page.getByLabel('Nome').fill('Viagem 2027');
    await page.getByLabel('Limite (R$)').fill('5000');
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
