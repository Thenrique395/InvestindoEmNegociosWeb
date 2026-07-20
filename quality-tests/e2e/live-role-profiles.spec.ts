import { expect, test } from '@playwright/test';
import { AdminRobotsPage } from './support/page-objects/admin-robots.page';
import { AdminUsersPage } from './support/page-objects/admin-users.page';
import { CategoriesPage } from './support/page-objects/categories.page';
import { ExpensesPage } from './support/page-objects/expenses.page';
import { InvestmentsPage } from './support/page-objects/investments.page';
import { NavigationComponent } from './support/page-objects/navigation.component';
import { getMissingLiveCredentialReason, loginWithSeededProfile } from './support/live-auth';

test.describe('live role profiles', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('Intermediate exibe menu compatível com o perfil e libera importação de fatura', async ({ page }) => {
    test.skip(!!getMissingLiveCredentialReason('intermediate'), getMissingLiveCredentialReason('intermediate')!);

    await loginWithSeededProfile(page, 'intermediate');
    const navigation = new NavigationComponent(page);
    const expensesPage = new ExpensesPage(page);

    await navigation.expectLinkVisible('Dashboard');
    await navigation.expectLinkVisible('Despesas');
    await navigation.expectLinkVisible('Receitas');
    await navigation.expectLinkVisible('Calendário');
    await navigation.expectLinkVisible('Cartões');
    await navigation.expectLinkVisible('Contas');
    await navigation.expectLinkVisible('Categorias');
    await navigation.expectLinkHidden('Investimentos');

    await expensesPage.goto();
    await expensesPage.expectInvoiceImportAvailable();
  });

  test('Intermediate acessa calendario mas nao investimentos nem admin', async ({ page }) => {
    test.skip(!!getMissingLiveCredentialReason('intermediate'), getMissingLiveCredentialReason('intermediate')!);

    await loginWithSeededProfile(page, 'intermediate');

    await page.goto('/calendario', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/calendario$/i, { timeout: 20000 });
    await expect(page.getByText('Calendário financeiro')).toBeVisible();

    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 20000 });

    await page.goto('/admin/parametros', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 20000 });
  });

  test('Advanced exibe wealth no menu e carrega ações principais de investimentos', async ({ page }) => {
    test.skip(!!getMissingLiveCredentialReason('advanced'), getMissingLiveCredentialReason('advanced')!);

    await loginWithSeededProfile(page, 'advanced');
    const navigation = new NavigationComponent(page);
    const investmentsPage = new InvestmentsPage(page);

    await navigation.expectLinkVisible('Dashboard');
    await navigation.expectLinkVisible('Calendário');
    await navigation.expectLinkVisible('Categorias');
    await navigation.expectLinkVisible('Investimentos');

    await investmentsPage.goto();
    await investmentsPage.expectAccessControls();
    await investmentsPage.openAnalysisTab();
  });

  test('Advanced acessa investimentos e calendario mas nao admin', async ({ page }) => {
    test.skip(!!getMissingLiveCredentialReason('advanced'), getMissingLiveCredentialReason('advanced')!);

    await loginWithSeededProfile(page, 'advanced');
    const investmentsPage = new InvestmentsPage(page);

    await investmentsPage.goto();
    await investmentsPage.expectSummaryVisible();

    await page.goto('/calendario', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/calendario$/i, { timeout: 20000 });
    await expect(page.getByText('Calendário financeiro')).toBeVisible();

    await page.goto('/admin/parametros', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 20000 });
  });

  test('Admin exibe menus administrativos e carrega módulos críticos', async ({ page }) => {
    test.skip(!!getMissingLiveCredentialReason('admin'), getMissingLiveCredentialReason('admin')!);

    await loginWithSeededProfile(page, 'admin');
    const navigation = new NavigationComponent(page);
    const categoriesPage = new CategoriesPage(page);
    const adminRobotsPage = new AdminRobotsPage(page);

    await navigation.expectLinkVisible('Dashboard');
    await navigation.expectLinkVisible('Categorias');
    await navigation.expectLinkVisible('Investimentos');
    await navigation.expectLinkVisible('Usuários');
    await navigation.expectLinkVisible('Parâmetros');
    await navigation.expectLinkVisible('Robôs');

    await categoriesPage.goto();
    // Admin vê as categorias de sistema inline na lista unificada (card "Minhas categorias").
    await expect(page.getByText('Minhas categorias')).toBeVisible();

    await adminRobotsPage.goto();
    await adminRobotsPage.expectRunAllAvailable();
  });

  test('Admin acessa telas administrativas reais', async ({ page }) => {
    test.skip(!!getMissingLiveCredentialReason('admin'), getMissingLiveCredentialReason('admin')!);

    await loginWithSeededProfile(page, 'admin');
    const adminUsersPage = new AdminUsersPage(page);

    await page.goto('/admin/parametros', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin\/parametros$/i, { timeout: 20000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Parâmetros do sistema' })).toBeVisible();

    await adminUsersPage.goto();
    await adminUsersPage.expectUserVisible('thenrique395@gmail.com');
  });
});
