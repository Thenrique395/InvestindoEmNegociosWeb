# Design System — Investindo em Negócios

Este documento define os componentes reutilizáveis do frontend, quando usar cada um e exemplos de implementação.

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

### StatusBadgeComponent

Uso: exibir status padronizados.

```html
<app-status-badge tone="success" label="Ativa"></app-status-badge>
<app-status-badge tone="warning" label="Duplicado"></app-status-badge>
<app-status-badge tone="danger" label="Despesa"></app-status-badge>
```

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

## Helpers reutilizáveis

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

- Aplicar `ModalComponent` em modais antigos.
- Aplicar `StatusBadgeComponent` nas telas restantes.
- Aplicar `FilterBarComponent` em todas as listagens.
- Criar tokens de design formais para spacing, radius, shadows e cores.
- Criar Storybook ou recriar uma página de catálogo visual (`design-lab` foi removido do roteamento; a pasta vazia `src/app/design-lab/` foi removida em 2026-06-28).

## Features recentes (revisão 2026-06-28)

Cinco features inspiradas no concorrente Budgi foram entregues entre 2026-06-26 e 2026-06-28 (ver `ROADMAP.md` na pasta `docs/` central). A maioria não introduz componente reutilizável novo — reaproveita o que já existia:

- **Insights de assinatura**: card novo na Home, sem componente novo (markup próprio da Home).
- **Exportar PDF**: botão ao lado do "Exportar CSV" em `/relatorios`, sem componente novo (lógica client-side com `jspdf`).
- **Anexo de comprovante**: botão "Comprovante" em despesas/receitas pagas, input de arquivo oculto — sem componente novo.
- **Multi-moeda (Fase 1)**: `StatusBadgeComponent` (já documentado acima) reaproveitado para a tag de moeda (`USD`/`EUR`) ao lado de contas/investimentos não-BRL; `appCurrency` (pipe) ganhou um segundo argumento opcional de moeda.
- **Spaces** (`/espacos`, `spaces.service.ts`): tela nova para criar/renomear/excluir/entrar em áreas. Na primeira versão foi escrita com markup solto (sem `PageHeader`/`SectionCard`/`FormField`) — **corrigido em 2026-06-28** para seguir o padrão (`EspacosComponent` agora usa os três).
