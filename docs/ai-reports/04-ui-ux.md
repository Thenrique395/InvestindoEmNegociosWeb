# 04 — UI/UX: Revisão da experiência do Dashboard

> Skill: `ui-ux-pro-max` · Data: 2026-07-03 · Tela: `/dashboard` (HomeComponent)

## Avaliação por critério

### Layout e hierarquia — BOM

- Hierarquia clara: header com título/período → KPIs → seções por relevância
  (contas, patrimônio, dívidas, assinaturas, saúde IA, insights, metas,
  gráficos, movimentos).
- Perfil Basic tem experiência dedicada e guiada ("Seu mês com clareza"),
  correta para o momento do usuário — não sobrecarrega iniciante com
  patrimônio/dívidas.
- Cards usam tokens (`--surface`, `--border`, `--shadow-sm`, `--spacing-*`)
  de forma consistente; raios `rounded-2xl`/`[12px]` levemente mistos
  (ver relatório 05).

### Responsividade — BOM, com atenção

- Grids colapsam via `max-[980px]:grid-cols-1` e media query global (960px).
- ⚠️ Dois breakpoints próximos e distintos (980px no template, 960px no SCSS)
  podem gerar faixa de layout inconsistente entre 960–980px. Padronizar em
  rodada futura.
- Lista de movimentos usa `overflow-y-auto` com `min-h`; sem scroll horizontal.

### Usabilidade — BOM, com correções aplicadas

- ✅ **Corrigido nesta rodada:** atalho "Ver detalhes do movimento" levava
  sempre a `/despesas`; agora receitas navegam para `/receitas`.
- ✅ **Corrigido:** seletor de período (Mensal/Trimestral/Anual) agora expõe
  `aria-pressed` + `role="group"` — leitores de tela anunciam o estado ativo.
- Tooltips (`app-tooltip`) explicam cada KPI — ótimo para domínio financeiro.
- Botões de navegação de insight têm `aria-label` correto.

### Dashboards e gráficos — ACEITÁVEL, com dívida registrada

- Donuts por conic-gradient são leves (zero JS de gráfico, bom para SSR),
  com total no centro e legenda top-5 com percentuais.
- ✅ **Corrigido:** `aria-label` dos donuts sem acentuação.
- ⚠️ Legenda mostra só top-5 fatias sem indicar "outros" — se houver 6+
  categorias, o resto fica sem rótulo visível (o donut mostra a cor).
  Sugestão futura: agregar fatias excedentes em "Outras".
- ⚠️ Duplicação com `DonutChartComponent` compartilhado (Relatórios/
  Investimentos) — hover-tip e formatação divergem entre telas. Plano na
  fase F3 do relatório 03.
- Barra de histórico de patrimônio usa alturas relativas simples — adequado.

### Estados vazios e loading — BOM

- Skeleton (`dashboardKpiSkeleton`) durante carregamento em ambas variantes —
  evita layout shift (regra `content-jumping` ✓).
- Empty states presentes: "Sem despesas.", "Sem receitas por categoria.",
  "Sem movimentos recentes…" com call-to-action textual.
- Erros de API degradam para `null` e ocultam a seção — sem tela quebrada
  (⚠️ porém silencioso: usuário não sabe que a seção falhou; considerar
  banner discreto de "não foi possível carregar" em rodada futura).

### Checklist da skill (itens críticos)

| Item | Status |
| --- | --- |
| Ícones SVG consistentes (sem emoji) | ✅ SVG inline 24×24, `role="presentation"` |
| `aria-label` em botões icon-only | ✅ |
| Focus/keyboard | ✅ botões nativos `type="button"`; foco global no styles.scss |
| Touch targets ≥ 44px | ⚠️ atalhos circulares de 24–34px (padrão do app; revisar globalmente) |
| Transições 150–300ms sem layout shift | ✅ `transition` de cor/sombra |
| `prefers-reduced-motion` | ✅ tratado globalmente em styles.scss |
| Contraste (texto muted `#64748b` sobre `#f8fafc`) | ✅ ≈ 4,7:1 |

## Mudanças aplicadas nesta rodada

1. Link condicional por tipo no card de movimentos recentes.
2. `aria-pressed` + `role="group"` no seletor de período.
3. Acentuação em `aria-label` dos dois donuts e na dica "fim do mês".

## Recomendações futuras (sem código nesta rodada)

1. Unificar breakpoint 960/980px.
2. Agregar categorias excedentes em "Outras" nos donuts.
3. Feedback visível quando uma seção falha ao carregar.
4. Aumentar touch targets dos atalhos circulares para ≥ 40px em mobile.
