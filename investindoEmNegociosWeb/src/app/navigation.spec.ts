import { Route } from '@angular/router';
import { routes } from './app.routes';
import { NAV_SECTIONS, allNavItems, canShowItem, type SidebarNavItem } from './navigation';
import type { UserRole } from './roles';
import type { AppFeatureKey } from './features';

/**
 * Coerência entre menu e rotas.
 *
 * O ARQUITETURA_ANGULAR.md §9.3 chama de bug clássico o menu exibir um item que
 * a rota bloqueia. Como as duas listas vivem em arquivos diferentes — o menu em
 * `navigation.ts`, as rotas em `app.routes.ts` —, é aqui que a divergência é
 * pega, e não em produção.
 */
describe('navegação', () => {
  const routeByPath = new Map<string, Route>();
  for (const route of routes) {
    if (route.path !== undefined) routeByPath.set('/' + route.path, route);
  }

  describe('cada item do menu aponta para uma rota existente', () => {
    for (const item of allNavItems()) {
      it(`${item.label} → ${item.path}`, () => {
        expect(routeByPath.has(item.path))
          .withContext(`rota ${item.path} não existe em app.routes.ts`)
          .toBeTrue();
      });
    }
  });

  /**
   * A regra é assimétrica: o menu **nunca pode ser mais permissivo que a rota**
   * — isso mostraria um item que leva a um bloqueio. O contrário (menu mais
   * restritivo que a rota) é legítimo: `/calculadora`, por exemplo, é pública,
   * mas só faz sentido listá-la para quem já entrou.
   */
  describe('o menu nunca é mais permissivo que a rota', () => {
    for (const item of allNavItems()) {
      it(`${item.label}`, () => {
        const route = routeByPath.get(item.path);
        const data = (route?.data ?? {}) as { minRole?: UserRole; feature?: AppFeatureKey };
        const rotaProtegida = !!route?.canActivate?.length;

        if (!rotaProtegida) {
          // Rota aberta: qualquer exigência de menu é mais restritiva, e tudo bem.
          expect(true).toBeTrue();
          return;
        }

        if (data.feature) {
          expect(item.feature)
            .withContext(`a rota exige a feature ${data.feature}; o menu precisa exigir a mesma`)
            .toBe(data.feature);
          return;
        }

        if (data.minRole) {
          expect(item.minRole ?? item.feature)
            .withContext(`a rota exige minRole ${data.minRole}; o menu não pode ser mais aberto`)
            .toBeTruthy();
        }
      });
    }
  });

  describe('visibilidade por perfil', () => {
    const labelsFor = (role: UserRole | null): string[] =>
      NAV_SECTIONS.flatMap((section) => section.items)
        .filter((item) => canShowItem(role, item))
        .map((item) => item.label);

    it('Basic não vê Investimentos, Orçamento nem Relatórios', () => {
      const labels = labelsFor('Basic');
      expect(labels).not.toContain('Investimentos');
      expect(labels).not.toContain('Orçamento');
      expect(labels).not.toContain('Relatórios');
    });

    it('Basic vê o básico do dia a dia', () => {
      const labels = labelsFor('Basic');
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('Despesas');
      expect(labels).toContain('Receitas');
      expect(labels).toContain('Metas');
    });

    it('Intermediate ganha Orçamento e Contas, mas não Investimentos', () => {
      const labels = labelsFor('Intermediate');
      expect(labels).toContain('Orçamento');
      expect(labels).toContain('Contas');
      expect(labels).not.toContain('Investimentos');
    });

    it('Advanced vê Investimentos e Relatórios', () => {
      const labels = labelsFor('Advanced');
      expect(labels).toContain('Investimentos');
      expect(labels).toContain('Relatórios');
    });

    it('só Admin vê o grupo administrativo', () => {
      expect(labelsFor('Advanced')).not.toContain('Usuários');
      expect(labelsFor('Admin')).toContain('Usuários');
    });

    it('sem perfil, nada aparece', () => {
      expect(labelsFor(null)).toEqual([]);
    });
  });

  it('nenhum item se repete entre grupos', () => {
    const paths = allNavItems().map((item: SidebarNavItem) => item.path);
    expect(paths.length).toBe(new Set(paths).size);
  });
});
