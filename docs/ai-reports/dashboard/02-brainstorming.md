# Dashboard — 02 Brainstorming (gráficos, insights e seções por perfil)

> Skill: `brainstorming` · Data: 2026-07-03

## Ideias avaliadas (YAGNI aplicado)

| Ideia | Perfis | Dado disponível? | Decisão |
| --- | --- | --- | --- |
| Gráfico de fluxo mensal (receitas × despesas × resultado, barras agrupadas) | Basic (3m) / Int+Adv (6m) | ✅ `expensesRaw`/`incomesRaw` | **FAZER** — componente único p/ consistência |
| Próximos vencimentos (lista com urgência) | Basic | ✅ `expensesRaw` (status aberto) | **FAZER** (Int/Adv já têm no Mapa de Dívidas) |
| Seções "O que observar" + "Ações recomendadas" na página | Int/Adv | ✅ `insightHighlights`/`insightChangesToday`/`insightTodoItems` | **FAZER** — hoje só aparecem no modal "Detalhes" |
| Card de upgrade honesto | Basic → Int; Int → Adv | ✅ rota `/planos` | **FAZER** |
| Banner de erro de carregamento por seção | Todos | ✅ callbacks de erro existentes | **FAZER** (leve) |
| Legenda completa dos donuts (remover corte `slice:0:5` que esconde a fatia "Outros") | Todos | ✅ | **FAZER** |
| Linha de tendência/projeção no gráfico mensal | Adv | `cashflowProjection` é diária, não mensal | ADIAR — mistura granularidade |
| Heatmap de gastos por dia | Int+ | Computável | ADIAR — baixo valor vs. custo |
| Biblioteca de gráficos (Chart.js/ECharts) | — | — | **REJEITADO** — CSS/SVG puro atende, mantém SSR simples e bundle enxuto (regra: sem lib nova sem justificativa) |
| Score de saúde gauge animado | Int+ | ✅ | ADIAR — score já aparece no modal; evitar duplicação |
| Distribuição por tipo de investimento | Adv | ❌ dashboard não recebe posições (só total em `netWorthSummary`) | ADIAR — exigiria nova chamada de API |

## Formato dos gráficos novos (padrão único)

- Barras verticais agrupadas por mês: verde (`--color-chart-income`) para
  entradas, vermelho (`--color-chart-expense`) para saídas; resultado do mês
  como rótulo com sinal e cor semântica.
- Tooltip CSS no hover (mesmo padrão do `donut-chart` compartilhado).
- Valores em `appCurrency`; eixo implícito (altura relativa ao maior valor).
- Empty state educativo com CTA.
- Título + subtítulo explicativos; legenda com dots coloridos.
- Mobile: barras encolhem com `minmax`, rótulos abreviados (mês curto).

## Componentização decidida

Novos standalone components (OnPush) em `src/app/dashboard/`:

1. `MonthlyFlowChartComponent` — gráfico de fluxo mensal (reuso nos 3 perfis).
2. `UpcomingDueListComponent` — próximos vencimentos (Basic).
3. `InsightActionsComponent` — "O que observar" + "Ações recomendadas" (Int/Adv).
4. `UpgradeCtaComponent` — card de upgrade (Basic e Intermediate).

Lógica de agregação vai para util puro `utils/monthly-flow.utils.ts`
(+ spec Karma), espelhando as regras existentes de soma (receitas recebidas,
despesas por vencimento) sem alterá-las.
