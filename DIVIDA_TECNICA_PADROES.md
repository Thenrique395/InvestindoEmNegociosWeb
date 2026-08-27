# Dívida técnica de padrões — o que falta e por quê

> Levantado na revisão de 2026-08-27 contra `Agent.md`, `ARQUITETURA_ANGULAR.md` e
> `InvestindoEmNegociosApi/docs/BACKEND_PADROES_IMPLEMENTACAO.md`.
> Formato igual ao do `BACKLOG.md` da raiz: **onde, problema, por que importa, a fazer, aceite**.
>
> O que já foi resolvido está no commit `ded5a7d` (branch `chore/padroes-frontend-fase1`)
> e resumido na seção **Já fechado**, no fim.

Legenda: 🔴 alta · 🟡 média · 🟢 baixa | Status: ⬜ a fazer · 🟦 em andamento · ✅ feito
Repos: **Web** = `InvestindoEmNegociosWeb` · **API** = `InvestindoEmNegociosApi`

---

# PARTE 1 — Decisões que travam código (precisam de resposta antes de implementar)

Estes dois itens **não são trabalho braçal**. Implementar sem decidir gera retrabalho ou piora
outra regra.

---

## 🔴 ⬜ DECISÃO — Onde mora um componente de domínio reusado por várias telas

**Onde:** Web · 11 imports em `calendario/`, `despesas/`, `onboarding/`

**Problema:** `ARQUITETURA_ANGULAR.md` §1 diz *"duas features nunca se importam"*. Hoje isso é
violado 11 vezes:

| Feature | Importa de outra feature |
|---|---|
| `calendario.component.ts` | `CartaoFormComponent`, `DespesaFormModalComponent`, `LoanFormModalComponent`, `MetaFormModalComponent`, `ReceitaFormModalComponent` |
| `despesas.component.ts` | `CartaoFormComponent`, `InvoiceImportComponent` |
| `despesa-form-modal.component.ts` | `CartaoFormComponent` |
| `onboarding.component.ts` | `CartaoFormComponent`, `DespesasFormComponent`, `ReceitasFormComponent` |

**Por que não dá para simplesmente mover para `shared/`:** a mesma §1 diz que *"`shared/` nunca
importa serviço de domínio"*. O `CartaoFormComponent` injeta `LookupsStore` e `CardsStore`; os
modais injetam os serviços das próprias features. Mover para `shared/` troca uma violação da §1
por outra — não resolve, só muda o nome do problema.

**Causa-raiz:** o handoff prevê duas camadas (`shared/` sem domínio, `features/` isoladas) e não
tem lugar para a terceira coisa que existe de fato: **componente que conhece o domínio e é
legitimamente reusado por três telas**. O `CartaoFormComponent` é usado por `calendario`,
`despesas` e `onboarding` — bate a "regra do três" da §2, mas não tem para onde subir.

**Opções (escolher uma):**

1. **Criar `features/_shared/` (ou `domain-ui/`)** para componentes de domínio reusados.
   Regra: pode importar de `core/`, não pode importar de uma feature específica.
   → mexe no handoff: precisa de emenda em `ARQUITETURA_ANGULAR.md` §1 e decisão em
   `PLANO_REDESIGN.md`, conforme o `Agent.md` exige.
2. **Aceitar a exceção e documentá-la** — registra em `PLANO_REDESIGN.md` que formulários de
   lançamento são reusáveis entre features, e adiciona regra no `check-handoff-fidelity.mjs`
   permitindo só esse conjunto nominal.
3. **Reestruturação completa `core/shared/features`** — resolve junto com o item de estrutura de
   pastas, mas é o que o `Agent.md` lista em "não fazer sem motivo claro".

**A fazer:**
- [ ] Escolher a opção
- [ ] Registrar a decisão em `PLANO_REDESIGN.md`
- [ ] Se opção 1 ou 2: emendar `ARQUITETURA_ANGULAR.md` §1
- [ ] Adicionar regra no `scripts/check-handoff-fidelity.mjs` que trave a violação daí em diante
- [ ] Mover o código conforme a decisão

**Aceite:** nenhum import feature→feature novo passa pelo gate; os 11 atuais ou foram movidos ou
estão numa allowlist com justificativa escrita.

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

