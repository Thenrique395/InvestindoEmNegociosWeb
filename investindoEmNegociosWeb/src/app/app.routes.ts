import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home.component';
import { CalculatorComponent } from './calculator/calculator.component';
import { CartoesComponent } from './cartoes/cartoes.component';
import { ReceitasComponent } from './receitas/receitas.component';
import { DespesasComponent } from './despesas/despesas.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { authGuard } from './auth.guard';
import { LandingComponent } from './landing.component';
import { MetasComponent } from './metas/metas.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { UserPreferencesComponent } from './user-preferences/user-preferences.component';
import { UserSecurityComponent } from './user-security/user-security.component';
import { UserDataComponent } from './user-data/user-data.component';
import { InvestmentsComponent } from './investments/investments.component';
import { CategoriesComponent } from './categories/categories.component';

export const routes: Routes = [
  { path: '', component: LandingComponent, pathMatch: 'full' },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'onboarding', component: OnboardingComponent, canActivate: [authGuard] },
  { path: 'calculadora', component: CalculatorComponent, canActivate: [authGuard] },
  { path: 'calculadora/:id', component: CalculatorComponent, canActivate: [authGuard] },
  { path: 'cartoes', component: CartoesComponent, canActivate: [authGuard] },
  { path: 'receitas', component: ReceitasComponent, canActivate: [authGuard] },
  { path: 'despesas', component: DespesasComponent, canActivate: [authGuard] },
  { path: 'investimentos', component: InvestmentsComponent, canActivate: [authGuard] },
  { path: 'categorias', component: CategoriesComponent, canActivate: [authGuard] },
  { path: 'metas', component: MetasComponent, canActivate: [authGuard] },
  { path: 'perfil', component: UserProfileComponent, canActivate: [authGuard] },
  { path: 'preferencias', component: UserPreferencesComponent, canActivate: [authGuard] },
  { path: 'seguranca', component: UserSecurityComponent, canActivate: [authGuard] },
  { path: 'dados', component: UserDataComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
