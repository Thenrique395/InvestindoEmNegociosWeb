# Plano de execução — Redesign Investindo em Negócios

Branch: `redesign/fase-1-base` · Base: `main` (commit `883faf1`)

Documento vivo. Fonte da verdade para a ordem de execução do redesign.

---

## 1. Fontes do design

### Pacote de handoff (dentro do repo)
`InvestindoEmNegociosWeb/design_handoff_investindo_redesign/`

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

`Histórico mensal` e `Calculadoras` existem e estão no ar. Mantive as duas em "Análises" — tirá-las
do menu deixaria funcionalidade inacessível. `PERFIS_E_PERMISSOES.md` foi atualizado para
registrar essa decisão.

---

### FASE 4 — Primitivos compartilhados — `app/shared/` 🔶 CRIADOS (13 de 13), ADOTADOS (6 de 13)

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
| 5.1 | Dashboard | 🔶 KPIs, saúde financeira Patrimônio, evolução Controle, orçamento do mês, recorrências do mês, dívidas/contas, investimentos, recortes por perfil e regras de histórico insuficiente aplicados; falta acabamento visual |
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

- [x] `<select>` em **formulários de modal**: `account-form`, `account-transfer`,
      `account-import` e formulário de cartão migrados para `app-select-menu`
- [x] Cartões: filtros de fatura migrados para `app-select-menu`; mês preservado como
      `number | null` via conversão explícita entre valor do dropdown e filtro de competência
- [ ] Ligar o modal de parcelado nas ações de baixa e edição de Despesas e Cartões — bloqueado
      por contrato: o handoff pede "esta e as seguintes", mas o frontend hoje só tem APIs para
      parcela atual (`/installments/:id`) ou plano inteiro (`/plans/:id`)
- [ ] Dashboard (5.1) — continuar pelo superconjunto Patrimônio e recortar por perfil; próximo bloco: acabamento visual incremental
- [ ] QA visual final app real × handoff — rodar quando a rodada principal do rebrand fechar,
      com screenshots pareados por tela/viewport e checklist de espaçamento, tipografia, cores,
      hierarquia, estados e responsividade

### FASE 6 — Planejamento e análise

| # | Tela | Observação |
|---|---|---|
| 6.1 | Metas | consumo × conquista é o núcleo; ler `goal-view.model.ts` antes |
| 6.2 | Orçamento | ✅ concluída — média 3m bloqueada por contrato |
| 6.3 | Investimentos | ✅ concluída — 5 abas alinhadas e evidenciadas |
| 6.4 | Empréstimos | ✅ concluída — KPIs, cards, detalhe e parcelas alinhados |
| 6.5 | Relatórios | ✅ **CONCLUÍDA** — resumo, comparativo 6/12, snapshots e tooltips |
| 6.6 | Simulador | ✅ **CONCLUÍDA** — simulador, calculadoras e tooltips |
| 6.7 | Assistente | |
| 6.8 | Perfil | + `user-security` |
| 6.9 | Configurações | barra de salvar fixa, zona sensível |

---

### FASE 6.1 — Metas 🔶 CONTEÚDO PRONTO, FIDELIDADE PENDENTE

O modelo `goal-view.model.ts` continua sendo a fonte da semântica: Despesa é consumo de
limite; Receita e Investimento são conquista de alvo.

- [x] Cards já usam rótulos por tipo: `Limite/Gasto/Disponível`, `Objetivo/Recebido/Falta
      receber`, `Meta de aporte/Aportado/Falta aportar`.
- [x] `GoalView.monthlyRequired` calcula quanto falta por mês para metas de conquista quando
      há valor restante e prazo. Despesa não recebe esse cálculo porque é consumo de limite.
- [x] `app-goal-card` renderiza a dica contextual `Precisa de R$ X por mês para chegar no prazo.`
      e o E2E de Metas valida a dica no fluxo assíncrono.
- [x] Recorrência aparece como badge no card (`Período único`, `Mensal`, `Trimestral` etc.).
- [x] Formulário de Investimento mostra nota explicativa no lugar de categoria/limiares de
      consumo.
- [x] Menu de ações usa `canCompleteGoalView`: `Concluir` só aparece para metas de conquista
      com 100% ou mais, e não aparece para despesa, arquivada, cancelada ou concluída.
- [x] Detalhes refletem as mesmas dicas do card, incluindo cadência mensal e previsto não
      contabilizado.
- [x] Detalhes mostram evolução por período com barras acessíveis baseadas nos dados reais de
      `occurrences`, sem sintetizar períodos.
- [x] Modal de aporte mostra atalhos calculados a partir do restante da meta e prévia acessível
      do progresso resultante antes de registrar.
- [x] Criação/edição em mobile foi reorganizada em seções (`Objetivo`, `Período`, `Regras`),
      dropdowns nativos foram trocados por `app-select-menu`, e o E2E valida 390px sem overflow.
- [x] Estados/filtros mostram contagem contextual (`N metas neste filtro`) e vazio filtrado com
      CTA para voltar a `Todas`, alinhado ao protótipo de Metas.
- [x] Edição de meta existente validada no E2E: `app-select-menu` preserva Recorrência e
      Categoria carregadas do backend, além dos limiares de alerta.
- [x] Ações de ciclo de vida validadas no E2E: `Pausar` muda badge para `Pausada`, `Reativar`
      volta ao estado calculado do backend, e `Arquivar` remove de `Todas` e aparece em
      `Arquivadas`.
- [x] Erro das ações de ciclo de vida usa `extractApiErrorMessage`: mensagens de domínio da API
      aparecem no feedback global e a meta permanece no estado atual quando a operação falha.
- [x] Exclusão validada no E2E: confirmação destrutiva mantém cópia do handoff, erro de API usa
      mensagem de domínio e sucesso remove a meta da listagem atual.
- [x] Captura visual focada de Metas executada em Playwright com evidências desktop/mobile e
      guarda contra overflow horizontal:
      `docs/ai-reports/metas-rebrand-desktop.png` e
      `docs/ai-reports/metas-rebrand-mobile.png`.
- [x] Próximo bloco iniciado em Orçamento.

---

### FASE 6.2 — Orçamento 🔶 CONTEÚDO PRONTO, FIDELIDADE PENDENTE

Fonte do handoff: `TELAS.md` §10. A edição na linha já existia; esta fase alinha filtros,
tabela editável, coluna direita e modal de adicionar categoria.

- [x] Filtros `Todas · Em atenção · Estouradas` adicionados acima da tabela, com contagem
      contextual e lista filtrada por uso real (`>80%`) / estouro (`realizado > planejado`).
