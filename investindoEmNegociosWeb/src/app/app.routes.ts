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
  { path: '**', redirectTo: '' }
];
