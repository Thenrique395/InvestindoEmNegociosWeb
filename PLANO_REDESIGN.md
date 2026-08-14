# Plano de execução — Redesign Investindo em Negócios

Branch: `redesign/fase-1-base` · Base: `main` (commit `883faf1`)

Documento vivo. Fonte da verdade para a ordem de execução do redesign.

---

## 1. Fontes do design

### Pacote de handoff (dentro do repo)
`InvestindoEmNegociosWeb/design_handoff_investindo_redesign 2/`

| Arquivo | Papel |
|---|---|
| `ARQUITETURA_ANGULAR.md` | **Regras vinculantes de componentização** — ler antes de escrever código |
| `tokens.css` | Todos os tokens de design |
| `COMPONENTES.md` | Medidas, cores e estados de cada componente |
| `TELAS.md` | Especificação tela por tela |
| `PERFIS_E_PERMISSOES.md` | Menu e dashboard por plano |
| `ORDEM_DE_IMPLEMENTACAO.md` | Sequência original em 4 fases |
| `prototipos/*.dc.html` | 11 protótipos das telas autenticadas |

### Projeto de design original (fora do repo)
`~/Downloads/code-exploration-and-branding-setup/project/`

Contém `_ds/`, `support.js` e `assets/`, então os protótipos **renderizam de verdade**. É a única fonte dos protótipos de site, que **não vieram** no pacote de handoff:

| Arquivo | Conteúdo | Tema |
|---|---|---|
| `Site - pagina de vendas -claro-.dc.html` | Landing de conversão | claro |
| `Site - página de vendas.dc.html` | Mesma landing | navy |
| `Site - estilo produto.dc.html` | Tour do produto | claro + faixas navy |
| `Site - estilo produto (standalone-src).dc.html` | Idêntico + thumbnail do bundler | — |
| `Investindo em Negocios - Site.html` | Bundle auto-contido do tour | — |

> ⚠️ Esta pasta está em `~/Downloads` e é frágil. Ver pendência **P3**.

---

## 2. Decisões tomadas

| # | Decisão | Consequência |
|---|---|---|
| D1 | **Tokens: substituição integral.** `design-tokens.scss` passa a ser o `tokens.css` puro, sem aliases legados | Refatorar 4.231 referências em 132 arquivos, via codemod por família |
| D2 | **Escopo do "tirar tudo": só a camada de tokens.** Os 74 `*.component.scss` sobrevivem | Reescritos tela por tela, na fase de cada uma |
| D3 | **Planos: mapa de rótulos só na UI.** `Basic`/`Intermediate`/`Advanced` intactos no código e na API | Zero risco em auth, guards e backend |
| D4 | **Ícones: `lucide-angular`** | Uma dependência nova |
| D5 | **Rotas do site:** `/` = landing de vendas · `/produto` = tour · `/planos` = pricing | `product-showcase` migra para `/produto`; novo componente na `/` |
| D6 | **Landing em dois temas**, respeitando o `theme.service` | Tokens claro + navy para as páginas públicas |
| D7 | **Branch dedicada** `redesign/fase-1-base` | `main` intacta; nada commitado sem confirmação |

### D8 — Ação é verde no site, azul no app

Distinção que o `tokens.css` não explicita e que os protótipos deixam claro:

- **Site público**: CTA primário é **verde** `--brand-green #349063`. Links no tema claro são azuis `#2563EB`; no tema navy, verdes `#4FB783`.
- **App autenticado**: ação primária é **azul** `--primary #2563EB`. Verde fica reservado a receita/positivo.

Os componentes de botão do site e do app **não são o mesmo componente**.

---

## 3. Estado atual do código

Angular 21 · standalone · signals · Tailwind 3.4 · SSR

| Métrica | Valor |
|---|---|
| Referências a tokens | 4.231 em 132 arquivos |
| Arquivos `.scss` em `app/` | 74 |
| Hex literais em SCSS de componente | 33 em 9 arquivos |
| Componentes em `shared/` | 25 |

### Colisões de token (por que D1 exige codemod, não find-replace)

| Token | Hoje | No `tokens.css` | Risco |
|---|---|---|---|
| `--font-display` | `clamp(2rem,3vw,3rem)` — tamanho | `'Poppins'` — família | `font-size: 'Poppins'` quebra todo título |
| `--font-body` | `1rem` — tamanho | `'Inter'` — família | mesma quebra no corpo |
| `--radius-sm` | `0.5rem` | `9px` | raios errados em massa |
| `--bg` | `#f8fafc` | não existe (virou `--bg-app`) | fundo do app não muda |
| `--success` | `#22c55e` | não existe (virou `--income`) | 132 usos órfãos |
| `--info` | `#0ea5e9` | **não existe** | 61 usos sem destino — ver **P1** |
| `--font-weight-*` | 400–800 | **não existe** | alimenta o `tailwind.config.js`; remover quebra `font-bold` — ver **P2** |
| `--spacing-*` | rem, com `html{font-size:14px}` | `--space-*` em px | conversão **não é 1:1**; densidade muda de verdade |

