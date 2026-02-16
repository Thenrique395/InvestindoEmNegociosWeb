import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home.component';
import { CalculatorComponent } from './calculator/calculator.component';
import { CartoesComponent } from './cartoes/cartoes.component';
import { ReceitasComponent } from './receitas/receitas.component';
import { DespesasComponent } from './despesas/despesas.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { authGuard } from './auth.guard';
import { MetasComponent } from './metas/metas.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { UserPreferencesComponent } from './user-preferences/user-preferences.component';
import { UserSecurityComponent } from './user-security/user-security.component';
import { UserDataComponent } from './user-data/user-data.component';
import { InvestmentsComponent } from './investments/investments.component';
import { CategoriesComponent } from './categories/categories.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { roleGuard } from './role.guard';
import { AdminParametersComponent } from './admin-parameters/admin-parameters.component';
import { ProductShowcaseComponent } from './product-showcase/product-showcase.component';
import { publicHomeGuard } from './public-home.guard';

export const routes: Routes = [
  { path: '', component: ProductShowcaseComponent, canActivate: [publicHomeGuard], pathMatch: 'full' },
  { path: 'produto-showcase', component: ProductShowcaseComponent },
  { path: 'dashboard', component: HomeComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Basic' } },
  { path: 'home', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'onboarding', component: OnboardingComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Basic' } },
  { path: 'calculadora', component: CalculatorComponent },
  { path: 'calculadora/:id', component: CalculatorComponent },
  { path: 'cartoes', component: CartoesComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Intermediate' } },
  { path: 'receitas', component: ReceitasComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Basic' } },
  { path: 'despesas', component: DespesasComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Basic' } },
  { path: 'investimentos', component: InvestmentsComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Advanced' } },
  { path: 'categorias', component: CategoriesComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Basic' } },
  { path: 'metas', component: MetasComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Intermediate' } },
  { path: 'perfil', component: UserProfileComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Basic' } },
  { path: 'preferencias', component: UserPreferencesComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Basic' } },
  { path: 'seguranca', component: UserSecurityComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Basic' } },
  { path: 'dados', component: UserDataComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Basic' } },
  { path: 'admin/usuarios', component: AdminUsersComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Admin' } },
  { path: 'admin/parametros', component: AdminParametersComponent, canActivate: [authGuard, roleGuard], data: { minRole: 'Admin' } },
  { path: '**', redirectTo: '' }
];
