# Catálogo de componentes do frontend

> **Este NÃO é o Design System.** São dois documentos com escopos diferentes, e até 2026-08-28
> os dois se chamavam "Design System", o que gerava confusão sobre qual consultar:
>
> | Documento | Responde |
> |---|---|
> | **este** | *quais* componentes existem, com seletor e exemplo de uso |
> | [`DESIGN_SYSTEM.md`](../investindoEmNegociosWeb/documentacao/DESIGN_SYSTEM.md) | *como e por quê*: princípios, tokens oficiais, heurísticas, acessibilidade, checklist de revisão |
>
> Em conflito entre os dois sobre regra de estilo, vale o `DESIGN_SYSTEM.md` — é ele que o
> `Agent.md` do frontend trata como normativo.

Este documento cataloga os componentes reutilizáveis do frontend, quando usar cada um e exemplos
de implementação. Catálogo conferido contra o código em 2026-08-28: os seletores abaixo existem,
salvo onde marcado como removido.

> **Referência viva**: a rota `/styleguide` (dev-only, bloqueada em produção pelo `devOnlyGuard`)
> mostra demos interativos de todos os componentes catalogados aqui, mais Design Tokens e classes
> de botão — útil pra inspecionar/ajustar um componente isoladamente sem precisar navegar até a
> tela real que o usa.

## Objetivos

- Manter consistência visual entre telas.
- Evitar código duplicado.
- Facilitar manutenção e evolução.
- Reduzir divergência entre páginas novas e antigas.

## Padrão visual atual

As telas autenticadas devem seguir o padrão consolidado em Dashboard, Despesas, Receitas, Cartões, Metas e Configurações.

Regras de composição:

- usar KPIs equivalentes quando houver resumo no topo
- usar hero com eyebrow, título forte e descrição curta
- manter CTAs principais em card lateral, rodapé de seção ou footer de modal
- manter cards irmãos com altura e peso visual equivalentes
- usar nuances semânticas suaves: receita/sucesso, despesa/perigo, pendência/atenção, informação/azul
- para `Basic`, esconder gestão avançada e remover módulos sem valor operacional imediato; manter `Categorias` como módulo operacional para classificar receitas e despesas

Checklist de UX antes de alterar uma tela:

- usar as heurísticas de UX do produto definidas em `documentacao/DESIGN_SYSTEM.md`
- identificar o que o usuário deve entender em até 3 segundos
- definir uma ação principal clara ou assumir uma tela de consulta
- remover textos repetidos entre hero, cards, rodapés e empty states
- garantir feedback útil para ações bloqueadas, erro, vazio e sucesso
- validar se `Basic` está recebendo apenas informação útil e operacional, incluindo `Categorias` quando o fluxo envolver classificação de lançamentos
- manter tamanho, CTA, modal, card e cor semântica consistentes com as telas já ajustadas

Regras de modais:

- cabeçalho com eyebrow, título e descrição
- formulário dentro de card interno quando houver agrupamento de campos
- `Cancelar` secundário e ação principal azul no footer
- ações destrutivas devem ser claras, mas visualmente contidas

## Componentes reutilizáveis

### PageHeaderComponent

Uso: cabeçalho padrão de páginas.

```html
<app-page-header
  eyebrow="Financeiro"
  title="Contas"
  description="Gerencie suas contas e saldos">
  <button page-actions class="btn-primary">Nova conta</button>
</app-page-header>
```

Quando usar:

- Topo de telas principais.
- Áreas administrativas.
- Páginas com título, descrição e ações.

---

### SectionCardComponent

Uso: separar blocos de conteúdo dentro de uma tela.

```html
<app-section-card
  title="Extrato"
  description="Acompanhe movimentações do período">
  <button card-actions class="btn-primary sm">Filtrar</button>
  Conteúdo da seção
</app-section-card>
```

Quando usar:

- Listas.
- Formulários agrupados.
- Importações.
- Blocos de resumo.

---

### FormFieldComponent