---

## 4. Ordem de execução

### FASE 1 — Base de estilo ✅ CONCLUÍDA

- [x] **1.1** Pendências P1 e P2 resolvidas
- [x] **1.2** Mapa de equivalência completo, família por família
- [x] **1.3** `design-tokens.scss` ← `tokens.css` integral
- [x] **1.4** Codemod por família — **2.926 substituições em 128 arquivos**
      (cor 1.180 · tipografia 1.132 · métrica 614)
- [x] **1.5** `styles.scss`: Poppins 600/700, `.type-*` com `--font-display`, `.type-eyebrow`,
      `.ffx`/`.tabular`, `skShimmer` + `.sk`, `:focus-visible`, botão em 40px/raio 10px/13px
- [x] **1.6** `@fontsource/poppins` + `@lucide/angular`; `tailwind.config.js` com `--fw-*` e `font-display`
- [x] **1.7** Hex literais: de 33 para **3** (só bandeiras de cartão — ver nota)
- [x] **1.8** Tema escuro reescrito com a paleta do handoff

**Verificado**: `npm run quality:frontend` verde — typecheck, **557/557 testes**, build de produção.
No navegador: tokens efetivos corretos (`--text #0A2430`, `--bg-app #F4F7F9`, `--primary #2563EB`,
`--fs-body 13px`, `--radius-card 16px`), Poppins carregando sob demanda a 26px/600/−0.65px,
zero erro de console em `/`, `/planos` e `/login`.

**Hex remanescentes** — 3 gradientes de bandeira de cartão (Visa, Elo, Amex) em
`cartoes-listagem.component.scss`. São cores de marca de terceiros, não do design system.
Resolvem-se na fase 5.4, quando o cartão passa ao gradiente navy do handoff.

#### Decisões tomadas dentro da fase

| Item | Decisão | Motivo |
|---|---|---|
| `--text-muted` (307 usos) | → `--text-tertiary` `#7A929E` | O `--text-muted` novo é `#9FB2BB`, contraste ~2,4:1. `--text-tertiary` preserva legibilidade e é o equivalente funcional |
| Raio | mapeado **por valor**, não por semântica | `--radius-lg` (107 usos) serve botão *e* card; separar exige contexto. O refino semântico acontece quando cada tela é reescrita |
| `--spacing-6` | → `--space-12` (28px) | É o padding lateral de página/header; 28px é exatamente o valor do redesign |
| `--font-weight-extrabold` | → `--fw-bold` (700) | O peso 800 não aparece em nenhum ponto do handoff |
| `CATEGORY_PALETTE` | expandida de 5 para 7 cores | TELAS.md §7 especifica `--chart-1` a `--chart-7` |

#### Bugs pré-existentes corrigidos de passagem

- `--line-height-heading` e `--text-base` eram usados **sem fallback** e sem definição:
  `line-height` e `font-size` inválidos, herdando do pai. Agora apontam para tokens reais.
- 28 fallbacks `var(--token, #hex)` removidos — literais mortos, já que o token sempre resolve.

---

### FASE 2 — Site público

Ordem: primitivos → landing → tour → pricing.

#### 2.1 Primitivos do site — `app/site/shared/` ✅ CONCLUÍDO

Nascem aqui porque não têm nada a ver com o app autenticado.

- [x] `site-header` — sticky 72px, nav âncora por `@Input`, "Entrar" + CTA
- [x] `site-footer` — 4 colunas + barra inferior; variante `compact` para `/produto`
- [x] `site-section` — eyebrow + título + descrição + slot `aside`, alterna fundo
- [x] `site-cta` — **diretiva**, não componente: um CTA que navega precisa ser `<a>` de
      verdade, e um wrapper obrigaria a duplicar `<ng-content>` por elemento
- [x] `reveal.directive` — `opacity` + `translateY(34px)`, 900ms, `cubic-bezier(.16,.8,.3,1)`
- [x] `site-card-grid` — atende passos, recursos, personas e segurança
- [x] `site-stat-strip` — divisor por `gap:1px` sobre fundo, não `border-right`
- [x] `site-faq` — accordion, um aberto por vez
- [x] `site-plan-cards` — consome `MARKETING_PLANS`, com 8 testes

> A revelação ao rolar não é enfeite: sem ela a página renderiza em branco. Descoberto ao
> capturar os protótipos — as seções só aparecem depois do scroll. Por isso a diretiva
> nasce revelada no SSR e há uma salvaguarda CSS em `prefers-reduced-motion`: a regra
> global de reduced-motion mata a transição mas não o `opacity: 0`.

#### 2.2 Landing de vendas — `/` — `app/site/vendas/` ✅ CONCLUÍDA

As 13 seções do protótipo, todas implementadas. Texto copiado literalmente para
`vendas.content.ts` — a copy foi aprovada junto com o design e não se reescreve.

