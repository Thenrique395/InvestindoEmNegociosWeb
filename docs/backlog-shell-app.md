# Backlog — Shell do app (Sidebar + Topbar)

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

## Melhorias de UX identificadas (não implementadas)

- [ ] **Busca no mobile** — abaixo de 720px a busca some por completo. Quando a busca for
      funcional, adicionar botão de lupa que abre a busca em overlay.
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

## Nomenclatura pendente de validação com usuários

- [ ] "Histórico mensal" (antes "Snapshots") — validar se o novo nome comunica melhor.
- [ ] "Movimentações / Planejamento / Análises" — títulos das seções da sidebar; observar se os
      usuários encontram os itens (ex.: Calculadoras está em "Análises").