- [x] Linha de total no rodapé da lista mostra Planejado, Realizado, Variação e Uso do filtro
      atual, mantendo `Salvar`/`Sair` na edição inline conforme o handoff.
- [x] Tabela editável recebeu densidade própria de Orçamento e valor planejado com borda
      tracejada no hover/focus para sinalizar edição inline.
- [x] Coluna direita adicionada com `Ritmo do mês`, `Composição planejada` e `Estouraram o
      planejado`, todos derivados dos dados reais do orçamento atual.
- [x] Modal de adicionar categoria substitui o formulário inline, com dropdown de categorias de
      despesa, prévia do planejado total após adicionar e evidência visual desktop/mobile.
- [x] Ação `Copiar do mês anterior` implementada usando o contrato atual: busca o orçamento do
      mês anterior e reaplica `categoryName` + `plannedAmount` no mês aberto.
- [ ] Média real dos últimos 3 meses no dropdown e atalho `Usar a média` — bloqueados por
      contrato: `BudgetService` só expõe o mês consultado e não retorna histórico/média por
      categoria.
- [x] Semântica de filtro isolada em `budget-overview.model.ts` e coberta por teste unitário.
- [x] E2E autenticado cobre filtro, total, edição inline, coluna direita, modal e cópia do mês
      anterior.
- [x] Captura visual focada de Orçamento executada em Playwright com evidências desktop/mobile e
      guarda contra overflow horizontal:
      `docs/ai-reports/orcamento-rebrand-desktop.png` e
      `docs/ai-reports/orcamento-rebrand-mobile.png`, além do modal em
      `docs/ai-reports/orcamento-rebrand-add-modal-desktop.png` e
      `docs/ai-reports/orcamento-rebrand-add-modal-mobile.png`.
- [x] Fase encerrada com bloqueio explícito para contrato de histórico/média.

---

### FASE 6.3 — Investimentos 🔶 CONTEÚDO PRONTO, FIDELIDADE PENDENTE

Fonte do handoff: `TELAS.md` §11. A tela já tinha as cinco abas (`Resumo`,
`Consolidação`, `Proventos`, `Rentabilidade`, `Análise`); esta fase começou pelo resumo
executivo para preservar a regra central de não misturar aporte, valorização e proventos.

- [x] KPIs do resumo alinhados para cinco cards na ordem do handoff: `Valor de mercado`,
      `Total investido`, `Valorização`, `Proventos (12m)` e `Aporte do mês`.
- [x] `investments-overview.model.ts` mantém valor de mercado, total investido,
      valorização e proventos como métricas separadas; o KPI de proventos considera apenas
      dividendos, JCP e rendimentos dos últimos 12 meses.
- [x] Parser local de datas adicionado ao cálculo de proventos para evitar perda de eventos
      em datas ISO sem hora por conversão de fuso.
- [x] Evolução do patrimônio agora expõe seleção `6 meses`, `12 meses` e `24 meses`,
      conforme o handoff.
- [x] Captura visual focada do resumo executada em Playwright com evidências desktop/mobile e
      guarda contra overflow horizontal:
      `docs/ai-reports/investimentos-rebrand-resumo-desktop.png` e
      `docs/ai-reports/investimentos-rebrand-resumo-mobile.png`.
- [x] Tabela de posições do Resumo mostra a fonte do preço por linha (`Cotação` ou
      `Preço médio`) e uma linha de total do filtro atual com investido, valor atual,
      resultado e contagem de fontes.
- [x] Colunas da tabela compactadas para o conjunto do protótipo: `Ativo`, `Qtd.`,
      `Preço médio`, `Atual`, `Investido`, `Mercado` e `Result.`, mantendo `Ações`
      como coluna operacional sticky.
- [x] Cabeçalho da seção atualizado para `Posições`, com a nota do protótipo sobre fallback
      para preço médio e chips de filtro por tipo (`Todos` + tipos do modelo).
- [x] Comportamento mobile da tabela de posições revisado em screenshot Playwright 390x900:
      linhas viram cards com rótulos (`Ativo`, `Qtd.`, `Investido`, `Mercado`, `Ações`),
      ação acessível e sem overflow horizontal.
- [x] Aba `Consolidação` passa a considerar `APORTE`/`RESGATE` junto de `COMPRA`/`VENDA`,
      mantendo proventos fora do gráfico e da tabela; o painel agora exibe resumo do período
      (`Compras`, `Vendas`, `Saldo`, `Lançamentos`) e evidências desktop/mobile:
      `docs/ai-reports/investimentos-rebrand-consolidacao-desktop.png` e
      `docs/ai-reports/investimentos-rebrand-consolidacao-mobile.png`.
- [x] Aba `Proventos` alinhada ao protótipo: gráfico de barras dos últimos 12 meses,
      resumo no mesmo card (`Total em 12 meses`, `Média mensal`, `Ativos pagadores`) e
      lista `Por ativo` com acumulado de 12 meses; seed E2E recebeu pagadores reais para
      validar o estado preenchido. Evidências:
      `docs/ai-reports/investimentos-rebrand-proventos-desktop.png` e
      `docs/ai-reports/investimentos-rebrand-proventos-mobile.png`.
- [x] Aba `Rentabilidade` alinhada ao protótipo: título `Carteira contra índice`, chips dos
      sete benchmarks (`CDI`, `IPCA`, `IFIX`, `IBOV`, `SMLL`, `IDIV`, `IVVB11`) recalculando
      cards/gráfico/tabela, três cards no mesmo bloco do gráfico e seção `Por ano` com barra da
      carteira e coluna do benchmark selecionado. Evidências:
      `docs/ai-reports/investimentos-rebrand-rentabilidade-desktop.png` e
      `docs/ai-reports/investimentos-rebrand-rentabilidade-mobile.png`.
- [x] Aba `Análise` alinhada ao protótipo: alocação alvo com soma visível, desvio em pontos
      percentuais, valor estimado da classe mais distante do alvo e ressalva permanente de que
      o cálculo é sobre a alocação alvo do usuário, não recomendação de ativos. Evidências:
      `docs/ai-reports/investimentos-rebrand-analise-desktop.png` e
      `docs/ai-reports/investimentos-rebrand-analise-mobile.png`.
- [x] Fase encerrada com E2E visual desktop/mobile cobrindo as cinco abas e guarda contra
      overflow horizontal.

---

### FASE 6.4 — Empréstimos 🔶 CONTEÚDO PRONTO, FIDELIDADE PENDENTE