**Verificado**: altura 6.376px contra 6.540px do protótipo · `quality:frontend` verde com
**565 testes** · sem scroll horizontal em 1440 / 1024 / 390 · zero erro de console.

**Dados**: `marketing-plans.ts` é a fonte única. Só ganhou dois campos que o protótipo tem
e o modelo não: `tag` (GRÁTIS / MAIS ESCOLHIDO / COMPLETO) e `ctaLabel`. Nome, preço,
headline, features e limits já batiam.

**Moeda**: usa `formatCurrencyValue` de `utils/locale-utils`, não o `CurrencyPipe`. O pipe do
Angular exige locale `pt-BR` registrado (o app não registra → `NG0701`), e o `AppCurrencyPipe`
do projeto é impuro e depende do serviço de ocultar valores — nada disso faz sentido numa
página pública.

**Ajustes no shell** que a landing exigiu:
- `isSiteRoute` em `app.component`: a página traz o próprio cabeçalho, porque cada página do
  site tem um nav diferente. `/produto` entra aqui só quando for repaginado — listá-lo antes
  o deixaria sem cabeçalho nenhum.
- `.page--site` zera o padding do shell: as faixas precisam ir de ponta a ponta.
- `/produto` adicionado à whitelist de `isPublicLayoutRoutePath` no `AppSessionFacade`. Sem
  isso a rota nova era tratada como protegida e ficava sem cabeçalho e rodapé.

#### 2.3 Tour do produto — `/produto` — `app/site/produto/` ✅ CONCLUÍDA

Substitui o `product-showcase`. Alterna faixas claras e navy, tipografia grande.

- [x] Hero navy — "Seu mês inteiro. Numa tela só."
- [x] "Nada de somar na mão." — 3 degraus (bruto → comprometido → disponível)
- [x] "Cada tela responde uma pergunta." — 6 cards
- [x] "Cartões. No mês certo." — faixa navy com cartão e barra de limite
- [x] "A meta sabe se você está no ritmo." — 2 cards de meta
- [x] "No bolso, na hora." — faixa navy com 2 mockups de celular
- [x] "Feito para quem cuida do dinheiro todo dia." — bento com gráfico, orçamento e destaque
- [x] Tabela comparativa + 3 garantias + rodapé compacto

**Verificado**: altura 5.632px · `quality:frontend` verde · varredura de 16 combinações
(4 páginas × 2 temas × 2 larguras) sem scroll horizontal e sem erro de console.

**Primitivo novo**: `site-compare-table` — `<table>` de verdade, com `scope` nos cabeçalhos e
texto alternativo na marca de disponibilidade. São dados tabulares: uma grade de divs deixaria
o leitor de tela sem associar a célula ao plano da coluna.

**A armadilha da barra proporcional** (COMPONENTES.md §9) foi respeitada no gráfico de seis
meses: cada barra tem a própria pista `flex:1; min-height:0`. Sem isso a maior transbordaria
por cima do rótulo.

#### 2.5 Páginas legais — `/termos` e `/privacidade` ✅ CONCLUÍDA

Um componente (`legal-page`) serve os dois documentos: mesma anatomia, conteúdo diferente,
escolhido por `data: { slug }` na rota.

> ⚠️ **O texto não passou por revisão jurídica.** Foi redigido para ser coerente com o que o
> site afirma (não pede senha de banco, dados exportáveis) e com a LGPD, mas é peça contratual.
> Há placeholders a preencher: `{{RAZAO_SOCIAL}}`, `{{CNPJ}}`, `{{ENDERECO}}`, `{{EMAIL_CONTATO}}`.

O `slug` vem de `data`, não de `input()`: o app não habilita `withComponentInputBinding()`, e
ligá-lo afetaria os 40+ componentes de rota do projeto.

#### 2.6 Tema navy do site ✅ CONCLUÍDO

A landing e o tour respondem ao `theme.service` — quase tudo funcionou só com os tokens.

Uma exceção precisou de tratamento: **a prévia do app permanece clara nos dois temas**. No
protótipo navy a janela do painel continua branca, porque é uma imagem do produto, não uma
superfície da página — escurecê-la faria o site mostrar um app diferente do real. Daí os
tokens `--preview-*`, fixos e independentes de tema.

#### 2.4 Planos — `/planos` — `app/site/planos/` ✅ CONCLUÍDA

Substitui o `pricing.component`, preservando todo o conteúdo comercial que já existia —
progressão (Começar / Prever / Evoluir), comparativo e FAQ de planos. Só a apresentação mudou.

- [x] Hero com alternador de ciclo e nota de decisão
- [x] Cards de plano + nota de cobertura
- [x] Progressão comercial em 3 passos
- [x] Comparativo com células **textuais e booleanas** na mesma tabela
- [x] FAQ de 4 itens
- [x] Garantias + fechamento

