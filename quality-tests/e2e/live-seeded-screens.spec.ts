import { expect, test, type Page } from '@playwright/test';
import { getMissingLiveCredentialReason, loginWithSeededProfile } from './support/live-auth';

/**
 * Regressão de renderização de telas contra o BANCO REAL, usando as contas de
 * teste semeadas (login rápido, sem criar usuário). Complementa live-role-profiles
 * (que cobre o gating de menu) verificando que cada tela liberada abre e renderiza
 * seu cabeçalho — sem mocks.
 *
 * Modelo estável: login com conta existente + navegação por rota direta. Evita o
 * fluxo lento/flaky de signUpAndLogin + onboarding.
 */

type ScreenCheck = { path: string; assert: (page: Page) => Promise<void> };

// Nível-agnóstico: telas variam entre h1 (page-header) e h2 (period-hero).
function heading(_level: 1 | 2 | 3, name: string | RegExp) {
  return async (page: Page) => {
    await expect(page.getByRole('heading', { name }).first()).toBeVisible({ timeout: 15000 });
  };
}

function text(value: string) {
  return async (page: Page) => {
    await expect(page.getByText(value).first()).toBeVisible({ timeout: 15000 });
  };
}

// Telas liberadas para Intermediate (e Advanced). Título = h1 do app-page-header.
const commonScreens: ScreenCheck[] = [
  { path: '/dashboard', assert: heading(1, 'Visão Geral Financeira') },
  { path: '/despesas', assert: heading(1, /^Despesas de/) },
  { path: '/receitas', assert: heading(1, /^Receitas de/) },
  { path: '/cartoes', assert: heading(1, 'Seus cartões e ciclos de fatura') },
  { path: '/contas', assert: heading(1, 'Contas') },
  { path: '/categorias', assert: heading(1, 'Categorias') },
  { path: '/calendario', assert: heading(1, 'Calendário Financeiro') },
  { path: '/metas', assert: heading(1, 'Metas') },
  { path: '/orcamento', assert: heading(1, /^Orçamento ·/) },
  { path: '/relatorios', assert: text('Relatório financeiro') },
  { path: '/emprestimos', assert: heading(1, 'Empréstimos e amortização') },
  { path: '/simulador', assert: heading(1, 'Simulador de cenários') },
  { path: '/assistente', assert: heading(1, 'Pergunte com contexto real') },
  { path: '/assinatura', assert: heading(1, 'Minha assinatura') }
];

const advancedOnlyScreens: ScreenCheck[] = [
  { path: '/investimentos', assert: heading(1, 'Carteira e evolução') }
];

async function checkScreens(page: Page, screens: ScreenCheck[]) {
  for (const screen of screens) {
    await test.step(`abre ${screen.path}`, async () => {
      await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(new RegExp(`${screen.path.replace(/\//g, '\\/')}(\\?.*)?$`), { timeout: 20000 });
      await screen.assert(page);
    });
  }
}

test.describe('live seeded screens', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('Intermediate renderiza todas as telas liberadas do plano', async ({ page }) => {
    test.skip(!!getMissingLiveCredentialReason('intermediate'), getMissingLiveCredentialReason('intermediate')!);

    await loginWithSeededProfile(page, 'intermediate');
    await checkScreens(page, commonScreens);
  });

  test('Advanced renderiza as telas comuns e as de investimentos', async ({ page }) => {
    test.skip(!!getMissingLiveCredentialReason('advanced'), getMissingLiveCredentialReason('advanced')!);

    await loginWithSeededProfile(page, 'advanced');
    await checkScreens(page, [...commonScreens, ...advancedOnlyScreens]);
  });
});