Uso: padronizar label, descrição, erro e destaque visual de campos.

```html
<app-form-field
  label="Nome"
  [required]="true"
  [error]="form.error('name')"
  [submitted]="form.submitted"
  [animate]="form.shouldAnimate('name')">
  <input [(ngModel)]="name" (blur)="form.markTouched('name')" />
</app-form-field>
```

Regras:

- Todo input/select/textarea de formulário deve usar `app-form-field`.
- Não criar labels soltos para formulários novos.
- Usar `FormState` para validação em tempo real inteligente.

---

### ToggleFieldComponent

Uso: card de toggle (switch) com label e descrição, para opções booleanas em formulários
(ex.: "Recorrente", "Notificar por e-mail"). Criado em 2026-06-29 ao migrar os modais de
Despesas/Receitas/Cartões/Categorias/Investimentos/Metas para os componentes compartilhados —
antes cada formulário tinha sua própria marcação de switch duplicada.

```html
<app-toggle-field
  label="Recorrente"
  description="Repete automaticamente todo mês."
  [checked]="recorrente"
  (checkedChange)="recorrente = $event">
</app-toggle-field>
```

Inputs: `label`, `description`, `checked`, `disabled`. Output: `checkedChange`.

Quando usar:

- Qualquer opção booleana dentro de um formulário (`app-modal` ou tela cheia).
- Não criar `<input type="checkbox">` solto com label manual para esse caso.

---

### StatusBadgeComponent

Uso: exibir status padronizados.

```html
<app-status-badge tone="success" label="Ativa"></app-status-badge>
<app-status-badge tone="warning" label="Duplicado"></app-status-badge>
<app-status-badge tone="danger" label="Despesa"></app-status-badge>
```

> **Achado corrigido (2026-06-29)**: existia um segundo `StatusBadgeComponent` (mesmo seletor
> `app-status-badge`) em `src/app/status-badge/`, com API por `status`/heurística de texto em vez
> de `tone` explícito — usado só por Despesas e Receitas. Migrado para este componente (o único
> agora) e a pasta antiga removida. Use `installmentStatusTone()` (`utils/status.ts`) pra mapear
> `InstallmentStatus` → `tone` em telas de parcelas/pagamentos.

Tons disponíveis:

- `success`
- `danger`
- `warning`
- `info`
- `muted`
- `default`

Quando usar:

- Ativo/Inativo.
- Receita/Despesa.
- Novo/Duplicado.
- Status operacionais.

---

### FilterBarComponent

Uso: padronizar filtros e ações de tela.

```html
<app-filter-bar>
  <div filter-left>
    <input placeholder="Buscar..." />
    <select>
      <option>Todos</option>
    </select>
  </div>

  <div filter-right>
    <button class="btn-primary">Novo</button>
  </div>
</app-filter-bar>
```

Quando usar:

- Telas com busca.
- Telas com filtros.
- Listagens com ação principal.

---

### ~~StatCardComponent~~ — **REMOVIDO em 2026-08-27**

`app-stat-card` **não existe mais**. Foi um dos seis primitivos apagados no commit `ba04b4e`
por não terem nenhum consumidor fora da demo do `/styleguide` — junto com `money`,
`chart-bars`, `installment-scope`, `period-action-card` e `toast-container`.

Para card de métrica, use `app-section-card` ou `app-period-total-card`. Recuperável pelo git
se voltar a ser necessário.

---

### ComparisonPillComponent

Uso: pílula de comparação (ex.: "vs. mês anterior"), com cor condicionada à direção boa/ruim da variação.

```html
<app-comparison-pill label="vs. mês anterior" trend="up" polarity="higher-is-better">
  +12%
</app-comparison-pill>
```

`polarity="lower-is-better"` inverte a leitura (ex.: dívida caindo é bom mesmo com `trend="down"`).

---

### PeriodHeroComponent + PeriodTotalCardComponent

