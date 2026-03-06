# Status de Funcionalidades

> Controle contínuo do que já existe, do que está parcial e do que ainda não foi implementado, organizado por tela/módulo.

## Legenda
- `✅ Implementado`
- `⚠️ Parcial`
- `❌ Não implementado`

## 1. Mapa por Tela / Funcionalidade

### 1.1 Tela de Acesso (Login, Cadastro, Recuperação)

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Cadastro com email e senha | ✅ | `POST /api/v1/auth/register` | Fluxo ativo no backend e tela de cadastro no frontend. |
| Login JWT + Refresh Token | ✅ | `POST /api/v1/auth/login` + `POST /api/v1/auth/refresh` | Refresh token com rotação e revogação. |
| Hash seguro de senha | ✅ | `AuthService` usando BCrypt | Work factor 12. |
| Recuperação de senha | ✅ | `POST /api/v1/auth/forgot-password` + `POST /api/v1/auth/reset-password` | Fluxo implementado; envio real depende de SMTP configurado. |
| Logout seguro | ✅ | `POST /api/v1/auth/logout` | Revoga refresh token persistido. |

### 1.2 Tela de Onboarding / Perfil

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Objetivo inicial do onboarding (persistência e uso) | ✅ | `FinancialGoal` em `user_profiles` + `ProfileService.Upsert` + dashboard | Objetivo selecionado é salvo e usado no Insight automático. |
| IntelligenceMode (B ou C) | ✅ | `user_profiles.IntelligenceMode` + `ProfileService` + onboarding/user-profile no frontend | Persistência e edição disponíveis em perfil/onboarding com validação de domínio e API (`B` ou `C`). |
| CarryOverDay (competência configurável) | ✅ | `user_profiles.CarryOverDay` + DTO/validator + onboarding/user-profile + `NotificationsService` | Configurável por usuário (1..31), persistido na API e aplicado no insight automático para janela de competência. |

### 1.3 Tela de Dashboard (Home)

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Insight automático financeiro | ⚠️ | Home + `NotificationsService`/robôs | Base funcional ativa; evoluir motor de decisão e priorização de recomendações. |
| Saldo atual por transações | ✅ | Ledger `accounts`/`account_transactions` + fluxo `payments/reversals` | Fluxo principal validado; evolução futura: transferência entre contas e UX multi-conta. |
| Total de dívida em cartões | ✅ | `GET /api/v1/cards/debt/total` | Já exposto na API e consumido no dashboard. |

### 1.4 Tela de Despesas

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| CRUD de planos de despesa | ✅ | `GET/POST/PUT/DELETE /api/v1/plans` | Gera parcelas conforme configuração do plano. |
| Gestão de parcelas (listar/pagar/antecipar/excluir) | ✅ | `/api/v1/installments` + `/payments` + `/anticipations` | Cobertura principal da operação financeira. |
| Parcelamento automático | ✅ | Motor de planos/parcelas | Implementado. |
| Competência de cartão por closing day | ✅ | `CardStatementCycleCalculator` + testes + front com `Fatura MM/AAAA` | Validado tecnicamente e com checklist manual documentado. |
| Fatura por competência (engine consolidada de ciclo) | ⚠️ | Campos de competência ativos em parcelas | Há base funcional; falta motor explícito de consolidação de ciclo separado de conta. |
| Importação automática de fatura/cartão + conciliação | ⚠️ | `InvoiceImportController` + tela frontend | Evoluir como pacote único (importação multi-formato + conciliação + deduplicação + fechamento). |

### 1.5 Tela de Receitas

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| CRUD de planos de receita | ✅ | `GET/POST/PUT/DELETE /api/v1/plans` | Compartilha engine de planos com despesas. |
| Resumo de receitas por mês | ✅ | `GET /api/v1/receitas/summary` | Consumido no frontend da tela de receitas. |

### 1.6 Tela de Cartões

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| CRUD de cartões (limite/fechamento/vencimento) | ✅ | `GET/POST/PUT/DELETE /api/v1/cards` | Fluxo completo disponível no frontend. |
| Compras no cartão + compromissos futuros (via despesas) | ✅ | Planos/parcelas com vínculo de cartão | Fluxo implementado por planos/parcelas/pagamentos. |

