# 06 — Clean Code: Revisão do Dashboard

> Skill: `clean-code` · Data: 2026-07-03 · Alvo: `home.component.{ts,html,scss}` + utils

## Princípio aplicado

"Refatorar apenas o necessário" — nesta rodada o critério foi: **corrigir o que
é bug ou texto errado; registrar (sem executar) refatorações que exigem plano
e baseline de testes**, conforme fases F1–F4 do relatório 03.

## Achados

### 1. Componente grande demais (God Component) — REGISTRADO (fase F1/F2)

`home.component.ts` tem 2.105 linhas e ~15 responsabilidades: duas variantes
de dashboard, orquestração de 10+ endpoints, motor de precedência de insights,
onboarding, gráficos e formatação. Já existe boa extração parcial
(`utils/home-insight.utils.ts`, `utils/status.ts`, `utils/locale-utils.ts`),
mas o corpo principal segue monolítico.

**Por que não refatorar agora:** o smoke spec (`home.component.smoke.spec.ts`)
instancia o componente com 11 argumentos posicionais de construtor — qualquer
extração/mudança de DI quebra o spec e exige reescrita conjunta com TestBed.
Mudança grande → precisa de rodada dedicada com baseline E2E.

### 2. Duplicação: dois blocos de donut quase idênticos no template — REGISTRADO (fase F3)

`home.component.html` repete ~30 linhas para "Despesas por categoria" e
"Receitas por categoria" (só mudam dados e cores). A solução correta não é um
`@for` local, e sim consolidar no `DonutChartComponent` compartilhado —
depende de evolução do componente para não perder o total central.

### 3. Duplicação: 3 botões de período idênticos — REGISTRADO (P2 do relatório 05)

Mesmas ~8 linhas de classes repetidas 3×. Candidato a componente
`segmented-control` reutilizável (padrão repete em Metas). Não extraído agora
para não criar componente novo sem aprovação visual.

### 4. Nomes — BOM no geral, mistura de idiomas — REGISTRADO

Convivem `somarDespesasMes`/`atualizarSaldo` (pt) com `loadDebtSummary`/
`updateInsight` (en). Não é bug; padronizar idioma numa rodada de baixo risco
junto à fase F4. Nomes são descritivos — sem "x", "data2", etc.

### 5. Campos `Subscription` manuais + `takeUntilDestroyed` — MANTIDO (não é dead code)

Os campos `subRealBalance`, `subDebtSummary`, etc. parecem redundantes com
`takeUntilDestroyed`, mas têm função real: `unsubscribe()` antes de recarregar
quando o usuário troca o período (evita corrida entre respostas). Remover
causaria bug sutil. Alternativa futura (F4): `switchMap` sobre um
`Subject`/signal de período.

### 6. Over-engineering — NÃO ENCONTRADO

Sem abstrações especulativas; getters são diretos; heurísticas de insight
têm fallback claro por precedência.

### 7. Correções aplicadas nesta rodada (baixo risco)

| Arquivo | Correção |
| --- | --- |
| `home.component.html` | Rota do atalho de movimento conforme o tipo (bug) |
| `home.component.html` | `aria-label` com acentuação correta (2 donuts) |
| `home.component.html` | `aria-pressed`/`role="group"` no seletor de período |
| `home.component.ts` | "fim do mes" → "fim do mês" |

## Resumo

Nenhuma refatoração estrutural foi executada — os problemas estruturais reais
(itens 1–3) exigem plano faseado já documentado no relatório 03 e aprovação
prévia, conforme as regras do trabalho. O código novo introduzido é mínimo e
segue o estilo existente do template.