# PARTE 2 — Frontend: `OnPush` + signals (46 componentes)

**O problema comum:** `ARQUITETURA_ANGULAR.md` §4 exige *"Signals, sempre"* e
*"`ChangeDetectionStrategy.OnPush` em todos os componentes, sem exceção"*. Hoje só 26 dos 149
componentes usam signals.

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

## 🟡 ⬜ GRUPO A — 19 componentes de pura apresentação (risco ~zero)

**Onde:** Web · lista abaixo

**Problema:** faltam `OnPush`.

**Por que é barato:** nenhum injeta serviço, nenhum tem `subscribe`. Só recebem `@Input` e emitem
`@Output`. É exatamente o caso para o qual `OnPush` foi desenhada — não há estado interno mutável
que possa "congelar". O risco de regressão é o mais baixo de toda a dívida, e derruba **R8 de 46
para 27** de uma vez.

```
shared/  responsive-list (167) · period-hero (180) · stat-card (138) · modal (114)
         status-badge (108) · form-field (101) · comparison-pill (67) · section-card (64)
         filter-bar (35) · period-total-card (23) · period-action-card (23) · toggle-field (21)
outros   account-import (149) · account-form (93) · account-transfer (59) · account-list (51)
         styleguide-tokens (75) · ui-state (52) · empty-state (35)
```

**Atenção nos quatro de `features/accounts/`:** têm `[(ngModel)]` (10, 5, 4 e 0 respectivamente).
Como recebem os dados por `@Input` mas escrevem em campo local, precisam dos campos como signal
antes do `OnPush` — não é só adicionar a linha.

**A fazer:**
- [ ] `shared/` e `empty-state`/`ui-state`/`styleguide-tokens`: adicionar `OnPush` (só a linha)
- [ ] `features/accounts/*`: campos de `ngModel` → signal, depois `OnPush`
- [ ] Rodar `test:ci` e a suíte e2e visual (as telas de Contas dependem desses quatro)
- [ ] Baixar `BASELINE.R8` para 27

**Aceite:** `handoff:check` passa com R8 = 27; 852+ unitários e 146 e2e verdes; telas de Contas,
Orçamento e Relatórios conferidas no browser (esses primitivos aparecem em quase tudo).

---

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

# PARTE 3 — Backend (não tocado nesta rodada)

O backend está **bem mais aderente** que o frontend: zero `DbContext` em controller, zero
`using Infrastructure` em `Application`, zero dependência para cima em `Domain`, controllers finos
(o maior tem 152 linhas). Os itens abaixo são pontuais.

---

## 🔴 ⬜ BUG — Empréstimos ficam fora do isolamento por Space

**Onde:** API · `Application/Services/LoansService.cs:41`,
`Infrastructure/Repositories/Loan{Contract,Payment,Amortization,Installment}Repository.cs`

**Problema:** `LoanContract`, `LoanPayment` e `LoanAmortization` **têm a coluna `SpaceId`**, mas:

1. `LoansService.CreateAsync` carimba `spaceRepository.GetDefaultByUserAsync(userId)` — o espaço
   **padrão** do usuário, não o **ativo da sessão**
2. nenhum dos 4 repositórios de empréstimo referencia `SpaceId` ou `ICurrentSpaceAccessor`;
   `ListByUserAsync` filtra só `x.UserId == userId`

**O que isso causa na prática:** com dois espaços, um contrato criado enquanto o usuário está no
espaço B nasce marcado com o id do espaço A; e a listagem mostra **todos** os contratos em
qualquer área. O isolamento que as outras 9 entidades têm, empréstimos não têm.

**Contra o que viola:** `BACKEND_PADROES_IMPLEMENTACAO.md`, seção Multi-tenancy — *"entidades donas
recebem o `SpaceId` via `ICurrentSpaceAccessor.RequireSpaceId()` no serviço de comando"* e *"o
isolamento por área é feito injetando `ICurrentSpaceAccessor` diretamente nos repositórios"*.

**Atenuante:** há um comentário no código atrelando isso à decisão "Família/CNPJ adiados". Mas a
tela `/espacos` **já permite** criar múltiplos espaços individuais hoje — a condição que tornava
isso inofensivo não vale mais.