### 1.7 Tela de Metas

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| CRUD de metas financeiras | ✅ | `GET/POST/PUT/DELETE /api/v1/goals` | Fluxo completo implementado. |
| Meta de receita anual | ✅ | `GET/PUT /api/v1/goals/income` | Funcionalidade separada das metas gerais. |
| Contribuições para metas | ✅ | `GET/POST /api/v1/goals/{goalId}/contributions` | Lançamentos de evolução disponíveis. |
| Alertas automáticos por progresso | ⚠️ | Notificações em `/api/v1/notifications` | Regras específicas de metas ainda dependem da geração atual. |

### 1.8 Tela de Calendário

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Calendário financeiro mensal | ✅ | Rota `/calendario` + `calendario.component.spec.ts` | Receitas, despesas e vencimentos de cartão com filtros e resumo mensal implementados. |

### 1.9 Tela de Investimentos

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Objetivo de investimentos | ✅ | `GET/PUT /api/v1/investments/goal` | Persistido por usuário. |
| Alocação alvo de carteira | ✅ | `GET/PUT /api/v1/investments/allocation-target` | Implementado com façade. |
| CRUD de posições | ✅ | `GET/POST/PUT/DELETE /api/v1/investments/positions` | Inclui listagem e item por id. |
| Movimentações (compra/venda etc.) | ✅ | `POST /api/v1/investments/positions/{id}/movements` | Disponível no backend e tela. |
| Dados de mercado (cotação/perfil/histórico) | ✅ | `/api/v1/investments/market/*` | Com resiliência HTTP. |
| Benchmarks | ✅ | `GET /api/v1/investments/benchmarks` | Comparativos disponíveis. |
| Importação B3 (PDF + confirmação) | ✅ | `/api/v1/investments/import/b3/*` | Fluxo de extração e confirmação implementado. |
| Sync B3 via consentimento | ⚠️ | `/api/v1/investments/b3/consent` e `/b3/sync` | Existe fluxo mock + sync; validar integração real fim a fim. |

### 1.10 Tela de Notificações

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Listar notificações do usuário | ✅ | `GET /api/v1/notifications` | Com filtro de não lidas. |
| Marcar notificação como lida | ✅ | `POST /api/v1/notifications/{id}/read` | Fluxo básico completo. |
| Geração de notificações | ✅ | `POST /api/v1/notifications/generate` + `RoboLembretes` | Geração sob demanda e execução automática diária. |
| Preferências de notificação (in-app/email) | ⚠️ | `PUT /api/v1/preferences` | Personalização ainda básica (sem granularidade por tipo). |
| Envio de e-mail real | ⚠️ | Preferência existe | Falta consolidar provedor transacional em produção. |

### 1.11 Tela de Configurações / Dados do Usuário

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Preferências de notificação | ⚠️ | `GET/PUT /api/v1/preferences` | Existe in-app/email; personalização ainda básica. |
| Exclusão de conta (LGPD self-service) | ❌ | Não há endpoint self-service | Falta fluxo de exclusão/anonimização para o próprio usuário. |

### 1.12 Área Administrativa

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Gestão de usuários (admin) | ✅ | `AdminUsersController` | Inclui atualização e remoção sob regras administrativas. |
| Gestão de categorias padrão (admin) | ✅ | `AdminCategoriesController` | Catálogo administrável. |
| Gestão de parâmetros (instituições, bandeiras, meios de pagamento e agendamento de robôs) | ✅ | `AdminParametersController` | Inclui configuração de horário de execução automática dos robôs via painel admin. |
| Monitoramento e execução de robôs (admin) | ✅ | `GET/POST /api/v1/admin/robots/*` + rota `/admin/robots` | Painel com histórico, detalhe de execução, cooldown/force e auditoria de disparo. |
| Controle de acesso por perfil | ⚠️ | Roles presentes em auth/JWT | Revisar matriz de autorização por endpoint (policies por feature). |

### 1.13 Tela de Portabilidade de Dados