Uso: hero de página com navegação de mês anterior/próximo e um card lateral (aside); `PeriodTotalCardComponent` mostra um valor em destaque.

> `PeriodActionCardComponent` (ação recomendada em texto) **foi removido em 2026-08-27** no mesmo commit `ba04b4e` — não tinha consumidor fora do `/styleguide`.

```html
<app-period-hero
  eyebrow="Junho 2026"
  title="Receitas do mês"
  description="Acompanhe entradas e saídas do período."
  (previousMonth)="mesAnterior()"
  (nextMonth)="proximoMes()">
  <div hero-aside>
    <app-period-total-card eyebrow="Total do mês" value="R$ 5.200,00" description="Receitas confirmadas" />
  </div>
</app-period-hero>
```

Quando usar:

- Topo de telas com navegação por mês (Despesas, Receitas, Relatórios).

---

### TooltipComponent

Uso: botão "?" acessível que abre um painel de ajuda contextual ao clicar ou focar (usado, por exemplo, dentro do `StatCardComponent`).

```html
<app-tooltip label="Mais informações sobre o saldo" text="Saldo real considerando lançamentos confirmados." />
```

---

### ResponsiveListComponent

Uso: tabela genérica orientada a coluna — ordenação, seleção em lote (checkbox com estado
indeterminado), loading e vazio (`EmptyStateComponent` embutido), com o conteúdo de cada célula
projetado pelo consumidor via `<ng-template appResponsiveListCell="chave" let-item>`.

```html
<app-responsive-list
  [columns]="columns"
  [items]="despesas"
  [getId]="getId"
  [sortBy]="sortBy"
  [sortDir]="sortDir"
  [selectable]="true"
  [selectedIds]="selectedIds"
  [selectableIds]="selectableIds"
  (sort)="onSort($event)"
  (selectionChange)="onSelectionChange($event)"
  (selectAllChange)="onSelectAllChange($event)">

  <ng-template appResponsiveListCell="nome" let-item>{{ item.nome }}</ng-template>
  <ng-template appResponsiveListCell="valor" let-item>{{ item.valor | appCurrency }}</ng-template>
</app-responsive-list>
```

`columns: ResponsiveListColumn[]` define `key`/`label`/`sortable?`/`align?`/`widthClass?` — uma
entrada por coluna, incluindo a de ações (sem `sortable`). `selectableIds` controla quais linhas
podem ser marcadas (ex.: não deixar selecionar uma despesa já paga); `null` = todas selecionáveis.

> **Origem (2026-06-29)**: generaliza o padrão de tabela que `DespesasListaComponent` e
> `ReceitasListaComponent` tinham cada um implementado de forma quase idêntica (~95% do `.html`/`.scss`
> duplicado, só com prefixos de classe diferentes). Preenche a pasta `src/app/shared/responsive-list/`,
> que existia vazia desde antes — o usuário notou a ausência durante a revisão do `/styleguide` e
> pediu a implementação real. `AccountListComponent`/`CartoesListagemComponent` (grid de cards, não
> tabela) ficaram deliberadamente fora desta consolidação — formato visual diferente demais pra
> caber na mesma API sem virar abstração forçada.

Regras:

- Toda tabela ordenável com seleção em lote nova deve usar `ResponsiveListComponent`, não recriar
  a estrutura de `<table>`/checkbox/ordenação na mão.

---

### ModalComponent

Uso: modal padrão para formulários e detalhes.

```html
<app-modal
  [open]="open"
  title="Novo item"
  subtitle="Preencha os dados"
  (close)="close()">
  <div modal-body>
    Conteúdo
  </div>

  <div modal-footer>
    <button class="btn-ghost">Cancelar</button>
    <button class="btn-primary">Salvar</button>
  </div>
</app-modal>
```

Regras:

- Não criar modal manual em telas novas.
- Usar `ConfirmDialogComponent` para confirmação simples.
- Usar `ModalComponent` para formulário, edição e conteúdo complexo.

---

### ConfirmDialogComponent + ConfirmDialogService