Mantida a restauração de `title` e `description` no `ngOnDestroy`, que a versão anterior já
fazia: sem ela, sair da página deixa o título de planos em toda rota seguinte.

**Primitivo estendido**: `site-compare-table` passou a aceitar `boolean | string` por célula.
`true`/`false` viram ícone; string vira texto. A página de planos compara *resultado*
("Operar o mês com previsibilidade") na mesma tabela em que marca disponibilidade.

#### 2.7 Fechamento do site ✅ CONCLUÍDO

- [x] Responsivo em 1440 / 1024 / 390
- [x] Tema claro e navy em todas as páginas
- [x] SEO: title e description por rota
- [x] **30 combinações verificadas** (5 páginas × 2 temas × 3 larguras): sem scroll
      horizontal, sem erro de console, cabeçalho e rodapé presentes em todas

### Estado do site

| Rota | Componente | Origem |
|---|---|---|
| `/` | `site/vendas` | `Site - pagina de vendas` |
| `/produto` | `site/produto` | `Site - estilo produto` |
| `/planos` | `site/planos` | conteúdo preservado do `pricing`, apresentação nova |
| `/termos` · `/privacidade` | `site/legal` | novo |

`app/site/` tem 46 arquivos: 11 primitivos compartilhados e 4 páginas.

---

### FASE 3 — Shell do app ✅ CONCLUÍDA

- [x] Sidebar navy 212px — grupos, item 34px, barra verde de 3px no ativo, rodapé de perfil
- [x] Topbar 56px — busca ⌘K, pílula Assistente, ocultar valores / tema / notificações
- [x] Área de conteúdo `26px 28px 40px`, `gap:16px`
- [x] `app-page-header` — eyebrow, título, descrição, meta, período, ações
- [x] Menu com **fonte única** verificada por teste

**Verificado no app, logado**: sidebar 212px em `#002E3E` · barra do ativo 3px `#4FB783` × 16px ·
topbar 56px · `⌘K` com detecção de plataforma · 6 grupos (com "Visão geral" e "Conta") ·
rodapé com nome e plano · mobile com sidebar em gaveta, sem scroll horizontal.
**599 testes** (49 novos de navegação).

#### Fonte única de navegação — P4 e P5 resolvidos

`NAV_SECTIONS` saiu do `SidebarComponent` para `navigation.ts`, e `navigation.spec.ts` cruza o
menu com `app.routes.ts` a cada build.

A regra do teste é **assimétrica**, e isso importa: o menu nunca pode ser *mais permissivo* que
a rota — isso mostraria um item que leva a um bloqueio. O contrário é legítimo: `/calculadora` é
uma rota aberta, mas só faz sentido listá-la para quem já entrou.

O teste pegou essa divergência real logo na primeira execução.

**Menu conforme `PERFIS_E_PERMISSOES.md`**: grupo "Visão geral" ganhou rótulo, Simulador foi de
Planejamento para Análises, e o grupo "Conta" (Perfil · Configurações) passou a existir.

**Rótulo de plano (D3 aplicado)**: `plan-labels.ts` traduz `Basic`/`Intermediate`/`Advanced`
para "Plano Essencial"/"Controle"/"Patrimônio", lendo os nomes de `marketing-plans.ts` — mesma
fonte da landing. Código e API seguem intactos.

#### 🐛 Segundo bug pré-existente encontrado e corrigido

Telas com pouco conteúdo apareciam **empurradas para o meio da janela**. Em Metas sem metas, o
título começava a 453px do topo.

Causa: `.content` é um grid com `min-height` e três linhas automáticas (topbar, banner,
conteúdo). Sem `align-content`, o grid reparte a altura sobrante entre as três — a linha da
topbar de 56px inflava para 209px. Só aparecia quando o conteúdo era curto, por isso passava
despercebido no dashboard.

Corrigido com `align-content: start`. As linhas passaram de `209px 153px 558px` para
`56px 0px 405px`, e o título subiu para 132px.

#### Pendência

`Histórico mensal` e `Calculadoras` **não constam** no `PERFIS_E_PERMISSOES.md`, mas as telas
existem e estão no ar. Mantive as duas em "Análises" — tirá-las do menu deixaria funcionalidade
inacessível. Ver P13.

---

### FASE 4 — Primitivos compartilhados — `app/shared/` ✅ CONCLUÍDA (13 de 13)

Contrato de cada um na seção 7 de `ARQUITETURA_ANGULAR.md`.

