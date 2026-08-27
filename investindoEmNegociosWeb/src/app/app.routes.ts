import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { publicHomeGuard } from './core/public-home.guard';
import { devOnlyGuard } from './core/dev-only.guard';
import { APP_FEATURE_KEYS } from './core/features';

export const routes: Routes = [
  {
    path: '',
    canActivate: [publicHomeGuard],
    data: { preload: true },
    pathMatch: 'full',
    loadComponent: () => import('./features/site/vendas/vendas.component').then((m) => m.VendasComponent),
  },
  {
    // Tour do produto. Era a home até o redesign; a landing de conversão tomou a `/`.
    path: 'produto',
    data: { preload: false },
    loadComponent: () => import('./features/site/produto/produto.component').then((m) => m.ProdutoComponent),
  },
  {
    path: 'termos',
    data: { preload: false, slug: 'termos' },
    loadComponent: () => import('./features/site/legal/legal-page.component').then((m) => m.LegalPageComponent),
  },
  {
    path: 'privacidade',
    data: { preload: false, slug: 'privacidade' },
    loadComponent: () => import('./features/site/legal/legal-page.component').then((m) => m.LegalPageComponent),
  },
  {
    path: 'planos',
    data: { preload: true },
    loadComponent: () => import('./features/site/planos/planos.component').then((m) => m.PlanosComponent),
  },
  {
    path: 'checkout',
    data: { preload: true },
    loadComponent: () => import('./features/checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'checkout/sucesso',
    data: { preload: false },
    loadComponent: () =>
      import('./features/checkout-status/checkout-success.component').then((m) => m.CheckoutSuccessComponent),
  },
  {
    path: 'checkout/pendente',
    data: { preload: false },
    loadComponent: () =>
      import('./features/checkout-status/checkout-pending.component').then((m) => m.CheckoutPendingComponent),
  },
  {
    path: 'checkout/falha',
    data: { preload: false },
    loadComponent: () =>
      import('./features/checkout-status/checkout-failure.component').then((m) => m.CheckoutFailureComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./features/dashboard/home.component').then((m) => m.HomeComponent),
  },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  {
    path: 'login',
    data: { preload: true },
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    data: { preload: false },
    loadComponent: () => import('./features/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'forgot-password',
    data: { preload: false },
    loadComponent: () =>
      import('./features/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    data: { preload: false },
    loadComponent: () =>
      import('./features/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'calculadora',
    data: { preload: true },
    loadComponent: () => import('./features/calculator/calculator.component').then((m) => m.CalculatorComponent),
  },
  {
    path: 'calculadora/:id',
    data: { preload: false },
    loadComponent: () => import('./features/calculator/calculator.component').then((m) => m.CalculatorComponent),
  },
  {
    path: 'cartoes',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.cardsRead, preload: false },
    loadComponent: () => import('./features/cartoes/cartoes.component').then((m) => m.CartoesComponent),
  },
  {
    path: 'contas',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.accountsRead, preload: false },
    loadComponent: () => import('./features/contas/contas.component').then((m) => m.ContasComponent),
  },
  {
    path: 'receitas',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./features/receitas/receitas.component').then((m) => m.ReceitasComponent),
  },
  {
    path: 'calendario',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./features/calendario/calendario.component').then((m) => m.CalendarioComponent),
  },
  {
    path: 'despesas',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./features/despesas/despesas.component').then((m) => m.DespesasComponent),
  },
  {
    path: 'investimentos',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.investmentsAccess, preload: false },
    loadComponent: () => import('./features/investments/investments.component').then((m) => m.InvestmentsComponent),
  },
  {
    path: 'categorias',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.categoriesRead, preload: false },
    loadComponent: () => import('./features/categories/categories.component').then((m) => m.CategoriesComponent),
  },
  {
    path: 'metas',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./features/metas/metas.component').then((m) => m.MetasComponent),
  },
  {
    path: 'emprestimos',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Intermediate', preload: false },
    loadComponent: () => import('./features/loans/loans.component').then((m) => m.LoansComponent),
  },
  {
    path: 'emprestimos/:id',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Intermediate', preload: false },
    loadComponent: () => import('./features/loans/loan-detail/loan-detail.component').then((m) => m.LoanDetailComponent),
  },
  {
    path: 'snapshots',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Intermediate', preload: false },
    loadComponent: () =>
      import('./features/monthly-snapshots/monthly-snapshots.component').then((m) => m.MonthlySnapshotsComponent),
  },
  {
    path: 'assistente',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Intermediate', preload: false },
    loadComponent: () => import('./features/assistant/assistant.component').then((m) => m.AssistantComponent),
  },
  {
    path: 'orcamento',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.budgetAccess, preload: false },
    loadComponent: () => import('./features/orcamento/orcamento.component').then((m) => m.OrcamentoComponent),
  },
  {
    path: 'simulador',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.scenariosAccess, preload: false },
    loadComponent: () => import('./features/cenarios/cenarios.component').then((m) => m.CenariosComponent),
  },
  {
    path: 'relatorios',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.reportsAccess, preload: false },
    loadComponent: () => import('./features/relatorios/relatorios.component').then((m) => m.RelatoriosComponent),
  },
  {
    path: 'assinatura',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () =>
      import('./features/subscriptions/subscriptions.component').then((m) => m.SubscriptionsComponent),
  },
  {
    path: 'perfil',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./features/user-profile/user-profile.component').then((m) => m.UserProfileComponent),
  },
  {
    path: 'preferencias',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () =>
      import('./features/user-preferences/user-preferences.component').then((m) => m.UserPreferencesComponent),
  },
  {
    path: 'seguranca',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () =>
      import('./features/user-security/user-security.component').then((m) => m.UserSecurityComponent),
  },
  {
    path: 'espacos',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () =>
      import('./features/espacos/espacos.component').then((m) => m.EspacosComponent),
  },
  {
    path: 'dados',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./features/user-data/user-data.component').then((m) => m.UserDataComponent),
  },
  {
    path: 'admin/usuarios',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.adminUsersManage, preload: false },
    loadComponent: () =>
      import('./features/admin-users/admin-users.component').then((m) => m.AdminUsersComponent),
  },
  {
    path: 'admin/parametros',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.adminParametersManage, preload: false },
    loadComponent: () =>
      import('./features/admin-parameters/admin-parameters.component').then((m) => m.AdminParametersComponent),
  },
  {
    path: 'admin/robots',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.adminRobotsManage, preload: false },
    loadComponent: () =>
      import('./features/admin-robots/admin-robots.component').then((m) => m.AdminRobotsComponent),
  },
  {
    path: 'styleguide',
    canActivate: [devOnlyGuard],
    loadComponent: () =>
      import('./features/styleguide/styleguide-shell.component').then((m) => m.StyleguideShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/styleguide/styleguide-overview.component').then((m) => m.StyleguideOverviewComponent),
      },
      {
        path: 'tokens',
        loadComponent: () =>
          import('./features/styleguide/styleguide-tokens.component').then((m) => m.StyleguideTokensComponent),
      },
      {
        path: 'components/:slug',
        loadComponent: () =>
          import('./features/styleguide/styleguide-component-detail.component').then((m) => m.StyleguideComponentDetailComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