Uso: substituir `window.confirm`.

```ts
const confirmed = await this.confirmDialog.confirm({
  title: 'Remover conta',
  message: 'Deseja remover esta conta?',
  confirmLabel: 'Remover',
  tone: 'danger'
});

if (!confirmed) return;
```

Regras:

- Não usar `confirm()` nativo.
- Sempre usar para ações destrutivas.

---

### ToastContainerComponent + UiFeedbackService

Uso: feedback global de sucesso, erro, aviso e informação.

> **Achado (revisão 2026-06-29)**: `ToastContainerComponent` não está montado em nenhum template
> do projeto hoje — confirmado via busca em todo `src/app/**/*.html`. Quem de fato exibe os avisos
> do `UiFeedbackService` é o bloco `feedbackMessage`/`global-alert` direto em `app.component.html`.
> O componente continua aqui documentado (e com demo em `/styleguide`) porque existe no código,
> mas religá-lo ou remover é uma decisão em aberto.

```ts
this.uiFeedback.success('Salvo com sucesso.');
this.uiFeedback.error('Não foi possível concluir.');
this.uiFeedback.warning('Revise os campos destacados.');
this.uiFeedback.info('Importação iniciada.');
```

Regras:

- Usar para mensagens globais.
- Erros de campo devem ir para `FormField`/`FormState` quando possível.

---

### UiStateComponent e EmptyStateComponent

Uso: estados de loading, erro e vazio.

```html
<app-ui-state type="loading" title="Carregando..."></app-ui-state>

<app-empty-state
  title="Nenhum registro encontrado"
  description="Crie um novo item para começar"
  ctaLabel="Novo item">
</app-empty-state>
```

Regras:

- Não usar parágrafos soltos para loading/empty em telas novas.
- Usar componente padronizado.

---

### BillingAlertBannerComponent

Uso: banner de alerta de cobrança (pagamento em atraso, acesso encerrado, renovação automática
desativada nos próximos 7 dias) — montado uma vez no shell autenticado (`app.component.html`),
não em telas individuais. Busca a assinatura atual via `SubscriptionsService` e só aparece pra
papéis acima de `Basic`.

```html
<app-billing-alert-banner />
```

Diferente dos demais componentes deste documento, não é demonstrável isoladamente sem um usuário
autenticado real — a página dele em `/styleguide` mostra só descrição e snippet.

## Helpers reutilizáveis

### AppCurrencyPipe

Uso: formatação monetária com suporte a moeda alternativa (multi-moeda) e máscara de privacidade
financeira (`FinancialPrivacyService` — esconde o valor como `••••••` quando o modo privado está
ativo).

```html
{{ valor | appCurrency }}
{{ valorEmDolar | appCurrency:'USD' }}
```

### FormState

Uso: controlar touched, submitted, erros locais, erros da API, primeiro erro e animação.

```ts
readonly form = new FormState(['name'], () => ({
  name: this.name.trim() ? '' : 'Informe o nome.'
}));
```

### form-scroll.utils

Uso: rolar automaticamente até o primeiro campo inválido, com suporte a header fixo e containers scrolláveis.

```ts
scrollToFirstInvalidFormField();
```

### api-error.utils / api-error.mapper

Uso: mapear `ProblemDetails` do backend para UX e erros de campo.

```ts
this.form.setApiErrors(mapApiErrors(err, {
  Name: 'name'
}));
```

## Regras gerais

### Não fazer

- Não criar modal manual.
- Não usar `window.confirm`.
- Não usar span hardcoded para status.
- Não criar input sem `FormField` em formulário novo.
- Não criar filtros soltos sem `FilterBar`.

### Fazer

- Usar `PageHeader` no topo da página.
- Usar `SectionCard` para blocos.
- Usar `FormField` + `FormState` para formulários.
- Usar `StatusBadge` para status.
- Usar `FilterBar` para filtros.
- Usar `Modal` para diálogos com conteúdo.
- Usar `ConfirmDialog` para confirmação.
- Usar `UiFeedbackService` para mensagens globais.

