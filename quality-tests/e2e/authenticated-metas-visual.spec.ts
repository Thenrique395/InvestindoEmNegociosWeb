import { expect, test, type Route } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

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
    state: 'OnTrack',
    forecast: null,
    daysRemaining: 300,
    start: '2026-01-01',
    end: '2026-12-31'
  };
}

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('metas — captura visual rebrand', () => {
  test('salva evidências desktop e mobile sem overflow horizontal', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Intermediate',
      categories: [
        { id: 'cat-food', name: 'Alimentação', appliesTo: 'Expense', isDefault: true, isActive: true }
      ]
    });

    const goals = [
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
      return json(route, {});
    });

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1200 },
      { name: 'mobile', width: 390, height: 900 }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/metas', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1, name: 'Metas' })).toBeVisible();
      await expect(page.getByText('Reserva de emergência')).toBeVisible();
      await expect(page.getByText('Alimentação do trimestre')).toBeVisible();
      await expect(page.getByText('2 metas neste filtro')).toBeVisible();

      const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/metas-rebrand-${viewport.name}.png`,
        fullPage: true
      });
    }
  });
});
