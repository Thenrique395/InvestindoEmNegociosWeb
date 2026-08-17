# Arquitetura Angular — regras de componentização

Este documento existe para evitar dois problemas conhecidos: **projeto bagunçado** (componentes duplicados, estilo copiado, cada tela com sua própria versão do mesmo card) e **bugs** (estado espalhado, formulário sem tipagem, `@Input` mutado, memory leak de subscription).

As regras são vinculantes. Onde houver conflito entre uma regra daqui e o que parece mais rápido no momento, vale a regra.

---

## 1. Camadas

Três camadas, e o fluxo de dependência é sempre de cima para baixo. Nunca ao contrário.

```
core/          serviços, guards, interceptors, modelos de domínio
   ↑
shared/        primitivos de UI sem conhecimento de domínio
   ↑
features/      telas (dashboard, despesas, metas…)
```

- `shared/` **nunca** importa de `features/`.
- `shared/` **nunca** importa serviço de domínio. Um componente de `shared/` recebe dados por `@Input` e emite por `@Output`. Ele não sabe o que é uma despesa.
- Duas features **nunca** se importam. Se as duas precisam da mesma coisa, ela sobe para `shared/` (se é UI) ou `core/` (se é lógica).

Violar isso é o que produz o import circular que quebra a build sem mensagem clara.

---

## 2. Estrutura de pasta por feature

```
app/despesas/
  despesas.component.ts|html|scss     # container: orquestra, busca dados
  despesas.routes.ts                  # rotas da feature (lazy)
  components/                         # componentes só desta feature
    despesa-form-modal/
    despesa-row/
  despesas.store.ts                   # estado da feature (signals)
  despesas.model.ts                   # tipos e funções puras
  despesas.model.spec.ts              # teste das funções puras
```

**Regra do `components/`**: um componente nasce em `features/<x>/components/`. Ele só sobe para `shared/` quando **a terceira feature** precisar dele. Duas features usando não é motivo suficiente — pode ser coincidência. Três é padrão.

**Regra inversa**: se um componente em `shared/` recebe um `@Input` que só uma feature usa, ele não deveria estar em `shared/`. Desce.

---

## 3. Container × apresentação

Toda tela tem exatamente **um** componente container.

**Container** (`despesas.component.ts`):
- injeta serviços
- lê e escreve no store
- resolve navegação
- **não tem SCSS de layout de card**, só a grade da página
- template é quase só composição de filhos

**Apresentação** (tudo em `components/` e `shared/`):
- recebe tudo por `@Input`
- comunica só por `@Output`
- **não injeta serviço de dados** (pode injetar `Router` para links, formatadores puros, e nada mais)
- é testável sem HTTP

Se um componente de apresentação precisa buscar algo, o dado está no lugar errado — sobe para o container.

---

## 4. Estado

**Signals, sempre.** Sem `BehaviorSubject` novo, sem estado em campo mutável de componente.

```ts
// despesas.store.ts
@Injectable()
export class DespesasStore {
  private readonly _itens = signal<Despesa[]>([]);
  private readonly _filtro = signal<FiltroDespesa>(FILTRO_INICIAL);
  private readonly _carregando = signal(false);

  readonly itens = this._itens.asReadonly();
  readonly filtro = this._filtro.asReadonly();
  readonly carregando = this._carregando.asReadonly();

  // derivado nunca é signal escrito à mão
  readonly visiveis = computed(() => aplicarFiltro(this._itens(), this._filtro()));
  readonly totais = computed(() => calcularTotais(this.visiveis()));
}
```

Regras:
1. **Signal privado + `asReadonly()` público.** Nenhum componente escreve em signal de outro.
2. **Todo valor derivado é `computed()`.** Se você está fazendo `this.total = ...` dentro de um método, é bug esperando acontecer.
3. **Store é `providedIn` do componente**, não do root, quando o estado é da tela. Assim ele morre com a tela e não vaza para a próxima.
4. **Nada de `effect()` para sincronizar estado.** `effect` é para efeito colateral externo (localStorage, título da página, foco). Sincronizar dois signals é sinal de que um deles devia ser `computed`.
5. `ChangeDetectionStrategy.OnPush` em **todos** os componentes. Sem exceção.

**Formulário**: `FormGroup` tipado, sempre.

