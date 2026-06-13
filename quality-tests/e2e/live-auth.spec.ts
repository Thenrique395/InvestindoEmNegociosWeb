import { expect, test, type Page } from '@playwright/test';

function calculateCpfVerifier(base: string, startWeight: number): number {
  const sum = base
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * (startWeight - index), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function buildValidCpf(seed: string): string {
  let base = seed.replace(/\D/g, '').padEnd(9, '0').slice(-9);
  if (/^(\d)\1{8}$/.test(base)) {
    base = `1${base.slice(1)}`;
  }
  const firstVerifier = calculateCpfVerifier(base, 10);
  const secondVerifier = calculateCpfVerifier(`${base}${firstVerifier}`, 11);
  return `${base}${firstVerifier}${secondVerifier}`;
}

function buildLiveUser(workerIndex: number, retry: number) {
  const uniqueSuffix = `${Date.now()}${workerIndex}${retry}`;
  return {
    email: `codex.live.${uniqueSuffix}@example.com`,
    password: `Codex@${uniqueSuffix.slice(-8)}`,
    fullName: `Codex Live ${uniqueSuffix.slice(-6)}`,
    cpf: buildValidCpf(uniqueSuffix)
  };
}

async function signUpAndLogin(page: Page, workerIndex: number, retry: number) {
  const user = buildLiveUser(workerIndex, retry);

  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Vamos começar' })).toBeVisible();

  await page.getByLabel('Nome completo').fill(user.fullName);
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByLabel('CPF').fill(user.cpf);
  await page.getByPlaceholder('Digite sua senha').fill(user.password);
  await page.getByPlaceholder('Confirme sua senha').fill(user.password);
  await page.getByLabel('Li e aceito os termos de uso e a política de privacidade.').check();
  await page.getByRole('button', { name: 'Criar conta agora' }).click();

  await expect(page).toHaveURL(/\/login$/, { timeout: 30000 });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('E-mail').fill(user.email);
  await page.getByPlaceholder('Digite sua senha').fill(user.password);

  let loggedIn = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.locator('form').getByRole('button', { name: 'Entrar' }).click();
    loggedIn = await page
      .waitForURL(/\/(onboarding|dashboard)$/i, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (loggedIn) break;
    await expect(page.locator('form').getByRole('button', { name: 'Entrar' })).toBeVisible({ timeout: 10000 });
    // O endpoint de login tem rate limit de 5 req/min; aguarda a janela resetar antes de tentar de novo.
    await page.waitForTimeout(65000);
  }

  await expect(page).toHaveURL(/\/(onboarding|dashboard)$/i, { timeout: 30000 });
  await expect.poll(async () => page.evaluate(() => !!window.localStorage.getItem('access_token'))).toBeTruthy();

  return user;
}

async function completeLiveOnboarding(page: Page, workerIndex: number, retry: number) {
  const user = await signUpAndLogin(page, workerIndex, retry);

  await expect(page).toHaveURL(/\/onboarding$/i, { timeout: 30000 });

  // Passo 1 de 4: objetivo inicial.
  await expect(page.getByRole('heading', { level: 2, name: 'Vamos definir seu foco inicial' })).toBeVisible();
  await page.getByText('Melhorar vida financeira', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuar para preferências' }).click();

  // Passo 2 de 4: preferências iniciais.
  await expect(page.getByRole('heading', { level: 2, name: 'Escolha suas preferências' })).toBeVisible();
  await page.getByText('Balanceado', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuar para dados básicos' }).click();

  // Passo 3 de 4: dados básicos do perfil.
  await expect(page.getByRole('heading', { level: 2, name: 'Dados Básicos' })).toBeVisible();
  const cpfField = page.getByLabel('CPF');
  if ((await cpfField.getAttribute('readonly')) === null) {
    await cpfField.fill(user.cpf);
  }
  await page.getByLabel('Telefone').fill('81995257823');
  await page.getByLabel('Data de nascimento').fill('1991-05-20');
  await page.getByLabel('Cidade').fill('Recife');
  await page.getByLabel('Estado (UF)').fill('PE');
  await page.getByLabel('País').fill('Brasil');
  await page.getByRole('button', { name: 'Salvar e continuar para conta e lançamentos' }).click();

  // Passo 4 de 4: conta principal e primeiros lançamentos.
  await expect(page.getByRole('heading', { level: 2, name: /Ative sua conta/ })).toBeVisible();
  const accountReadyMessage = page.getByText('Conta principal criada. Agora você já pode registrar os primeiros lançamentos.');
  if (!(await accountReadyMessage.isVisible())) {
    await page.getByLabel('Nome da conta').fill('Conta teste live');
    await page.getByLabel('Saldo inicial').fill('1500');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(accountReadyMessage).toBeVisible({ timeout: 20000 });
  }

  await page.getByRole('button', { name: 'Adicionar receita' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Adicionar receita' })).toBeVisible();
  await page.getByLabel('Fonte').fill('Salario teste live');
  await page.locator('select[name="categoria"]').first().selectOption({ index: 1 });
  await page.locator('input[name="valor"]').fill('500000');
  await page.locator('input[name="recebimento"]').fill('09032026');
  await page.getByRole('button', { name: 'Salvar receita' }).click();
  await expect(page.getByText('Receita inicial cadastrada.')).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: 'Adicionar despesa' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Adicionar lançamento' })).toBeVisible();
  await page.getByLabel('Nome da despesa').fill('Mercado teste live');
  await page.locator('select[name="categoria"]').last().selectOption({ index: 1 });
  await page.locator('input[name="valor"]').last().fill('9000');
  await page.locator('input[name="vencimento"]').fill('09032026');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByText('Despesa inicial cadastrada.')).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: 'Concluir onboarding' }).click();
  await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 30000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Seu mês com clareza' })).toBeVisible();
  await expect(page.getByText('Quanto sobra')).toBeVisible();

  return user;
}

test.describe('live auth flow', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('conclui onboarding real e entra no dashboard autenticado', async ({ page }, testInfo) => {
    test.setTimeout(180000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
  });

  test('cria um cartao real e exibe na listagem', async ({ page }, testInfo) => {
    test.setTimeout(180000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const last4 = user.email.match(/(\d+)/)?.[1]?.slice(-4) || '4242';

    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Meus cartões' })).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar cartão' }).first().click();
    await page.getByLabel('Número do cartão').fill(`5555 4444 3333 ${last4}`);
    await page.getByLabel('Nome impresso no cartão').fill(`Cartao Live ${last4}`);
    await page.getByLabel('Banco (opcional)').fill('Banco Live');
    await page.getByLabel('Limite de crédito').fill('850000');
    await page.getByLabel('Dia do fechamento').fill('12');
    await page.getByLabel('Dia do vencimento').fill('20');
    await page.getByRole('button', { name: 'Salvar cartão' }).click();

    await expect(page.getByText(`Cartao Live ${last4}`)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(`•••• ${last4}`)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Fatura por competência')).toBeVisible();
  });

  test('exibe a conta principal real e respeita a restricao do plano Basic', async ({ page }, testInfo) => {
    test.setTimeout(180000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/contas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Contas' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Conta principal' })).toBeVisible();

    await page.getByLabel('Nome').fill('Reserva bloqueada live');
    await page.getByLabel('Saldo inicial').fill('300');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('No plano Basic a conta principal é gerenciada automaticamente. Faça upgrade para criar ou editar contas.')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { level: 3, name: 'Conta principal' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Reserva bloqueada live' })).toHaveCount(0);

    const principalAccount = page.locator('article').filter({ hasText: 'Conta principal' });
    await principalAccount.getByRole('button', { name: 'Ver extrato' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /Extrato: Conta principal/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Salario teste live' }).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('cell', { name: 'Mercado teste live' }).first()).toBeVisible({ timeout: 20000 });
  });
});