## Pendências recomendadas

- Aplicar `ModalComponent` em modais antigos — **resolvido em 2026-06-30**: migrados os modais de Despesas, Receitas, Cartões, Categorias, Investimentos e Metas para `app-modal`/`app-form-field`/`app-toggle-field` (novo componente, ver seção acima), eliminando a marcação e o CSS de modal/campo/switch duplicados em cada tela.
- Aplicar `StatusBadgeComponent` nas telas restantes — **resolvido em 2026-06-30**: migrados os status manuais (`<span>` com `ngClass`/CSS BEM próprio) de Despesas (histórico de pagamentos), Cartões (compras), Metas, `AccountListComponent` (Ativa/Inativa) e Home (metas e lançamentos recentes) para `app-status-badge`, removendo o CSS de status duplicado em cada tela.
- Aplicar `FilterBarComponent` em todas as listagens — **resolvido parcialmente em 2026-06-30**: migrados os filtros soltos das 6 listagens financeiras centrais (Despesas, Receitas, Cartões, Metas, Categorias e Investimentos — este último com 2 blocos de filtro) para `app-filter-bar`, mantendo a marcação/lógica interna de cada filtro intacta (só envolvendo com o wrapper padrão). Numa segunda rodada, migrado também o Calendário (3 checkboxes de visibilidade + 2 selects, mesmo padrão de "só envolver"). Ficaram de fora, por incompatibilidade real de layout (não falta de prioridade): Admin/Robôs (painel com grid de 5 campos + rodapé com checkboxes e botões "Limpar"/"Aplicar" — não cabe no wrapper de 2 slots sem reestruturar) e Contas (filtro vive dentro do slot `card-actions` de um `app-section-card` já existente — envolver criaria caixa-com-borda dentro de caixa-com-borda).
- Criar tokens de design formais para spacing, radius, shadows e cores — **resolvido em 2026-06-29**: já existiam em `src/styles/design-tokens.scss`, agora catalogados em `/styleguide/tokens`.
- Criar Storybook ou recriar uma página de catálogo visual — **resolvido em 2026-06-29**: rota `/styleguide` (dev-only), com demo vivo dos 18 componentes/pipe catalogados neste documento (`design-lab` tinha sido removido do roteamento por estar vazio; a pasta `src/app/design-lab/` foi removida em 2026-06-28).
- `src/app/shared/responsive-list/` — **resolvido em 2026-06-29**: implementado `ResponsiveListComponent` de verdade (ver seção acima), `DespesasListaComponent`/`ReceitasListaComponent` migrados pra usá-lo.

## Features recentes (revisão 2026-06-28)

Cinco features inspiradas no concorrente Budgi foram entregues entre 2026-06-26 e 2026-06-28 (ver `ROADMAP.md` na pasta `docs/` central). A maioria não introduz componente reutilizável novo — reaproveita o que já existia:

- **Insights de assinatura**: card novo na Home, sem componente novo (markup próprio da Home).
- **Exportar PDF**: botão ao lado do "Exportar CSV" em `/relatorios`, sem componente novo (lógica client-side com `jspdf`).
- **Anexo de comprovante**: botão "Comprovante" em despesas/receitas pagas, input de arquivo oculto — sem componente novo.
- **Multi-moeda (Fase 1)**: `StatusBadgeComponent` (já documentado acima) reaproveitado para a tag de moeda (`USD`/`EUR`) ao lado de contas/investimentos não-BRL; `appCurrency` (pipe) ganhou um segundo argumento opcional de moeda.
- **Spaces** (`/espacos`, `spaces.service.ts`): tela nova para criar/renomear/excluir/entrar em áreas. Na primeira versão foi escrita com markup solto (sem `PageHeader`/`SectionCard`/`FormField`) — **corrigido em 2026-06-28** para seguir o padrão (`EspacosComponent` agora usa os três).
