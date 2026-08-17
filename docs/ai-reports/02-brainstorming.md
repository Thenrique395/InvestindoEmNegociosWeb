# 02 — Brainstorming: Alternativas para melhorar o Dashboard

> Skill: `brainstorming` · Data: 2026-07-03 · Insumo: `01-product-strategy.md`

## Problema a resolver

O Dashboard concentra duas experiências (Basic e Intermediate/Advanced) em um
único componente de ~2.100 linhas TS + ~1.000 HTML, com bugs pontuais de UX e
pequenas divergências do design system. A estratégia pede melhoria
**incremental, sem tocar regra de negócio, permissões, SSR ou onboarding**.

## Alternativas avaliadas

### Opção A — Reescrita ampla com Signals + split total (rejeitada)

Quebrar o HomeComponent em ~10 componentes standalone, migrar todo estado para
`signal()`/`computed()`, adotar `ChangeDetectionStrategy.OnPush` em tudo.

- ✅ Estado final ideal (Angular 21 moderno, performance máxima).
- ❌ Viola as regras do trabalho: mudança gigante, alto risco de quebrar
  onboarding/roles/SSR, invalidaria o smoke spec existente (instancia o
  componente por construtor posicional).
- ❌ Semanas de esforço; sem valor visível imediato ao usuário.

### Opção B — Correções cirúrgicas + plano de modularização faseado (ESCOLHIDA)

Nesta rodada, aplicar apenas mudanças seguras e observáveis:

1. **Bug fix:** no card "Movimentos recentes", o atalho de detalhe leva sempre
   a `/despesas`, mesmo para receitas → passar a rotear por tipo
   (`income → /receitas`).
2. **Acessibilidade/idioma:** corrigir `aria-label` sem acentos
   ("Distribuicao…" → "Distribuição…"), dica "fim do mes" → "fim do mês", e
   adicionar `aria-pressed` + `role="group"` no seletor de período
   (Mensal/Trimestral/Anual), que hoje não expõe o estado ativo a leitores de
   tela.
3. **Documentar** (não executar agora) a modularização faseada e a
   consolidação dos donuts com o `DonutChartComponent` compartilhado.

- ✅ Valor imediato (bug real corrigido), risco próximo de zero.
- ✅ Respeita todas as regras (rotas, auth, permissões, SSR e build intactos).
- ✅ Deixa trilha clara para as próximas rodadas (relatório 03).
- ❌ Não resolve a dívida técnica de tamanho do componente (fica para fases).

### Opção C — Apenas documentação, nenhuma mudança de código (rejeitada)

- ✅ Risco zero absoluto.
- ❌ Deixa um bug de navegação conhecido em produção.
- ❌ Não cumpre o objetivo "analisar **e melhorar**" a tela.

## Decisão

**Opção B.** Máximo valor com mínimo risco, alinhada à estratégia de
consolidação do relatório 01 e às regras do trabalho (YAGNI: nada de novos
widgets ou bibliotecas).

## Backlog sugerido para próximas rodadas (fora do escopo desta)

1. Extrair a variante Basic (`basic-home-*`) para `BasicDashboardComponent`.
2. Extrair painel de insights (robô/risk/engine) para componente + service próprio.
3. Substituir os donuts artesanais pelo `DonutChartComponent` compartilhado
   (exige adicionar suporte a "total no centro" e legenda compacta ao
   componente antes da troca, para não perder funcionalidade).
4. Migração gradual para `inject()` + Signals com reescrita do smoke spec
   via `TestBed` (pré-requisito para OnPush).
