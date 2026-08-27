# Dívida técnica de padrões — o que falta e por quê

> Levantado na revisão de 2026-08-27 contra `Agent.md`, `ARQUITETURA_ANGULAR.md` e
> `InvestindoEmNegociosApi/docs/BACKEND_PADROES_IMPLEMENTACAO.md`.
> Formato igual ao do `BACKLOG.md` da raiz: **onde, problema, por que importa, a fazer, aceite**.
>
> Branch `chore/padroes-frontend-fase1`. O que já foi resolvido está resumido na seção
> **Já fechado**, no fim — commits `ded5a7d` (mecânicos), `632fbfd` (memoização dos
> gráficos) e `27ab7a4` (Grupo A).

Legenda: 🔴 alta · 🟡 média · 🟢 baixa | Status: ⬜ a fazer · 🟦 em andamento · ✅ feito
Repos: **Web** = `InvestindoEmNegociosWeb` · **API** = `InvestindoEmNegociosApi`

---

# PARTE 1 — Decisões que travam código (precisam de resposta antes de implementar)

Estes dois itens **não são trabalho braçal**. Implementar sem decidir gera retrabalho ou piora
outra regra.

---

## ✅ DECISÃO — Onde mora um componente de domínio reusado — **RESOLVIDA em 2026-08-27**

Commits `68f2962` (reestruturação). Escolhida a **opção 1**: criar um lugar para o componente
de domínio reusado, dentro da reestruturação `core/shared/features` (que era a opção 3) — as
duas acabaram saindo juntas.

`features/shared/` recebeu os 8 componentes que eram importados entre telas: `CartaoForm`,
`DespesaFormModal`, `ReceitaFormModal`, `MetaFormModal`, `LoanFormModal`, `DespesasForm`,
`ReceitasForm`, `InvoiceImport`. Regra: pode importar de `core/`, **não pode importar de outra
feature**.

**Critério: duas telas, não três.** A regra do três da §2 vale para subir a `shared/`, onde o
componente é genérico e a terceira ocorrência confirma o padrão. Aqui é diferente — na
**segunda** tela a §1 já está violada e não existe outro lugar.

Modelos puros consumidos por duas telas foram para `core/`, que é onde a §1 põe "modelos de
domínio": `card-metrics`, `budget-overview`, `investments-overview`, `accounts-overview`,
`onboarding.helpers`.

**A regra virou executável:** o gate ganhou a **R10**, que falha quando uma pasta de `features/`
importa de outra. Ela encontrou 10 violações que a revisão manual não tinha visto
(`contas` → `accounts`) e hoje está em 0 com teto 0. Ver emenda **E4** em
`ARQUITETURA_ANGULAR.md`.

---

## 🟡 ⬜ RESTA — cinco primitivos de `shared/` injetam serviço de domínio

**Onde:** Web · `shared/billing-alert-banner`, `shared/money`, `shared/onboarding-return`,
`shared/toast-container`

**Problema:** a §1 diz que `shared/` **nunca** importa serviço de domínio. Estes quatro
arquivos (cinco imports) importam: `AuthService` + `SubscriptionsService`,
`FinancialPrivacyService`, `OnboardingService`, `UiFeedbackService`.

**Por que a reestruturação não resolveu:** mover a pasta não muda a dependência. Resolver exige
trocar o contrato de cada componente para receber os dados por `@Input`, o que muda também quem
os hospeda — no caso do `toast-container`, o `app.component`. É trabalho por componente.

**Ressalva honesta:** dois deles são discutíveis. `toast-container` é o host dos toasts e
`billing-alert-banner` é uma faixa que decide sozinha se aparece — componentes "inteligentes"
de `shared/` são um padrão defensável, e talvez a regra deva distinguir "primitivo burro" de
"widget de shell". Vale decidir isso antes de refatorar os quatro.

**A fazer:**
- [ ] Decidir se a §1 distingue primitivo de widget de shell
- [ ] Se não distinguir: passar os dados por `@Input` e mover a injeção para quem hospeda
- [ ] Adicionar regra no gate travando `shared/` → `core/*.service`

---

## 🟡 ⬜ DECISÃO — Adotar `app-money` (regra R1, 2 de dívida no teto)