**A fazer:**
- [ ] `LoansService.CreateAsync`: trocar `GetDefaultByUserAsync` por
      `ICurrentSpaceAccessor.RequireSpaceId()`
- [ ] Injetar `ICurrentSpaceAccessor` nos 4 repositórios e filtrar `&& x.SpaceId == accessor.SpaceId`
      nos métodos de listagem/busca (lembrar: `SpaceId` é `Guid?` e `null` = "não filtrar", para
      não quebrar jobs fora de request)
- [ ] Decidir o que fazer com contratos já gravados com o espaço errado (migration de backfill?)
- [ ] Teste de integração: contrato criado no espaço B não aparece na listagem do espaço A
- [ ] Atualizar a lista de entidades com `SpaceId` em `BACKEND_PADROES_IMPLEMENTACAO.md` (o doc
      fala em 9; são 13 com os de empréstimo e `PlanHistoryEntry`)

**Aceite:** trocar de espaço muda a lista de empréstimos; teste de integração cobrindo o
cross-space.

---

## 🟡 ⬜ BUG — `UnauthorizedAccessException` sem mapeamento vira 500

**Onde:** API · `Controllers/InstallmentPaymentsController.cs`,
`Application/Services/InstallmentsService.cs:234`

**Problema:** não há handler global para `UnauthorizedAccessException`. O mapeamento só acontece
quando o controller passa `unauthorizedAccessTitle` em `ExecuteWithProblemMappingAsync`.
**24 controllers usam o helper; só 3 passam esse parâmetro.**

Caso concreto: `InstallmentPaymentsController.Pay` não usa o helper, e
`InstallmentsService.ResolveAccountForPaymentAsync` lança
`UnauthorizedAccessException("Usuário não encontrado.")` → cai no handler global → **500 "Erro
interno do servidor"**, com log de nível Error. É o único controller de installments sem o
mapping (os outros dois têm).

**Por que importa:** `BACKEND_PADROES_IMPLEMENTACAO.md` exige *"respostas de erro consistentes"* e
proíbe *"exceção genérica como atalho para semântica de erro que a aplicação já conhece"*. Um 500
gera alerta falso na observabilidade e o frontend não consegue tratar.

**Também torto:** `SpaceService.EnterAsync` (`SpaceService.cs:72,78`) lança
`UnauthorizedAccessException` para "Espaço não encontrado" e "Usuário não encontrado", e o
`SpacesController` mapeia **tudo** para `401 "Senha inválida"` — a mensagem mente sobre a causa.

**A fazer:**
- [ ] `InstallmentPaymentsController`: envolver em `ExecuteWithProblemMappingAsync` com
      `unauthorizedAccessTitle`
- [ ] Varrer os outros 21 controllers que usam o helper sem o parâmetro e checar se o serviço
      abaixo pode lançar `UnauthorizedAccessException`
- [ ] Avaliar um mapeamento global de `UnauthorizedAccessException` → 401/403 em
      `ExceptionHandlingExtensions`, em vez de opt-in por controller (elimina a classe inteira)
- [ ] `SpaceService.EnterAsync`: separar "não encontrado" (404) de "senha inválida" (401)
- [ ] Teste: pagar parcela com usuário inexistente devolve 4xx, não 500

**Aceite:** nenhum caminho de negócio conhecido produz 500; `problem+json` com `traceId` em todos.

---

## 🟡 ⬜ Três integrações HTTP fora do molde e engolindo falha

**Onde:** API · `Application/Services/B3ApiClient.cs:60`,
`FreeMarketDataProvider.cs` (2 pontos), `InvestmentBenchmarksService.cs:68`

**Problema:** o doc fixa o molde para integração HTTP sem SDK: `EnsureXConfigured()` lançando
`AppProblemException` 503 quando falta credencial, `EnsureSuccessAsync()` lançando 502 em erro do
upstream. `AnthropicClient` e `MercadoPagoBillingGateway` seguem. Estes três **não**: fazem
`catch (Exception) { LogWarning; return null; }`.

**O que isso causa:** falha de rede, credencial errada e "não há dado" viram **a mesma coisa** —
`null`. A tela mostra "sem cotação" quando na verdade a integração está quebrada, e ninguém é
alertado. Contra *"integração crítica exige caminho de erro explícito e observável"*.

