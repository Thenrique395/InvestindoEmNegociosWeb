# Matriz de Cobertura de Testes

> Visão objetiva da cobertura atual, com foco no que está validado, no que ainda é parcial e no que hoje representa risco real.

## Resumo atual
- Última validação consolidada: `2026-03-10`
- Backend:
  - `343` testes aprovados
  - `0` falhas na suíte completa
  - comando: `dotnet test InvestindoEmNegociosApi/InvestindoEmNegocio.sln /p:UseAppHost=false`
- Frontend unitário:
  - `103` testes aprovados
  - comando: `npm test -- --watch=false`
- Frontend E2E padrão:
  - `26` testes aprovados
  - `35` cenários live sob demanda ignorados na suíte padrão
  - comando: `npm run test:e2e`
- Frontend E2E live:
  - `26` testes aprovados e `9` ignorados quando as credenciais elevadas não estão carregadas no ambiente
  - `35` testes aprovados na rodada completa com credenciais de `Intermediate`, `Advanced` e `Admin`
  - comando base: `RUN_LIVE_SERVER_E2E=1 npm run test:e2e:live`

## Leitura rápida
- `Alta`: regra funcional validada em mais de uma camada, com boa evidência de persistência.
- `Média`: cobertura relevante, mas ainda falta uma camada crítica ou casos de borda.
- `Baixa`: cobertura insuficiente para o risco do fluxo.

## Cobertura por área crítica

| Área | Backend | Front unit/smoke | E2E | Cobertura | Gap principal |
|---|---|---|---|---|---|
| Acesso / auth / refresh / recovery | Alta | Alta | Alta | Alta | Falta only ampliar sessão expirada em mais rotas críticas. |
| Onboarding / perfil inicial | Alta | Alta | Alta (`live-core`) | Alta | Falta cenário visual mobile dedicado. |
| Dashboard / SDR / risco / insights / recomendações | Alta | Média/Alta | Alta (`authenticated-shell`, `live-core`) | Alta | Falta massa de dados mais densa para mês completo. |
| Despesas / parcelas / pagamento / antecipação | Alta | Média | Alta (`live-writeflows`) | Alta | Faltam mais casos de exceção visual/lote. |
| Receitas / summary / recorrência | Alta | Alta | Alta (`live-writeflows`, `live-access`) | Alta | Falta E2E visual mensal mais profundo. |
| Cartões / CRUD / fatura por competência | Alta | Média | Alta (`authenticated-shell`, `live-core`) | Alta | Falta ampliar erro/remoção com persistência confirmada por API. |
| Metas | Alta | Média | Alta (`live-core`) | Alta | Faltam mais cenários de edição/filtros/status. |
| Calendário | Média | Média | Alta por acesso/perfil | Média | Falta E2E funcional do conteúdo do calendário com massa real. |
| Contas / extrato / transferência | Alta | Média | Alta (`authenticated-shell`, `authenticated-writeflows`, `error-flows`) | Alta | Falta concorrência/duplo clique/rollback visual. |
| Importação OFX / CSV | Alta | Média | Alta (mockado no E2E padrão) | Alta | Falta fixture maior e mais diversidade de extratos. |
| Importação de fatura | Alta | Média | Alta (`live-role-writeflows`) | Alta | Falta ampliar massa de fixture e cenários de erro operacional. |
| Categorização / score / aprendizado | Alta | Média | Alta indireta via importações | Alta | Falta benchmark automatizado com massa histórica grande. |
| Recurrence Detector | Média | Média | Alta indireta via importações | Média | Falta suíte maior de falsos positivos/negativos. |
| Wealth / patrimônio / dívidas / evolução | Alta | Média | Média (`authenticated-shell`, `live-role-profiles`) | Média | Falta E2E dedicado da Home patrimonial com composição mais rica. |
| Preferências / LGPD / exportação / exclusão | Alta | Média | Alta (`live-profile`) | Alta | Falta ampliar cenários de falha operacional. |
| Controle de acesso por perfil | Alta | Alta | Alta (`role-regression`, `live-role-profiles`) | Alta | Falta expandir para mais endpoints e overrides específicos. |

## Falhas abertas hoje

- Nenhuma falha aberta na última rodada consolidada das suítes principais.

## Estado atual da suíte live

Resumo da rodada mais recente:
- `26 passed`, `9 skipped (13.8m)` sem credenciais elevadas carregadas
- `35 passed (16.2m)` na rodada completa com credenciais elevadas configuradas
- sem mocks de API/sessão
- incluindo perfis `Basic`, `Intermediate`, `Advanced` e `Admin`
- incluindo escrita real, LGPD, cartões, metas, importação de fatura e fluxos administrativos

## Comandos de validação

### Backend
```bash
cd InvestindoEmNegociosApi
dotnet test InvestindoEmNegociosApi/InvestindoEmNegocio.sln /p:UseAppHost=false
```

### Frontend unitário
```bash
cd InvestindoEmNegociosWeb/investindoEmNegociosWeb
npm test -- --watch=false
```

### Frontend E2E padrão
```bash
cd InvestindoEmNegociosWeb/investindoEmNegociosWeb
npm run test:e2e
```

### Frontend E2E live
```bash
cd InvestindoEmNegociosWeb/investindoEmNegociosWeb
RUN_LIVE_SERVER_E2E=1 npm run test:e2e:live
```

Para executar a suíte completa de perfis elevados, carregar também as credenciais live de `Intermediate`, `Advanced` e `Admin`.

## Próximas melhorias prioritárias
1. Atualizar a suíte de remoção de cartão para o mesmo padrão rigoroso de persistência usado em criação/edição.
2. Criar E2E visual dedicado para `onboarding` mobile.
3. Criar E2E patrimonial da `Home` com massa realista e mais composição de ativos/passivos.
4. Expandir os cenários reais de erro para `importação de fatura` e `cartões`.
