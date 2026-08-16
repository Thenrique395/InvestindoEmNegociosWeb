# Dashboard — 03 Arquitetura e plano técnico

> Skills: `senior-architect` + `software-architecture` + `angular` · Data: 2026-07-03

## Mapa de arquivos do dashboard

| Arquivo | Papel |
| --- | --- |
| `src/app/home.component.{ts,html,scss}` | Componente da rota `/dashboard` (2 variantes por perfil) |
| `src/app/home.component.smoke.spec.ts` | Spec Karma — instancia por construtor posicional (11 args) → **construtor não pode mudar** |
| `src/app/utils/home-insight.utils.ts` | Heurísticas de insight/health/score |
| `src/app/utils/{locale-utils,status}.ts` | Formatação e status compartilhados |
| `src/app/shared/{stat-card,status-badge,tooltip,donut-chart,empty-state…}` | Design system |
| `src/app/app.routes.ts:46` | Rota com `authGuard`+`roleGuard` (minRole Basic) |
| `src/app/roles.ts` (`hasAtLeastRole`) | Diferenciação Basic < Intermediate < Advanced (< Admin) |

**Como o sistema diferencia perfis:** `roleGuard` na rota + `hasAccess(minRole)`
no template + revalidação em cada `load*()` antes de chamar API. `isBasicProfile`
seleciona a variante de template. **Nada disso será alterado.**

## Decisões

| # | Decisão | Racional |
| --- | --- | --- |
| A1 | Gráficos em CSS/SVG puro, sem lib | SSR seguro, bundle enxuto, consistente com donuts atuais |
| A2 | Novos componentes standalone + OnPush + `input()` signals em `src/app/dashboard/` | Padrão Angular moderno; apresentação isolada; HomeComponent segue orquestrando dados |
| A3 | Agregação mensal em util puro + spec | Testável sem TestBed; espelha somas existentes (não muda regra) |
| A4 | Construtor e ordem de DI do HomeComponent intocados | Preserva smoke spec e minimiza risco |
| A5 | Erros de carregamento acumulam em `Set<string>` + banner único dismissível | "Mensagens de erro" com 1 ponto de UI, sem tocar cada seção |
| A6 | Breakpoint do template unificado em 960px (era 980 vs 960 no SCSS) | Elimina faixa inconsistente |

## Componentes novos (contratos)

```
dashboard/monthly-flow-chart.component  inputs: points: MonthlyFlowPoint[]
                                                title, subtitle: string
dashboard/upcoming-due-list.component   inputs: items: UpcomingDueItem[]
dashboard/insight-actions.component     inputs: observations: string[]
                                                actions: InsightActionItem[]
dashboard/upgrade-cta.component         inputs: planLabel, features: string[]
utils/monthly-flow.utils.ts             buildMonthlyFlowSeries(expenses, incomes,
                                        reference, monthsCount): MonthlyFlowPoint[]
```

`MonthlyFlowPoint = { key, label, income, expense, balance }` — income só
recebidas (`isIncomeReceived`), expense por mês de vencimento (mesmas regras
dos KPIs). `UpcomingDueItem` = despesas abertas vencidas (tom danger) ou
vencendo em ≤14 dias (warn ≤7, info ≤14), ordenadas, máx. 5.

## Integração por perfil (template)

- **Basic:** após "Situação do mês": fluxo mensal (3 meses) + próximos
  vencimentos + upgrade CTA (Intermediate).
- **Int/Adv:** fluxo mensal (6 meses) após o bloco "Resultado do mês";
  `InsightActionsComponent` logo após o banner de insight; upgrade CTA
  (Advanced) apenas para Intermediate (`!hasAccess('Advanced')`).
- Donuts: legenda completa (remove `| slice:0:5` — a fatia "Outros" já é
  agregada no TS e hoje fica sem legenda).

## Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Quebrar smoke spec Karma | Construtor intocado; novos campos com defaults |
| Divergência gráfico × KPI | Util espelha somas existentes; spec compara com casos conhecidos |
| SSR (Date no servidor) | Cálculos idem aos existentes (`dataAtual = new Date()` já usado); sem `window`/`document` |
| Regressão de permissões | Seções novas condicionadas aos mesmos `isBasicProfile`/`hasAccess`; E2E role-regression valida |
| CLS/layout shift | Gráficos com alturas fixas; skeleton existente mantido |

## Sequência de implementação

1. Util + spec → 2. componentes novos → 3. wiring no HomeComponent (campos +
`updateMonthlyFlow()`/`updateUpcomingDue()` chamados nos subscribes existentes;
`loadErrors`) → 4. template (Basic, Int/Adv, donuts, breakpoints) →
5. `typecheck`/`quality:frontend` → 6. Playwright 3 perfis × 3 viewports.
