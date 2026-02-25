# Status de Funcionalidades

> Controle contínuo do que já existe, do que está parcial e do que ainda não foi implementado.

## Legenda
- `✅ Implementado`
- `⚠️ Parcial`
- `❌ Não implementado`

## 1. Gestão de Usuário

### 1.1 Cadastro e Autenticação

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Cadastro com email e senha | ✅ | `POST /api/v1/auth/register` | Fluxo ativo no backend e tela de cadastro no frontend. |
| Hash seguro de senha | ✅ | `AuthService` usando BCrypt | Work factor 12. |
| JWT + Refresh Token | ✅ | `POST /api/v1/auth/login` + `POST /api/v1/auth/refresh` | Refresh token com rotação e revogação. |
| Recuperação de senha | ✅ | `POST /api/v1/auth/forgot-password` + `POST /api/v1/auth/reset-password` | Fluxo e token com expiração implementados; depende de SMTP configurado para envio real. |
| Logout seguro | ✅ | `POST /api/v1/auth/logout` | Revoga refresh token persistido. |

### 1.2 Configurações do Usuário

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Objetivo inicial do onboarding (persistência e uso) | ✅ | `FinancialGoal` em `user_profiles` + `ProfileService.Upsert` + dashboard | Objetivo selecionado é salvo no perfil e usado para enriquecer o Insight automático no home. |
| IntelligenceMode (B ou C) | ❌ | Não encontrado em DTO/entidade/endpoint | Planejar modelo + endpoint + tela. |
| CarryOverDay (competência configurável) | ❌ | Não encontrado em DTO/entidade/endpoint | Planejar regra de competência por usuário. |
| Preferências de notificação | ⚠️ | `GET/PUT /api/v1/preferences` | Existe in-app/email; personalização ainda básica. |
| Exclusão de conta (LGPD) | ❌ | Não há endpoint self-service | Falta fluxo de exclusão/anonimização para o próprio usuário. |
---

## 2. Gestão Financeira (Despesas/Receitas/Cartões)

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| CRUD de cartões | ✅ | `GET/POST/PUT/DELETE /api/v1/cards` | Fluxo completo disponível no frontend. |
| Total de dívida em cartões | ✅ | `GET /api/v1/cards/debt/total` | Já exposto na API. |
| CRUD de planos (receita/despesa) | ✅ | `GET/POST/PUT/DELETE /api/v1/plans` | Gera parcelas conforme tipo do plano. |
| Gestão de parcelas (listar/pagar/antecipar/excluir) | ✅ | `/api/v1/installments` + `/payments` + `/anticipations` | Cobertura principal de operação financeira. |
| Resumo de receitas por mês | ✅ | `GET /api/v1/receitas/summary` | Consumido no frontend de receitas. |
| Categorias personalizadas do usuário | ✅ | `GET/POST/PUT/DELETE /api/v1/categories` | Inclui categorias padrão + do usuário. |
| Calendário financeiro mensal | ✅ | Rota frontend `/calendario` + `calendario.component.spec.ts` | Visão mensal com receitas, despesas e vencimentos de cartão, filtros por tipo/categoria/status, resumo mensal e ação de marcar como pago implementados e testados. |
| Importação automática de fatura/cartão + conciliação | ⚠️ | `InvoiceImportController` + tela no frontend | Tratar como pacote único: importação multi-formato e conciliação devem evoluir juntas; validar cobertura de formatos, deduplicação e fechamento de fatura. |

## 3. Metas e Objetivos

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| CRUD de metas financeiras | ✅ | `GET/POST/PUT/DELETE /api/v1/goals` | Fluxo completo implementado. |
| Meta de receita anual | ✅ | `GET/PUT /api/v1/goals/income` | Funcionalidade separada de metas gerais. |
| Contribuições para metas | ✅ | `GET/POST /api/v1/goals/{goalId}/contributions` | Lançamentos de evolução de meta disponíveis. |
| Alertas automáticos por progresso | ⚠️ | Notificações existem (`/api/v1/notifications`) | Regras específicas de metas dependem da geração atual. |

