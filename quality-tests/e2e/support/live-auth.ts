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

export function buildLiveUser(workerIndex: number, retry: number) {
  const uniqueSuffix = `${Date.now()}${workerIndex}${retry}`;
  return {
    email: `codex.live.${uniqueSuffix}@example.com`,
    password: `Codex@${uniqueSuffix.slice(-8)}`,
    fullName: `Codex Live ${uniqueSuffix.slice(-6)}`
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
    await page.waitForTimeout(2500);
  }

  await expect(page).toHaveURL(/\/(onboarding|dashboard)$/i, { timeout: 30000 });
  await expect.poll(async () => page.evaluate(() => !!window.localStorage.getItem('access_token'))).toBeTruthy();
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

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Crie sua conta gratuita' })).toBeVisible();

  await page.getByLabel('Nome completo').fill(user.fullName);
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByLabel('Senha').fill(user.password);
  await page.getByRole('checkbox').check();

  let signedUp = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.getByRole('button', { name: 'Criar conta e entrar' }).click();
    signedUp = await page
      .getByRole('heading', { level: 3, name: 'Crie sua conta gratuita' })
      .waitFor({ state: 'hidden', timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (signedUp) break;
    await page.waitForTimeout(2000);
  }

  await expect(page.getByRole('heading', { level: 3, name: 'Crie sua conta gratuita' })).toBeHidden({ timeout: 30000 });

  await loginWithLiveCredential(page, user);

  return user;
}

export async function completeLiveOnboarding(page: Page, workerIndex: number, retry: number) {
  const user = await signUpAndLogin(page, workerIndex, retry);

  await expect(page).toHaveURL(/\/onboarding$/i, { timeout: 30000 });
  await expect(page.getByRole('heading', { level: 2, name: 'Vamos configurar seu perfil' })).toBeVisible();

  await page.getByText('Melhorar vida financeira').click();
  await page.getByLabel(/Nome completo/).fill('Codex Live Usuario');
  await page.getByLabel('CPF').fill('52998224725');
  await page.getByLabel('Telefone').fill('81995257823');
  await page.getByLabel('Data de nascimento').fill('1991-05-20');
  await page.getByLabel('Cidade').fill('Recife');
  await page.getByLabel('Estado (UF)').fill('PE');
  await page.getByLabel('País').fill('Brasil');

  let movedToAccountStep = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByRole('button', { name: 'Salvar e continuar para conta' }).click();
    movedToAccountStep = await page
      .getByRole('heading', { level: 2, name: 'Crie sua primeira conta' })
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (movedToAccountStep) break;
    await page.waitForTimeout(1500);
  }

  await expect(page.getByRole('heading', { level: 2, name: 'Crie sua primeira conta' })).toBeVisible();
  const accountNameInput = page.getByPlaceholder('Ex.: Nubank');
  if (await accountNameInput.isVisible().catch(() => false)) {
    await accountNameInput.fill('Conta teste live');
    await page.locator('input[type="number"]').fill('1500');
    await page.getByRole('button', { name: 'Criar conta' }).click();
  }
  await expect(page.getByText('Conta ativa configurada. Você já pode concluir o onboarding.')).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Continuar para receita e despesa' }).click();

  await expect(page.getByRole('heading', { level: 2, name: 'Cadastre sua primeira receita e despesa' })).toBeVisible();

  const openIncomeModal = async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const button = page.getByRole('button', { name: 'Adicionar receita' });
      const visible = await button.isVisible().catch(() => false);
      if (!visible) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { level: 2, name: 'Cadastre sua primeira receita e despesa' })).toBeVisible();
      }
      await page.getByRole('button', { name: 'Adicionar receita' }).click();
      const opened = await page
        .getByRole('heading', { level: 3, name: 'Adicionar receita' })
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      if (opened) return;
      await page.waitForTimeout(1500);
    }
  };

  await openIncomeModal();
  await expect(page.getByRole('heading', { level: 3, name: 'Adicionar receita' })).toBeVisible();
  await page.getByLabel('Fonte').fill('Salario teste live');
  await page.locator('select[name="categoria"]').first().selectOption({ index: 1 });
  await page.locator('input[name="valor"]').fill('500000');
  await page.locator('input[name="recebimento"]').fill('09032026');
  await page.getByRole('button', { name: 'Salvar receita' }).click();
  await expect(page.getByText('Receita inicial cadastrada.')).toBeVisible({ timeout: 20000 });

  const openExpenseModal = async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.getByRole('button', { name: 'Adicionar despesa' }).click();
      const opened = await page
        .getByRole('heading', { level: 3, name: 'Adicionar lançamento' })
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      if (opened) return;
      await page.waitForTimeout(1500);
    }
  };

  await openExpenseModal();
  await expect(page.getByRole('heading', { level: 3, name: 'Adicionar lançamento' })).toBeVisible();
  await page.getByLabel('Nome da despesa').fill('Mercado teste live');
  await page.locator('select[name="categoria"]').last().selectOption({ index: 1 });
  await page.locator('input[name="valor"]').last().fill('9000');
  await page.locator('input[name="vencimento"]').fill('09032026');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByText('Despesa inicial cadastrada.')).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: 'Concluir onboarding' }).click();
  await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 30000 });
  await expect(page.getByRole('heading', { level: 1, name: /Visão geral de/i })).toBeVisible();
  await expect(page.getByText('Saldo Disponível Real')).toBeVisible();

  return user;
}

export async function openUserMenu(page: Page) {
  await new UserMenuComponent(page).open();
}