```ts
readonly form = this.fb.nonNullable.group({
  descricao: ['', [Validators.required, Validators.maxLength(120)]],
  valor: [0, [Validators.required, Validators.min(0.01)]],
  categoriaId: ['', Validators.required],
});
```
Nunca `FormGroup` sem tipo, nunca `[(ngModel)]` em formulário com mais de dois campos.

---

## 5. Subscriptions

Toda subscription usa `takeUntilDestroyed(this.destroyRef)`. Sem exceção, mesmo em chamada que "só acontece uma vez" — a tela pode ser destruída antes da resposta chegar, e aí o `setState` acontece em componente morto.

Preferência: `toSignal()` / `resource()` em vez de `subscribe()` manual, quando o dado alimenta o template diretamente.

---

## 6. Estilo

**Nenhum hex literal fora de `design-tokens.scss`.** Nem em SCSS de componente, nem inline no template. Se você precisa de uma cor que não existe no token, ela vira token primeiro.

**Nenhum valor de espaçamento, raio ou sombra literal.** Mesma regra.

O SCSS de componente contém **layout** (grid, flex, gap) e nada mais. Aparência (cor, borda, raio, sombra, tipografia) vem de token ou de classe utilitária de `styles.scss`.

Se você está escrevendo `border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface); padding: var(--card-padding)` num componente, pare: isso é o card padrão. Use `<app-card>`.

---

## 7. Os primitivos de `shared/` e seus contratos

Estes são os componentes que **não** podem ser reimplementados por feature. Cada duplicata é um bug futuro.

| Componente | Contrato | Regra |
|---|---|---|
| `app-page-header` | `eyebrow?`, `title`, `description?`, `meta?`; slots `actions`, `period` | toda tela usa. Sem `<h1>` solto em feature. |
| `app-kpi-strip` | `items: KpiItem[]` | flex com quebra, `flex:1 1 210px`, divisor por `box-shadow`. **Proibido `grid` com `auto-fit`** — deixa célula vazia. |
| `app-metric-card` | `label`, `value`, `note?`, `tooltip`, `tone`, `icon?` | `tooltip` é obrigatório. Indicador sem explicação não passa em revisão. |
| `app-select-menu` | `options`, `value`, `placeholder?`, `searchable?`, `createLabel?`; `valueChange` | **todo campo de valor múltiplo usa isto.** Chips em linha são proibidos — não escalam com 20 categorias. |
| `app-number-stepper` | `value`, `min`, `max`, `step?`; `valueChange` | o campo do meio é `<input>` digitável. Stepper só com botões não passa. |
| `app-segmented` | `options`, `value`; `valueChange` | já existe como `app-segmented-selector`; ajustar, não duplicar. |
| ~~`app-data-table`~~ → `app-responsive-list` | `columns: ResponsiveListColumn[]`, `rows` | **uma única definição de coluna** alimenta cabeçalho e linha. Nunca dois `grid-template-columns` escritos separadamente. Sempre dentro de scroller com `min-width`. **Ver emenda E1.** |
| `app-modal` | `open`, `title`, `eyebrow?`, `subtitle?`, `width?`; slots `body`, `footer`; `close` | três faixas: cabeçalho `flex:none`, corpo `flex:1; min-height:0; overflow-y:auto`, rodapé `flex:none`. Sem isso a rolagem quebra o layout. |
| `app-confirm-dialog` | `title`, `message`, `confirmLabel`, `destructive?`, `requirePhrase?` | toda exclusão passa por aqui. |
| `app-toast` / `UiFeedbackService` | `message`, `undo?` | toda mutação confirmada oferece "Desfazer". |
| `app-empty-state` | `icon`, `title`, `message`, `actionLabel?`; `action` | |
| `app-skeleton` | `variant`, `width?`, `lines?` | só no que vem do servidor. Título e cabeçalho de tabela renderizam de imediato. |
| `app-progress-bar` | `value`, `max`, `tone` \| `mode: 'consumo' \| 'conquista'` | **os limiares de cor moram aqui**, não em cada tela. |
| `app-money` | `value`, `sign?`, `size?` | formata BRL, aplica `tabular-nums`, aplica cor por sinal. Nunca formatar moeda à mão no template. |
| `app-chart-*` | por tipo | ver seção 8 |