## 4. Investimentos

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Objetivo de investimentos | ✅ | `GET/PUT /api/v1/investments/goal` | Persistido por usuário. |
| Alocação alvo de carteira | ✅ | `GET/PUT /api/v1/investments/allocation-target` | Implementado com façade. |
| CRUD de posições | ✅ | `GET/POST/PUT/DELETE /api/v1/investments/positions` | Inclui listagem e item por id. |
| Movimentações (compra/venda etc.) | ✅ | `POST /api/v1/investments/positions/{id}/movements` | Disponível no backend e tela. |
| Dados de mercado (cotação/perfil/histórico) | ✅ | `/api/v1/investments/market/*` | Com resiliência HTTP adicionada. |
| Benchmarks | ✅ | `GET /api/v1/investments/benchmarks` | Comparativos disponíveis. |
| Importação B3 (PDF + confirmação) | ✅ | `/api/v1/investments/import/b3/*` | Fluxo de extração e confirmação implementado. |
| Sync B3 via consentimento | ⚠️ | `/api/v1/investments/b3/consent` e `/b3/sync` | Existe fluxo mock e sync; validar integração real fim-a-fim. |

## 5. Administração

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Gestão de usuários (admin) | ✅ | `AdminUsersController` | Inclui atualização e remoção sob regras administrativas. |
| Gestão de categorias padrão (admin) | ✅ | `AdminCategoriesController` | Catálogo administrável. |
| Gestão de parâmetros (instituições, bandeiras, meios pagamento e agendamento de robôs) | ✅ | `AdminParametersController` | Inclui ativação/desativação e configuração do horário de execução automática dos robôs via painel admin. |
| Monitoramento e execução de robôs (admin) | ✅ | `GET/POST /api/v1/admin/robots/*` + rota frontend `/admin/robots` | Painel com status, histórico filtrável, detalhe por execução, disparo seguro com cooldown/force, observabilidade (duration/correlation/host), auditoria de disparo e rate limit admin. |
| Controle de acesso por perfil | ⚠️ | Roles presentes em auth/JWT | Recomenda-se revisão de matriz de autorização por endpoint. |

## 6. Notificações e Alertas

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Listar notificações do usuário | ✅ | `GET /api/v1/notifications` | Com filtro de não lidas. |
| Marcar como lida | ✅ | `POST /api/v1/notifications/{id}/read` | Fluxo básico completo. |
| Geração de notificações | ✅ | `POST /api/v1/notifications/generate` + `RoboLembretes` (scheduler diário) | Geração sob demanda e execução automática diária implementadas. |
| Preferências de notificação (in-app/email) | ⚠️ | `PUT /api/v1/preferences` | Personalização simples por usuário; sem granularidade por tipo. |
| Envio de e-mail real | ⚠️ | Preferência existe | Falta consolidar provedor transacional no fluxo produtivo. |

## 7. Portabilidade de Dados

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Exportar dados do usuário (JSON) | ✅ | `GET /api/v1/dataportability/export` | Endpoint pronto e usado em testes de carga. |
| Importar dados do usuário | ✅ | `POST /api/v1/dataportability/import` | Suporta substituição de dados existentes. |
| Validação de integridade na importação | ⚠️ | `DataPortabilityService` com validações | Cobertura boa; manter testes para casos extremos. |
| Fluxo LGPD completo (download + exclusão/anonimização) | ⚠️ | Export/import implementados | Exclusão self-service ainda pendente. |

---

## 8. Backlog priorizado (referência: `FEATURE_PRIORIDADES.md`)

### Prioridade 1 - Fluxo financeiro core
- Recorrência de receitas e despesas.
- Lembretes reais (push/WhatsApp).
- Importação de faturas + conciliação de cartões e faturas (pacote único).
- Calendário financeiro mensal.
- Alertas por faixa de valor.

### Prioridade 2 - Automação útil
- Regras automáticas por categoria.
- Sugestão de orçamento mensal.
- Categorização inteligente por histórico.
- Projeção de fechamento do mês.