**Onde:** Web · `src/app/shared/money/`, `src/app/shared/charts/chart-bars/`

**Problema:** dois primitivos de `shared/` existem só na demo do `/styleguide` — nenhuma tela usa.
A §7 diz que `app-money` é obrigatório: *"nunca formatar moeda à mão no template"*.

**Por que não é swap mecânico:** `app-money` com `sign="auto"` colore **os dois sinais** — positivo
verde, negativo vermelho. Vários pontos hoje colorem só o negativo:

| Local | Hoje | Com `app-money` |
|---|---|---|
| `orcamento.component.html:128` | `[class.negative]` só se `< 0` | positivo vira **verde** |
| `investment-consolidation-panel:38` | `[class.negative]` só se `< 0` | positivo vira **verde** |
| `investment-assets-list:121` | `.success`/`.danger` nos dois sinais | equivalente ✅ |

Além da cor, `app-money` aplica `font-weight: var(--fw-semibold)` (600); onde hoje há `<strong>`,
isso **reduz** o peso (700 → 600).

Mudar a cor de um número financeiro sem decisão explícita é o tipo de coisa que faz a pessoa ler
errado o próprio dinheiro. Por isso ficou de fora da rodada mecânica.

**A fazer:**
- [ ] Decidir, por tela, se saldo/variação positivo deve ser verde ou neutro
- [ ] Adotar `app-money` onde a decisão for "colorir os dois sinais"
- [ ] Onde for "só negativo": ou adicionar um modo `sign="negative-only"` ao primitivo, ou manter
      a classe local e registrar a exceção
- [ ] `app-chart-bars`: encontrar tela que precise de barras, ou remover o primitivo
- [ ] Baixar `BASELINE.R1` no mesmo commit

**Aceite:** R1 em 0, ou em 1 com justificativa registrada. Evidência visual antes/depois das telas
que mudaram de cor.

---

# PARTE 2 — Frontend: `OnPush` + signals (27 restantes de 46)

**O problema comum:** `ARQUITETURA_ANGULAR.md` §4 exige *"Signals, sempre"* e
*"`ChangeDetectionStrategy.OnPush` em todos os componentes, sem exceção"*. Em 2026-08-27 o Grupo A fechou; restam 27 componentes.

**Por que importa, além de conformidade:** sem `OnPush`, o Angular reavalia **toda** expressão de
**todo** template a cada evento — clique, digitação, timer, resposta HTTP. Numa tela como a
`home`, que tem dezenas de getters fazendo cálculo (`insightDiagnostics`, `netWorthDelta`,
somatórios de lista), isso é trabalho refeito centenas de vezes por interação. Com estado mutável
e sem signals, também não há como saber o que dependia do quê — é a causa da classe de bug que a
§4 chama de *"bug esperando acontecer"*.

**A armadilha de ordem:** `OnPush` num componente com **estado mutável** faz a tela **parar de
renderizar** — o Angular só verifica o componente quando um `@Input` muda, um evento dispara nele,
ou um signal lido no template muda. Por isso a conversão é sempre **signals primeiro, `OnPush`
depois**, na mesma tela, nunca em lotes separados.

**Padrão validado** (piloto: `espacos`, commit `ded5a7d`):

1. campo mutável → `private readonly _x = signal(...)` + `readonly x = this._x.asReadonly()`
2. `get y()` → `readonly y = computed(() => ...)`
3. campo de `[(ngModel)]` → signal **público e escrivível** (Angular 21 faz two-way binding em
   signal: lê o valor e chama `.set()` — confirmado no browser)
4. adicionar `changeDetection: ChangeDetectionStrategy.OnPush`
5. template: `()` em toda leitura; `@if (x(); as y)` onde precisa estreitar tipo
6. spec: `.set()` para escrever, `()` para ler
7. **testar no browser**: digitação, submit que limpa campo, abrir/fechar modal, console sem erro
8. baixar `BASELINE.R8` no mesmo commit

> **Sobre `[(ngModel)]`:** a §4 proíbe em formulário com **mais de dois campos**. Contar
> ocorrências por template **superestima** — `espacos` tinha "5 ngModel" e nenhuma violação, porque
> eram três formulários independentes de 1–2 campos. Contar por formulário, não por arquivo.

---

