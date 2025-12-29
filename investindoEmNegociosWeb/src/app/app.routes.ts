import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home.component';
import { CalculatorComponent } from './calculator/calculator.component';
import { CartoesComponent } from './cartoes/cartoes.component';
import { RendasComponent } from './rendas/rendas.component';
import { DespesasComponent } from './despesas/despesas.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'calculadora', component: CalculatorComponent },
  { path: 'calculadora/:id', component: CalculatorComponent },
  { path: 'cartoes', component: CartoesComponent },
  { path: 'rendas', component: RendasComponent },
  { path: 'despesas', component: DespesasComponent },
  { path: '**', redirectTo: '' }
];