Fonte do handoff: `TELAS.md` §9. A tela cobre contratos com saldo devedor, parcela,
parcelas pagas/total, taxa/vencimento e barra de amortização.

- [x] KPIs do topo alinhados ao handoff: `Saldo devedor`, `Parcela mensal`,
      `Próximo vencimento` e `Quitação prevista`.
- [x] `loans-overview.model.ts` deriva `expectedPayoffDate` da última parcela aberta,
      sem inventar previsão quando não há cronograma.
- [x] Cards de contrato expõem o conjunto do handoff no corpo principal: saldo devedor,
      parcela, parcelas pagas/total, taxa anual e vencimento da próxima parcela, mantendo
      a barra de amortização por contrato.
- [x] Detalhe do contrato alinhado ao mesmo conjunto: resumo com próximo vencimento e
      quitação prevista, card de detalhes com sistema/taxa/prazo/parcelas/vencimento e
      cronograma de parcelas com cabeçalho contextual.
- [x] Mock Playwright passa a responder `GET /api/v1/loans/:id`, permitindo QA visual real
      do detalhe depois da criação de contrato no próprio fluxo autenticado.
- [x] Captura visual focada de Empréstimos executada em Playwright com evidências
      desktop/mobile e guarda contra overflow horizontal:
      `docs/ai-reports/emprestimos-rebrand-desktop.png` e
      `docs/ai-reports/emprestimos-rebrand-mobile.png`, além do detalhe em
      `docs/ai-reports/emprestimos-rebrand-detalhe-resumo-desktop.png`,
      `docs/ai-reports/emprestimos-rebrand-detalhe-resumo-mobile.png`,
      `docs/ai-reports/emprestimos-rebrand-detalhe-parcelas-desktop.png` e
      `docs/ai-reports/emprestimos-rebrand-detalhe-parcelas-mobile.png`.
- [x] Fase encerrada sem pendência de contrato: a tela não tem protótipo dedicado e segue os
      padrões compartilhados do handoff.

---

### FASE 6.5 — Relatórios ✅ CONCLUÍDA

Fonte do handoff: `TELAS.md` §12. A fase cobre `app/relatorios/` e, em seguida,
`app/monthly-snapshots/`.

- [x] `Despesas por categoria` trocada de rosca para barras horizontais, conforme handoff.
- [x] `reports-overview.model.ts` deriva `expenseCategoryBars` sem inventar valores e limita
      percentuais a 0–100 para largura CSS.
- [x] Layout mobile dos KPIs revisado localmente em Relatórios para manter dois cards por linha
      em 390px sem quebrar valores monetários caractere a caractere.
- [x] Seletor de tipo de relatório implementado: `Resumo mensal` mostra categorias/maiores
      despesas; `Comparativo` mostra receitas × despesas e evolução de saldo.
- [x] Seletor de período do comparativo implementado para `6 meses` e `12 meses`, compondo a
      série com o contrato mensal existente (`GET /reports/monthly-summary/{year}/{month}`) sem
      criar endpoint fictício.
- [x] `reports-overview.model.ts` deriva janela mensal, escala única das barras de receitas ×
      despesas e escala de evolução do saldo, com testes de virada de ano e percentuais.
- [x] Captura visual focada de Relatórios executada em Playwright com evidências
      desktop/mobile e guarda contra overflow horizontal:
      `docs/ai-reports/relatorios-rebrand-desktop.png` e
      `docs/ai-reports/relatorios-rebrand-mobile.png`.
- [x] Captura visual focada do comparativo executada em Playwright com evidências
      desktop/mobile:
      `docs/ai-reports/relatorios-rebrand-comparativo-desktop.png` e
      `docs/ai-reports/relatorios-rebrand-comparativo-mobile.png`.
- [x] `monthly-snapshots` alinhado como fechamento mensal: destaque do fechamento mais recente,
      KPIs de SDR, projeção, pendências, dívida e risco, além de lista com patrimônio e
      recomendações de cada mês.
- [x] `MonthlySnapshotsComponent` convertido para `OnPush` com `takeUntilDestroyed`, mantendo o
      contrato atual de listagem e geração de snapshots.
- [x] Mock Playwright aceita `/monthly-snapshots` e o caminho legado `/monthlysnapshots`, e a
      geração usa id estável por ano/mês para simular substituição do fechamento do mês.
- [x] Captura visual focada de `monthly-snapshots` executada em Playwright com evidências
      desktop/mobile e guarda contra overflow horizontal:
      `docs/ai-reports/monthly-snapshots-rebrand-desktop.png` e
      `docs/ai-reports/monthly-snapshots-rebrand-mobile.png`.
- [x] Fase encerrada sem endpoint novo: o comparativo usa relatórios mensais existentes e o
      fechamento mensal usa o contrato atual de snapshots.

---

### FASE 6.6 — Simulador ✅ CONCLUÍDA

Fonte do handoff: `TELAS.md` §13. A fase cobre `app/cenarios/` e `app/calculator/`.

- [x] `app/cenarios` trocou inputs numéricos por sliders para receita extra, despesa extra e
      taxa de poupança, com o valor atual visível acima do trilho.
- [x] `scenario-overview.model.ts` deriva pontos de gráfico comparativo usando apenas
      `scenarioPoints` do contrato atual, com escala compartilhada para saldo base e saldo
      cenário.
- [x] Resultado do simulador agora exibe gráfico comparado `Base × Cenário` antes do
      detalhamento tabular dos pontos retornados pela API.
- [x] Layout mobile revisado: o seletor de período vira grade 2×2 para manter todos os rótulos
      legíveis em 390px, e o gráfico usa rolagem horizontal interna sem overflow da página.
- [x] Captura visual focada de Simulador executada em Playwright com evidências desktop/mobile e
      guarda contra overflow horizontal:
      `docs/ai-reports/simulador-rebrand-desktop.png` e
      `docs/ai-reports/simulador-rebrand-mobile.png`.
- [x] `app/calculator` convertido para `OnPush` com `takeUntilDestroyed`, preservando as
      fórmulas existentes e a navegação pública `/calculadora/:id`.
- [x] Catálogo de calculadoras recebeu ajustes responsivos: KPIs em 2 colunas no mobile, cards
      sem overflow de texto e painéis com `scroll-margin-top` para reduzir conflito com header
      público sticky.
- [x] Tabelas largas de calculadoras agora usam overflow interno: a classe local `.table`
      sobrescreve o utilitário global/Tailwind `display: table`, que fazia a tabela anual
      aumentar a largura do documento em mobile.