## ✅ GRUPO A — 19 componentes de pura apresentação — **CONCLUÍDO em 2026-08-27**

Commit `27ab7a4`. **R8 de 46 para 27.** Verificado: typecheck limpo, 852/852 unitários,
147/147 e2e, `build:prod` sem erro, e as evidências visuais conferidas uma a uma (o que mudou
foi a data virando 26→27, não regressão).

Dez já usavam `input()`/`output()` e só precisavam da estratégia. Oito migraram de decorator,
e três decisões desse lote valem como precedente:

- **`toggle-field` ficou com `input()` + `output()`, não `model()`.** É componente
  **controlado**: o pai é dono do valor e o filho só notifica. `model()` guardaria estado
  local e o toggle divergiria do pai caso ele decidisse não aplicar a mudança. `model()` é
  para par two-way de verdade — foi o caso de `account-transfer.value` e
  `account-import.csvSkipDuplicates`, que reatribuíam o próprio `@Input`.
- **`responsive-list` perdeu o `ngOnChanges`.** O reset de página era `this.page = ...` dentro
  do hook, ou seja, estado derivado escrito à mão (§4.2). Virou `computed` que limita a página
  escolhida ao total atual — a lista que encolhe se ajusta sozinha. De quebra, `cellTemplate`
  era um `find()` linear por célula (N linhas × M colunas por verificação) e virou `Map`
  memoizado.
- **`account-form` manteve os getters de erro de propósito.** Eles dependem de propriedades
  **mutadas** de `form()`, que não são reativas: um `computed` memoizaria em cima de uma
  dependência que nunca notifica e a mensagem de validação congelaria. Como a mutação vem do
  `ngModel` do próprio componente, o evento já marca o `OnPush` como sujo.

## 🟡 ⬜ GRUPO B — 19 telas de tamanho médio

**Onde:** Web

```
admin-users (337) · despesas-form (203) · admin-robots (196) · user-preferences (192)
signup (191) · user-data (176) · login (176) · user-profile (133) · receitas-lista (126)
reset-password (123) · cartoes-listagem (123) · despesas-lista (113) · receitas-form (91)
public-header (83) · toast-container (81) · user-security (70) · forgot-password (70)
styleguide-shell (20) · styleguide-overview (15)
```

**Problema:** estado em campo mutável, sem `OnPush`. Todas já receberam `takeUntilDestroyed`
(commit `ded5a7d`), então a parte de vazamento está resolvida — falta o estado.

**Por que importa:** são as telas onde o usuário digita. Sem signals, cada tecla dispara
verificação global; e o estado espalhado em 10–20 campos booleanos (`loading`, `saving`,
`editingId`, `deletingId`...) é o que a §4 aponta como fonte de bug — nada garante que dois
campos que deveriam andar juntos andem.

**Ordem sugerida** (menor risco primeiro): `forgot-password`, `reset-password`, `user-security`,
`styleguide-*`, `toast-container`, `public-header` → depois `login`, `signup`, `user-profile`,
`user-data`, `user-preferences` → depois `admin-robots`, `admin-users`, `cartoes-listagem`,
`despesas-lista`, `receitas-lista`, `receitas-form`, `despesas-form`.

**Cuidado especial:**
- `login`, `signup`, `reset-password`, `forgot-password` — caminho de autenticação. Testar login
  real, não só unitário.
- `despesas-form` / `receitas-form` — são usados **dentro** do `onboarding` (import cruzado, ver
  Parte 1). Mudança aqui afeta duas telas.
- `toast-container` — é o feedback de toda mutação do app; se congelar, o usuário deixa de ver
  confirmação de tudo.

**A fazer (por tela):**
- [ ] Aplicar os 8 passos do padrão validado
- [ ] Atualizar o spec da tela (as que têm)
- [ ] Teste de browser cobrindo os cenários da tela, com `pageerror`/`console.error` no `expect`
- [ ] Baixar `BASELINE.R8` a cada tela

**Aceite:** por tela — unitários verdes, cenários exercitados no browser sem erro de console,
`BASELINE` baixado no mesmo commit.

---

## 🔴 ⬜ GRUPO C — 8 telas pesadas

**Onde:** Web

```
home (2704) · onboarding (1156) · invoice-import (1015) · contas (724)
admin-parameters (506) · styleguide-component-detail (422) · app.component (422)
checkout (408)
```

