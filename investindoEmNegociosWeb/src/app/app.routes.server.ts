import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'calculadora/:id', renderMode: RenderMode.Server },
  { path: 'emprestimos/:id', renderMode: RenderMode.Server },
  { path: 'despesas', renderMode: RenderMode.Prerender },
  { path: 'cartoes', renderMode: RenderMode.Prerender },
  { path: 'receitas', renderMode: RenderMode.Prerender },
  // Ferramenta só de desenvolvimento (bloqueada em produção pelo devOnlyGuard) — nunca deve ser
  // pré-renderizada como HTML estático no build de produção.
  { path: 'styleguide', renderMode: RenderMode.Client },
  { path: 'styleguide/tokens', renderMode: RenderMode.Client },
  { path: 'styleguide/components/:slug', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender }
];
