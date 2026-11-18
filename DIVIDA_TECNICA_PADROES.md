# Dívida técnica de padrões — o que falta e por quê

> Levantado na revisão de 2026-08-27 contra `Agent.md`, `ARQUITETURA_ANGULAR.md` e
> `InvestindoEmNegociosApi/docs/BACKEND_PADROES_IMPLEMENTACAO.md`.
> Formato igual ao do backlog no Obsidian: **onde, problema, por que importa, a fazer, aceite**.
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

## ✅ DECISÃO — `shared/` importando serviço de domínio — **RESOLVIDA até 2026-09-12**

**Onde:** Web · `src/app/shared/`, `scripts/check-handoff-fidelity.mjs`

**Estado verificado em 2026-09-12:** R11 está em **0** no `npm run handoff:report`.

**O que ficou permitido:** `shared/` pode depender de serviços de UI, como tema, ocultar valores
e feedback visual. A varredura atual encontrou `FinancialPrivacyService` em
`shared/app-currency.pipe.ts`, e o gate permite esse caso porque ele controla apresentação
(`ocultar valores`), não carrega nem muta domínio do usuário.

**Regra que fica:** componente primitivo não importa serviço de domínio. Se precisar decidir
aparecimento com dados do usuário, ele vira componente de shell ou recebe tudo por `@Input`.

**Aceite atual:** R11 segue em 0 no gate.

---

## ✅ DECISÃO — Primitivos órfãos do handoff — **RESOLVIDA até 2026-09-12**

**Onde:** Web · `scripts/check-handoff-fidelity.mjs`, `src/app/shared/`

**Estado verificado em 2026-09-12:** `npm run handoff:briefing` e `npm run handoff:report`
mostram R1 em **0**. Não há mais primitivo de `shared/` existindo apenas no `/styleguide`.

**Decisão efetiva:** `app-money` e `app-chart-bars` foram removidos da regra porque não viraram
contrato adotado. A regra de moeda fica no `AppCurrencyPipe`/`formatCurrencyValue`; gráfico de
linha fica em `app-chart-line`; barra de progresso fica em `app-progress-bar`. Se a necessidade
voltar, nasce contrato novo no handoff antes de nascer componente novo.

**Aceite atual:** R1 segue em 0 no gate. Qualquer primitivo novo deve nascer com uso real fora do
`/styleguide`, ou a regra volta a acusar.

---

# PARTE 2 — Frontend: `OnPush` + signals (21 restantes de 46)

**O problema comum:** `ARQUITETURA_ANGULAR.md` §4 exige *"Signals, sempre"* e
*"`ChangeDetectionStrategy.OnPush` em todos os componentes, sem exceção"*. Em 2026-08-27 o Grupo A
fechou com 27 restantes; em 2026-09-12 o gate vivo está em **21 restantes**.

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

## 🟡 ⬜ GRUPO B — 13 telas de tamanho médio

**Onde:** Web

```
admin-users · admin-robots · user-preferences · signup · user-data · login · user-profile
receitas-lista · cartoes-listagem · despesas-lista · despesas-form · receitas-form
public-header
```

**Problema:** estado em campo mutável, sem `OnPush`. Todas já receberam `takeUntilDestroyed`
(commit `ded5a7d`), então a parte de vazamento está resolvida — falta o estado.

**Por que importa:** são as telas onde o usuário digita. Sem signals, cada tecla dispara
verificação global; e o estado espalhado em 10–20 campos booleanos (`loading`, `saving`,
`editingId`, `deletingId`...) é o que a §4 aponta como fonte de bug — nada garante que dois
campos que deveriam andar juntos andem.

**Ordem sugerida** (menor risco primeiro): `public-header` → depois `login`, `signup`,
`user-profile`, `user-data`, `user-preferences` → depois `admin-robots`, `admin-users`,
`cartoes-listagem`, `despesas-lista`, `receitas-lista`, `receitas-form`, `despesas-form`.

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

## 🔴 ⬜ BUG — Export/import de dados não funciona entre instâncias

**Onde:** API · `Application/Services/DataPortabilityService.cs`, `Application/DTOs/DataPortabilityDtos.cs`