Cada uma é frente própria. Duas merecem descrição à parte:

### `home.component.ts` — 2704 linhas, zero signals

**Problema:** não é só falta de `OnPush`. Viola a §3 (container × apresentação) de forma
estrutural:
- 12 serviços injetados por construtor
- ~36 campos mutáveis públicos
- `Subscription` e `Subject` manuais
- **nenhum store**, apesar da §4.3 pedir um para estado de tela
- dezenas de getters que fazem cálculo dentro do template

**O que o problema causa:** todo getter é reavaliado a cada ciclo de detecção; sem `OnPush` são
muitos ciclos. E a lógica de negócio do dashboard (score de saúde, projeção de risco, agregações)
está misturada com apresentação num arquivo só — não dá para testar sem montar o componente
inteiro.

**O que já existe a favor:** a pasta `src/app/dashboard/` tem **11 componentes de apresentação
prontos** (`attention-card`, `evolution-card`, `goals-card`, `financial-overview`,
`spend-breakdown-card`, `recurrences-card`, `upcoming-card`, `health-score-card`,
`category-breakdown`, `recent-activity-card`, `upgrade-cta`) e um `dashboard-overview.model.ts`
com funções puras. O caminho é mover cálculo para `home.store.ts` + `home.model.ts` e deixar o
componente só compondo os filhos que já existem.

**A fazer:**
- [ ] Criar `home.model.ts` com as funções puras hoje inline (já há `utils/home-insight.utils.ts`
      para aproveitar) + spec das funções
- [ ] Criar `home.store.ts` (`providedIn` do componente) com os signals e `computed`
- [ ] Mover cada bloco do template para o componente de `dashboard/` correspondente
- [ ] `OnPush` por último
- [ ] Evidência visual antes/depois nos dois temas

**Aceite:** `home.component.ts` abaixo de ~400 linhas, só orquestração; cálculo coberto por teste
unitário sem montar componente; dashboard idêntico ao atual em desktop e mobile, claro e escuro.

### `app.component.ts` — o shell

**Problema:** 422 linhas, zero signals, sem `OnPush`. É o componente-raiz: ele envolve **toda** a
aplicação.

**Por que é o mais delicado:** `OnPush` no root muda como a detecção de mudança se propaga para
tudo abaixo. Qualquer componente filho que ainda dependa de detecção global para renderizar pode
parar de atualizar.

**Regra:** `app.component` deve ser o **último** a receber `OnPush` — só depois que todos os 45
outros estiverem convertidos. Converter antes trava telas que ainda não foram migradas.

**A fazer:**
- [ ] Deixar por último, depois dos Grupos A, B e do resto do C
- [ ] Suíte e2e completa antes e depois

**Aceite:** 146 e2e verdes; navegação, tema, notificações, toast e sessão expirada conferidos no
browser.

---

# PARTE 3 — Backend

**Atualização de 2026-08-27:** os três itens de maior peso foram corrigidos na branch
`fix/isolamento-space-emprestimos` (isolamento por área, `UnauthorizedAccessException` virando
500, e a doc apontando para `schema.sql`). O que sobra está abaixo.

O backend está **bem mais aderente** que o frontend: zero `DbContext` em controller, zero
`using Infrastructure` em `Application`, zero dependência para cima em `Domain`, controllers finos
(o maior tem 152 linhas). Os itens abaixo são pontuais.

---

## ✅ BUG — Empréstimos fora do isolamento por Space — **CORRIGIDO em 2026-08-27**

API, branch `fix/isolamento-space-emprestimos`, commit `df15edf`.

`LoansService.CreateAsync` passou a usar `ICurrentSpaceAccessor.RequireSpaceId()` (área ativa)
no lugar de `GetDefaultByUserAsync` (área padrão), e os 4 repositórios filtram com o mesmo
padrão das demais entidades. `LoanInstallment` é a única sem coluna `SpaceId` — o isolamento
vem do contrato pai via `EXISTS`, sem exigir migration.

Três testes de integração em SQLite protegem o comportamento, e ficou **verificado que o
primeiro falha se o filtro for removido**.

---

## ✅ BUG — `UnauthorizedAccessException` virando 500 — **CORRIGIDO em 2026-08-27**

