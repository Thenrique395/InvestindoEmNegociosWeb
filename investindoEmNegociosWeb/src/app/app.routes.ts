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
    loadComponent: () => import('./product-showcase/product-showcase.component').then((m) => m.ProductShowcaseComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./home.component').then((m) => m.HomeComponent)
  },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  {
    path: 'login',
    data: { preload: true },
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    data: { preload: false },
    loadComponent: () => import('./forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    data: { preload: false },
    loadComponent: () => import('./reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  {
    path: 'onboarding',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./onboarding/onboarding.component').then((m) => m.OnboardingComponent)
  },
  {
    path: 'calculadora',
    data: { preload: true },
    loadComponent: () => import('./calculator/calculator.component').then((m) => m.CalculatorComponent)
  },
  {
    path: 'calculadora/:id',
    data: { preload: false },
    loadComponent: () => import('./calculator/calculator.component').then((m) => m.CalculatorComponent)
  },
  {
    path: 'cartoes',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.cardsAccess, preload: false },
    loadComponent: () => import('./cartoes/cartoes.component').then((m) => m.CartoesComponent)
  },
  {
    path: 'contas',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.accountsAccess, preload: false },
    loadComponent: () => import('./contas/contas.component').then((m) => m.ContasComponent)
  },
  {
    path: 'receitas',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./receitas/receitas.component').then((m) => m.ReceitasComponent)
  },
  {
    path: 'calendario',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Intermediate', preload: false },
    loadComponent: () => import('./calendario/calendario.component').then((m) => m.CalendarioComponent)
  },
  {
    path: 'despesas',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./despesas/despesas.component').then((m) => m.DespesasComponent)
  },
  {
    path: 'investimentos',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.investmentsAccess, preload: false },
    loadComponent: () => import('./investments/investments.component').then((m) => m.InvestmentsComponent)
  },
  {
    path: 'categorias',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.categoriesAccess, preload: false },
    loadComponent: () => import('./categories/categories.component').then((m) => m.CategoriesComponent)
  },
  {
    path: 'metas',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./metas/metas.component').then((m) => m.MetasComponent)
  },
  {
    path: 'perfil',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./user-profile/user-profile.component').then((m) => m.UserProfileComponent)
  },
  {
    path: 'preferencias',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./user-preferences/user-preferences.component').then((m) => m.UserPreferencesComponent)
  },
  {
    path: 'seguranca',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./user-security/user-security.component').then((m) => m.UserSecurityComponent)
  },
  {
    path: 'dados',
    canActivate: [authGuard, roleGuard],
    data: { minRole: 'Basic', preload: false },
    loadComponent: () => import('./user-data/user-data.component').then((m) => m.UserDataComponent)
  },
  {
    path: 'admin/usuarios',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.adminUsersManage, preload: false },
    loadComponent: () => import('./admin-users/admin-users.component').then((m) => m.AdminUsersComponent)
  },
  {
    path: 'admin/parametros',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.adminParametersManage, preload: false },
    loadComponent: () => import('./admin-parameters/admin-parameters.component').then((m) => m.AdminParametersComponent)
  },
  {
    path: 'admin/robots',
    canActivate: [authGuard, roleGuard],
    data: { feature: APP_FEATURE_KEYS.adminRobotsManage, preload: false },
    loadComponent: () => import('./admin-robots/admin-robots.component').then((m) => m.AdminRobotsComponent)
  },
  { path: '**', redirectTo: '' }
];