- [x] Captura visual focada de Calculadoras executada em Playwright com evidências de catálogo e
      de `Juros Compostos` calculado, desktop/mobile e guarda contra overflow horizontal:
      `docs/ai-reports/calculadoras-rebrand-catalogo-desktop.png`,
      `docs/ai-reports/calculadoras-rebrand-catalogo-mobile.png`,
      `docs/ai-reports/calculadoras-rebrand-juros-compostos-desktop.png` e
      `docs/ai-reports/calculadoras-rebrand-juros-compostos-mobile.png`.
- [x] Fase encerrada sem contrato novo: `app/cenarios` usa `POST /scenarios/simulate` e
      `app/calculator` mantém cálculo local.

---

### FASE 7 — Fluxos e transversais

| # | Item | Situação |
|---|---|---|
| 7.1 | ~~Autenticação~~ | ✅ **CONCLUÍDA** — ver seção abaixo |
| 7.2 | Onboarding | 4 passos |
| 7.3 | Dashboard administrativo | + telas `admin-*` |
| 7.4 | Tema escuro | segundo conjunto de tokens, não CSS duplicado |
| 7.5 | Mobile | 🔶 tabela → cards **feito** (9 telas); bottom nav com FAB **feito**. Falta revisão tela a tela |
| — | ~~Checkout e plano~~ | **fora**: pagamento adiado até o gateway estar configurado |

---

### FASE 7.5 — Mobile 🔶 EM ANDAMENTO

- [x] Tabelas viram cards responsivos nas 9 telas que usam `responsive-list`.
- [x] Bottom nav do shell autenticado em até 900px: atalhos para Dashboard, Despesas,
      Receitas e Calendário, filtrados pela mesma fonte `NAV_SECTIONS`, com FAB "Menu" para
      abrir a sidebar completa.
- [x] E2E em 390x900 valida os atalhos, navegação para Receitas, abertura da gaveta completa e
      ausência de overflow horizontal.
- [ ] Revisão tela a tela fica para o QA visual final app real × handoff.

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

**Resolvido em 390px** (fora do `responsive-list`): `page-header` no Calendário e título/ações
do Orçamento receberam `min-width: 0`, quebra de texto e empilhamento mobile. Verificado em
`/orcamento` com viewport 390px: `documentElement.scrollWidth === clientWidth`.

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
`auto-fit`** — deixa célula vazia"*. Com 5 KPIs no perfil Patrimônio, é o caso exato.

Convertido para faixa unida: `flex: 1 1 200px`, divisor por `box-shadow` (cobre a quebra de
linha sem borda solta), primeira célula com gradiente e valor maior, valores em Poppins com
`tabular-nums` — sem isso, dígitos de largura variável fazem as 5 colunas dançarem a cada
atualização.

**Medido**: faixa de 1172px, células somando 1170px — preenche a linha inteira, sem sobra.

#### Restante do Dashboard

Saúde financeira (só Patrimônio), evolução de 12 meses, "Precisa da sua atenção", recorrências,
orçamento do mês, metas e insights. Mais o recorte por perfil (Essencial 3 KPIs, Controle e
Patrimônio 5) e a regra de **histórico insuficiente**: com menos de dois meses de dados, o
gráfico de evolução é substituído por um bloco explicativo — desenhar tendência com dois
pontos mente sobre o dado.

**Recorte aplicado**: `Saúde financeira (IA)` agora carrega e renderiza só para Patrimônio
(`Advanced+`). Controle mantém Assinaturas, Relatórios/Simulador e demais análises permitidas,
mas não recebe o bloco de saúde IA.

**Recorte aplicado**: `Distribuição por categoria` agora renderiza só para Controle+
(`Intermediate+`). Essencial mantém a faixa de 3 KPIs, projeção/insight e próximos vencimentos,
sem gráfico de categorias.

**Recorte aplicado**: o modal de detalhes do insight mantém o resumo contextual no Essencial,
mas esconde `Painel de risco`, simulação diária e comparação mensal até Controle+
(`Intermediate+`), coerente com o CTA de upgrade.

**Regra de conta nova aplicada**: os cards de distribuição por categoria agora só desenham o
donut e liberam insight/comparação com pelo menos 3 categorias movimentadas. Com 1 ou 2
categorias, mostram um bloco explicativo; com zero dados, mantêm o estado vazio com CTA.

**Regra de conta nova aplicada**: `Evolução patrimonial` agora exige pelo menos 2 pontos para
desenhar o gráfico. Com 1 ponto, mostra o bloco "Histórico começando" em vez de inferir
tendência.

**Recorte aplicado**: o bloco `Metas` do Dashboard agora renderiza só para Controle+
(`Intermediate+`). Essencial continua podendo acessar a tela de Metas pelo menu/CTA, mas o
Dashboard não mostra acompanhamento de ritmo.

**Recorte aplicado**: `Próximos vencimentos` do Dashboard agora usa janela de 7 dias, alinhada
ao perfil Essencial do handoff. Vencimentos em 8+ dias não entram no board inicial.
O painel de risco e a meta curta usam a mesma janela.

**Recorte aplicado**: Controle (`Intermediate`) agora tem `Evolução do caixa` de 6 meses
(receitas recebidas × despesas). Com apenas 1 mês movimentado, renderiza "Histórico começando".

**Recorte aplicado**: `Orçamento do mês` agora carrega via `BudgetService` para Controle+
(`Intermediate+`) e mostra planejado, realizado, variação, uso e até 3 categorias em destaque.
Falha da API deixa o bloco oculto e não bloqueia o Dashboard.

**Recorte aplicado**: `Recorrências do mês` agora consolida assinaturas, contas fixas,
parcelas e receitas fixas a partir dos lançamentos do mês para Controle+ (`Intermediate+`).
O fallback de `subscriptionsSummary` fica apenas quando não há recorrências locais carregadas.

**Recorte aplicado**: `Dívidas e contas` agora aparece para Controle+ (`Intermediate+`) quando
há saldo real, contas ativas ou dívida aberta. O card consolida saldo em contas, disponível real,
dívida aberta, próximos compromissos e as principais contas sem depender de novo contrato backend.

**Recorte aplicado**: `Investimentos` agora aparece para Patrimônio (`Advanced+`) quando há
posições ativas ou valor de carteira. O card reaproveita `buildInvestmentsOverview` para valor
atual, aportado, resultado, rentabilidade e principais alocações, com CTA para a carteira.

