# Prioridades de Novas Features

## Prioridade 1 - Fluxo financeiro core
- Recorrência de receitas e despesas.
- Lembretes reais (push/WhatsApp).
- Conciliação simples de cartões e faturas.
- Calendário financeiro mensal com compromissos e vencimentos.
- Regra de alertas por faixa de valor (alto impacto no orçamento).

## Prioridade 2 - Automação útil
- Regras automáticas por categoria (reagendar, alertar, marcar status).
- Sugestões de orçamento mensal.
- Categorização inteligente por histórico de lançamentos.
- Projeção de fechamento do mês com base no comportamento atual.

## Prioridade 3 - Retenção
- Metas com "próxima ação" clara.
- Streak de saúde financeira.
- Resumo semanal automático.
- Relatório mensal consolidado (PDF) com evolução e principais desvios.
- Checklist de rotina financeira (semanal/mensal).

## Prioridade 4 - Dados e confiança
- Import/export robusto.
- Detecção de duplicados.
- Trilha de alterações por item.
- Backup automático opcional com histórico de versões.
- Centro de auditoria com filtros por período e ação.

## Prioridade 5 - Monetização
- Travas por plano no front e API.
- Tela de upgrade contextual.
- Comparação dinâmica de benefícios por perfil.
- Trial guiado com metas de ativação por plano.
- Upsell contextual para recursos de investimentos e automações.

## Prioridade 6 - Qualidade técnica
- Reduzir bundle inicial.
- Testes E2E dos fluxos críticos (login, importação, despesas, metas).
- Observabilidade de erro no front.
- Monitoramento de performance por tela (Core Web Vitals).
- Testes de carga nos endpoints críticos (faturas, dashboard, investimentos).
- Backend: endpoint de posições com modo leve (`withMarket=false`) para reduzir p95.
- Backend: análise de queries críticas com `EXPLAIN ANALYZE` + índices por uso real.
- Backend: export/import de portabilidade em job assíncrono com status.
- Backend: rate limit e timeout/circuit breaker para rotas e integrações críticas.
- Backend: OpenTelemetry com dashboard p50/p95/p99 por endpoint e alertas.
- Frontend: virtualização de tabelas longas (movimentos, proventos, lançamentos).
- Frontend: cancelar requests ao trocar aba/filtro e padronizar loading/skeleton.
- Frontend: gate de performance no CI (Lighthouse + budget de bundle com fail automático).

## Melhorias técnicas (limpeza e padrão de mercado)
- Remover componente órfão `LandingComponent` sem rota ativa.
- Limpar CSS legado no `app.component.scss` (blocos antigos de hero/painel não utilizados).
- Adicionar `trackBy` em listas com `*ngFor` para reduzir re-render desnecessário.
- Corrigir links placeholder (`href="#"`) para rotas reais ou botões sem navegação.
- Revisar `AppComponent` e separar responsabilidades em serviços/componentes menores (shell, notificações, menu de usuário, tema).
- Evitar `refresh()` global em toda navegação logada; aplicar cache/revalidação por feature.
- Migrar rotas para lazy loading (`loadComponent`) para reduzir bundle inicial.
- Definir estratégia de budgets por feature e otimização de assets, evitando apenas elevar limite.

## Prioridade 7 - Investimentos (núcleo de expansão)
Concluído:
- Dashboard de carteira com rentabilidade diária, mensal e acumulada.
- Comparação da carteira com benchmarks (CDI, IPCA, Ibovespa, S&P500).
- Alocação por classe de ativo com alerta de desbalanceamento.
- Agenda de eventos: dividendos, juros, vencimentos e aportes planejados.
- Registro de proventos e cálculo de retorno total (preço + renda).
- Simulador de aportes recorrentes com cenários conservador/base/otimista.
- Metas de patrimônio com projeção de prazo e esforço de aporte.
- Importação de posição por CSV/planilha para onboarding rápido.
- Relatório fiscal básico (resumo de operações e proventos por período).

Pendente:
- Integração direta com APIs da B3 para sincronização automática (depende de credenciais e política oficial de acesso).


# Futuras Features (Frontend)

Este documento lista ideias e pendências discutidas para implementar no futuro.

## Despesas: “Antecipada e Paga”
Objetivo: indicar que uma despesa foi antecipada **e** depois paga, sem duplicar badges.

Proposta:
- Criar um status novo no backend: `ANTICIPATED_PAID`.
- Fluxo:
  - Ao antecipar: `OPEN` → `ANTICIPATED`.
  - Ao pagar:
    - se estava `ANTICIPATED` → `ANTICIPATED_PAID`.
    - se estava `OPEN` → `PAID`.
- No front:
  - Exibir **um** badge: “Antecipada (paga)” com cor própria.
  - Filtros:
    - “Pagas” deve incluir `PAID` e `ANTICIPATED_PAID`.
    - “Antecipadas” deve incluir `ANTICIPATED` e `ANTICIPATED_PAID`.
  - Relatórios/análises:
    - Contabilizar antecipações com `ANTICIPATED` + `ANTICIPATED_PAID`.

## Métricas de antecipação (ano/mês)
Objetivo: relatório de impacto de antecipações.

Ideias:
- Contar quantas parcelas foram antecipadas por período.
- Somar valor total antecipado por período.
- Comparar “economia de juros” (se houver campo de juros/desconto).

## Histórico de antecipações
Objetivo: saber quando a antecipação ocorreu.

Proposta:
- Armazenar `anticipationDate` na despesa/parcela.
- Mostrar no histórico detalhado.
