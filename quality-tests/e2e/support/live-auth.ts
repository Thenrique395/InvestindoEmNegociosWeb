import { expect, type Page } from '@playwright/test';
import { LoginPage } from './page-objects/login.page';
import { UserMenuComponent } from './page-objects/user-menu.component';

export type LiveProfile = 'intermediate' | 'advanced' | 'admin';

export type LiveCredential = {
  email: string;
  password: string;
  fullName?: string;
};

const PROFILE_ENV_MAP: Record<LiveProfile, { email: string; password: string }> = {
  intermediate: {
    email: 'LIVE_INTERMEDIATE_EMAIL',
    password: 'LIVE_INTERMEDIATE_PASSWORD'
  },
  advanced: {
    email: 'LIVE_ADVANCED_EMAIL',
    password: 'LIVE_ADVANCED_PASSWORD'
  },
  admin: {
    email: 'LIVE_ADMIN_EMAIL',
    password: 'LIVE_ADMIN_PASSWORD'
  }
};

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

export function buildLiveUser(workerIndex: number, retry: number) {
  const uniqueSuffix = `${Date.now()}${workerIndex}${retry}`;
  return {
    email: `codex.live.${uniqueSuffix}@example.com`,
    password: `Codex@${uniqueSuffix.slice(-8)}`,
    fullName: `Codex Live ${uniqueSuffix.slice(-6)}`,
    cpf: buildValidCpf(uniqueSuffix)
  };
}

export function getSeededLiveCredential(profile: LiveProfile): LiveCredential | null {
  const map: Record<LiveProfile, { email: string; password: string; fullName: string }> = {
    intermediate: {
      email: process.env['LIVE_INTERMEDIATE_EMAIL'] ?? '',
      password: process.env['LIVE_INTERMEDIATE_PASSWORD'] ?? '',
      fullName: 'Codex Intermediate'
    },
    advanced: {
      email: process.env['LIVE_ADVANCED_EMAIL'] ?? '',
      password: process.env['LIVE_ADVANCED_PASSWORD'] ?? '',
      fullName: 'Codex Advanced'
    },
    admin: {
      email: process.env['LIVE_ADMIN_EMAIL'] ?? '',
      password: process.env['LIVE_ADMIN_PASSWORD'] ?? '',
      fullName: 'Codex Admin'
    }
  };

  const credential = map[profile];
  if (!credential.email || !credential.password) {
    return null;
  }

  return credential;
}

export function getMissingLiveCredentialEnv(profile: LiveProfile) {
  const required = PROFILE_ENV_MAP[profile];
  return [required.email, required.password].filter((envName) => !process.env[envName]);
}

export function getMissingLiveCredentialReason(profile: LiveProfile) {
  const missing = getMissingLiveCredentialEnv(profile);
  if (missing.length === 0) {
    return null;
  }

  return `Credenciais ${profile} nao configuradas. Defina: ${missing.join(', ')}.`;
}

export async function loginWithLiveCredential(page: Page, credential: LiveCredential) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  let loggedIn = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await loginPage.login(credential.email, credential.password);
    loggedIn = await page
      .waitForURL(/\/(onboarding|dashboard)$/i, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (loggedIn) break;
    await expect(page.locator('form').getByRole('button', { name: /Entrar no dashboard/i })).toBeVisible({ timeout: 10000 });
  }

  await expect(page).toHaveURL(/\/(onboarding|dashboard)$/i, { timeout: 30000 });
  // access_token agora é cookie httpOnly — não dá para ler via page.evaluate(); confirmamos
  // via API de automação do Playwright, que tem acesso ao cookie jar do browser.
  await expect.poll(async () => {
    const cookies = await page.context().cookies();
    return cookies.some((cookie) => cookie.name === 'access_token');
  }).toBeTruthy();
}

export async function loginWithSeededProfile(page: Page, profile: LiveProfile) {
  const credential = getSeededLiveCredential(profile);
  if (!credential) {
    throw new Error(`Credenciais live ausentes para o perfil ${profile}.`);
  }

  await loginWithLiveCredential(page, credential);
  return credential;
}

export async function signUpAndLogin(page: Page, workerIndex: number, retry: number) {
  const user = buildLiveUser(workerIndex, retry);

  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Vamos começar' })).toBeVisible();

  await page.getByLabel('Nome completo').fill(user.fullName);
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByLabel('CPF').fill(user.cpf);
  await page.getByPlaceholder('Digite sua senha').fill(user.password);
  await page.getByPlaceholder('Confirme sua senha').fill(user.password);
  await page.getByLabel('Li e aceito os termos de uso e a política de privacidade.').check();

  let signedUp = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.getByRole('button', { name: 'Criar conta agora' }).click();
    signedUp = await page
      .waitForURL(/\/login$/i, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (signedUp) break;
    await expect(page.getByRole('button', { name: 'Criar conta agora' })).toBeEnabled({ timeout: 10000 });
  }

  await expect(page).toHaveURL(/\/login$/i, { timeout: 30000 });

  await loginWithLiveCredential(page, user);

  return user;
}

export async function completeLiveOnboarding(page: Page, workerIndex: number, retry: number) {
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

export async function openUserMenu(page: Page) {
  await new UserMenuComponent(page).open();
}