### Prioridade 3 - Retenção
- Metas com próxima ação.
- Streak de saúde financeira.
- Resumo semanal automático.
- Relatório mensal consolidado em PDF.
- Checklist de rotina financeira.

### Prioridade 4 - Dados e confiança
- Import/export robusto.
- Detecção de duplicados.
- Trilha de alterações por item.
- Backup automático opcional com versões.
- Centro de auditoria.

### Prioridade 5 - Monetização
- Planos Free/Pro com feature gates no front e API.
- Tela de upgrade contextual.
- Comparação de benefícios por perfil.
- Trial guiado.
- Upsell de investimentos/automações.

### Prioridade 6 - Qualidade técnica
- Reduzir bundle inicial e manter budget.
- E2E de fluxos críticos.
- Observabilidade de erro no front e Core Web Vitals.
- Testes de carga de endpoints críticos.
- Otimizações backend (queries, export/import assíncrono, rate limit, OTEL por endpoint).

### Prioridade 7 - Investimentos (expansão)
- Integração direta com APIs da B3 para sincronização automática (pendente de credenciais/política).

---

## 9. Atualizações
- 2026-02-21: documento criado com o status inicial de Gestão de Usuário.
- 2026-02-21: mapeados módulos de Gestão Financeira, Metas, Investimentos, Administração, Notificações e Portabilidade.
- 2026-02-21: adicionado backlog priorizado com base no `FEATURE_PRIORIDADES.md`.
- 2026-02-21: recuperação de senha evoluída para status parcial (API pronta, pendente configuração SMTP para envio real).
- 2026-02-23: calendário financeiro mensal evoluído com rota MVP e testes unitários iniciais.
- 2026-02-23: painel admin de monitoramento de robôs adicionado com execução manual e histórico.
- 2026-02-24: monitor de robôs evoluído (filtros, detalhe de execução, execução segura/idempotente com cooldown, auditoria de disparo, alerta proativo por falhas consecutivas e rate limit admin).
- 2026-02-24: UX do detalhe de execução no monitor de robôs refinada (modal com KPIs, contexto técnico e resultado, com melhor legibilidade em desktop/mobile).
- 2026-02-24: saldo por transações evoluído com conta automática para Basic, bloqueio de gestão de contas no Basic, limpeza de ledger em exclusão de parcelas e script de backfill para histórico (`Infrastructure/Data/scripts/backfill_account_transactions_from_payments.sql`).
- 2026-02-24: saldo por transações evoluído com estorno explícito de pagamento (`POST /installments/{id}/payments/{paymentId}/reversals`), regra mais rígida para seleção de conta em perfis não-Basic e playbook de testes em base limpa (`docs/FLUXO_SALDO_TRANSACOES_PLAYBOOK.md`).

## 10. Gap Analysis (escopo estratégico 2–25)