**Acabamento visual aplicado**: `Saúde financeira (IA)` não renderiza mais card vazio quando a
resposta da API/mock é inválida. Quando a resposta é válida mas não traz áreas detalhadas, o
card mostra o resumo geral em um bloco compacto.

**Acabamento visual aplicado**: o harness Playwright autenticado agora mocka
`/financial-assistant/health`, então as capturas e E2E do perfil Patrimônio exercitam o card real
de `Saúde financeira (IA)`. O page object também foi alinhado ao nome rebrandado
`Dívidas e contas`.

**Validação visual atualizada**: o Dashboard Patrimônio foi capturado em 1440x1200 e 390x900
com os blocos `Investimentos`, `Dívidas e contas` e `Saúde financeira (IA)` visíveis e sem
overflow horizontal. Evidências: `docs/ai-reports/dashboard-rebrand-advanced-1440.png` e
`docs/ai-reports/dashboard-rebrand-advanced-390.png`.

**Guarda E2E permanente**: `authenticated-home-wealth.spec.ts` agora valida o mesmo conjunto
rebrandado em desktop e mobile, com `DashboardPage.expectNoHorizontalOverflow()` para impedir
regressão de largura no Dashboard Patrimônio.

**Cobertura E2E rebrandada**: os smokes autenticados de shell/fallback não procuram mais
`Mapa de dívidas`. `authenticated-shell.spec.ts` e `authenticated-home-fallback.spec.ts` agora
validam `Dívidas e contas`, incluindo o cenário em que os resumos oficiais falham e o Dashboard
mantém os cálculos locais.

## 5.1 Auditoria de fidelidade — 2026-08-16

Auditoria do código contra o handoff, não contra o próprio plano. O resultado mudou o status
de quatro fases: elas entregaram o **conteúdo** certo (rótulos, KPIs, regras de negócio,
modelos puros com teste) e divergiram na **forma** em regras que o handoff declara
vinculantes. `TELAS.md` foi seguido; `ARQUITETURA_ANGULAR.md` e o `README.md` do handoff, não
inteiramente.

**O critério mudou**: até aqui, "concluída" queria dizer que a tela ficou parecida com o
protótipo. Passa a querer dizer **igual** — sem violação aberta no gate.

### O que a auditoria confirmou como correto

Nada disso precisa ser revisitado:

- **128 de 128 tokens** do `tokens.css` presentes no `design-tokens.scss`. Zero divergência.
- Poppins e Inter carregadas de verdade; `--font-display` resolve.
- Medidas do shell tokenizadas conforme README §9: `--w-sidebar 212px`, `--h-topbar 56px`,
  `--h-table-row 56px`.
- `OnPush` em **100%** dos componentes criados ou tocados no redesign.
- Regra de negócio em função pura com spec — `budget-overview`, `loans-overview`,
  `investments-overview`, `goal-view`. O padrão do §9 não regrediu.
- `typecheck` e a suíte de testes verdes no estado auditado.

### O que divergiu

Contagem do dia, por regra do gate (`npm run handoff:report`):

| Regra | Violações | O que é |
|---|---|---|
| **R1** | 7 | Primitivos criados na Fase 4 que só aparecem no `/styleguide` |
| ~~R2~~ | ✅ 0 | `grid auto-fit` em faixa de indicadores — **quitada, e fora do baseline** |
| ~~R3~~ | ✅ 0 | Tela com card de indicador sem nenhum tooltip — **quitada, e fora do baseline** |
| **R4** | 10 | Gráfico desenhado à mão dentro da feature |
| ~~R5~~ | ✅ 0 | `--shadow-card-hover` aplicada em repouso — **quitada, e fora do baseline** |
| ~~R6~~ | ✅ 0 | Hex literal fora do `design-tokens.scss` — **quitada, e fora do baseline** |
| **R8** | 49 | Componente sem `OnPush` (dívida anterior ao redesign) |
| **R9** | 14 | Feature repintando primitivo por dentro com `::ng-deep` — 8 quitados; 14 esperam a 8.1 |

**R1 é a que decide o resultado do rebrand.** `app-kpi-strip`, `app-money`, `app-data-table`,
`app-number-stepper`, `app-progress-bar`, `app-chart-bars` e `app-chart-line` foram
construídos, testados e demonstrados — e nenhuma tela os importa. As telas seguem usando os
equivalentes legados (`app-transaction-summary-card`, `app-usage-bar`, `app-responsive-list`,
`app-donut-chart`, SVG próprio). São dois design systems no mesmo repositório, que é
exatamente o cenário que `ARQUITETURA_ANGULAR.md` §13.1 descreve como o erro mais caro.

**R9 é o mesmo erro em outra forma.** Em vez de copiar o SCSS do primitivo, a tela fura o
encapsulamento e reescreve o interior dele. O primitivo fica sem dono e a próxima mudança nele
quebra telas que ninguém lembra que dependiam do detalhe interno.

**Por que a revisão por leitura não pegou**: `4df1a1c` corrigiu `grid auto-fit` no dashboard e
o plano registrou a correção — mas a mesma violação continuava em cinco outros arquivos,
inclusive no `transactions-layout.scss`, que é compartilhado por três telas. Corrigir o
sintoma na tela em que ele foi visto não fecha a regra. É por isso que existe o gate.

### O gate

```bash
npm run handoff:briefing # o que precisa estar na cabeça antes de tocar em tela
npm run handoff:check    # bloqueia regressão · roda dentro de quality:frontend
npm run handoff:report   # lista tudo que está aberto, com arquivo:linha
```

`briefing-redesign.mjs` existe porque documento longo não é lido no meio da tarefa. Ele cabe
em uma tela, tira os números do gate ao vivo — nunca de texto fixo, que envelheceria no
commit seguinte — e repete as cinco coisas que não se faz. **Rodar ao iniciar qualquer tarefa
de tela do redesign.**

Nove regras do handoff viraram verificação executável em `scripts/check-handoff-fidelity.mjs`,
cada uma citando a seção que a define. Funciona por **baseline**: a dívida de hoje está
congelada em números e o gate falha quando um número **sobe**. Código novo nasce conforme sem
precisar limpar o legado inteiro antes.

**Regra de uso, e ela não tem exceção**: quando o gate falhar, corrija o código. Não suba o
baseline, não adicione ignore, não reescreva a regra para caber no que já está lá. Se a regra
estiver errada, ela muda **primeiro** em `design_handoff_investindo_redesign/`, com a decisão
registrada aqui — e só depois no script. Ao quitar dívida, baixe o número no mesmo commit,
senão ela volta sem ninguém perceber.

