# PRD Operacional: Custos e Go-Live

Documento curto para decisão de produção, com foco em custo, pré-requisitos e ordem de execução.

## Faixa de custo

### MVP econômico

- Infra principal: `US$ 15 a US$ 40/mês`
- Domínio: `US$ 10 a US$ 20/ano` ou `R$ 40 a R$ 60/ano`
- E-mail, backup e monitoramento: `US$ 0 a US$ 50+/mês`

### Produção mais robusta

- Infra + banco gerenciado + observabilidade: `US$ 60 a US$ 200+/mês`

## Pré-requisitos técnicos

- domínio oficial definido
- HTTPS com reverse proxy
- ambientes separados para `staging` e `production`
- pipeline de deploy com rollback simples
- backup diário com teste de restore
- segredos fora do repositório
- rate limit e headers de segurança aplicados

## Pré-requisitos de qualidade

### Frontend

- `npm run quality:frontend`
- E2E crítico verde
- monitoramento de Web Vitals ou equivalente

### Backend

- `dotnet test InvestindoEmNegociosApi/InvestindoEmNegocio.sln /p:UseAppHost=false`
- smoke dos endpoints críticos
- baseline de carga dos fluxos mais sensíveis
- health checks validados no deploy

## Pré-requisitos de negócio

- ICP e proposta de valor definidos
- política de privacidade e termos prontos
- pricing inicial definido
- onboarding e ativação dos primeiros 7 dias desenhados
- indicadores mínimos definidos:
  - ativação
  - retenção
  - conversão
  - churn
  - ticket médio

## Ordem recomendada

1. Estabilização técnica
   - fechar gaps de performance, backup, observabilidade e rollback
2. Pré-produção
   - rodar smoke, carga básica e simular incidente simples
3. Go-live controlado
   - liberar para grupo pequeno, medir por alguns dias e só então escalar

## Checklist final

- [ ] domínio e TLS válidos
- [ ] variáveis corretas em produção
- [ ] backup e restore testados
- [ ] deploy e rollback funcionando
- [ ] logs, métricas e alertas ativos
- [ ] testes críticos verdes
- [ ] documento de incidente e operação disponível