**Definição de coluna, para não desalinhar nunca:**

```ts
export interface ColumnDef<T> {
  key: string;
  label: string;
  width: string;            // '112px' | 'minmax(180px,2.1fr)'
  align?: 'left' | 'right';
  cell: (row: T) => unknown;
}
```
O componente de tabela deriva `grid-template-columns` de `columns.map(c => c.width).join(' ')` e o usa **no cabeçalho e em cada linha**. É a única forma de garantir alinhamento.

---

### Emenda E2 — contrato real do `app-kpi-strip` (2026-08-16)

Decidida na Fase 8.1 do `PLANO_REDESIGN.md`, durante a implementação.

A seção 7 listava o `app-kpi-strip` como `items: KpiItem[]`, e `COMPONENTES.md` §3.1
descrevia o tooltip da faixa como um `?` com atributo `title`. As duas coisas mudaram, por
motivos encontrados na implementação:

1. **O contrato era fino demais para as telas que o handoff atribui ao formato (b).** O
   Dashboard precisa de `delta` (variação com direção e sinal), link "Ver detalhes", linha de
   pergunta e **ícone SVG por indicador** — `KpiItem.icon` era uma string. Investimentos e
   Calendário também usam ícone SVG. O `KpiItem` agora tem `key`, `question?`, `delta?` e
   `link?`, e o ícone entra por `ng-template` com o `key` no contexto.

2. **O `title` nativo saiu, em favor do `app-tooltip`.** `title` não abre em toque, não é
   estilizável e não é anunciado de forma confiável por leitor de tela. O README §8 exige que
   todo indicador explique seu cálculo — em celular, com `title`, essa explicação
   simplesmente não existe. O `app-tooltip` cumpre o mesmo requisito em todos os dispositivos.

A implementação veio da faixa que o Dashboard já tinha inline, que era a versão correta do
§3.1(b) e mais completa que o primitivo original.

---

### Emenda E1 — `app-responsive-list` no lugar do `app-data-table` (2026-08-16)

Decidida na Fase 8.1 do `PLANO_REDESIGN.md`, durante a implementação.

O repositório já tinha o `app-responsive-list`, com a mesma garantia que motivou o
`app-data-table` — **definição única de coluna**, via `columns: ResponsiveListColumn[]` — e
com um comportamento que o primitivo especificado aqui não cobria: **a tabela vira lista de
cards no mobile**. Nove telas já dependiam dele.

Manter os dois seria a duplicação que a seção 7 existe para impedir, então o
`app-data-table` foi apagado. O contrato acima passa a valer para o `app-responsive-list`.

Seleção em lote e paginação, que estavam no contrato original, não existem hoje no
`app-responsive-list`: quando alguma tela precisar, elas nascem nele — não num segundo
componente de tabela.

---

## 8. Gráficos

Um componente por tipo, em `shared/charts/`: `app-chart-line`, `app-chart-bars`, `app-chart-donut`.

**Nenhuma feature escreve SVG.** Se um gráfico novo é necessário, ele nasce em `shared/charts/` com contrato de série.

```ts
export interface ChartSeries {
  label: string;
  color: string;          // token, não hex
  points: number[];
  dashed?: boolean;       // comparação: aporte, benchmark, planejado
}
```

**A armadilha da barra proporcional** — está documentada em `COMPONENTES.md` seção 9 e é encapsulada no `app-chart-bars`. Se alguém reimplementar barras à mão vai reintroduzir o bug: a barra precisa da própria pista `flex:1; min-height:0`, senão a altura percentual resolve contra a coluna inteira (transborda por cima do texto) ou contra altura indefinida (achata tudo no `min-height`).

---

## 9. Lógica de domínio fica fora do componente

Toda regra de negócio é **função pura** em `*.model.ts`, com teste em `*.model.spec.ts`.

O repositório já faz isso bem — `financial-overview.model.ts`, `goal-view.model.ts`, `budget-overview.model.ts`, `calendar-agenda.model.ts` são o padrão a seguir. Não regredir.

```ts
// metas.model.ts
export function estadoDaMeta(meta: Meta, hoje: Date): EstadoMeta { … }
export function progressoDaMeta(meta: Meta): number { … }
```