---

## 6. Pendências

| # | Pendência | Bloqueia |
|---|---|---|
| ~~P1~~ | ✅ `--info` → `--primary` (41 usos), `--info-text` → `--primary-text`, `--info-10/20` → `--primary-tint` | — |
| ~~P2~~ | ✅ `--fw-regular/medium/semibold/bold` tokenizados conforme os pesos usados na spec; `tailwind.config.js` aponta para eles | — |
| ~~P3~~ | ✅ 4 protótipos de site + `_ds/`, `support.js`, `assets/` copiados para `prototipos/` (1,8 MB); renderização confirmada a partir do repo | — |
| ~~P4~~ | ✅ Rótulos comerciais consolidados em `Essencial/Controle/Patrimônio` na landing, sidebar, dashboard, `PERFIS_E_PERMISSOES.md` e `TELAS.md`. Código/API continuam usando `Basic/Intermediate/Advanced` | — |
| ~~P5~~ | ✅ `PERFIS_E_PERMISSOES.md` alinhado ao `NAV_SECTIONS`: menu mantém "Histórico mensal" e "Calculadoras" em Análises por serem telas existentes, Simulador fica em Análises, e o grupo "Conta" lista Perfil/Configurações | — |
| ~~P6~~ | ✅ Pasta do handoff renomeada para `design_handoff_investindo_redesign/`; referências do plano e dos tokens atualizadas para remover o sufixo temporário ` 2` | — |
| ~~P7~~ | ✅ `#E0A458` validado por contraste: **7.89:1** sobre `#011E29` (AA texto normal), na mesma faixa de income (9.67), expense (7.53) e primary (6.33) | — |
| **P8** | ⚠️ **BLOQUEIA PUBLICAÇÃO.** `/termos` e `/privacidade` estão no ar com os placeholders `{{RAZAO_SOCIAL}}`, `{{CNPJ}}`, `{{ENDERECO}}` e `{{EMAIL_CONTATO}}` **visíveis ao usuário**, e o texto não passou por revisão jurídica. `npm run legal:ready` falha enquanto os placeholders existirem | antes de publicar |
| ~~P9~~ | ✅ Site respondendo aos dois temas; prévia do app mantida clara via tokens `--preview-*` | — |
| ~~P10~~ | ✅ `product-showcase` (2.100 linhas) e `pricing` (1.094 linhas) removidos, mais a regra órfã `.pricing-page` do `styles.scss`. Testes: 565 → 550 (−15 dos specs apagados) | — |
| ~~P11~~ | ✅ Resolvido com `variant` no `site-plan-cards`: `landing` mostra `salesHeadline`+`salesSubheadline`, `tour` mostra `audience`+`highlight`. Muda a ênfase, não a fonte — os dois lêem o mesmo `MarketingPlan` | — |
| ~~P12~~ | ✅ **Decidido: não implementar.** Sessão persistente muda como o token é guardado e por quanto tempo — decisão a tomar junto com o backend, não com o layout | — |
| ~~P13~~ | ✅ **Decidido: manter no menu**, em "Análises". Tirá-las deixaria funcionalidade existente inacessível | — |
| ~~P14~~ | ✅ `titlecase` removido de Despesas — Receitas já fazia certo, e agora as duas dizem "de agosto de 2026". O `TitleCasePipe` saiu do componente |  — |

---

## 7. Verificação

```bash
npm run typecheck        # tsc --noEmit
npm run handoff:briefing # briefing do redesign — rodar ao iniciar tarefa de tela
npm run handoff:check  # fidelidade ao handoff — bloqueia regressão
npm run handoff:report # fidelidade — lista o que está aberto, com arquivo:linha
npm run test:ci        # karma headless + cobertura
npm run build:prod     # build de produção
npm run quality:frontend  # typecheck + handoff:check + test:ci + build:prod
npm run legal:ready    # gate manual antes de publicar o site
```

Protótipos renderizam com Playwright a partir de
`~/Downloads/code-exploration-and-branding-setup/project/` — dependem de `support.js` e `_ds/`
na mesma pasta, e exigem **scroll até o fim** antes da captura, senão a revelação ao rolar
não dispara e a página sai em branco.

---

## 8. FASE 8 — Quitação da dívida de fidelidade

**Placar em 2026-08-16: 143 → 80 violações.** Quatro regras zeradas e fora do `BASELINE`
(R2, R3, R5, R6) — viraram regra dura, e reincidência quebra o gate na hora.

| Etapa | Regra | Estado |
|---|---|---|
| 8.1 Adotar primitivos | R1 | 🔶 5 · decisão tomada; 1 par de 6 migrado |
| 8.2 Faixa em flex | R2 | ✅ 0 |
| 8.3 Tooltip | R3 | ✅ 0 |
| 8.4 Gráficos | R4 | 🔴 10 · depende da 8.1 |
| 8.5 Sombra | R5 | ✅ 0 |
| 8.6 `::ng-deep` | R9 | 🔶 14 · 8 quitados; o resto depende da 8.1 |
| 8.7 Hex · OnPush | R6 · R8 | ✅ 0 · 🔶 49 |

**Tudo que sobra passa pela 8.1.** A 8.4 exige saber se o `app-chart-line` sobrevive antes de
migrar 10 gráficos para ele; 13 dos 14 `::ng-deep` restantes miram componentes que podem ser
apagados. Só o `OnPush` é independente, e ele desce sozinho conforme as telas são tocadas.


Aberta pela auditoria da seção 5.1. **Precede a Fase 7.2 em diante**: cada tela nova
construída sobre os componentes legados aumenta o custo de adotar os primitivos depois.

Ordem por dependência, não por tamanho. 8.1 primeiro porque as etapas seguintes reescrevem
os mesmos arquivos — fazer 8.4 antes de 8.1 é ajustar sombra em card que vai ser trocado.

Regra para todas as etapas: **uma etapa por commit**, com o `BASELINE` do
`scripts/check-handoff-fidelity.mjs` baixado no mesmo commit, e captura Playwright
desktop/mobile da tela afetada em `docs/ai-reports/`.

### 8.1 — Adotar os primitivos ou apagá-los · R1: 7 → 5 🔶 EM ANDAMENTO

**Decisão tomada em 2026-08-16**, na ausência de contraindicação e com a recomendação
registrada três vezes. Ela está aqui para ser contestada: se algum par estiver errado, é
reverter o commit da migração daquele par, não refazer tudo.

