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
    path: 'design-lab/componentes',
    data: { preload: false },
    loadComponent: () => import('./design-lab/components-showcase.component').then((m) => m.ComponentsShowcaseComponent)
  },

  {
    path: 'planos',
    data: { preload: true },
    loadComponent: () => import('./pricing/pricing.component').then((m) => m.PricingComponent)
  },

  { path: '**', redirectTo: '' }
];