| Funcionalidade | Status | Evidência atual | Observação |
|---|---|---|---|
| Exportar dados do usuário (JSON) | ✅ | `GET /api/v1/dataportability/export` | Endpoint pronto e usado em testes de carga. |
| Importar dados do usuário | ✅ | `POST /api/v1/dataportability/import` | Suporta substituição de dados existentes. |
| Validação de integridade na importação | ⚠️ | `DataPortabilityService` com validações | Cobertura boa; manter testes para casos extremos. |
| Fluxo LGPD completo (download + exclusão/anonimização) | ⚠️ | Export/import implementados | Exclusão self-service ainda pendente. |

---

## 2. Backlog priorizado (organizado por foco e tela)

| Prioridade | Foco | Telas/módulos impactados | Entregas planejadas |
|---|---|---|---|
| P1 | Fluxo financeiro core | `Despesas`, `Receitas`, `Cartões`, `Calendário`, `Notificações` | Recorrência de receitas/despesas; lembretes reais (push/WhatsApp); importação + conciliação de faturas (pacote único); alertas por faixa de valor. |
| P2 | Automação útil | `Despesas`, `Receitas`, `Dashboard` | Regras automáticas por categoria; sugestão de orçamento mensal; categorização inteligente por histórico; projeção de fechamento do mês. |
| P3 | Retenção | `Metas`, `Dashboard`, `Notificações` | Metas com próxima ação; streak de saúde financeira; resumo semanal automático; relatório mensal em PDF; checklist de rotina financeira. |
| P4 | Dados e confiança | `Portabilidade`, `Admin`, serviços de dados | Import/export robusto; detecção de duplicados; trilha de alterações por item; backup opcional com versões; centro de auditoria. |
| P5 | Monetização | `Onboarding`, `Configurações`, guards/policies de acesso | Planos Free/Pro com feature gates no front e API; tela de upgrade contextual; comparação de benefícios por perfil; trial guiado; upsell de automações/investimentos. |
| P6 | Qualidade técnica | Frontend + Backend (cross) | Reduzir bundle inicial; E2E de fluxos críticos; observabilidade de erro + Core Web Vitals; testes de carga; otimizações de query e processamento assíncrono. |
| P7 | Investimentos (expansão) | `Investimentos` | Integração direta com APIs da B3 para sincronização automática (pendente de credenciais/política). |

### 2.1 Sequência recomendada de execução
1. P1
2. P5
3. P2
4. P3
5. P4
6. P6
7. P7

---

## 3. Atualizações
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
- 2026-03-06: item `3.2 Saldo atual por transações` marcado como concluído após validação funcional do fluxo principal.
- 2026-03-06: item `2.2 Competência de cartão por closing day` marcado como concluído após validação automatizada (`CardStatementCycleCalculatorTests` + `PlansServiceTests`) e checklist manual documentado em `documentacao/Cenarios de teste/2.2_competencia-cartao-closing-day.md`.
- 2026-03-06: item `1.2 IntelligenceMode (B ou C)` implementado com persistência em `user_profiles`, validação (`B|C`) e cobertura em onboarding/perfil no frontend.
- 2026-03-06: item `1.2 CarryOverDay` implementado com persistência (`user_profiles`), validação (`1..31`), edição em onboarding/perfil e aplicação na competência do insight automático.

## 4. Gap Analysis (escopo estratégico 2–25)

| Item | Tema | Status | Observação resumida |
|---|---|---|---|
| 2.1 | CarryOverDay | ✅ | Configuração por usuário disponível em perfil/onboarding e regra de competência aplicada no insight automático. |
| 2.2 | Competência de cartão por closing day | ✅ | Cálculo por fechamento/vencimento operacional no backend, campos de competência propagados para o frontend e testes automatizados cobrindo cenários de borda. Manter regressão manual conforme playbook de cenários. |
| 3.1 | Gestão de contas (corrente/poupança/digital/carteira) | ✅ | Implementado com CRUD, extrato por conta e saldo consolidado em `accounts`/`account_transactions`. |
| 3.2 | Saldo atual por transações | ✅ | Ledger operacional ativo (pagamento/recebimento + estorno explícito + limpeza em delete + backfill histórico) e fluxo principal validado. Evoluções futuras: transferência entre contas e UX avançada multi-conta. |
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