Descoberto em 2026-08-28 ao copiar a base do PRD para o DEV usando a própria feature do produto.
São **dois defeitos independentes**, os dois reproduzidos ao vivo.

**1. FK de categoria quebra a importação (400).** O export leva apenas as categorias
*customizadas* do usuário. Os planos, porém, também referenciam as categorias **padrão do
sistema** — e essas têm GUID diferente em cada instância, porque cada ambiente foi semeado
separadamente. Importar em outra instância falha com:

```
23503: insert or update on table "money_plans"
violates foreign key constraint "FK_money_plans_categories_CategoryId"
```

Medido no caso real: 10 categorias referenciadas pelos planos, **8 fora do export**; das 22
categorias do PRD, **as 22 tinham id inexistente no DEV**.

**2. O import não preserva ids de pagamento.** Gera ids novos, então qualquer coisa que aponte
para um pagamento por id (`account_transactions.SourceId`) fica órfã depois da importação.

**Por que importa:** portabilidade de dados é **feature de plano pago**. Hoje um usuário que
exporte e importe em outra instância recebe 400. Também é o caminho de LGPD para levar os dados
embora — se ele não volta a lugar nenhum, não cumpre o propósito.

**A fazer:** (a) incluir no export as categorias padrão referenciadas, ou casar por
`(Name, AppliesTo)` na importação em vez de por id; (b) decidir se o import preserva ids ou se
publica um mapa de remapeamento para as tabelas que referenciam por id.

**Aceite:** exportar de uma instância e importar em outra, com planos usando categorias padrão,
termina em 200 e sem referência órfã.

**Contorno usado nesta migração** (não é correção): remapeamento das categorias por nome +
inserção das 2 que faltavam, e remapeamento dos pagamentos por `(PaidAt, PaidAmount)` — 34/34
casaram porque a chave era única no caso concreto. Não serve como solução geral.

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

## 🟢 ⬜ Pastas vazias com sufixo ` 2`

**Onde:** Web · `investindoEmNegociosWeb/src/app/**`

**Problema:** há várias pastas vazias com sufixo ` 2` sob `core/` e `features/`, por exemplo
`features/dashboard 2`, `features/login 2`, `features/site 2` e equivalentes. A varredura de
2026-09-12 confirmou que elas não contêm arquivos.

**Por que importa pouco:** não entram no build, não alteram rota e não mudam o comportamento do
app. Ainda assim poluem busca, navegação no editor e leitura de estrutura.

**A fazer:**
- [ ] Remover os diretórios vazios depois de conferir `git status`
- [ ] Se voltarem, investigar sincronização do iCloud/Finder antes de limpar de novo

**Aceite:** `find investindoEmNegociosWeb/src/app -type d -name '* 2'` sem resultados.

---

## 🟡 ⬜ A raiz do monorepo não é versionada

**Onde:** `/InvestindoEmNegocios/` (raiz)

**Problema:** só `InvestindoEmNegociosApi/` e `InvestindoEmNegociosWeb/` são repositórios git. Tudo
na raiz — **`Agent.md`, `BACKLOG.md`, `docs/`, `scripts/`** — está **fora de controle de versão**.

**O que isso causava:** o `Agent.md`, que é a fonte de verdade operacional do projeto inteiro, e
toda a documentação central (`ARCHITECTURE.md`, `BUSINESS_RULES.md`, `DECISIONS/`) não tinham
histórico, não passavam por review, e somiam se a máquina fosse trocada.

**Mitigação em 2026-09-12:** a documentação humana central foi consolidada no Obsidian em
`/Users/henriquesantos/Documents/my second brain/Investindo em Negocio/Documentacao`, e os
arquivos duplicados na raiz viraram ponteiros. Continua pendente decidir versionamento/backup do
vault e dos ponteiros operacionais.

**A fazer:**
- [ ] Decidir como versionar ou fazer backup do vault Obsidian e dos ponteiros da raiz
- [ ] Fazer backup do estado atual antes de qualquer reorganização destrutiva

