import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { loginIntoOnboarding } from './support/onboarding-flow';

/**
 * Leva até o passo dos lançamentos iniciais. O helper compartilhado
 * (onboarding-flow) ainda procura rótulos que a tela não usa mais, então a
 * navegação vive aqui até aquele arquivo ser atualizado.
 */
async function irParaLancamentosIniciais(page: Parameters<typeof setupAuthenticatedApp>[0]) {
  await loginIntoOnboarding(page, 'atalhos.e2e@example.com', 'senha-e2e-123');

  // Foco inicial e preferências: escolher a primeira opção basta para avançar.
  for (const passo of [1, 2]) {
    await page.locator('.onboarding-choice').first().click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    expect(passo).toBeGreaterThan(0);
  }

  // Dados básicos já vêm preenchidos pelo perfil do harness.
  await page.getByRole('button', { name: /^Salvar e continuar/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: /primeiros movimentos/ })).toBeVisible();
}


/**
 * O formulário de despesa inicial do onboarding oferece "Cadastrar cartão".
 * Enquanto o guard devolvia toda rota para /onboarding, o clique não ia a lugar
 * nenhum — daí esta cobertura. Categoria não tem atalho: a opção de criar fica
 * escondida no onboarding.
 */
test.describe('onboarding — atalho para cartões', () => {
  test('cartões abre com o cadastro inicial pendente e oferece a volta', async ({ page }) => {
    await setupAuthenticatedApp(page, { onboardingCompleted: false });

    await page.goto('/cartoes');

    await expect(page).toHaveURL(/\/cartoes$/);
    await expect(page.locator('.onb-return')).toContainText('Cadastro inicial em andamento');

    await page.locator('.onb-return__action').click();
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test('as demais rotas continuam presas no onboarding', async ({ page }) => {
    await setupAuthenticatedApp(page, { onboardingCompleted: false });

    await page.goto('/despesas');
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.goto('/categorias');
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  // Categoria segue outra regra: no cadastro inicial só se usa o que já existe,
  // porque sair para criar uma perderia o lançamento em preenchimento.
  test('os modais iniciais não oferecem criar categoria', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Basic',
      profileName: 'Atalhos E2E',
      email: 'atalhos.e2e@example.com',
      onboardingCompleted: false,
      skipSession: true
    });
    await irParaLancamentosIniciais(page);

    await page.getByRole('button', { name: /Adicionar receita/i }).first().click();
    const receita = page.getByRole('dialog');
    await receita.getByRole('combobox', { name: /Categoria/ }).first().click();
    await expect(page.getByRole('option').first()).toBeVisible();
    await expect(page.getByText('Criar nova categoria')).toHaveCount(0);
    await receita.getByRole('button', { name: /Cancelar/i }).click();

    await page.getByRole('button', { name: /Adicionar despesa/i }).first().click();
    const despesa = page.getByRole('dialog');
    await despesa.getByRole('combobox', { name: /Categoria/ }).first().click();
    await expect(page.getByRole('option').first()).toBeVisible();
    await expect(page.getByText('Criar nova categoria')).toHaveCount(0);
  });

  test('fora do onboarding o atalho continua disponível', async ({ page }) => {
    await setupAuthenticatedApp(page);

    await page.goto('/despesas');
    await page.getByRole('button', { name: /Adicionar despesa/i }).first().click();
    await page.getByRole('dialog').getByRole('combobox', { name: 'Categoria da despesa' }).click();

    await expect(page.getByText('Criar nova categoria')).toBeVisible();
  });

  test('quem já concluiu não vê a faixa de volta', async ({ page }) => {
    await setupAuthenticatedApp(page);

    await page.goto('/cartoes');

    await expect(page.locator('.cards-page')).toBeVisible();
    await expect(page.locator('.onb-return')).toHaveCount(0);
  });
});
