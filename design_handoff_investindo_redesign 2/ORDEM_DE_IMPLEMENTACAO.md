# Ordem de implementação

Quatro fases. A ordem é deliberada: a fase 1 muda a aparência de **todas** as telas de uma vez, com pouco código. Só depois vale abrir tela por tela.

Cada item lista os arquivos-alvo no `investindoEmNegociosWeb`.

---

## Fase 1 — Base do sistema

Sem isto, qualquer tela nova fica visualmente órfã. É a fase de maior retorno por linha escrita.

### 1.1 Tokens
`src/styles/design-tokens.scss`

Substituir pelo conteúdo de `tokens.css` deste pacote, convertido para a convenção SCSS já usada no arquivo. Manter os nomes de variável existentes que já batem; adicionar os novos.

**Critério de pronto**: nenhum hex literal novo escrito fora deste arquivo, nas fases seguintes.

### 1.2 Tipografia e base
`src/styles.scss`

- Adicionar Poppins (600 e 700) — Inter já está via `@fontsource-variable/inter`
- Escala de texto conforme `tokens.css` (`--fs-*`, `--ls-*`)
- `font-variant-numeric: tabular-nums` como utilitário aplicável a todo valor numérico
- Resets de `a` / `a:hover` com as cores da paleta
- Keyframes de `skShimmer` e a classe `.sk`
- Transições padrão de botão e `:focus-visible`

### 1.3 Sidebar
`src/app/sidebar/sidebar.component.{html,scss,ts}`

Fundo navy, grupos com rótulo, item de 34px com barra verde de 3px no ativo, rodapé de perfil clicável. Logo em uma linha (marca + wordmark, sem "em" verde).

**A visibilidade dos itens por perfil** vem de `PERFIS_E_PERMISSOES.md`. Item sem permissão **não aparece** — não desabilitar.

### 1.4 Topbar
`src/app/topbar/topbar.component.{html,scss,ts}`

56px, busca com atalho ⌘K, pílula do Assistente, ícones de ocultar valores / tema / notificações com ponto.

### 1.5 Shell e page header
`src/app/app.component.{html,scss}` + novo `src/app/shared/page-header/`

Padding de conteúdo `26px 28px 40px`, `gap:16px` entre seções. O page header suporta: eyebrow opcional, título, descrição, metadados, ação principal, ação secundária, seletor de período.

### 1.6 Primitivos compartilhados
`src/app/shared/`

Nesta ordem de dependência:
1. **Dropdown** (`shared/select-menu/`) — o padrão da seção 5.3 de `COMPONENTES.md`. Usado em praticamente toda tela; fazer primeiro.
2. **Stepper numérico** (`shared/number-stepper/`) — com campo digitável, não só botões.
3. **Segmented control** — já existe (`app-segmented-selector`); ajustar ao novo visual.
4. **Faixa de KPIs** (`shared/kpi-strip/`) — flex com quebra, `flex:1 1 210px`, divisor por `box-shadow`, tooltip `?` por card.
5. **Card de métrica** (`shared/metric-card/`).
6. **Tabela responsiva** (`shared/responsive-list/`) — já existe; refazer com scroller + `min-width`, colunas compartilhadas entre cabeçalho e linha, seleção em lote, paginação. **Este é o item mais pesado da fase 1** e destrava cinco telas.
7. **Modal** (`shared/modal/`) — três faixas com `flex:none / flex:1 min-height:0 overflow-y:auto / flex:none`.
8. **Toast** (`shared/toast/` ou o `UiFeedbackService` existente) — com ação "Desfazer".
9. **Estado vazio** (`app/empty-state/`) e **skeleton** (`app/ui-state/`).

---

## Fase 2 — Telas do dia a dia

Ordem por frequência de uso.

| # | Tela | Arquivos | Depende de |
|---|---|---|---|
| 2.1 | **Dashboard** | `app/dashboard/` | faixa de KPIs, gráficos, card de métrica |
| 2.2 | **Despesas** | `app/despesas/` | tabela responsiva, dropdown, modal |
| 2.3 | **Receitas** | `app/receitas/` | mesmos de 2.2 — muda só conteúdo e polaridade |
| 2.4 | **Cartões** | `app/cartoes/`, `app/invoice-import/` | tabela, stepper, modal de importação |
| 2.5 | **Contas** | `app/contas/` | tabela, dropdown, modal |
| 2.6 | **Calendário** | `app/calendario/` | segmented, badge, card de severidade |
| 2.7 | **Categorias** | `app/categories/` | tabela, paleta de cor fixa |

