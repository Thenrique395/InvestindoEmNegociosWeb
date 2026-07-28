import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'calculadora/:id', renderMode: RenderMode.Server },
  { path: 'despesas', renderMode: RenderMode.Prerender },
  { path: 'cartoes', renderMode: RenderMode.Prerender },
  { path: 'receitas', renderMode: RenderMode.Prerender },
  // Ferramenta só de desenvolvimento (bloqueada em produção pelo devOnlyGuard) — nunca deve ser
  // pré-renderizada como HTML estático no build de produção.
  { path: 'styleguide', renderMode: RenderMode.Client },
  { path: 'styleguide/tokens', renderMode: RenderMode.Client },
  { path: 'styleguide/components/:slug', renderMode: RenderMode.Client },
  // Página de AÇÃO com token na query: não pode ser pré-renderizada estática (o prerender roda
  // no build, sem token). Renderiza só no cliente para o componente montar e confirmar o e-mail.
  { path: 'confirmar-email', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender }
];