**A fazer:**
- [ ] Alinhar os três ao molde de `MercadoPagoBillingGateway.cs` / `AnthropicClient.cs`
- [ ] Onde o `null` é comportamento desejado (cotação ausente é normal), distinguir
      explicitamente "sem dado" de "falha", com log em nível diferente
- [ ] Se a feature não pode quebrar por falta do provedor, aplicar o padrão de fallback
      determinístico já usado no `FinancialAssistantService`
- [ ] Teste cobrindo upstream fora do ar

**Aceite:** upstream fora do ar é distinguível de "sem dado" no log e na resposta.

---

## 🟢 ⬜ Doc normativa aponta para arquivo que não existe

**Onde:** API · `docs/BACKEND_PADROES_IMPLEMENTACAO.md`, `docs/Agent.md`, `docs/README.md`

**Problema:** os três exigem revisar `InvestindoEmNegocio/Infrastructure/Data/schema.sql` em toda
mudança persistente, e afirmam que ele *"deve continuar suficiente para criar a base do zero"*.
**O arquivo não existe mais** — o schema virou EF Migrations (15 arquivos em `Migrations/`,
`Migrate()` no boot).

**Por que importa:** é uma regra de bloqueio (*"mudança persistente sem atualização de
`schema.sql`"* está nos critérios de bloqueio) apontando para o nada. Quem seguir a doc ao pé da
letra trava sem saber o que fazer. O `Agent.md` da raiz manda *"verificar primeiro se a
documentação está desatualizada"* — está.

**A fazer:**
- [ ] Trocar as menções a `schema.sql` por EF Migrations nos três arquivos
- [ ] Reescrever o critério de bloqueio: "mudança de modelo sem migration correspondente"
- [ ] Conferir se `docs/RUNBOOK.md` e `docs/ARCHITECTURE.md` também mencionam

**Aceite:** `grep -r schema.sql docs/` só retorna `docs/ARCHIVE/`.

---

## 🟢 ⬜ Resíduos menores no backend

**Onde / o quê:**

1. **`Controllers/AdminRobotsController.cs:44`** — `NotFound(new { detail = ... })` é a única
   resposta de erro ad hoc fora de `application/problem+json` em todos os controllers. O frontend
   não consegue tratar igual às outras, e não tem `traceId`.
   → trocar por `AppProblemException`.

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

## 🟡 ⬜ `src/app` é plano: não existe `core/`, `features/` tem uma feature só

**Onde:** Web · `src/app/`

**Problema:** `ARQUITETURA_ANGULAR.md` §1 define `core/ ← shared/ ← features/`. Hoje:
- **não há `core/`** — 65 arquivos `.ts` soltos na raiz de `src/app` (serviços, stores, guards,
  interceptors, `roles.ts`, `features.ts`)
- **`features/` tem só `accounts`** — as outras 42 telas são pastas soltas na raiz

**Por que não foi feito:** são milhares de linhas de import alteradas de uma vez, e o `Agent.md`
lista *"reestruturar a arquitetura inteira do projeto"* em "o que não fazer sem motivo claro".
Decisão do usuário em 2026-08-27: fora do escopo por ora.

**Observação:** a Parte 1 (onde mora componente de domínio reusado) pode ser resolvida junto com
isso, se a reestruturação for aprovada — é a opção 3 daquele item.

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

# Já fechado — commit `ded5a7d` (2026-08-27)

Branch `chore/padroes-frontend-fase1`. Verificado: typecheck limpo, **852/852** unitários,
**146/146** e2e, `build:prod` sem erro.

| Regra / item | Antes | Depois |
|---|---|---|
| R9 — `::ng-deep` em feature | 14 | **0** |
| R4 — SVG de gráfico em feature | 10 | **0** |
| R6 — cor literal fora de token | 46 ocorrências | **0** |
| §5 — `subscribe` sem `takeUntilDestroyed` | 18 componentes | **0** |
| §4 — `fb.group` não tipado | 3 | **0** |
| §1 — imports entre features | 18 | **11** |
| R8 — sem `OnPush` | 49 | **46** |
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
