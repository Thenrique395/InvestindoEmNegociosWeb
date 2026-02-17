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
- [x] Dashboard de carteira com rentabilidade diária, mensal e acumulada.
- [x] Comparação da carteira com benchmarks (CDI, IPCA, Ibovespa, S&P500).
- [x] Alocação por classe de ativo com alerta de desbalanceamento.
- [x] Agenda de eventos: dividendos, juros, vencimentos e aportes planejados.
- [x] Registro de proventos e cálculo de retorno total (preço + renda).
- [x] Simulador de aportes recorrentes com cenários conservador/base/otimista.
- [x] Metas de patrimônio com projeção de prazo e esforço de aporte.
- [x] Importação de posição por CSV/planilha para onboarding rápido.
- [x] Relatório fiscal básico (resumo de operações e proventos por período).
- [ ] Integração direta com APIs da B3 para sincronização automática (pendente, depende de credenciais e política oficial de acesso).
