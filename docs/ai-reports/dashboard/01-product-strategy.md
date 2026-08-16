# Dashboard — 01 Product Strategy (rodada 2: melhoria completa por perfil)

> Skill: `product-strategist` · Data: 2026-07-03

## Objetivo

Elevar o dashboard ao nível "SaaS financeiro premium" para os 3 perfis,
diferenciando por **valor entregue e permissão**, nunca por inconsistência
visual — e usando apenas dados que o frontend já recebe.

## O que gera valor real por perfil (com dado já disponível)

### Basic — "entender o mês e agir"
| Informação | Fonte já disponível | Status |
| --- | --- | --- |
| Saldo/receitas/despesas/resultado do mês | KPIs existentes | Manter |
| Principais categorias de gasto | `expenseCategorySlices` | Melhorar legenda |
| Evolução simples (últimos 3 meses) | Computável de `expensesRaw`/`incomesRaw` | **NOVO** |
| Próximos vencimentos | `expensesRaw` (status aberto + vencimento) | **NOVO** |
| Alertas básicos + CTA cadastrar | Insights heurísticos existentes | Manter |
| CTA de upgrade honesto | rota `/planos` | **NOVO** |

### Intermediate — "comparar e antecipar"
| Informação | Fonte | Status |
| --- | --- | --- |
| Comparativo receitas × despesas × saldo (6 meses) | Computável de raw | **NOVO (gráfico)** |
| Análise por categoria | Donuts existentes | Melhorar |
| Recorrências | `subscriptionsSummary` | Manter |
| Metas | `metasResumo`/`metasDetalhe` | Manter |
| "O que observar" + "Ações recomendadas" | `insightHighlights`/`insightTodoItems` (hoje escondidos no modal Detalhes) | **NOVO (superfície)** |
| Alertas de tendência | `cashflowProjection`/`riskAssessment` | Manter |
| CTA upgrade p/ Advanced | rota `/planos` | **NOVO** |

### Advanced — "visão consolidada e estratégica"
Tudo do Intermediate + patrimônio (resumo/histórico), saldos por conta,
mapa de dívidas, saúde IA — já existem; ganham o mesmo padrão visual e o
gráfico de fluxo mensal por cima.

## Princípios de produto aplicados

1. **Sem funcionalidade fantasma:** seções bloqueadas não aparecem "desbotadas";
   o upsell é um card explícito de upgrade com lista do que será liberado.
2. **Mesma linguagem visual nos 3 perfis** (cards, tipografia, grid, gráficos).
3. **Dados honestos:** gráficos novos derivam dos mesmos números dos KPIs
   (receitas = recebidas; despesas = por vencimento) para não gerar conflito
   de leitura. Nenhuma regra de negócio alterada.
4. **Erro visível:** falha de carregamento de seção passa a ser comunicada
   (banner discreto), não silenciosa.

## Métricas de sucesso

- `typecheck`, `test:ci`, `build:prod` verdes; E2E de roles 5/5.
- 3 perfis com gráfico de evolução no mesmo padrão visual.
- Zero mudança em guards/roles/endpoints.