| Par | Vence | Motivo |
|---|---|---|
| `app-data-table` × `app-responsive-list` | **legado** | O legado dá a mesma garantia de coluna única **e** vira lista de cards no mobile, que o primitivo do handoff não cobria. 9 telas já dependiam dele. `app-data-table` **apagado**; handoff emendado (E1) |
| `app-progress-bar` × `app-usage-bar` | **handoff** | ✅ feito. O legado só sabia consumo |
| `app-kpi-strip` × `app-transaction-summary-card` | **nenhum: não são um par** | ver correção abaixo |
| `app-money` × formatação na tela | **handoff** | pendente |
| `app-chart-line`/`bars` × SVG na feature | **handoff** | pendente — é a 8.4 |
| `app-number-stepper` × `<input type=number>` | **handoff** | pendente |

#### Feito: `app-progress-bar` substitui `app-usage-bar`

A migração encontrou **quatro cópias dos mesmos limiares**, que é exatamente o que
ARQUITETURA_ANGULAR.md §9.1 manda ter em um lugar só:

1. `shared/progress-bar/progress-thresholds.ts` — a correta, e a única sem uso;
2. `orcamento/budget-overview.model.ts` — `>100 critical, >80 warning`;
3. `metas/goal-view.model.ts` — com `warning` configurável;
4. `shared/usage-bar` — **`>80 critical, >50 warning`**, valores que não são os do handoff.

A quarta é a que importa: as seis telas passavam `tone` explícito, então a divergência não
aparecia — mas quem adicionasse uma barra sem `tone` ganhava atenção em 50% em vez de 80%.

O `app-usage-bar` também **não sabia expressar conquista**. Metas resolveu isso com uma
barra própria, feita à mão no `goal-card` com sete regras de cor — a terceira implementação
de barra do repositório.

Resultado: `app-usage-bar` apagado, barra à mão de Metas apagada, `toneFor` do orçamento e
`progressTone` das metas removidos. `GoalView` passa a declarar **semântica** (`progressMode`,
`onTrack`) e o primitivo decide a cor. O limiar inline que sobrava no template do orçamento
(`> 100 ? 'danger' : > 80 ? 'warning' : ...`) virou `budgetUsageCardTone`, com teste.

#### Correção: `app-kpi-strip` × `app-transaction-summary-card` **não são um par**

Registrado porque eu recomendei migrar 18 telas para o `app-kpi-strip`, e a recomendação
estava **errada**. `COMPONENTES.md` §3.1 define **dois formatos** de KPI e atribui telas a
cada um:

| Formato | Telas | Componente |
|---|---|---|
| (a) cards soltos com gap, `flex: 1 1 210px` | Metas, Contas, Orçamento, Cartões | `app-transaction-summary-card` ✅ correto hoje |
| (b) faixa unida com divisor por `box-shadow` | Investimentos, Calendário, Dashboard | `app-kpi-strip` — não usado |

Os dois devem existir. Os próprios tokens provam: `--fs-kpi` 26px é "faixa isolada",
`--fs-kpi-strip` 20px é "faixa unida de 5".

**O problema real é outro**: o `app-kpi-strip` como foi construído não atende **nenhuma** das
três telas do formato (b) sem perder função.

| Tela | Precisa | `KpiItem` oferece |
|---|---|---|
| Dashboard | `delta` com direção e sinal, link "Ver detalhes", linha de pergunta, ícone SVG por indicador, skeleton | `label, value, note?, tooltip, tone?, icon?` — **string**, não SVG |
| Investimentos | 5 ícones SVG em slot | idem |
| Calendário | 5 ícones SVG em slot | idem |

E o Dashboard **já implementa o formato (b) corretamente à mão**, citando §3.1(b) no
comentário do SCSS: faixa unida, `flex: 1 1 200px`, divisor por `box-shadow`. É uma cópia
inline do primitivo — a duplicação que §13.1 descreve — só que **mais rica** que ele, e já
usando o `app-tooltip` em vez do `title` nativo que §3.1 especifica (o `title` não abre em
toque e não é anunciado de forma confiável por leitor de tela).

**Recomendação, e desta vez com a evidência antes**: promover a implementação do Dashboard
para `shared/`, adotá-la em Investimentos e Calendário, e apagar o `app-kpi-strip` — com
emenda no handoff, como foi feito na E1. O caminho inverso (engrossar o `app-kpi-strip` até
cobrir delta, link e ícone SVG) é reconstruir o que já existe e está em produção.

**Não executado**: eu errei este par uma vez e prometi avisar antes de mexer. A decisão está
aberta.

- [ ] Decidir o formato (b): promover a do Dashboard, ou engrossar o `app-kpi-strip`.
- [ ] Depois: `app-money`, `app-number-stepper`, e a 8.4 para os gráficos.

### 8.2 — Faixa de indicadores em flex · R2: ~~6~~ ✅ CONCLUÍDA

16 faixas convertidas para `flex-wrap` com `flex: 1 1 210px`, em 2026-08-16.

**O gate apontava 6; corrigi 16.** As outras 10 usavam `repeat(N, minmax(0,1fr))` fixo, que
o regex não pega — mas a regra do README §4 é "flex com quebra", não "sem `auto-fit`".
Corrigir só onde o checker aponta é o erro nº 3 do briefing.

O flex ainda dispensou os breakpoints que existiam só para recontar colunas.

**Medido**: com `grid`, Contas deixava **890px vazios** na última linha a 1440px. É esse o
defeito que a regra evita, e ele só aparece em largura específica —
`quality-tests/e2e/kpi-strip-fill.spec.ts` mede a sobra em 9 larguras e foi verificado
falhando quando a tela volta para grid.

**Efeito colateral que precisou de correção**: com os 5 cards de Contas cabendo numa linha,
cada um ficou estreito e o valor partia no meio — `R$ 8.580` numa linha, `,00` na outra,
porque a base do card tinha `overflow-wrap: anywhere`. Dinheiro não parte. A base passou a
não quebrar e as faixas de 5 usam `density="compact"`, que é o degrau que o handoff já
tokenizava: `--fs-kpi` (26px) é "faixa isolada", `--fs-kpi-strip` (20px) é "faixa unida de 5".

### 8.3 — Tooltip em todo indicador · R3: ~~16~~ ✅ CONCLUÍDA

55 tooltips em 16 telas, concluída em 2026-08-16. **R3 saiu do `BASELINE`**: virou regra
dura, e indicador novo sem tooltip quebra o gate na hora.

Cada texto foi derivado da função que produz o número — não do rótulo. Foi o que fez a etapa
valer mais que o checklist: escrever a explicação obrigou a ler o cálculo, e o cálculo
contradizia a tela em três lugares.