Commit `7b29480`. O mapeamento virou global (403 — o usuário está autenticado, falta acesso ao
recurso), em vez de depender de cada controller passar `unauthorizedAccessTitle`. Elimina a
classe inteira do problema, não só o caso do `InstallmentPaymentsController`. O middleware de
erro de negócio também passou a tratá-la, para não gravar stack trace de algo que não é falha
de servidor.

Junto: `AdminRobotsController` deixou de devolver erro fora de `problem+json`.

---

## ✅ Doc normativa apontando para `schema.sql` — **CORRIGIDO em 2026-08-27**

Commit `7b29480`. `BACKEND_PADROES_IMPLEMENTACAO.md`, `docs/Agent.md` e `docs/README.md`
passam a falar de EF Migrations. A contagem de entidades com `SpaceId` também estava
desatualizada — eram 9 no texto, são 13.

---

## 🟢 ⬜ Três integrações HTTP fora do molde — **só importa quando forem ligadas**

**Onde:** API · `Application/Services/B3ApiClient.cs:60`, `FreeMarketDataProvider.cs` (2 pontos),
`InvestmentBenchmarksService.cs:68`

**Problema:** o doc fixa o molde para integração HTTP sem SDK — `EnsureXConfigured()` lançando
`AppProblemException` 503 quando falta credencial, `EnsureSuccessAsync()` lançando 502 em erro do
upstream. `AnthropicClient` e `MercadoPagoBillingGateway` seguem. Estas três não: fazem
`catch (Exception) { LogWarning; return null; }` — falha de rede, credencial errada e "não há
dado" viram a mesma coisa.

**Severidade rebaixada de 🟡 para 🟢 em 2026-08-27.** A justificativa original dizia que "a tela
mostra 'sem cotação' quando a integração está quebrada e ninguém é alertado". **Isso estava
errado: não há tela.** Levantamento:

| Integração | Estado |
|---|---|
| B3 (`B3ApiClient`) | `"B3Api": { "Enabled": false }`, `BaseUrl`/`ClientId`/`ClientSecret` vazios |
| MarketData (`FreeMarketDataProvider`) | endpoint existe e `investments.service.ts` tem `getMarketQuote/Profile/History` — **nenhuma tela chama** |
| Benchmarks (`InvestmentBenchmarksService`) | endpoint existe e `getBenchmarks()` existe — **nenhuma tela chama** |

Ou seja: hoje o `return null` não engana ninguém, porque ninguém pergunta. O risco é **futuro** —
no dia em que uma tela consumir, o silêncio vira "sem cotação" indistinguível de "integração
caída".

**Quando fazer:** antes de ligar qualquer uma delas, não agora. É pré-requisito da feature, não
dívida corrente.

**A fazer (no momento de ligar):**
- [ ] Alinhar ao molde de `MercadoPagoBillingGateway.cs` / `AnthropicClient.cs`
- [ ] Distinguir explicitamente "sem dado" (normal) de "falha" (anormal), com log em nível diferente
- [ ] Se a feature não puder quebrar por falta do provedor, aplicar o padrão de fallback
      determinístico já usado no `FinancialAssistantService`
- [ ] Teste cobrindo upstream fora do ar

---

## 🟢 ⬜ Código morto na ponta do consumidor

**Onde:** Web · `core/investments.service.ts`

Quatro métodos sem nenhum consumidor: `getBenchmarks`, `getMarketQuote`, `getMarketProfile`,
`getMarketHistory`. Foram escritos para as integrações acima, que não estão ligadas.

**Decidir:** manter (a feature está planejada e o custo é zero) ou remover (e reescrever quando
a feature chegar). Achado ao verificar o item anterior — não vale ação isolada.

---

## 🟢 ⬜ Resíduos menores no backend

**Onde / o quê:**

2. **`Application/Services/InvestmentsApplicationService.cs`** — camada 100% pass-through: 13
   métodos, todos `=> await outro.Mesmo(...)`, sem orquestração nem mapeamento de exceção. Os
   outros `*ApplicationService` do projeto existem justamente para mapear exceção; este não faz
   nada. É indireção sem função.
   → ou dar função a ela, ou remover e injetar o serviço de baixo direto.

