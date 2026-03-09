# Matriz de Cobertura de Testes

> Mapa objetivo de cobertura por funcionalidade, ligando testes unitários, smoke e automatizados de frontend.

## Resumo atual da suíte
- Última validação completa: `2026-03-09`
- Backend: `342` testes aprovados via `dotnet test InvestindoEmNegociosApi/InvestindoEmNegocio.sln /p:UseAppHost=false`
- Frontend unitário: `65` testes aprovados via `npm test -- --watch=false`
- Frontend E2E: `26` testes aprovados via `npm run test:e2e`
- Total validado na suíte completa: `433` testes aprovados, `0` falhas
- Observação operacional: no macOS local o backend continua exigindo `/p:UseAppHost=false` por conflito de `apphost`; a suíte em si está verde.

## Legenda de cobertura
- `Alta`: possui unit/backend + smoke/backend + front automatizado + cenário manual documentado.
- `Média`: possui parte relevante da cobertura automatizada, com gap em pelo menos uma camada.
- `Baixa`: cobertura automatizada insuficiente para risco do fluxo.

## 1) Cobertura por funcionalidade crítica

| Tela/Funcionalidade | Backend (unit) | Backend (smoke) | Front (automatizado) | Cenário manual | Cobertura | Gap principal |
|---|---|---|---|---|---|---|
| 1.2 Onboarding (objetivo/intelligence/carryOverDay) | `ProfileServiceTests`, `UpsertUserProfileRequestValidatorTests`, `ProfileControllerIntegrationTests`, `CompetenceWindowCalculatorTests`, `CompetenceWindowCalculatorEdgeCaseTests` | `MoreControllersSmokeTests` (Profile/Onboarding) | `onboarding.component.smoke.spec.ts`, `role.guard.spec.ts`, `features.spec.ts`, `role-regression.spec.ts` | `Cenarios de teste/1.2_carry-over-day-competencia.md`, `Cenarios de teste/1.2_intelligence-mode-b-c.md` | Alta | Evoluir com E2E visual do fluxo completo (desktop/mobile) em ambiente integrado. |
| 1.3 Dashboard / Insight automático financeiro | `NotificationsServiceTests` (cenários critical/warning/deficit/dedup), `ReminderRobotTaskTests` | `MoreControllersSmokeTests` (`NotificationsController`) | `home.component.smoke.spec.ts`, `authenticated-shell.spec.ts` | `Cenarios de teste/1.10_insight-automatico-financeiro.md` | Alta | Evoluir regras do motor (priorização contextual mais avançada). |
| 1.4 Despesas (parcelas/pagamento/antecipação/exclusão) | `InstallmentsServiceTests` | `MoreControllersSmokeTests` (`InstallmentsController`) | `despesas.component.spec.ts` | `docs/FLUXO_SALDO_TRANSACOES_PLAYBOOK.md` + cenários operacionais | Média | Falta ampliar automatização de casos de exceção em UI (modal/fluxos de lote). |
| 1.5 Receitas (CRUD + summary) | `IncomeSummaryServiceTests`, `PlansServiceTests` | `MoreControllersSmokeTests` (Plans/Installments indireto) | `receitas.component.smoke.spec.ts` + cobertura de componentes de receitas | fluxo manual no playbook financeiro | Alta | Falta E2E visual da navegação mensal em ambiente integrado (latência real). |
| 1.6 Cartões (CRUD + fatura por competência) | `CardsServiceTests`, `CardStatementCycleCalculatorTests`, `FinanceRulesSmokeTests`, `CardsControllerSqliteIntegrationTests`, `ImportFlowsIntegrationTests` | `MoreControllersSmokeTests` (`CardsController`) | `cartoes.component.smoke.spec.ts`, `authenticated-shell.spec.ts`, `authenticated-writeflows.spec.ts`, `role-regression.spec.ts` | `Cenarios de teste/2.2_competencia-cartao-closing-day.md`, `Cenarios de teste/4.3_fatura-por-competencia.md` | Alta | Falta ampliar cenários de erro de validação e concorrência de refresh no CRUD. |
| 1.7 Metas (CRUD + contribuições) | `GoalsServiceTests`, `GoalContributionsServiceTests` | `PlansAndGoalsControllerTests`, `MoreControllersSmokeTests` (Goals/Contributions) | cobertura de front parcial em fluxos existentes | cenários funcionais já mapeados no status | Média | Falta smoke de front para filtros/anos e status de meta. |
| 1.8 Calendário financeiro | `CompetenceWindowCalculator*` (regras auxiliares) | n/a direto | `calendario.component.spec.ts` | cenário funcional no status/playbook | Média | Falta cobertura de integração com mudanças de locale e timezone em runtime real. |
| 1.11 Configurações (preferências + LGPD self-service) | `PreferencesServiceTests`, `DataPortabilityServiceTests`, `NotificationSettingsDtoTests` | `MoreControllersSmokeTests` (`PreferencesController`, `DataPortabilityController`) | `role-regression.spec.ts` + cobertura front parcial em componentes de preferências/portabilidade | `Cenarios de teste/1.11_configuracoes-preferencias-lgpd.md` | Alta | Falta E2E de confirmação de exclusão em ambiente integrado. |
| 1.12 Controle de acesso por perfil/feature | `AdminUsersServiceTests`, regras centralizadas `AppFeatureMatrix` validadas por serviços/controladores | `MoreControllersSmokeTests` (área admin e políticas por endpoint) | `features.spec.ts`, `role.guard.spec.ts`, `auth.interceptor.spec.ts`, `role-regression.spec.ts` | governança no `STATUS_FUNCIONALIDADES` (matriz por feature) | Alta | Falta ampliar regressão por perfil para mais rotas protegidas e combinações de override. |
| 3.2 Saldo por transações (ledger) + 5.1 transferência | `AccountsServiceTests` | `MoreControllersSmokeTests` (`AccountsController`) + `FinanceRulesSmokeTests` | `contas.component.smoke.spec.ts`, `authenticated-shell.spec.ts`, `authenticated-writeflows.spec.ts`, `error-flows.spec.ts` | `Cenarios de teste/5.1_tipos-transacao-transferencia.md` + playbook saldo | Alta | Falta E2E de concorrência/duplo clique e rollback visual em erro de transferência. |
| 6.1 / 6.2 / 6.3 Importação bancária (OFX/CSV/deduplicação) | `OfxImportServiceTests`, `CsvImportServiceTests`, `BankStatementImportEngineTests`, `InvoiceImportServiceTests`, `ImportFlowsIntegrationTests` | `MoreControllersSmokeTests` (`AccountsController` / `InvoiceImportController` indireto) | `contas.component.smoke.spec.ts`, `invoice-import.component.smoke.spec.ts`, `authenticated-writeflows.spec.ts`, `error-flows.spec.ts` | cenários operacionais no `STATUS_FUNCIONALIDADES` + playbook financeiro | Alta | Falta E2E com arquivos reais grandes e regressão visual do preview autenticado. |
| 7.1 / 7.2 / 7.3 Categorização inteligente | `CategorizationServiceTests`, `InvoiceImportServiceTests`, `BankStatementImportEngineTests` | smoke indireto por controllers de importação | `contas.component.smoke.spec.ts`, `invoice-import.component.smoke.spec.ts` | revisão manual de amostras de importação por banco/fatura | Alta | Falta benchmark automatizado com massa histórica mais diversa. |
| 8 Recurrence Detector | `RecurrenceDetectorServiceTests` | smoke indireto por importação bancária/fatura | `contas.component.smoke.spec.ts`, `invoice-import.component.smoke.spec.ts` | revisão manual de recorrências limítrofes | Média | Falta suíte maior de falsos positivos/negativos em massa. |
| 9 / 10 / 11 / 12 / 13 Resumos, projeção, risco, insights e recomendações | `AccountsServiceTests`, `CashflowProjectionEngineTests`, `RiskBotServiceTests`, `InsightEngineServiceTests`, `RecommendationEngineServiceTests`, `NotificationsServiceTests` | `MoreControllersSmokeTests` (`AccountsController`, `NotificationsController`) | `home.component.smoke.spec.ts`, `authenticated-shell.spec.ts` | `Cenarios de teste/1.10_insight-automatico-financeiro.md` + playbook saldo | Alta | Falta E2E integrada com seed realista de mês completo. |
| 14.2 / 14.3 / 14.4 Wealth operacional (dívidas, patrimônio líquido, evolução) | `AccountsServiceTests` | `MoreControllersSmokeTests` (`AccountsController`) | `home.component.smoke.spec.ts` | validação manual dos cards/curva patrimonial com dados reais do usuário | Média | Falta teste visual dedicado da Home para composição patrimonial e falta fechar `14.1` com imóvel/veículo. |

## 2) Comandos padrão de validação

### Backend
```bash
cd InvestindoEmNegociosApi
bash ./scripts/quality-backend.sh
```

### Frontend
```bash
cd InvestindoEmNegociosWeb
bash ./scripts/quality-frontend.sh
```

### Gate único do workspace
```bash
cd /Users/henriquesantos/Desktop/Codes/Projeto\ InvestindoEmNegocios
bash ./scripts/quality-gate.sh
```

## 3) Próximas amarrações recomendadas (ordem)
1. Criar E2E visual de `onboarding` (desktop/mobile) validando UX, máscara e mensagens no fluxo completo.
2. Adicionar suíte de regressão por perfil/rota (Basic/Intermediate/Advanced/Admin) para fechar controle de acesso ponta a ponta.
3. Adicionar smoke de sessão expirada/refresh token em rotas críticas para evitar tela em branco.

## 4) Gate em CI
- Backend: workflow `InvestindoEmNegociosApi/.github/workflows/ci-backend.yml` com `Suite=Smoke` + suíte completa.
- Frontend: workflow `InvestindoEmNegociosWeb/.github/workflows/ci-frontend.yml` com `quality-frontend.sh` incluindo unitário, E2E e build.
- Política operacional: merge só com checks de CI verdes.