O que os tooltips passaram a dizer e a tela escondia:

- **Empréstimos** — saldo devedor soma todos os contratos; parcela mensal, só os ativos. É
  por isso que os dois números não se correspondem, e ninguém explicava.
- **Metas** — "atingidas" é acumulado e conta as arquivadas; o progresso médio limita cada
  meta a 100%, então meta superada não puxa a média para cima.
- **Calendário** — "despesas previstas" inclui parcela de financiamento, e o saldo previsto é
  o fluxo do mês isolado: não soma o que já está em conta.
- **Histórico mensal** — o "Risco" é um índice de saúde: quanto maior, melhor.

**Bug encontrado por causa disto** (commit `2876644`): o front lia a classificação por
substring em português contra valores que a API emite em inglês, e `'healthy'.includes('alt')`
é verdadeiro — he-**alt**-hy. O estado mais saudável caía na regra de risco alto: badge
vermelho e barra crítica para quem está com as contas em dia. O fallback numérico ainda
invertia a escala, e a spec cravava o comportamento errado. Corrigido com os limiares do
próprio backend e verificado no navegador.

**Legibilidade verificada**: `quality-tests/e2e/indicator-tooltips-visual.spec.ts`. O painel
abre para cima com 280px fixos — texto longo em faixa no topo da página poderia sair pela
borda superior. Medido em três telas, incluindo o texto mais longo do app. Metas ficou de
fora da spec porque o mock não serve `/api/v1/goals` e a tela cai no estado vazio.

**Fica em aberto, e é decisão de produto**: o KPI diz "Risco 84/100" para um número em que
84 é bom. O tooltip resolve a ambiguidade, mas o rótulo honesto seria "Saúde financeira" —
renomear atravessa o card, o badge e a barra, e é chamada do dono do produto.

### 8.4 — Gráficos para `shared/charts/` · R4: 10 → 0

- [ ] `home.component.html` — 6 séries de patrimônio desenhadas com `<path [attr.d]>`
- [ ] `investment-profitability-panel` — carteira × benchmark
- [ ] `loan-detail` — evolução do saldo devedor
- [ ] Se o `app-chart-line` atual não cobre algum caso (área preenchida, série tracejada,
      hover por ponto), **estender o primitivo** conforme o contrato `ChartSeries` de §8.
      Não voltar a desenhar na feature.

### 8.5 — Sombra só em hover e camada flutuante · R5: ~~27~~ ✅ CONCLUÍDA

24 cards perderam a sombra de repouso em 2026-08-16. Ficam com borda de 1px e raio, como o
README §3 pede.

**Três dos 27 eram falso positivo da regra, não do código** — e a correção foi na regra:

- o knob do switch (`toggle-field__thumb`): controle elevado, não card;
- a aba ativa do segmented: a própria Fase 4.3 pede "aba ativa branca com sombra";
- o plano destacado do site: linguagem visual própria, por D8.

Isto **não é afrouxar a regra**. A regra do handoff é sobre card em repouso; minha
implementação estava larga demais e pegava controle e site junto. A distinção está escrita no
código do gate, para não virar exceção silenciosa.

**Cartões, faturas e categorias eram clicáveis e ficaram sem retorno visual nenhum**: ganharam
a elevação de 2px no `:hover` que o handoff especifica. Card não interativo não ganhou hover.

**Verificado nos dois temas.** O risco anotado antes desta etapa era o tema escuro, onde
`--border` tem menos contraste e a separação passaria a depender só dela. Confirmado em
captura: os cards continuam legíveis.

**Defeito pré-existente encontrado na verificação**: `.btn-secondary` não existe no
`styles.scss` — a classe nunca foi definida. Quatro telas a usavam, e o botão renderizava sem
estilo nenhum: em Contas, "Nova transferência" era texto solto entre dois botões. Trocado por
`.btn-ghost`.

### 8.6 — Fim do `::ng-deep` em feature · R9: ~~22~~ 14 → 0

**Duas rodadas feitas, 8 quitados.** As duas seguiram o mesmo caminho, que é o modelo para o
resto: a variação sobe para o primitivo, não desce para a tela.

- **Card de indicador** (−3): Relatórios, Histórico mensal e Calculadoras tinham o **mesmo**
  bloco de sete regras copiado. Virou `density="compact"`. Os `rem` do bloco reinventavam
  tokens que já existiam — `--fs-micro` é literalmente o token de eyebrow.
- **Segmented** (−5): Cenários repintava o controle para ocupar a largura do campo. Virou
  `stretch`, seguindo o padrão de host attribute que o componente já usava em `data-size`.
  Não dependia da 8.1 porque a Fase 4.3 já decidiu que este primitivo fica.

**Os 14 restantes esperam a 8.1**: 13 miram o `app-responsive-list` e o `app-donut-chart`,
1 é uma largura de coluna. Dar `@Input` de variante a um componente que pode ser apagado é
trabalho jogado fora — por isso param aqui.

### 8.7 — Hex literal e `OnPush` · R6: ~~4~~ ✅ CONCLUÍDA · R8: 49 → 0

**Hex quitado em 2026-08-16.** Eram os gradientes de Visa, Elo e Amex, pendentes desde a
Fase 1 — que os previa para a 5.4 e não fechou. São marcas de terceiros e não seguem a paleta
do handoff, mas §6 não abre exceção por origem da cor: literal não mora em SCSS de
componente. Viraram `--brand-visa-from` e companhia, em seção própria do `design-tokens.scss`
que diz o que são e onde podem ser usadas. Selo conferido no navegador, sem mudança visual.

O quarto achado era **falso positivo do gate**: ele testava comentário só pelo começo da
linha, e um hex citado no meio de um bloco `/* */` contava como violação. Corrigido com
remoção de comentários antes da busca, e teste de mesa cobrindo bloco, linha e inline.

- [ ] `OnPush`: dívida anterior ao redesign, 49 componentes. Segue a regra de não abrir
      frente própria — cada tela que a Fase 8 tocar sai com `OnPush`, e o baseline desce
      junto. Já caiu de 51 para 49 sem esforço dirigido.

### Encerramento da Fase 8

- [ ] `npm run handoff:check` sem nenhuma dívida aberta.
- [ ] Todo `BASELINE` do script em `0`, e o objeto vazio no arquivo.
- [ ] Só então as fases 6.1 a 6.4 voltam a `✅ CONCLUÍDA` e a Fase 7.2 começa.