3. **`Infrastructure/Repositories/GoalContributionRepository.cs`** — único dos 9 repositórios "com
   `SpaceId`" sem `ICurrentSpaceAccessor`. Na prática está protegido porque sempre recebe um
   `goalId` que já veio escopado, mas está fora do padrão declarado e um método novo que não
   receba `goalId` fura o isolamento sem aviso.
   → injetar o accessor, ou documentar por que esse é exceção.

4. **`BudgetService` e `ScenariosService`** — zero referência na suíte de 119 arquivos de teste.
   O doc exige teste proporcional para regra de negócio.
   → cobrir o caminho principal e a rejeição esperada.

---

# PARTE 4 — Itens de estrutura (fora do escopo desta rodada)

## ✅ `src/app` plano — **RESOLVIDO em 2026-08-27**

Commit `68f2962`. 467 arquivos movidos com `git mv`, 1003 imports reescritos por resolução de
alvo. Estrutura final: `core/` (113 arquivos), `shared/` (61), `features/` (38 pastas), e só o
bootstrap na raiz.

O que a operação ensinou, para a próxima vez:

- **O compilador é o verificador.** Import errado não compila. O que ele **não** cobre é o que
  vive fora de `src/app`: `src/styles.scss` importava `./app/onboarding/onboarding.styles`, e o
  `test:ci` excluía `src/app/styleguide/**` da cobertura. Os dois quebraram só na execução.
- **Reescrever por resolução de alvo, não por regex de caminho.** Para cada import: resolve o
  alvo original, procura o destino no mapa, recalcula o relativo a partir da nova pasta. Um
  `sed` de prefixo erraria em toda mudança de profundidade.
- **O gate tinha `includes('/shared/')` para isentar primitivos.** Com `features/shared/` isso
  passaria a isentar código de domínio por acidente — virou um helper explícito que só casa
  `/app/shared/`.

---

## 🟢 ⬜ Stores `providedIn: 'root'` — exceção decidida, falta registrar

**Onde:** Web · `categories.store.ts`, `accounts.store.ts`, `cards.store.ts`, `lookups.store.ts`

**Problema:** a §4.3 pede *"store é `providedIn` do componente quando o estado é da tela"*. Os
quatro são root.

**Decisão tomada (2026-08-27):** manter em root. São dados de lookup/catálogo compartilhados entre
várias telas; escopar por componente faria cada tela refazer o fetch, com piscada de loading onde
hoje não tem. A regra do handoff não se aplica bem a estado de catálogo.

**A fazer:**
- [ ] Registrar a exceção em `PLANO_REDESIGN.md` com esta justificativa
- [ ] Considerar emenda na §4.3 distinguindo "estado de tela" de "catálogo compartilhado"

---

## 🟡 ⬜ A raiz do monorepo não é versionada

**Onde:** `/InvestindoEmNegocios/` (raiz)

**Problema:** só `InvestindoEmNegociosApi/` e `InvestindoEmNegociosWeb/` são repositórios git. Tudo
na raiz — **`Agent.md`, `BACKLOG.md`, `docs/`, `scripts/`** — está **fora de controle de versão**.

**O que isso causa:** o `Agent.md`, que é a fonte de verdade operacional do projeto inteiro, e toda
a documentação central (`ARCHITECTURE.md`, `BUSINESS_RULES.md`, `DECISIONS/`) não têm histórico,
não passam por review, e somem se a máquina for trocada. O `docs/DECISIONS/` — que existe
justamente para registrar decisão estrutural — é o caso mais grave.

**A fazer:**
- [ ] Decidir: `git init` na raiz (com os dois subprojetos como submódulos ou ignorados), ou mover
      a documentação central para dentro de um dos repos
- [ ] Fazer backup do estado atual antes de qualquer coisa

**Aceite:** `Agent.md` e `docs/DECISIONS/` com histórico de commits.

---

# Já fechado (2026-08-27)

Branch `chore/padroes-frontend-fase1`, três commits. Verificado ao fim: typecheck limpo,
**852/852** unitários, **147/147** e2e, `build:prod` sem erro.