Componente chama, não calcula. Isso é o que permite mudar o limiar de "em atenção" de 80% para 75% em um lugar só.

**Onde estão as regras que atravessam telas** (implementar uma vez, em `core/` ou `shared/`):

1. **Limiares de consumo × conquista** — despesa/orçamento/limite de cartão são consumo (passar é ruim); receita/aporte são conquista (chegar é bom). Duas funções, um lugar.
2. **Parcelado** — ao editar ou dar baixa em lançamento parcelado, perguntar se vale para esta parcela ou todas as seguintes. Um modal compartilhado, usado por Despesas, Cartões e Calendário.
3. **Permissão por plano** — um guard e uma função `podeAcessar(rota, plano)`. O menu e as rotas leem da **mesma** fonte. Menu mostrando item que a rota bloqueia é bug clássico.
4. **Formatação de moeda e data** — respeitando as preferências salvas em Configurações. Um serviço, nunca `toLocaleString` espalhado.
5. **Histórico insuficiente** — `temHistoricoSuficiente(meses: number)`. Gráfico de tendência com menos de dois meses de dados é substituído pelo bloco explicativo, não desenhado.

---

## 10. Rotas

Lazy por feature:

```ts
{
  path: 'despesas',
  canActivate: [planoGuard],
  data: { plano: ['ESSENCIAL', 'INTELIGENTE', 'COMPLETO', 'ADMIN'] },
  loadChildren: () => import('./despesas/despesas.routes').then(m => m.routes),
}
```

O array de planos em `data` e a visibilidade no menu vêm da **mesma constante**. Duplicar a lista é garantir que elas vão divergir.

---

## 11. Nomenclatura

| Coisa | Convenção | Exemplo |
|---|---|---|
| Componente | `kebab-case` na pasta, `PascalCase` na classe | `despesa-form-modal/` → `DespesaFormModalComponent` |
| Seletor | prefixo `app-` | `app-despesa-form-modal` |
| Signal privado | `_camelCase` | `_itens` |
| Signal público | `camelCase` | `itens` |
| Computed | substantivo, não `getX` | `visiveis`, `totais` |
| Output | verbo no passado ou `xChange` | `saved`, `valueChange` |
| Função pura de domínio | verbo em português | `calcularTotais`, `estadoDaMeta` |
| Constante | `SCREAMING_SNAKE` | `FILTRO_INICIAL`, `LIMIAR_ATENCAO` |

Português no domínio (é o idioma do produto), inglês nas primitivas de framework. Não misturar dentro do mesmo identificador.

---

## 12. Checklist de revisão de PR

Um PR de tela não entra se algum item falhar:

- [ ] `ChangeDetectionStrategy.OnPush`
- [ ] Nenhum hex, espaçamento, raio ou sombra literal
- [ ] Nenhum primitivo de `shared/` reimplementado
- [ ] Estado em signals, derivados em `computed`
- [ ] `takeUntilDestroyed` em toda subscription
- [ ] `FormGroup` tipado
- [ ] Regra de negócio em função pura, com teste
- [ ] Faixa de indicadores em flex com quebra, sem célula vazia em nenhuma largura
- [ ] Tabela em scroller com `min-width`, colunas de uma única definição
- [ ] Campo de valor múltiplo é dropdown
- [ ] Stepper aceita digitação
- [ ] Todo indicador com tooltip
- [ ] Modal com três faixas, rolagem só no corpo
- [ ] Ação destrutiva com confirmação; mutação confirmada com "Desfazer"
- [ ] Estados de vazio, carregando e erro implementados
- [ ] Testado em 1440px, 1024px e 390px

---

## 13. Os cinco erros que mais vão custar

1. **Copiar o SCSS de um card para outra tela.** Na terceira cópia ninguém sabe qual é a versão certa. Use o primitivo.
2. **Escrever `grid-template-columns` no cabeçalho e nas linhas separadamente.** Vão divergir na primeira mudança de coluna.
3. **Guardar valor derivado em campo mutável.** Fica velho e ninguém descobre até um usuário reclamar de número errado.
4. **Duplicar a lista de permissão por plano** entre menu e rota.
5. **Reimplementar barra de gráfico à mão.** Reintroduz o bug de altura percentual que já foi corrigido uma vez.