| Item | Tema | Status | Observação resumida |
|---|---|---|---|
| 2.1 | CarryOverDay | ❌ | Não há configuração de competência mensal por dia de corte. |
| 2.2 | Competência de cartão por closing day | ⚠️ | Implementação técnica realizada no backend e em validação funcional; marcar como concluído apenas após confirmação final. |
| 3.1 | Gestão de contas (corrente/poupança/digital/carteira) | ✅ | Implementado com CRUD, extrato por conta e saldo consolidado em `accounts`/`account_transactions`. |
| 3.2 | Saldo atual por transações | ⚠️ | Ledger operacional ativo (pagamento/recebimento + estorno explícito + limpeza em delete + backfill histórico). Pendente principal: transferência entre contas e ajustes avançados no front para multi-conta. |
| 4.1 | Cadastro de cartão (limite/fechamento/vencimento) | ✅ | Implementado em `cards`. |
| 4.2 | Compras no cartão + parcelamento + compromissos futuros | ✅ | Fluxo implementado por planos/parcelas/pagamentos. |
| 4.3 | Fatura por competência | ⚠️ | Há base funcional, mas sem engine explícita de consolidação de ciclo de fatura separado de conta. |
| 5.1 | Tipos de transação (receita/despesa/transferência) | ⚠️ | Receita/despesa existem; transferência formal não está modelada. |
| 5.2 | Campos completos (competência + source type etc.) | ⚠️ | Parte dos campos existe; competência e `SourceType` padronizado não estão completos. |
| 5.3 | Parcelamento automático | ✅ | Implementado. |
| 6.1 | Importação OFX | ❌ | Não encontrado parser/fluxo OFX. |
| 6.2 | Importação CSV de extrato bancário | ❌ | Não encontrado fluxo de CSV bancário configurável (há CSV em investimentos). |
| 6.3 | Deduplicação por hash valor+data+descrição | ⚠️ | Existem dedups em importações específicas (ex.: fatura), não como motor unificado de extrato. |
| 7.1 | Categorization Bot (merchant/histórico/regex) | ❌ | Não implementado como motor dedicado. |
| 7.2 | Score de confiança | ❌ | Não implementado. |
| 7.3 | Aprendizado incremental | ❌ | Não implementado. |
| 8 | Recurrence Detector | ❌ | Não implementado. |
| 9 | Saldo Disponível Real (SDR) | ❌ | Não implementado como indicador oficial. |
| 10.1 | Projection Engine (simulação diária) | ❌ | Não implementado. |
| 10.2 | Data provável de risco | ❌ | Não implementado. |
| 11 | Risk Bot (score/classificação) | ❌ | Não implementado. |
| 12 | Insight Engine (reativo/preventivo/estrutural/patrimonial) | ⚠️ | Existem insights pontuais no produto, sem engine formal completo. |
| 13 | Recommendation Engine | ⚠️ | Existem recomendações pontuais; sem motor com limiar e governança definidos. |
| 14.1 | Wealth: ativos (investimentos, imóvel, veículo) | ⚠️ | Investimentos implementados; imóvel/veículo não. |
| 14.2 | Wealth: dívidas | ❌ | Não implementado como módulo estruturado. |
| 14.3 | Patrimônio líquido | ❌ | Não implementado como visão consolidada oficial. |
| 14.4 | Evolução patrimonial (snapshot mensal) | ❌ | Não implementado. |
| 15.1 | LoanContract | ❌ | Não implementado. |
| 15.2 | LoanInstallment | ❌ | Não implementado. |
| 15.3 | Simulação de amortização | ❌ | Não implementado. |
| 16 | Snapshot mensal imutável | ❌ | Não implementado. |
| 17.1 | IA conversacional (assistente financeiro) | ❌ | Não implementado. |
| 17.2 | Prompt estruturado com dados pré-calculados | ❌ | Não implementado. |
| 17.3 | Limites de IA (governança) | ❌ | Não implementado no produto. |
| 18.1 | PWA | ❌ | Não há configuração ativa de PWA/service worker. |
| 18.2 | Capacitor | ❌ | Não há integração Capacitor no projeto. |
| 18.3 | Mobile-first UX | ⚠️ | Existem responsividades em telas, sem estratégia mobile formal fim a fim. |
| 19 | Segurança e LGPD completos | ⚠️ | Há base (JWT, segregação por `UserId`, export, auditoria); faltam exclusão completa self-service e controles adicionais de PRD. |
| 20 | Open Finance | ❌ | Não implementado. |
| 21 | Escalabilidade técnica por fases | ⚠️ | Há melhorias técnicas em andamento, mas sem execução formal das fases propostas (replica/redis/DW/engines). |
| 22 | Planos e monetização | ❌ | Feature gates/assinaturas/planos não implementados. |
| 23 | Estratégia de crescimento | ⚠️ | Tema de negócio/documentação, não funcionalidade implementada no sistema. |
| 24 | Projeção financeira (CAC/LTV/ARR etc.) | ⚠️ | Tema de negócio, não engine implementada no software. |
| 25 | Roadmap 36 meses | ⚠️ | Planejamento estratégico, não funcionalidade de código. |

- 2026-02-21: adicionada análise de gaps do escopo estratégico (itens 2–25).
