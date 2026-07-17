# Backlog — Shell do app (Sidebar + Topbar) e Dashboard

Registro do que ficou pendente, preparado apenas visualmente ou identificado como melhoria futura
durante a refatoração premium da Sidebar e do Topbar (julho/2026). Atualizar este arquivo conforme
itens forem concluídos ou descartados.

## Estado atual (referência)

- **Sidebar** (`src/app/sidebar/`): seções nomeadas (Movimentações, Planejamento, Análises,
  Administração), ícones limpos, estado ativo com tom semântico + barra indicadora, sticky com
  scroll interno, signal inputs/outputs + OnPush. Commit `6ca83fa`.
- **Topbar** (`src/app/topbar/`): shell fino compondo `GlobalSearchComponent`,
  `NotificationBellComponent` e `UserMenuComponent`; botão Assistente IA (Intermediate+),
  toggles de privacidade/tema com SVG, sticky 64px. Ainda não commitado.

## Preparado apenas visualmente (sem lógica)

- [ ] **Busca global funcional** — a UI (`topbar/global-search/`) está pronta, incluindo atalho
      ⌘K/Ctrl+K que foca o campo, mas o submit não faz nada. Requer:
  - endpoint de busca na API (transações, contas, cartões, metas...);
  - decisão de UX: resultados inline (dropdown) ou command palette completo (modal ⌘K com
    navegação por teclado, estilo Linear/Raycast) — recomendado o segundo;
  - rota/estado de "resultados da busca" se necessário.

## Decisão de produto — Mobile web (julho/2026)

Haverá um **app nativo** no futuro. Ficou decidido com o usuário:

- **Não investir em mobile web além do responsivo existente.** Nada de PWA, gestos de toque,
  bottom navigation ou fluxos específicos de celular. As media queries atuais (sidebar drawer,
  cards em 1 coluna, busca oculta em telas estreitas) são o piso e devem apenas ser mantidas —
  elas também atendem janelas redimensionadas e split-screen no desktop.
- **Exceção acordada:** uma passada de *priorização* no dashboard para acesso via browser mobile
  (ver item na seção do Dashboard abaixo). Sem código novo de features — só ordem e carregamento.
- Sessões futuras **não** devem "melhorar o mobile" por iniciativa própria.

## Melhorias de UX identificadas (não implementadas)

- [ ] ~~**Busca no mobile**~~ — descartado pela decisão de mobile web acima; reavaliar somente
      depois do app nativo.
- [ ] **Sidebar colapsável no desktop** — modo "só ícones" (72px) com tooltip nos itens, padrão
      em SaaS premium. Exige persistir a preferência (localStorage ou preferências do usuário).
- [ ] **Notificações mais ricas** — o `NotificationItem` já traz `kind` (vencimentos, metas,
      cartões, insights...) e `dueDate`, mas o dropdown mostra só título/mensagem. Possível:
      ícone por tipo, agrupamento por dia, ação "marcar todas como lidas" (verificar suporte da
      API), deep-link para a tela relacionada via `payload`.
- [ ] **Badge do sino com aria-live** — hoje o contador atualiza silenciosamente para leitores de
      tela; avaliar `aria-live="polite"` em um texto oculto.
- [ ] **Focus trap nos dropdowns** — o menu do usuário já tem navegação por setas e foco inicial,
      mas Tab ainda escapa do dropdown sem fechá-lo. Avaliar fechar ao perder foco (blur) ou
      prender o foco enquanto aberto. O dropdown de notificações não tem gestão de foco nenhuma.
- [ ] **Badge "Novo" no Assistente IA** — só quando houver lançamento/novidade real do assistente;
      não usar de forma permanente.

## Dívidas técnicas / riscos conhecidos

- [ ] **Click-outside acoplado a nomes de classe** — `app.component.ts` fecha dropdowns/sidebar
      procurando `.notifications`, `.user-menu`, `.menu-toggle` e `.sidebar` via `closest()`.
      Funciona, mas é frágil (renomear uma classe quebra silenciosamente). Alternativas: CDK
      Overlay, ou outputs `closeRequested` emitidos pelos próprios componentes.
- [ ] **Testes unitários dos novos componentes** — `SidebarComponent`, `TopbarComponent`,
      `GlobalSearchComponent`, `NotificationBellComponent` e `UserMenuComponent` não têm specs.
      Cobrir ao menos: visibilidade de seções/assistente por role, navegação por teclado do menu
      do usuário e badge de não lidas.
- [ ] **`overflow: clip` no shell** — necessário para o sticky de Sidebar/Topbar funcionar
      (ancestral com `overflow: hidden` desabilita sticky). Suportado em Safari 16+, Chrome 90+,
      Firefox 81+. Se surgir demanda por Safari ≤15, precisa de fallback.
- [ ] **Estado dos dropdowns centralizado no `app.component`** — abrir/fechar notificações e menu
      do usuário passa por inputs/outputs através de 2 níveis (app → topbar → filho). Aceitável
      hoje; se crescer, considerar um service com signals (padrão já usado em
      `notificationsFacade`).

## Dashboard — Visão Geral Financeira (julho/2026)

Componente `src/app/dashboard/financial-overview/` substituiu o antigo "Resumo financeiro".
Regras puras (cards por plano, comparativos, compromissos, resumo) em `financial-overview.model.ts`,
cobertas por spec. Pendências e próximos passos:

- [ ] **Saúde financeira com score numérico (ex.: 82/100)** — hoje o card usa o status real da API
      (`/financial-assistant/health`: Estável/Atenção/Crítico). O visual "82/100 · +6 pontos" pede um
      score numérico calculado no backend; não foi inventado cálculo no frontend.
- [ ] **Comparativo de patrimônio para Intermediate** — o delta usa `netWorthHistory`, que só é
      carregado/exibido para Advanced hoje. Avaliar liberar a série (ou só o delta) para Intermediate.
- [ ] **Compromissos além de despesas** — o card conta despesas em aberto (vencidas + 7 dias).
      Evoluir para incluir faturas de cartão com fechamento próximo e parcelas de empréstimos.
- [ ] **Módulo Família/CNPJ** — **adiado por decisão de produto** (lançamento inicial só pessoa
      física/individual — ver `docs/DECISIONS/2026-07-16-lancamento-individual-adiar-familia-cnpj.md`).
      Nenhum card foi adicionado porque não existe conta familiar no produto. Quando o módulo
      existir, o grid do overview aceita novos cards via `buildOverviewCards` sem mudança estrutural.
- [ ] **Clique no card inteiro** — hoje só o link "Ver detalhes" navega; avaliar tornar o card todo
      clicável (com área de toque generosa) mantendo acessibilidade.
- [ ] **Priorização mobile do dashboard** (exceção acordada à decisão de mobile web) — quando
      aberto em browser de celular: (1) reordenar cards via CSS `order` para Saldo e Compromissos
      primeiro; (2) adiar seções pesadas (evolução patrimonial, mapa de dívidas, gráficos) com
      `@defer (on viewport)`. Só CSS + defer, sem features novas nem layout paralelo.
- [ ] **Animação de entrada dos cards** — stagger sutil no primeiro load (respeitando
      `prefers-reduced-motion`).

## Nomenclatura pendente de validação com usuários

- [ ] "Histórico mensal" (antes "Snapshots") — validar se o novo nome comunica melhor.
- [ ] "Movimentações / Planejamento / Análises" — títulos das seções da sidebar; observar se os
      usuários encontram os itens (ex.: Calculadoras está em "Análises").