**Notas de execução**

- 2.2 e 2.3 compartilham quase tudo. Implementar Despesas por completo, extrair o que é comum, e Receitas sai em uma fração do tempo.
- A **regra de parcelado** (perguntar se a ação vale para esta parcela ou todas as seguintes) atravessa Despesas, Cartões e Calendário. Implementar o modal de escolha uma vez, em `shared/`.
- O **dashboard depende dos três perfis** — ver `PERFIS_E_PERMISSOES.md`. Fazer o perfil Completo primeiro (é o superconjunto) e depois recortar.

---

## Fase 3 — Planejamento e análise

| # | Tela | Arquivos | Observação |
|---|---|---|---|
| 3.1 | **Metas** | `app/metas/` | a semântica consumo × conquista é o núcleo; ler `goal-view.model.ts` antes |
| 3.2 | **Orçamento** | `app/orcamento/` | edição na linha da tabela |
| 3.3 | **Investimentos** | `app/investments/` | maior tela do sistema, cinco abas; a separação aporte/valorização/proventos é regra de negócio, não estética |
| 3.4 | **Empréstimos** | `app/loans/` | segue os padrões, sem novidade estrutural |
| 3.5 | **Relatórios** | `app/relatorios/`, `app/monthly-snapshots/` | padrão único de gráfico + exportação |
| 3.6 | **Simulador** | `app/cenarios/`, `app/calculator/` | sliders + projeção comparada |
| 3.7 | **Assistente** | `app/assistant/` | conversa com cards de dado |
| 3.8 | **Perfil** | `app/user-profile/`, `app/user-security/` | formulário longo em seções |
| 3.9 | **Configurações** | `app/user-preferences/` | barra de salvar fixa, zona sensível |

---

## Fase 4 — Fluxos e transversais

| # | Item | Arquivos |
|---|---|---|
| 4.1 | **Autenticação** | `app/login/`, `signup/`, `forgot-password/`, `reset-password/` |
| 4.2 | **Onboarding** | `app/onboarding/` |
| 4.3 | **Checkout e plano** | `app/checkout/`, `checkout-status/`, `subscriptions/` |
| 4.4 | **Dashboard administrativo** | `app/dashboard/` (variante admin) + `app/admin-*` |
| 4.5 | **Tema escuro** | `app/theme.service.ts` + segundo conjunto de tokens em `design-tokens.scss` |
| 4.6 | **Mobile** | revisão de todas as telas: tabela → cards, header navy com o total, bottom nav de 5 itens com FAB central |

**Tema escuro**: um segundo conjunto de tokens, não CSS duplicado. As cores dark já usadas nos protótipos: fundo `#001620`, superfície `#011E29`, superfície elevada `#042A38`, borda `#123544`, divisor `#0E3948`, texto `#E8EFF1`, texto secundário `#A9C1CA`, texto terciário `#7C97A2`, primária `#5B9DFF` (com texto escuro sobre ela), verde `#7FD3A8`, vermelho `#F0928A`.

---

## Critérios de pronto, por tela

Antes de considerar uma tela concluída:

1. Nenhum hex literal no SCSS do componente — tudo via variável de token
2. Faixa de indicadores em flex com quebra, sem célula vazia à direita em nenhuma largura
3. Toda tabela dentro de scroller com `min-width`, cabeçalho e linhas com as mesmas colunas
4. Todo campo de valor múltiplo é dropdown, não chips
5. Todo stepper aceita digitação
6. Todo indicador tem tooltip explicando o cálculo
7. Modal com as três faixas e rolagem só no corpo
8. Toda ação destrutiva tem confirmação, e toda confirmação de mutação tem "Desfazer"
9. Estados de vazio, carregando e erro implementados — não só o caminho felizde
10. Testado em 1440px, 1024px e 390px

---

## O que não implementar

- As páginas de site de vendas (`Site - *.dc.html`) — material de marketing, fora do app
- O board de propostas (`Redesign Investindo em Negócios.dc.html`) — documentação da direção visual
- Qualquer card de upsell dentro de tela de perfil restrito — o item simplesmente não aparece no menu