| # | Componente | Situação |
|---|---|---|
| 4.1 | `app-select-menu` | ✅ criado — CVA, teclado completo, busca, "criar nova" |
| 4.2 | `app-number-stepper` | ✅ criado — campo digitável, sanitizado só no blur |
| 4.3 | `app-segmented` | ✅ ajustado — trilho `#EDF2F5`, aba ativa branca com sombra |
| 4.4 | `app-kpi-strip` | ✅ criado — flex com quebra, divisor por `box-shadow` |
| 4.5 | `app-metric-card` | ✅ `app-stat-card` ajustado — sem gradiente, sem sombra em repouso |
| 4.6 | `app-data-table` | ✅ criado — grade única, scroller, seleção, paginação · 15 testes |
| 4.7 | `app-modal` | ✅ ajustado às três faixas |
| 4.8 | `app-toast` | ✅ `successWithUndo()` + botão "Desfazer" |
| 4.9 | `app-empty-state` / skeleton | ✅ ajustados (`.sk` veio na fase 1) |
| 4.10 | `app-progress-bar` | ✅ criado — limiares isolados · 11 testes |
| 4.11 | `app-money` | ✅ criado — respeita "ocultar valores" |
| 4.12 | `app-chart-bars` / `app-chart-line` | ✅ criados |
| 4.13 | Modal de parcelado | ✅ criado · 8 testes |

**Verificado**: 629 testes · **todos** renderizados no `/styleguide`, com demo ao vivo.

Medidos no navegador:
- **kpi-strip**: 4 itens quebram em 2 linhas e a última cresce e preenche
- **chart-bars**: a barra máxima não transborda e nenhuma achata
- **modal**: card `flex column` com `max-height:88vh`, cabeçalho e rodapé `flex:none`,
  corpo `flex:1; min-height:0; overflow-y:auto`
- **segmented**: trilho `rgb(237,242,245)`, aba ativa branca
- **data-table**: cabeçalho e linhas com `grid-template-columns` idêntico

#### 🐛 Regressão do codemod da fase 1, encontrada e corrigida

Os links da sidebar do `/styleguide` estavam **invisíveis**. O token `--sidebar` antigo era
**branco**; o codemod o mapeou para `--nav-bg`, que é navy — texto escuro sobre fundo escuro.
Era o único uso herdado fora da sidebar do app. Corrigido para `--surface`.

Passou por três fases sem ser notada porque `/styleguide` não estava no roteiro de verificação
visual. Agora está, e os 13 primitivos vivem lá.

### FASE 5 — Telas do dia a dia 🔶 EM ANDAMENTO

| # | Tela | Observação |
|---|---|---|
| 5.1 | Dashboard | 🔶 faixa de KPIs feita; faltam saúde financeira, evolução, atenção, recorrências, orçamento e metas |
| 5.2 | Despesas | 🔶 em andamento |
| 5.3 | Receitas | sai barato depois de 5.2 — muda conteúdo e polaridade |
| 5.4 | Cartões | + `invoice-import`; resolve os 3 hex de bandeira |
| 5.5 | Contas | |
| 5.6 | Calendário | 4 visões |
| 5.7 | Categorias | paleta fixa `--chart-1..7`, sem seletor livre |

#### Achado que muda a estratégia desta fase

As telas **já estão componentizadas na mesma estrutura do protótipo**. Despesas, por exemplo,
é composta de `transaction-summary-card`, `period-hero`, `period-total-card`,
`bulk-action-bar`, `filter-bar` e `despesas-lista` — exatamente os blocos do
`Despesas-e-Receitas.dc.html`.

Ou seja: a fase 5 **não é reescrever telas, é repaginar componentes compartilhados**. E o
alcance de cada um é grande:

| Componente | Telas que o usam |
|---|---|
| `transaction-summary-card` | **20** |
| `filter-bar` | 7 |
| `period-hero` · `period-total-card` | 4 cada |

É o mesmo princípio de maior retorno da fase 1: mexer em um componente muda dezenas de telas.

#### Feito

- [x] `transaction-summary-card` repaginado — **alcança 20 telas**. Verificado em `/despesas`:
      raio 16px, **sem sombra em repouso**, valor em Poppins 26px com `tabular-nums`
