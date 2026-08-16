# 03 — Arquitetura: Plano técnico para o Dashboard

> Skills: `senior-architect` + `software-architecture` · Data: 2026-07-03
> Insumos: `01-product-strategy.md`, `02-brainstorming.md`

## Arquitetura atual (as-is)

```
/dashboard (authGuard + roleGuard, minRole: Basic, lazy loadComponent)
└── HomeComponent (standalone, ~2.105 linhas TS, ~1.028 HTML, ~594 SCSS)
    ├── Variante Basic ......... herói + guia + insight paginado + resumo + movimentos
    ├── Variante Int/Advanced .. KPIs + contas + patrimônio + dívidas + assinaturas
    │                            + saúde IA + insight engine + metas + donuts + movimentos
    ├── Fontes de dados ........ ApiDataService (expenses$/incomes$/cards$),
    │                            AccountsService (9 endpoints), GoalsService,
    │                            ProfileService, NotificationsService,
    │                            FinancialAssistantService, OnboardingService
    ├── Insights ............... 3 fontes com precedência: notificação do robô
    │                            → risk assessment → insight engine → heurística local
    └── Compartilhados usados .. StatCardComponent, StatusBadgeComponent,
                                 TooltipComponent, AppCurrencyPipe
```

**Pontos fortes:** rota lazy, standalone, `takeUntilDestroyed` em todas as
assinaturas, skeleton de carregamento, empty states, gating por role feito em
template via `hasAccess()` (com fallback também no servidor, pois cada `load*`
revalida `isLogged`/`hasAccess`), SSR com hydration habilitado.

**Dívidas identificadas:**

| # | Dívida | Impacto | Risco de correção |
| --- | --- | --- | --- |
| D1 | God component (2 experiências em 1 componente) | Manutenção cara, merge conflicts | Alto (split exige cuidado) |
| D2 | Change detection Default + ~60 getters recalculados a cada ciclo de CD com zone.js | CPU em interações; sem bug funcional | Médio (OnPush exige signals/markForCheck) |
| D3 | Constructor DI posicional + smoke spec instancia `new HomeComponent(...)` com 11 args | Frágil: qualquer novo serviço quebra o spec | Baixo, mas exige reescrever spec junto |
| D4 | Donuts artesanais duplicando o `DonutChartComponent` compartilhado (usado em Relatórios/Investimentos) | Inconsistência visual e de a11y | Médio (variante compacta com total central não existe no compartilhado) |
| D5 | Bug: atalho de movimento recente roteia sempre p/ `/despesas` | UX incorreta para receitas | **Baixo — corrigir agora** |
| D6 | A11y: aria-labels sem acento, seletor de período sem `aria-pressed` | Leitores de tela | **Baixo — corrigir agora** |
| D7 | Campos `Subscription` manuais coexistindo com `takeUntilDestroyed` | Redundância aceitável (cancelamento em recarga por período) | Não mexer agora |

## Decisão arquitetural desta rodada

Conforme opção B do brainstorming: **somente D5 e D6 entram em código nesta
rodada.** D1–D4 ficam planejadas abaixo. Não há mudança de backend: todos os
dados exibidos já vêm de endpoints existentes e nenhum contrato muda.

### Mudanças de código (escopo fechado)

1. `home.component.html`
   - Link de detalhe do movimento recente: `routerLink` condicional por tipo
     (`income → /receitas`, `expense → /despesas`).
   - `aria-label` dos donuts com acentuação correta.
   - Seletor de período: `role="group"` + `aria-label` no container e
     `[attr.aria-pressed]` nos 3 botões.
2. `home.component.ts`
   - Textos de dicas: "fim do mes" → "fim do mês".

**Invariantes garantidos:** nenhuma rota nova/removida, nenhuma mudança em
guards, roles ou gating; nenhum pacote novo; nenhum efeito em SSR (mudanças
são atributos estáticos e string de rota); nenhum contrato de API tocado.

## Plano faseado (próximas rodadas — não executar sem aprovação)

| Fase | Entrega | Pré-requisitos | Risco |
| --- | --- | --- | --- |
| F1 | Extrair `BasicDashboardComponent` (template `basic-home-*` + getters `basicDashboard*`) | Testes E2E de role passando como baseline | Médio |
| F2 | Extrair `InsightPanelComponent` + `DashboardInsightService` (precedência robô → risk → engine em um só lugar, testável isoladamente) | F1 | Médio |
| F3 | Variante compacta no `DonutChartComponent` (input `variant: 'compact'`, total no centro, legenda top-5) e troca no dashboard | Aprovação visual | Médio |
| F4 | Migração para `inject()` + Signals (`signal`/`computed` substituindo getters) + `OnPush`; reescrever smoke spec com `TestBed` | F1–F3 | Alto |

Cada fase deve passar `npm run quality:frontend` + smoke E2E antes de merge.

## Backend (.NET)

**Nenhuma alteração necessária.** A melhoria é integralmente de apresentação;
os endpoints de contas/insights/risco permanecem com contratos idênticos.
