import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { publicHomeGuard } from './public-home.guard';
import { APP_FEATURE_KEYS } from './features';

export const routes: Routes = [
  {
    path: '',
    canActivate: [publicHomeGuard],
    data: { preload: true },
    pathMatch: 'full',
    loadComponent: () =>
      import('./product-showcase/product-showcase.component').then((m) => m.ProductShowcaseComponent),
  },
  {
    path: 'planos',
    data: { preload: true },
    loadComponent: () => import('./pricing/pricing.component').then((m) => m.PricingComponent),
  },
  {
    path: 'checkout',
    data: { preload: true },
    loadComponent: () => import('./checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'checkout/sucesso',
    data: { preload: false },
    loadComponent: () =>
      import('./checkout-status/checkout-success.component').then((m) => m.CheckoutSuccessComponent),
  },
  {
    path: 'checkout/pendente',
    data: { preload: false },
    loadComponent: () =>
      import('./checkout-status/checkout-pending.component').then((m) => m.CheckoutPendingComponent),
  },
  {
    path: 'checkout/falha',
    data: { preload: false },
    loadComponent: () =>
      import('./checkout-status/checkout-failure.component').then((m) => m.CheckoutFailureComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./home.component').then((m) => m.HomeComponent),
  },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  {
    path: 'login',
    data: { preload: true },
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    data: { preload: false },
    loadComponent: () => import('./signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'forgot-password',
    data: { preload: false },
    loadComponent: () =>
      import('./forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    data: { preload: false },
    loadComponent: () =>
      import('./reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () =>
      import('./onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'calculadora',
    data: { preload: true },
    loadComponent: () => import('./calculator/calculator.component').then((m) => m.CalculatorComponent),
  },
  {
    path: 'calculadora/:id',
    data: { preload: false },
    loadComponent: () => import('./calculator/calculator.component').then((m) => m.CalculatorComponent),
  },
  {
    path: 'design-lab',
    pathMatch: 'full',
    redirectTo: 'design-lab/sidebar',
  },
  {
    path: 'design-lab/componentes',
    data: { preload: false },
    loadComponent: () =>
      import('./design-lab/components-showcase.component').then((m) => m.ComponentsShowcaseComponent),
  },
  {
    path: 'design-lab/telas',
    data: { preload: false, section: 'screens' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/sidebar',
    data: { preload: false, section: 'sidebar' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/topbar',
    data: { preload: false, section: 'topbar' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/page-header',
    data: { preload: false, section: 'page-header' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/kpi-card',
    data: { preload: false, section: 'kpi-card' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/botoes',
    data: { preload: false, section: 'buttons' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/forms',
    data: { preload: false, section: 'forms' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/cards',
    data: { preload: false, section: 'cards' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/tables',
    data: { preload: false, section: 'tables' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/states',
    data: { preload: false, section: 'states' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/modals',
    data: { preload: false, section: 'modals' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'design-lab/navigation',
    data: { preload: false, section: 'navigation' },
    loadComponent: () => import('./design-lab/design-lab.component').then((m) => m.DesignLabComponent),
  },
  {
    path: 'cartoes',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.cardsRead, preload: false },
    loadComponent: () => import('./cartoes/cartoes.component').then((m) => m.CartoesComponent),
  },
  {
    path: 'contas',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.accountsManage, preload: false },
    loadComponent: () => import('./contas/contas.component').then((m) => m.ContasComponent),
  },
  {
    path: 'receitas',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./receitas/receitas.component').then((m) => m.ReceitasComponent),
  },
  {
    path: 'calendario',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Intermediate', preload: false },
    loadComponent: () => import('./calendario/calendario.component').then((m) => m.CalendarioComponent),
  },
  {
    path: 'despesas',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./despesas/despesas.component').then((m) => m.DespesasComponent),
  },
  {
    path: 'investimentos',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.investmentsAccess, preload: false },
    loadComponent: () => import('./investments/investments.component').then((m) => m.InvestmentsComponent),
  },
  {
    path: 'categorias',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Intermediate', preload: false },
    loadComponent: () => import('./categories/categories.component').then((m) => m.CategoriesComponent),
  },
  {
    path: 'metas',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./metas/metas.component').then((m) => m.MetasComponent),
  },
  {
    path: 'emprestimos',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Intermediate', preload: false },
    loadComponent: () => import('./loans/loans.component').then((m) => m.LoansComponent),
  },
  {
    path: 'snapshots',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Intermediate', preload: false },
    loadComponent: () =>
      import('./monthly-snapshots/monthly-snapshots.component').then((m) => m.MonthlySnapshotsComponent),
  },
  {
    path: 'assistente',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Intermediate', preload: false },
    loadComponent: () => import('./assistant/assistant.component').then((m) => m.AssistantComponent),
  },
  {
    path: 'assinatura',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () =>
      import('./subscriptions/subscriptions.component').then((m) => m.SubscriptionsComponent),
  },
  {
    path: 'perfil',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./user-profile/user-profile.component').then((m) => m.UserProfileComponent),
  },
  {
    path: 'preferencias',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () =>
      import('./user-preferences/user-preferences.component').then((m) => m.UserPreferencesComponent),
  },
  {
    path: 'seguranca',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () =>
      import('./user-security/user-security.component').then((m) => m.UserSecurityComponent),
  },
  {
    path: 'dados',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./user-data/user-data.component').then((m) => m.UserDataComponent),
  },
  {
    path: 'admin/usuarios',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.adminUsersManage, preload: false },
    loadComponent: () =>
      import('./admin-users/admin-users.component').then((m) => m.AdminUsersComponent),
  },
  {
    path: 'admin/parametros',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.adminParametersManage, preload: false },
    loadComponent: () =>
      import('./admin-parameters/admin-parameters.component').then((m) => m.AdminParametersComponent),
  },
  {
    path: 'admin/robots',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.adminRobotsManage, preload: false },
    loadComponent: () =>
      import('./admin-robots/admin-robots.component').then((m) => m.AdminRobotsComponent),
  },
  { path: '**', redirectTo: '' },
];