- [x] `period-hero` — setas ‹ › de 32px ao lado do título (eram botões "Mês anterior"/"Próximo
      mês" abaixo), título em Poppins. **Alcança 4 telas**
- [x] Filtros de Despesas com `app-select-menu` — zero `<select>` nativo, categoria com busca
- [x] `period-total-card` — superfície branca, sem sombra, valor em Poppins. **4 telas**
- [x] `responsive-list` repaginado à tabela do handoff — **alcança 9 telas**

#### Decisão: repaginar `responsive-list` em vez de migrar para `data-table`

9 telas usam `responsive-list` (Despesas, Receitas, Orçamento, Empréstimos, Relatórios,
Investimentos…). Repaginar o SCSS dele entrega a aparência da tabela do handoff nas nove de
uma vez; migrar cada tela para `app-data-table` daria o mesmo resultado visual com nove
refatorações.

Os dois convivem: `app-data-table` é o primitivo para telas refeitas do zero — ele traz grade
única, seleção em lote e paginação que o `responsive-list` não tem.

Verificado em `/despesas`: cabeçalho **10px uppercase** (inclusive nas colunas ordenáveis),
linha de 66px, tabela e card de total **sem sombra em repouso**.

Um detalhe que a verificação visual pegou: o botão de ordenar é um `<button>`, e o reset do
Tailwind zerava fonte e caixa herdadas do `<th>` — as colunas ordenáveis ficavam em caixa
normal ao lado de "AÇÕES" em caixa alta.

- [x] Despesas — filtros em dropdown, título sem `titlecase`
- [x] Receitas — filtros em dropdown; herdou cards, hero, total e tabela prontos

**Medido nas 5 telas restantes**: todas já herdaram cards com raio 16px, tabela com
cabeçalho 10px, sem scroll horizontal e sem erro de console. O visual chegou nelas pelos
componentes compartilhados, sem uma linha por tela.

- [x] Filtros em dropdown: Contas (4), Categorias (2), Calendário (2)

**Todos os filtros de listagem** agora usam `app-select-menu`. Verificado no app: Despesas,
Receitas, Categorias e Calendário com 2 dropdowns cada e **zero `<select>` nativo**; o
comportamento foi testado ponta a ponta (abrir → listar → escolher → valor muda).

Contas aparece com 0 dropdowns na medição porque a conta de teste **está sem contas
cadastradas** e a tela mostra o estado vazio — os 4 filtros existem no template.

#### A fazer

- [ ] `<select>` em **formulários de modal**: `account-form`, `account-transfer`,
      `account-import` e o formulário de cartão. Não são filtros; entram quando os modais
      forem refeitos
- [ ] Cartões: filtros de fatura usam `[ngValue]` **numérico** (mês). Converter para o
      dropdown exige acertar o tipo, e errar ali quebra o filtro de competência
- [ ] Ligar o modal de parcelado nas ações de baixa e edição de Despesas e Cartões
- [ ] Dashboard (5.1) — depende dos três perfis; fazer o Completo e recortar

### FASE 6 — Planejamento e análise

| # | Tela | Observação |
|---|---|---|
| 6.1 | Metas | consumo × conquista é o núcleo; ler `goal-view.model.ts` antes |
| 6.2 | Orçamento | edição na linha |
| 6.3 | Investimentos | **a maior**: 9 componentes, ~4.700 linhas, 5 abas |
| 6.4 | Empréstimos | |
| 6.5 | Relatórios | + `monthly-snapshots` |
| 6.6 | Simulador | + `calculator` |
| 6.7 | Assistente | |
| 6.8 | Perfil | + `user-security` |
| 6.9 | Configurações | barra de salvar fixa, zona sensível |

---

### FASE 7 — Fluxos e transversais

| # | Item | Situação |
|---|---|---|
| 7.1 | ~~Autenticação~~ | ✅ **CONCLUÍDA** — ver seção abaixo |
| 7.2 | Onboarding | 4 passos |
| 7.3 | Dashboard administrativo | + telas `admin-*` |
| 7.4 | Tema escuro | segundo conjunto de tokens, não CSS duplicado |
| 7.5 | Mobile | 🔶 tabela → cards **feito** (9 telas). Falta bottom nav com FAB e revisão tela a tela |
| — | ~~Checkout e plano~~ | **fora**: pagamento adiado até o gateway estar configurado |

---

### FASE 7.1 — Autenticação ✅ CONCLUÍDA

Quatro telas: `/login`, `/register`, `/forgot-password`, `/reset-password`.

**Método**: os `.ts` ficaram praticamente intactos — só ganharam o import do layout.
Trocamos HTML e SCSS. Essas telas carregam lógica que não pode se perder: double opt-in por
`confirmToken`, reenvio de confirmação, `returnTo`/`plan`/`cycle`, perfil incompleto →
onboarding, e tratamento de 423 / 429 / 403 / 401.

- [x] `app-auth-layout` — cartão dividido, painel navy à esquerda, formulário à direita
- [x] `styles/auth.scss` — campos, caixa de seleção, medidor de força, avisos, requisitos
- [x] Os quatro templates reescritos
- [x] 4 SCSS de componente removidos (1.271 linhas) — o layout e o global cobrem tudo

**Verificado**: 550 testes · máscara de CPF (`111.444.777-35`) · medidor de força (2 barras em
`abc123`, 3 em `Abc12345!`) · botão desabilitado com formulário inválido · mobile sem scroll
horizontal com o painel oculto.

#### 🐛 Bug pré-existente encontrado e corrigido: a redefinição de senha estava quebrada

`/reset-password?token=...` caía em **"Link inválido ou expirado" mesmo com um link válido**.

Causa: `Location.replaceState()` do Angular — usado para tirar o token da barra de endereço —
**notifica o Router**, que recria o componente. A instância recriada lê a URL já sem o token e
conclui que não há token.

Confirmado empiricamente: desativando a linha, o formulário aparece. A lógica de leitura é
idêntica à do commit anterior, então o bug já existia.

Correção: `window.history.replaceState`, que não notifica o Router. Mantém a proteção de tirar
o token do histórico **e** preserva o token em memória — as duas coisas verificadas.

#### Diferenças conscientes em relação ao protótipo

| Item | Decisão |
|---|---|
| "Manter conectado" | **Não implementado.** O `AuthService` não tem suporte a sessão persistente; adicionar seria mudança funcional, não visual. Ver P12 |
| Modal de cadastro | Preservado o suporte (`isRoutePage` + `ng-template`), embora `openSignup()` **já não tivesse chamador antes** desta fase — o modal já estava órfão |

## 5. Regras vinculantes

De `ARQUITETURA_ANGULAR.md`. Um PR não entra se algum item falhar.

- `ChangeDetectionStrategy.OnPush` em todos os componentes
- Nenhum hex, espaçamento, raio ou sombra literal fora de `design-tokens.scss`
- Nenhum primitivo de `shared/` reimplementado por feature
- Estado em signals privados + `asReadonly()`; derivados sempre em `computed()`
- `takeUntilDestroyed(this.destroyRef)` em toda subscription
- `FormGroup` tipado, via `fb.nonNullable.group`
- Regra de negócio em função pura de `*.model.ts`, com teste
- Faixa de indicadores em flex com quebra, sem célula vazia em nenhuma largura
- Tabela em scroller com `min-width`, colunas de **uma única** definição
- Campo de valor múltiplo é dropdown, nunca chips
- Stepper aceita digitação
- Todo indicador com tooltip explicando o cálculo
- Modal com três faixas, rolagem só no corpo
- Ação destrutiva com confirmação; mutação confirmada com "Desfazer"
- Estados de vazio, carregando e erro implementados
- Testado em 1440px, 1024px e 390px

### Camadas

```
core/      serviços, guards, interceptors, modelos
   ↑
shared/    primitivos de UI sem conhecimento de domínio
   ↑
features/  telas
```

`shared/` nunca importa de `features/` nem serviço de domínio. Duas features nunca se importam.
Um componente sobe para `shared/` quando a **terceira** feature precisar dele.

---

### Auditoria de responsividade — 9 telas em 390px

Varredura automatizada (scroll horizontal + elementos que estouram) em Dashboard, Despesas,
Receitas, Cartões, Contas, Calendário, Categorias, Metas e Orçamento.

**Resultado**: nenhuma página rola na horizontal. Mas o `responsive-list` — apesar do nome —
**não tinha uma única media query**: em 390px mantinha a tabela com rolagem lateral, contra a
regra de COMPONENTES.md §4 ("a tabela vira lista de cards (...) Nunca scroll horizontal
infinito").

Corrigido para as **9 telas** que usam o componente: cada linha vira card, com o rótulo da
coluna reaparecendo como etiqueta via `data-label` — sem ele, o valor sozinho perde o
significado ("R$ 318,42" de quê?).

O `<thead>` é ocultado com `clip-path`, não `display:none`: some da tela mas continua na
árvore de acessibilidade, então os `<th>` seguem nomeando as células para o leitor de tela.
A tabela continua sendo `<table>` no HTML — só a apresentação vira blocos.

**Ainda estouram em 390px** (fora do `responsive-list`): `page-header` no Calendário e o
título de seção no Orçamento.

### Auditoria de contraste — tema escuro, 9 telas do app

Medição automatizada de todo texto visível contra o fundo composto, com os limiares da WCAG
(4.5:1 normal, 3:1 para texto grande ou negrito ≥18.66px).

**Achado real**: os cards de ação primária ("Adicionar despesa/receita/cartão") usavam
`color: white` fixo. No tema claro o fundo é o azul escuro `#2563EB` e funciona; no escuro a
primária vira `#5B9DFF` — **branco sobre azul claro media 2.52:1**, abaixo do mínimo.

Corrigido para `--on-primary`, que carrega o par certo em cada tema:
**2.52:1 → 7.35:1** (passa AA e AAA); o subtítulo, a 80% de opacidade, ficou em 5.23:1.

#### Duas armadilhas do próprio medidor, que valem para a próxima auditoria

1. **Alpha**: um badge com fundo `rgba(224,164,88,.16)` e texto `#E0A458` mede 1:1 se o alpha
   for ignorado — o script acusou **102 falsos positivos** em Categorias antes de compor as
   camadas de fundo.
2. **Gradiente**: `background: linear-gradient(...)` não aparece em `backgroundColor`, então o
   medidor sobe para o pai e compara contra o fundo errado. Foi o que fez a correção do botão
   *parecer* ter piorado. A conferência final teve que ser visual.

Sobram 4.01:1 em rótulos de aba (Calendário e Categorias) — abaixo de 4.5 para texto normal.
Não corrigido: exige decidir se o rótulo inativo sobe de `--text-tertiary` para
`--text-secondary`, o que mexe no contraste entre aba ativa e inativa em ambos os temas.

### Dashboard — faixa de indicadores

O `financial-overview` usava exatamente o que o handoff proíbe:

```
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
```

ARQUITETURA_ANGULAR.md §7 e COMPONENTES.md §3.1(b): *"flex com quebra, **proibido `grid` com
`auto-fit`** — deixa célula vazia"*. Com 5 KPIs no perfil Completo, é o caso exato.

Convertido para faixa unida: `flex: 1 1 200px`, divisor por `box-shadow` (cobre a quebra de
linha sem borda solta), primeira célula com gradiente e valor maior, valores em Poppins com
`tabular-nums` — sem isso, dígitos de largura variável fazem as 5 colunas dançarem a cada
atualização.

**Medido**: faixa de 1172px, células somando 1170px — preenche a linha inteira, sem sobra.

#### Restante do Dashboard

Saúde financeira (só Completo), evolução de 12 meses, "Precisa da sua atenção", recorrências,
orçamento do mês, metas e insights. Mais o recorte por perfil (Essencial 3 KPIs, Inteligente e
Completo 5) e a regra de **histórico insuficiente**: com menos de dois meses de dados, o
gráfico de evolução é substituído por um bloco explicativo — desenhar tendência com dois
pontos mente sobre o dado.

## 6. Pendências

| # | Pendência | Bloqueia |
|---|---|---|
| ~~P1~~ | ✅ `--info` → `--primary` (41 usos), `--info-text` → `--primary-text`, `--info-10/20` → `--primary-tint` | — |
| ~~P2~~ | ✅ `--fw-regular/medium/semibold/bold` tokenizados conforme os pesos usados na spec; `tailwind.config.js` aponta para eles | — |
| ~~P3~~ | ✅ 4 protótipos de site + `_ds/`, `support.js`, `assets/` copiados para `prototipos/` (1,8 MB); renderização confirmada a partir do repo | — |
| **P4** | Nomes de plano divergem em três lugares: código `Basic/Intermediate/Advanced` · marketing `Essencial/Controle/Patrimônio` · handoff de perfis `Essencial/Inteligente/Completo`. **O marketing e o código de `marketing-plans.ts` já concordam entre si** — a divergência é só com o handoff de perfis | Fase 3 |
| **P5** | Menu atual ≠ `PERFIS_E_PERMISSOES.md`: sobra "Histórico mensal" e "Calculadoras", Simulador está em Planejamento (handoff põe em Análises), falta grupo "Conta" | Fase 3 |
| **P6** | Pasta do handoff no repo chama-se `design_handoff_investindo_redesign 2` — renomear? | — |
| ~~P7~~ | ✅ `#E0A458` validado por contraste: **7.89:1** sobre `#011E29` (AA texto normal), na mesma faixa de income (9.67), expense (7.53) e primary (6.33) | — |
| **P8** | ⚠️ **BLOQUEIA PUBLICAÇÃO.** `/termos` e `/privacidade` estão no ar com os placeholders `{{RAZAO_SOCIAL}}`, `{{CNPJ}}`, `{{ENDERECO}}` e `{{EMAIL_CONTATO}}` **visíveis ao usuário**, e o texto não passou por revisão jurídica. Decidido deixar assim enquanto o site não for publicado | antes de publicar |
| ~~P9~~ | ✅ Site respondendo aos dois temas; prévia do app mantida clara via tokens `--preview-*` | — |
| ~~P10~~ | ✅ `product-showcase` (2.100 linhas) e `pricing` (1.094 linhas) removidos, mais a regra órfã `.pricing-page` do `styles.scss`. Testes: 565 → 550 (−15 dos specs apagados) | — |
| ~~P11~~ | ✅ Resolvido com `variant` no `site-plan-cards`: `landing` mostra `salesHeadline`+`salesSubheadline`, `tour` mostra `audience`+`highlight`. Muda a ênfase, não a fonte — os dois lêem o mesmo `MarketingPlan` | — |
| ~~P12~~ | ✅ **Decidido: não implementar.** Sessão persistente muda como o token é guardado e por quanto tempo — decisão a tomar junto com o backend, não com o layout | — |
| ~~P13~~ | ✅ **Decidido: manter no menu**, em "Análises". Tirá-las deixaria funcionalidade existente inacessível | — |
| ~~P14~~ | ✅ `titlecase` removido de Despesas — Receitas já fazia certo, e agora as duas dizem "de agosto de 2026". O `TitleCasePipe` saiu do componente |  — |

---

## 7. Verificação

```bash
npm run typecheck      # tsc --noEmit
npm run test:ci        # karma headless + cobertura
npm run build:prod     # build de produção
npm run quality:frontend  # os três acima
```

Protótipos renderizam com Playwright a partir de
`~/Downloads/code-exploration-and-branding-setup/project/` — dependem de `support.js` e `_ds/`
na mesma pasta, e exigem **scroll até o fim** antes da captura, senão a revelação ao rolar
não dispara e a página sai em branco.
