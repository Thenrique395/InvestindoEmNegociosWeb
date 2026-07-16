# Design System — Investindo em Negócios (frontend)

Referência de tokens, componentes e convenções do frontend Angular
(`InvestindoEmNegociosWeb/investindoEmNegociosWeb`). Para exemplos interativos,
use o **styleguide in-app** em `/styleguide` (overview, tokens e detalhe por
componente).

## Onde vive

| O quê | Caminho |
|---|---|
| Tokens (fonte da verdade) | `src/styles/design-tokens.scss` (99 tokens em `:root`) |
| Styleguide in-app | rota `/styleguide` → `src/app/styleguide/` |
| Catálogo de componentes | `src/app/styleguide/styleguide-catalog.ts` (`STYLEGUIDE_COMPONENTS`) |
| Componentes compartilhados | `src/app/shared/` |

## Tokens

Todos os tokens seguem o padrão **`--color-x: var(--theme-var, fallback)`**. A
camada de tema define `--theme-var` (claro/escuro); os componentes consomem
apenas o token `--color-x`/`--*`. **Nunca** use hex/rgba direto no componente —
sempre um token (garante tema e consistência; ver auditoria A8/A11).

Categorias (em `design-tokens.scss`):

- **Brand:** `--color-primary`, `--color-primary-text`, `--color-primary-weak`, `--color-primary-soft`
- **Surfaces:** `--color-bg`, `--color-surface`, `--color-surface-muted`, `--color-surface-raised`
- **Text:** `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse`
- **Borders:** `--color-border`, `--color-border-strong`
- **Status** (cada um com base/`-text`/`-weak`/`-soft`): `--color-success`, `--color-danger`, `--color-warning`, `--color-info`
- **Spacing:** `--spacing-1`…`--spacing-10` (0.5rem → 5rem)
- **Radius:** `--radius-sm`…`--radius-2xl`, `--radius-pill`
- **Controls:** `--control-height(-sm)`, `--control-background(-hover/-focus)`, `--control-border(-hover)`, `--control-focus-ring`, `--control-transition`
- **Shadows:** `--shadow-elevation-sm/md/lg`
- **Typography:** `--font-family-sans`, `--font-size-*` (caption → display-lg), `--font-weight-regular/medium/semibold`

### Mapeamentos canônicos (evite o hex, use o token)

| Hex comum | Token |
|---|---|
| `#f8fafc` | `var(--color-bg)` |
| `#f1f5f9` | `var(--color-surface-muted)` |
| `#e2e8f0` | `var(--color-surface-raised)` |
| `#64748b` | `var(--color-text-muted)` |
| `#fff` (texto sobre cor) | `var(--color-text-inverse)` |

Exceções aceitáveis: gradientes decorativos (variantes de azul de marca) e
sombras `rgba(...)` sem token exato.

### Como tematizar

Sobrescreva as **variáveis internas** (`--primary`, `--surface`, `--text`, …)
num escopo (ex.: `:root[data-theme="dark"]`); os tokens `--color-*` recalculam
sozinhos. Não sobrescreva os `--color-*` diretamente.

## Biblioteca de componentes

Catalogados em `STYLEGUIDE_COMPONENTS` (22 entradas, com `slug`, `selector`,
`category`, `description`), navegáveis em `/styleguide`:

- **Layout:** PageHeader, SectionCard, FilterBar, PeriodHero
- **Forms:** FormField, ToggleField
- **Feedback:** EmptyState, UiState, StatusBadge, ToastContainer, BillingAlertBanner
- **Overlay:** Modal, ConfirmDialog, Tooltip
- **Data:** StatCard, ComparisonPill, PeriodTotalCard, PeriodActionCard, ResponsiveList, AccountList, CartoesListagem
- **Pipe:** AppCurrencyPipe

> **Gap conhecido (A13):** alguns componentes de `shared/` ainda não estão no
> catálogo — ex.: `SegmentedSelector`, `ConfirmSheet`, `UsageBar`, `DonutChart`,
> `CategoryIcon` e `shared/transactions/*` (BulkActionBar, TransactionSummaryCard).
> Ao criar/expor um componente compartilhado, adicione-o a `styleguide-catalog.ts`.

## Convenções (frontend)

- **Change detection:** `OnPush` + estado por `signal()`/`computed()`; estado
  compartilhado via **signal store**. Evite a ponte `service.subscribe(() => { …; cdr.markForCheck(); })`
  e `effect()` que copia signal para campo — quebram a reatividade OnPush de
  forma sutil (ver A9/A19/A22). Migração progressiva em andamento.
- **Cores:** sempre tokens (nunca hex/rgba avulso) — ver acima.
- **Helpers puros por tela:** lógica testável em arquivos `*.model.ts` +
  `.spec.ts`; utilitários de lançamentos compartilhados em
  `shared/transactions/transaction-helpers.ts` (chave/label de mês, comparação
  de datas, collation).
- **Testes:** unit (Karma/Jasmine) para lógica; E2E em `quality-tests/`
  (Playwright, harness mockado `setupAuthenticatedApp`). **Atenção:** telas de
  estado vazio dão falso "Carregando" no Playwright **headless** por
  agendamento de CD via rAF — validar em `headless:false` ou com asserções
  híbridas (ver A22).

## Como estender

1. **Novo token:** adicione em `design-tokens.scss` no padrão
   `--color-x: var(--theme-var, fallback)`; consuma via `var(--color-x)`.
2. **Novo componente compartilhado:** crie em `src/app/shared/`, `standalone`,
   `OnPush` + signals; registre em `STYLEGUIDE_COMPONENTS` para aparecer no
   styleguide.