**Aceite:** documentação central e decisões formais com histórico recuperável.

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
| R8 — sem `OnPush` | 49 | **21** em 2026-09-12 |
| R1 — primitivo órfão | 3 | **0** em 2026-09-12 |
| Gate `handoff:check` | 5/9 verde | **10/11 regras zeradas; R8 dentro do baseline** |

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

Ver a seção do Grupo A na Parte 2. R8 de 46 para 27. Em 2026-09-12, a medição viva do gate
está em 21.

## ✅ Limpeza de código morto e docs — **FEITO em 2026-08-28**

**Removido depois de verificar que nada referencia** (tudo recuperável pelo git):

| Arquivo | Por que morto |
|---|---|
| `core/api-validation-errors.service.ts` | `ApiValidationErrorsService`: 0 referências |
| `core/utils/form-scroll.utils.ts` | `scrollToFirstInvalidFormField` e seu tipo: 0 referências |
| `assets/landing/hero-financial-control.png` (2,2 MB) | 0 referências no repo, docs e protótipos |
| `assets/login/office-portrait.jpg` (3,7 MB) | idem |
| `assets/login/finance-workspace.jpg` (900 KB) | idem |
| `assets/logoHeaderInvestindoemNegocios 2.png` (254 KB) | duplicata de sync do iCloud; só o original de 3,5 KB é usado |
| `assets/logoHeaderInvestindoemNegocios2 2.png` (253 KB) | idem |
| `quality-tests/e2e/primitivos-contratos.spec 2.ts` | duplicata de sync do iCloud, versionada por engano |
| API · `Domain/Finance/MissingSequenceSumCalculator.cs` + teste | kata de algoritmo em `Domain/Finance/`; referenciado só pelo próprio teste |

Total: ~7,3 MB de assets. `Users/` na raiz (árvore vazia criada por caminho absoluto escrito como
relativo) também foi removida.

**Verificado e mantido** — parecia morto e não é: `onboarding.styles.scss` (importado por
`styles.scss`), `StripeSubscriptionMapping` / `MercadoPagoSubscriptionMapping` (extension methods,
chamados como `x.ToProviderSnapshot()`), `InvoiceParserFactory` (registrado no DI). Controllers,
`*Validator` e `*Configuration` do backend são resolvidos **por convenção** — varredura por
referência textual sempre os aponta como mortos e sempre erra.

**Docs corrigidas:** 13 caminhos `src/app/...` quebrados pela reestruturação `core/shared/features`,
em 5 documentos.

**`docs/ROADMAP.md` reconstruído como índice:** era citado por 13 documentos como fonte única de
pendências e **não existia mais** — perdido sem histórico, porque a raiz do monorepo não é
versionada (ver seção acima). O conteúdo original é irrecuperável; o índice novo aponta para as
fontes vivas e não inventa roadmap.

---

## Documentação atualizada nesta rodada

- `ARQUITETURA_ANGULAR.md`: emenda **E3** com os contratos novos dos primitivos, tabela §7
  atualizada, e um **sexto erro** na §13 (valor derivado em getter alimentando `input()`).
- `PLANO_REDESIGN.md`: Fase 8 com R1, R4, R9, R10 e R11 zeradas, 8.7 em 21, e a premissa
  "tudo passa pela 8.1" corrigida — ela estava errada.
- `reference_build_local_gotchas` (memória): o prerender de `/receitas` saiu de "quebra
  conhecida" para "corrigido"; se voltar, é regressão.

## Atualização de 2026-11-15 — estado vigente

R8 foi reduzida de 21 para **0**; o gate verifica todas as 11 regras sem tolerância residual. Os 21 componentes herdados usam `OnPush`, com marcação explícita nas fronteiras assíncronas do estado imperativo existente. Isso evita congelamento da interface sem impor uma reescrita funcional nesta correção. As contagens de 21 acima são histórico, não o estado atual.

A conversão completa de estado imperativo para signals e a decomposição de containers extensos continuam sendo melhoria estrutural incremental; OnPush não resolve essas duas dimensões sozinho. Cobertura medida em 2026-11-15: statements 49,20%, branches 38,29%, functions 41,01%, lines 51,52%. Não há garantia de cobertura integral. Priorizar testes de regras e fluxos críticos conforme alterações, evitando testes que apenas reproduzem implementação.
