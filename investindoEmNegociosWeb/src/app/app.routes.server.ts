import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'calculadora/:id', renderMode: RenderMode.Server },
  { path: 'despesas', renderMode: RenderMode.Prerender },
  { path: 'cartoes', renderMode: RenderMode.Prerender },
  { path: 'rendas', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Prerender }
];
