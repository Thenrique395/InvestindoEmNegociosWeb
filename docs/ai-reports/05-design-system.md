# 05 — Design System: Padronização do Dashboard

> Skill: `ui-design-system` · Data: 2026-07-03

## Estado do design system do projeto

O projeto já possui uma base sólida e o Dashboard a consome corretamente:

- **Tokens** em `src/styles/design-tokens.scss` (131 linhas): cores semânticas
  (`--color-primary|success|danger|warning|info` + variantes `-text/-weak/-soft`),
  superfícies (`--surface`..`--surface-3`), texto (`--text`, `--text-secondary`,
  `--text-muted`), bordas, espaçamento (`--spacing-1..10`), raios
  (`--radius-sm/md/...`), sombras e séries de gráfico (`--color-chart-*`).
- **Styleguide vivo** em `/styleguide` (rota dev-only) com tokens e componentes.
- **Componentes compartilhados** em `src/app/shared/`: stat-card, status-badge,
  tooltip, donut-chart, section-card, page-header, filter-bar, modal,
  form-field, empty-state, toast, etc.

## Aderência do Dashboard (por categoria pedida)

| Categoria | Situação | Observação |
| --- | --- | --- |
| **Cores** | ✅ Aderente | KPIs, badges e gradientes usam tokens; donuts usam `--color-chart-*`. ⚠️ Exceções pontuais: classes Tailwind-like hardcoded `rose-500/10`, `amber-300/60`, `emerald-500/10` etc. nos getters `insight*ToneClass` do TS — deveriam ser `--color-danger-weak`/`--color-warning-soft`/... |
| **Botões** | ⚠️ Parcial | Seletor de período e CTAs são estilizados inline no template em vez de classe utilitária/componente de botão; consistentes visualmente, mas duplicam ~10 linhas de classes por botão. |
| **Cards** | ✅ Aderente | Seções seguem o mesmo padrão (`rounded-2xl border bg-[var(--surface)] shadow-[var(--shadow-sm)]`). ⚠️ Raios mistos: `rounded-2xl` (seções) vs `rounded-[12px]` (cards internos) — mapear para `--radius-lg`/`--radius-md`. |
| **Inputs** | N/A | Dashboard não tem formulários (form-field compartilhado existe para outras telas). |
| **Tabelas/Listas** | ✅ Aderente | Movimentos recentes e vencimentos usam padrão de lista em card com status-badge compartilhado. |
| **Tipografia** | ⚠️ Parcial | Boa hierarquia (`clamp()` no h1, uppercase tracking em eyebrows), mas tamanhos hardcoded (`text-[0.8125rem]`, `text-[0.875rem]`) convivem com tokens (`--text-sm`, `--text-xs`). Padronizar nos tokens tipográficos. |
| **Espaçamento** | ✅ Aderente | `--spacing-*` usado na maioria; alguns `gap-2/gap-3` utilitários equivalentes. |
| **Componentes compartilhados** | ⚠️ Parcial | Usa stat-card, status-badge e tooltip. **Não usa** `DonutChartComponent` (donut artesanal duplicado) nem `EmptyStateComponent`/`SectionCardComponent` onde caberiam. |

## Inconsistência mais relevante

**Donut duplicado.** `home.component` constrói donut via `buildConicGradient`
(utils) + SCSS próprio (`.expense-donut*`), enquanto Relatórios e Investimentos
usam `shared/donut-chart` (OnPush, signals, hover-tip). Consolidar exige antes
adicionar ao componente compartilhado: variante compacta, total no centro e
legenda top-N — sem isso a troca removeria funcionalidade (proibido nesta
rodada). Planejado como fase F3 no relatório 03.

## Ações desta rodada

Nenhuma mudança visual foi necessária para manter consistência — as correções
aplicadas (roteamento, aria, acentuação) não afetam o design system. As
padronizações abaixo ficam como backlog priorizado:

1. **P1** — Consolidar donuts no `DonutChartComponent` (fase F3).
2. **P2** — Substituir cores hardcoded (`rose-*`, `amber-*`, `emerald-*`,
   `sky-*`, `slate-*`) nos getters de tom por tokens semânticos.
3. **P2** — Extrair botão segmentado (período) como componente compartilhado
   `segmented-control` — o padrão se repete em outras telas (metas: visão
   progresso/aporte).
4. **P3** — Normalizar raios (`rounded-[12px]` → `var(--radius-md)`) e
   tamanhos de fonte hardcoded → tokens tipográficos.