| Regra / item | Antes | Depois |
|---|---|---|
| R9 — `::ng-deep` em feature | 14 | **0** |
| R4 — SVG de gráfico em feature | 10 | **0** |
| R6 — cor literal fora de token | 46 ocorrências | **0** |
| §5 — `subscribe` sem `takeUntilDestroyed` | 18 componentes | **0** |
| §4 — `fb.group` não tipado | 3 | **0** |
| §1 — imports entre features | 18 | **11** |
| R8 — sem `OnPush` | 49 | **27** |
| R1 — primitivo órfão | 3 | **2** |
| Gate `handoff:check` | 5/9 verde | **7/9 verde** |

**Dois bugs corrigidos de passagem:**

1. **Prerender de `/receitas` quebrado** — `select-menu.component.ts` registrava
   `document.addEventListener` no construtor sem guarda de plataforma; o build de produção
   imprimia `ReferenceError: document is not defined`. Agora sai limpo.
2. **Contraste no tema escuro** — o painel de insights da `home` usava `text-slate-700` (cinza
   escuro) sobre fundo quase preto, porque as classes literais do Tailwind não trocam com o tema.
   Ao virar token, passou a adaptar.

**Contratos novos nos primitivos** (substituem o que as features faziam com `::ng-deep`):
`ResponsiveListColumn.width`/`minWidth` (valor, não classe) · `responsive-list` com
`density="comfortable"` e coluna `actions` · `donut-chart` com `[compact]` · custom property
`--responsive-list-row-hover-border` para conteúdo projetado reagir ao hover da linha.

**Regressão que a verificação visual pegou:** ao mover a coluna de ações para o primitivo, o rótulo
"Ações" voltou a aparecer no card mobile — `.responsive-list__item[data-label]::before` tem
especificidade maior. Corrigido com `.responsive-list__item--actions[data-label]::before`.

**Testes de regressão criados:** `quality-tests/e2e/primitivos-contratos.spec.ts` (guarda os
contratos novos e a tokenização, nos dois temas) e `quality-tests/e2e/espacos-onpush.spec.ts`.

**Correção de um número do relatório inicial:** `account-card.component.ts` **não** está morto — é
importado por `account-list`. Eram 4 alvos de código morto, não 5.

---

## `632fbfd` — memoização das séries dos gráficos

Regressão que **eu introduzi** no `ded5a7d` ao adotar o `app-chart-line`, encontrada numa
auditoria contra as boas práticas do Angular, não pelos testes.

`balanceSeries`/`balanceLabels` (loan-detail) e `chartSeries`/`chartLabels`
(investment-profitability-panel) eram **getters**. Os quatro alimentam `input()` **signal** do
`app-chart-line`, então devolviam array novo a cada ciclo de detecção: o signal de entrada via
referência nova toda vez e todo o cálculo do gráfico (viewBox, grade, paths, ticks, pointHits)
refazia sem nada ter mudado. No `loan-detail` havia ainda um `sort()` completo em cada passada.

- `loan-detail`: `contract` já é signal → `computed()`, com o sort isolado num
  `orderedInstallments` compartilhado.
- `investment-profitability-panel`: os 15 inputs ainda são decorator e `computed()` precisa de
  fonte reativa → deriva em `ngOnChanges`. Vira `computed()` quando esse componente entrar no
  Grupo B.

**O gate não pega isso.** As 9 regras do `check-handoff-fidelity.mjs` não olham valor derivado
em getter — foi por isso que passou. Uma regra R10 candidata: `get` que retorna array/objeto
literal e é usado em binding. Não foi adicionada porque provavelmente acusaria dezenas de casos
pré-existentes e viraria mais um baseline; fica registrada como a lacuna conhecida do gate.

## `27ab7a4` — Grupo A

Ver a seção do Grupo A na Parte 2. R8 de 46 para 27.

## Documentação atualizada nesta rodada

- `ARQUITETURA_ANGULAR.md`: emenda **E3** com os contratos novos dos primitivos, tabela §7
  atualizada, e um **sexto erro** na §13 (valor derivado em getter alimentando `input()`).
- `PLANO_REDESIGN.md`: Fase 8 com 8.4 e 8.6 concluídas, 8.7 em 27, e a premissa "tudo passa
  pela 8.1" corrigida — ela estava errada.
- `reference_build_local_gotchas` (memória): o prerender de `/receitas` saiu de "quebra
  conhecida" para "corrigido"; se voltar, é regressão.
