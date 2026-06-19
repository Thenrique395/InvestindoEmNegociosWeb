# Catálogo dos testes e2e "live"

Os arquivos `live-*.spec.ts` rodam contra um backend real (não mockado) e só executam
quando a variável de ambiente `RUN_LIVE_SERVER_E2E=1` está definida (cada `test.describe`
chama `test.skip(!process.env['RUN_LIVE_SERVER_E2E'], ...)`).

Comando padrão para rodar um arquivo específico:

```bash
RUN_LIVE_SERVER_E2E=1 npx playwright test e2e/<arquivo>.spec.ts --workers=1
```

`--workers=1` é recomendado porque o endpoint `/auth` (registro + login) tem rate limit
global de 5 requisições/minuto — vários workers em paralelo aumentam a chance de bater no
limite e o helper precisa esperar ~65s para tentar de novo.

## Helper compartilhado: `support/live-auth.ts`

A maioria dos testes "live" usa `completeLiveOnboarding(page, workerIndex, retry)`, que:

1. Gera um usuário único com CPF válido (`buildLiveUser` + `buildValidCpf`).
2. Registra a conta em `/register` e faz login em `/login` (com retry de 65s para o rate
   limit), via `signUpAndLogin`.
3. Conclui o onboarding novo de 4 passos:
   - **Passo 1** – foco inicial ("Vamos definir seu foco inicial") → seleciona "Melhorar
     vida financeira".
   - **Passo 2** – preferências ("Escolha suas preferências") → seleciona "Balanceado".
   - **Passo 3** – dados básicos ("Dados Básicos") → telefone, data de nascimento, cidade,
     UF, país (CPF só é preenchido se o campo não estiver `readonly`).
   - **Passo 4** – conta principal e primeiros lançamentos ("Ative sua conta") → cria a
     conta principal (se ainda não existir), cadastra uma receita inicial ("Salario teste
     live") e uma despesa inicial ("Mercado teste live"), e conclui o onboarding.
4. Confirma a chegada no dashboard novo: heading "Seu mês com clareza" e texto "Quanto
   sobra".

Esse helper retorna o `user` (com `email`, `password`, `fullName`, `cpf`), usado por vários
testes para gerar nomes/categorias únicos via
`user.email.match(/(\d+)/)?.[1]?.slice(-6)`.

## `live-auth.spec.ts`

Fluxo básico de autenticação + onboarding + verificação de telas-chave.

| Teste | O que valida |
| --- | --- |
| `conclui onboarding real e entra no dashboard autenticado` | Cadastro, login e os 4 passos do onboarding até o dashboard novo. |
| `cria um cartao real e exibe na listagem` | Após onboarding, cria um cartão em `/cartoes` e confere que aparece na listagem com o número mascarado e o bloco "Como suas compras entram na fatura". |
| `exibe a conta principal real e respeita a restricao do plano Basic` | Em `/contas`, confere que a "Conta principal" existe, que o botão "Nova conta" não existe no plano Basic, e que o extrato dessa conta começa vazio ("Nenhuma movimentação") — a receita/despesa do onboarding entram como lançamentos, não como transações de conta. |

## `live-core.spec.ts`

Fluxos centrais (onboarding, cartão, dashboard, metas, contas) usando o helper
compartilhado.

| Teste | O que valida |
| --- | --- |
| `conclui onboarding real e entra no dashboard autenticado` | Mesmo fluxo básico de onboarding via helper compartilhado. |
| `cria um cartao real e exibe na listagem` | Criação de cartão pós-onboarding (mesmo padrão do `live-auth.spec.ts`). |
| `abre o dashboard real e alterna os paineis de periodo e risco` | Alterna filtros/paineis do dashboard (período e risco) e confere que os painéis respondem. |
| `cria uma meta real e registra na listagem` | Cria uma meta financeira em `/metas` (ou equivalente) e confere que aparece na listagem. |
| `exibe a conta principal real e respeita a restricao do plano Basic` | Mesma verificação de `/contas` e restrição do plano Basic do `live-auth.spec.ts`. |

## `live-access.spec.ts`

Controle de acesso e mensagens de "sem categoria ativa" para o plano Basic.

| Teste | O que valida |
| --- | --- |
| `abre a receita real e evidencia ausencia de categorias ativas` | Usuário novo (sem categorias custom) vê o aviso de "crie uma categoria antes de continuar" ao tentar lançar receita. |
| `abre a despesa real e evidencia ausencia de categorias ativas` | Mesmo aviso, para despesas. |
| `abre categorias por rota direta para usuario Basic` | Navegação direta para `/categorias` funciona para plano Basic. |
| `permite usuario Basic abrir calendario` | `/calendario` acessível no plano Basic. |
| `redireciona usuario Basic ao tentar abrir investimentos` | `/investimentos` redireciona usuário Basic (módulo não disponível no plano). |
| `redireciona usuario Basic ao tentar abrir admin parametros` | Telas administrativas redirecionam usuário Basic comum. |

## `live-writeflows.spec.ts`

CRUD completo de categorias, despesas e receitas após o onboarding (cada teste cria sua
própria categoria com nome único baseado no e-mail do usuário).

| Teste | O que valida |
| --- | --- |
| `cria categoria de despesa real, lanca despesa e marca como pago` | Cria categoria de despesa, lança uma despesa nela, confere status "Pendente" → marca como pago → confere "Pago". |
| `cria categoria de receita real, lanca receita e marca como recebida` | Mesmo fluxo para receita: cria categoria, lança receita, "Pendente" → marca como recebida → "Recebido". |
| `cria categoria e remove a categoria personalizada real` | Cria uma categoria de despesa e depois a remove, confirmando que deixa de existir após reload. |
| `cria receita recorrente real e filtra por tipo recorrente` | Cria receita marcada como recorrente, confere a coluna "Recorrente" e que o filtro por tipo recorrente mostra essa receita e oculta a receita avulsa do onboarding. |
| `edita despesa real em aberto e reflete novo valor` | Edita nome e valor de uma despesa pendente e confere que o novo valor aparece na listagem. |
| `edita e exclui receita recorrente real` | Edita uma receita recorrente (nome e valor), confere o novo valor, depois exclui a recorrência inteira e confirma ausência após reload. |
| `tenta estornar pagamento real e preserva a despesa como paga quando o servidor rejeita` | Marca despesa como paga, abre o histórico, tenta estornar o pagamento (espera rejeição do servidor) e confirma que a despesa permanece "Pago". |
| `exclui receita real avulsa pela confirmacao simples` | Cria uma receita avulsa (não recorrente) e a exclui via confirmação simples, validando ausência após reload. |

## `live-post-onboarding-entries.spec.ts` (novo)

Fluxos focados em **cadastros adicionais feitos depois do onboarding**, ou seja,
lançamentos extras que o usuário cria já usando o app no dia a dia (além dos lançamentos
iniciais gerados pelo próprio onboarding).

Usuários recém-onboardados ficam no plano Basic, que tem `feature.categories.read` mas
**não** tem `feature.categories.manage` (não podem criar categorias personalizadas). Por
isso estes testes usam categorias padrão já disponíveis para qualquer plano: `Alimentação`
(despesa) e `Freela` (receita).

Os lançamentos adicionais usam a data atual (`todayAsDDMMYYYY()`), já que `/despesas` e
`/receitas` filtram por padrão o período (mês) corrente — os lançamentos iniciais do
onboarding usam uma data fixa (09/03/2026) e por isso não aparecem nesse período quando o
mês atual é diferente de março/2026.

| Teste | O que valida |
| --- | --- |
| `cria conta, conclui onboarding e cadastra despesas adicionais depois` | Fluxo completo: cria conta → onboarding (4 passos) → cadastra **duas** despesas adicionais na categoria padrão "Alimentação", com vencimento no mês atual → confere que ambas aparecem como "Pendente" em `/despesas`. |
| `cria conta, conclui onboarding e cadastra despesa e receita adicionais depois` | Fluxo completo: cria conta → onboarding → cadastra uma despesa adicional na categoria padrão "Alimentação" e uma receita adicional na categoria padrão "Freela", ambas no mês atual → confere que ambas aparecem como "Pendente" em `/despesas` e `/receitas`. |

### Bug de aplicação corrigido: `ReceitasSummaryService` chamava rota inexistente

O segundo teste deste arquivo falhava em `incomesPage.reloadAndExpectRow(incomeName)` porque,
após criar a receita, a tabela de `/receitas` nunca era atualizada:

- O frontend (`src/app/receitas-summary.service.ts`) chamava
  `GET ${API_BASE_URL}/receitas/summary?month=...`.
- O backend (`IncomeSummaryController`) só expõe `[Route("api/incomes")]` /
  `[Route("api/v1/incomes")]` com `[HttpGet("summary")]`, ou seja, o caminho correto é
  `.../incomes/summary`, não `.../receitas/summary`.
- Essa chamada retornava **404** sempre (confirmado via trace, antes e depois do POST de
  criação da receita), e `ApiDataService.refreshIncomes()` (que usa
  `forkJoin({ summary: ..., incomeInstallments: ... })`) caía no `error` do `forkJoin`
  (apenas `console.error`), nunca atualizando `dbSubject`/`incomeSummarySubject`.

**Correção**: `receitas-summary.service.ts` agora aponta para `${API_BASE_URL}/incomes/summary`.

As constantes `DEFAULT_EXPENSE_CATEGORY`, `DEFAULT_INCOME_CATEGORY`, `todayAsDDMMYYYY()` e
`REFRESH_THROTTLE_MS` usadas neste arquivo e em `live-post-onboarding-management.spec.ts`
ficam em `support/post-onboarding-helpers.ts`.

## `live-post-onboarding-management.spec.ts` (novo)

Fluxos focados em **gerenciar lançamentos adicionais criados depois do onboarding**:
marcar como pago/recebido, editar valor, criar receita recorrente e filtrar, e excluir
uma receita avulsa. Segue o mesmo padrão de `live-post-onboarding-entries.spec.ts`
(categorias padrão "Alimentação"/"Freela", data atual via `todayAsDDMMYYYY()`, espera de
`REFRESH_THROTTLE_MS` antes de criar/editar lançamentos).

| Teste | O que valida |
| --- | --- |
| `cadastra despesa adicional depois do onboarding e marca como paga` | Cadastra uma despesa adicional (categoria "Alimentação") → confere "Pendente" → marca como pago → confere "Pago". |
| `cadastra despesa adicional depois do onboarding e edita o valor` | Cadastra uma despesa adicional → edita nome e valor → confere que o novo valor aparece em `/despesas`. |
| `cadastra receita recorrente adicional depois do onboarding e filtra por tipo recorrente` | Cadastra uma receita adicional recorrente (categoria "Freela") → confere a coluna "Recorrente" → filtra por tipo recorrente e confirma que a receita aparece. |
| `cadastra receita avulsa adicional depois do onboarding e a exclui` | Cadastra uma receita avulsa adicional (categoria "Freela") → exclui pelo modal de confirmação → confere que a linha desaparece (inclusive após reload). |
| `cadastra despesa adicional depois do onboarding e a exclui` | Cadastra uma despesa avulsa adicional (categoria "Alimentação") → clica em "Excluir" na linha → confere que a linha desaparece (inclusive após reload). |

### Correções de seletor de teste aplicadas

- `expenses.page.ts` (`openEdit`): heading do modal de edição mudou de "Editar lançamento"
  para **"Atualize este lançamento"** (level 3); "Editar despesa" agora é só um parágrafo
  (eyebrow).
- `expenses.page.ts` (`saveExpenseEdit`): o botão de salvar em modo edição é
  **"Salvar alterações"**, não "Editar despesa" (esse texto só existe para o modo criação:
  "Salvar despesa").
- `incomes.page.ts` (`createIncome`): o label do toggle de recorrência mudou de
  "Receita recorrente mensal" para **"Receita recorrente"**; o input é `sr-only` (switch
  customizado), então é necessário `check({ force: true })`.

### Bug de aplicação corrigido: faltava o modal de confirmação de exclusão em `/receitas`

O botão "Excluir" na tabela de `/receitas` não funcionava:

- `receitas.component.ts` → `remover()` seta `showDeleteModal = true`,
  `deletePlanId`/`deleteInstallmentId`/`deleteFonte`/`deleteIsRecurring`, e existem
  `confirmarExcluirSomenteEsta()` / `confirmarExcluirRecorrencia()` que chamam
  `db.removeIncomeInstallment(...)` / `db.removeIncome(...)`.
- Porém `receitas.component.html` não tinha nenhum bloco `@if (showDeleteModal)` — o
  modal de confirmação nunca era renderizado, então essas funções nunca eram chamadas e a
  receita nunca era removida pela UI.
- Em `/despesas` existe o equivalente funcional: `@if (confirmRemocao) { ... }` com heading
  "Confirmar remoção" e botões "Somente esta"/"Todas as parcelas" (ou "Somente este
  mês"/"Encerrar recorrência" para recorrentes).

**Correção**: adicionado em `receitas.component.html` um bloco `@if (showDeleteModal)`
reaproveitando as classes `.receitas-edit-received*` (novas classes
`.receitas-edit-received__title` e `.receitas-edit-received__danger` em
`receitas.component.scss`), com heading "Confirmar remoção" e:
- receita avulsa: botão "Excluir receita" (`confirmarExcluirSomenteEsta()`, remove apenas a
  parcela via `removeIncomeInstallment`);
- receita recorrente: "Somente este mês" (`confirmarExcluirSomenteEsta()`) ou "Encerrar
  recorrência" (`confirmarExcluirRecorrencia()`, remove o plano via `removeIncome`).

`incomes.page.ts` (`deleteIncome`) foi reescrito para clicar no botão "Excluir" da linha,
aguardar o heading "Confirmar remoção" e clicar no botão correto conforme `recurring`.

Assim como na edição de despesa, a exclusão também sofre do throttle de
`REFRESH_THROTTLE_MS` quando feita imediatamente após um `reloadAndExpectRow` — o teste
aguarda `REFRESH_THROTTLE_MS` antes de chamar `deleteIncome`.

### Bug de aplicação corrigido: faltava o botão "Excluir" na tabela de `/despesas`

`despesas-lista.component.html` tinha o `@Output() remover` declarado e consumido em
`despesas.component.html` (`(remover)="openRemocaoPorId($event)"`), mas nenhum elemento da
tabela disparava esse evento — não havia caminho na UI para excluir uma despesa.

**Correção**: adicionado o botão de ícone "Excluir"
(`expenses-table__icon-action expenses-table__icon-action--danger`, mesmo padrão visual do
botão equivalente em `/receitas`) em `despesas-lista.component.html`, emitindo
`remover.emit(d.id!)`.

Para uma despesa avulsa simples (sem parcelas/recorrência), `openRemocao()` não exibe o
modal `confirmRemocao` — remove direto via `removerDespesa()` → `removeExpenseInstallment()`
(`DELETE /installments/{id}`). O novo teste `cadastra despesa adicional depois do
onboarding e a exclui` cobre esse caminho; o modal `confirmRemocao` (despesas
parceladas/recorrentes) continua sem cobertura de teste e2e.

## `live-finance-modules.spec.ts`

Módulos financeiros adicionais (empréstimos, snapshots mensais, assinatura/plano,
segurança).

| Teste | O que valida |
| --- | --- |
| `cria um empréstimo real e persiste o contrato` | Simula e cria um contrato de empréstimo em `/emprestimos`, confere persistência via API (`GET /loans`). |
| `gera um snapshot real do mês e exibe na listagem` | Gera um snapshot mensal e confere que aparece na listagem de snapshots. |
| `troca o plano real para Intermediate anual e depois cancela a renovação` | Fluxo de assinatura: upgrade para plano Intermediate anual e cancelamento da renovação automática. |
| `revoga sessões reais e atualiza o resumo de segurança` | Em `/seguranca`, revoga sessões ativas e confere que o resumo de segurança é atualizado. |

## `live-profile.spec.ts`

Perfil do usuário, preferências, exportação de dados, logout e exclusão de conta (LGPD).

| Teste | O que valida |
| --- | --- |
| `abre preferencias e centro de dados reais` | Acesso às telas de preferências e ao centro de dados do usuário. |
| `abre o perfil real e carrega os dados do usuario` | `/perfil` carrega os dados reais do usuário autenticado. |
| `abre a pagina real de seguranca` | `/seguranca` carrega corretamente. |
| `exporta dados reais do usuario` | Fluxo de exportação de dados pessoais (LGPD). |
| `salva preferencia real de notificacao` | Altera e persiste uma preferência de notificação. |
| `faz logout real e bloqueia retorno direto ao dashboard` | Logout remove a sessão e impede acesso direto ao `/dashboard` depois. |
| `exclui a conta descartavel via fluxo lgpd real` | Exclui a própria conta via fluxo de exclusão LGPD (usuário descartável criado só para esse teste). |

## `live-role-profiles.spec.ts`

Validação de menus e acessos por perfil/role (Intermediate, Advanced, Admin), usando
credenciais "seed" pré-configuradas (`LIVE_INTERMEDIATE_*`, `LIVE_ADVANCED_*`,
`LIVE_ADMIN_*`).

| Teste | O que valida |
| --- | --- |
| `Intermediate exibe menu compatível com o perfil e libera importação de fatura` | Usuário Intermediate vê o menu correto e tem acesso à importação de fatura. |
| `Intermediate acessa calendario mas nao investimentos nem admin` | Intermediate acessa `/calendario`, mas é bloqueado em `/investimentos` e telas admin. |
| `Advanced exibe wealth no menu e carrega ações principais de investimentos` | Usuário Advanced vê o módulo "wealth"/investimentos no menu e carrega as ações principais. |
| `Advanced acessa investimentos e calendario mas nao admin` | Advanced acessa `/investimentos` e `/calendario`, mas é bloqueado em telas admin. |
| `Admin exibe menus administrativos e carrega módulos críticos` | Admin vê os menus administrativos e carrega módulos críticos sem erro. |
| `Admin acessa telas administrativas reais` | Admin navega pelas telas administrativas reais (usuários, parâmetros etc.). |

## `live-role-writeflows.spec.ts`

Fluxos de escrita reais por perfil/role.

| Teste | O que valida |
| --- | --- |
| `Intermediate cria categoria real e a usa no fluxo de importação de fatura` | Usuário Intermediate cria uma categoria e a utiliza no fluxo de importação de fatura (PDF). |
| `Advanced cria um lançamento real em investimentos` | Usuário Advanced cria um lançamento real no módulo de investimentos. |
| `Admin altera o role de um usuário real e restaura no fim do fluxo` | Admin altera o role de um usuário de teste e restaura o valor original ao final, evitando efeitos colaterais permanentes. |

## Outros arquivos de e2e (não-"live")

Os specs abaixo **não** dependem de `RUN_LIVE_SERVER_E2E` — rodam contra a app servida
localmente (`http://127.0.0.1:4300` por padrão) com mocks/fixtures, conforme descrito no
`README.md` da pasta `quality-tests`:

- `smoke.spec.ts`, `app-shell.spec.ts`, `authenticated-shell.spec.ts` — smoke tests gerais
  de navegação e shell autenticado.
- `signup-onboarding.spec.ts`, `onboarding-regression.spec.ts`,
  `onboarding-error-flows.spec.ts` — fluxo de cadastro/onboarding com mocks, incluindo
  casos de erro.
- `authenticated-finance-modules.spec.ts`, `authenticated-admin-*.spec.ts`,
  `authenticated-profile-modules.spec.ts`, `authenticated-home-*.spec.ts` — módulos
  autenticados (financeiro, admin, perfil, home) com mocks.
- `category-propagation.spec.ts` — propagação de categorias padrão/admin para usuários.
- `commercial-checkout.spec.ts` — fluxo de checkout comercial (planos/billing) com mocks.
- `error-flows.spec.ts` — cenários de erro genéricos (rede, validação etc.).
- `role-regression.spec.ts` — regressão de permissões por role com mocks.
- `post-deploy-frontend.spec.ts` — checagens pós-deploy do frontend (smoke contra ambiente
  publicado).

## Cobertura pendente — próximos testes live

Áreas ainda sem cobertura live. Usar como backlog ao criar novos specs.

### Billing e assinatura

| Fluxo | Arquivo sugerido | Observação |
| --- | --- | --- |
| Checkout Stripe completo (redirect → webhook → plano ativado) | `live-billing.spec.ts` | Requer Stripe ativado em PRD; usar conta de teste Stripe para simular pagamento |
| Portal de cobrança Stripe (alterar cartão, cancelar renovação) | `live-billing.spec.ts` | Verifica redirect para `stripe.com/billing/portal` e retorno ao app |
| Solicitação de reembolso dentro da janela de arrependimento | `live-billing.spec.ts` | `POST /billing/refund` em até 7 dias da ativação |
| Trial de plano Advanced (ativar, verificar role, expirar) | `live-billing.spec.ts` | `POST /billing/trial` → verifica `UserRole.Advanced` → verifica bloqueio após `TrialUsedAt` |
| Downgrade automático após fim da janela de graça | `live-billing.spec.ts` | Difícil de testar live; candidato a teste de integração backend |

### Assistente financeiro

| Fluxo | Arquivo sugerido | Observação |
| --- | --- | --- |
| Enviar mensagem ao assistente e receber resposta | `live-assistant.spec.ts` | Verifica que o chat responde com conteúdo não vazio |
| Assistente bloqueado para plano Basic | `live-assistant.spec.ts` | Usuário Basic deve ver mensagem de upgrade, não resposta do assistente |

### Importações OFX / CSV

| Fluxo | Arquivo sugerido | Observação |
| --- | --- | --- |
| Importar fatura OFX de cartão (Intermediate+) | `live-imports.spec.ts` | Upload de arquivo OFX de teste → verifica lançamentos importados em `/despesas` |
| Importar extrato CSV de conta (Intermediate+) | `live-imports.spec.ts` | Upload de arquivo CSV → verifica transações importadas |
| Bloqueio de importação para plano Basic | `live-imports.spec.ts` | Usuário Basic deve ver aviso de upgrade ao tentar importar |

### Patrimônio e investimentos (Advanced)

| Fluxo | Arquivo sugerido | Observação |
| --- | --- | --- |
| Criar e listar ativo de investimento real | `live-advanced.spec.ts` | Já parcialmente coberto em `live-role-writeflows.spec.ts` — expandir |
| Snapshot patrimonial mensal | `live-advanced.spec.ts` | Já parcialmente coberto em `live-finance-modules.spec.ts` — verificar campos |
| Verificar patrimônio líquido consolidado no wealth | `live-advanced.spec.ts` | Tela de wealth com totais de contas + investimentos |

### Cenários de erro por módulo

#### Autenticação

| Cenário | Arquivo sugerido |
| --- | --- |
| Login com senha incorreta → mensagem de erro visível | `live-auth-errors.spec.ts` |
| Tentativa de cadastro com e-mail já existente → erro 409 | `live-auth-errors.spec.ts` |
| Rate limit de `/auth` atingido (5 req/min) → erro 429 + retry automático no helper | `live-auth-errors.spec.ts` |
| Token expirado → refresh automático sem logout | `live-auth-errors.spec.ts` |

#### Billing

| Cenário | Arquivo sugerido |
| --- | --- |
| Tentar iniciar checkout sem plano valid → erro 400 | `live-billing-errors.spec.ts` |
| Reembolso fora da janela (> 7 dias) → erro 422 | `live-billing-errors.spec.ts` |
| Trial já utilizado → erro 422 com mensagem clara | `live-billing-errors.spec.ts` |

#### Importações

| Cenário | Arquivo sugerido |
| --- | --- |
| Upload de arquivo OFX inválido → mensagem de erro | `live-imports.spec.ts` |
| Upload de CSV com colunas erradas → erro de validação | `live-imports.spec.ts` |
| Importação duplicada → sistema identifica e avisa | `live-imports.spec.ts` |

## Como adicionar novos testes "live"

1. Use `completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry)` do
   `support/live-auth.ts` para começar de um usuário novo já onboardado.
2. Gere nomes únicos a partir do e-mail do usuário retornado:
   `const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';`
3. Prefira os page objects em `support/page-objects/*.page.ts` (ex.: `ExpensesPage`,
   `IncomesPage`, `CategoriesPage`, `CardsPage`) em vez de seletores avulsos.
4. Sempre envolva o `test.describe` com
   `test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.')`.
5. Depois de criar o teste, atualize este arquivo (`LIVE_E2E_TESTS.md`) com uma linha na
   tabela do spec correspondente (ou crie uma nova seção, se for um novo arquivo).
