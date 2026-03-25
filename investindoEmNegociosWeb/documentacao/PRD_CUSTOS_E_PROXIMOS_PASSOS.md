# Custos e Go-Live

Documento de referência rápida para custo estimado, gates mínimos de produção e ordem de execução do go-live.

Este arquivo não é o backlog central do projeto.

Use:

- [../../../docs/ROADMAP.md](../../../docs/ROADMAP.md) para pendências ativas, gaps e próximos passos
- [../../../docs/PRODUCT.md](../../../docs/PRODUCT.md) para oferta, planos e decisões comerciais
- [../../../docs/BUSINESS_RULES.md](../../../docs/BUSINESS_RULES.md) para regras operacionais do sistema

## Objetivo

Responder três perguntas práticas:

- qual a faixa de custo inicial esperada
- quais gates mínimos precisam estar atendidos para produção
- em que ordem o go-live deve acontecer

## Faixa de custo

### Operação enxuta

- infraestrutura principal: `US$ 15 a US$ 40/mês`
- domínio: `US$ 10 a US$ 20/ano` ou `R$ 40 a R$ 60/ano`
- e-mail, backup e monitoramento: `US$ 0 a US$ 50+/mês`

### Operação mais robusta

- infraestrutura + banco gerenciado + observabilidade: `US$ 60 a US$ 200+/mês`

## Gates mínimos para produção

### Infraestrutura e segurança

- domínio oficial definido
- HTTPS com reverse proxy
- ambientes separados para `staging` e `production`
- segredos fora do repositório
- backup diário com teste de restore
- rollback simples e documentado
- rate limit e headers de segurança aplicados

### Qualidade mínima

#### Frontend

- `npm run build`
- fluxo comercial crítico validado
- E2E crítico verde quando a nova suíte estiver reconstruída
- monitoramento básico de erro e experiência em produção

#### Backend

- `dotnet test InvestindoEmNegociosApi/InvestindoEmNegocio.sln /p:UseAppHost=false`
- smoke dos endpoints críticos
- health checks validados no deploy
- billing e autenticação verificados em ambiente publicado

### Operação e negócio

- política de privacidade e termos prontos
- pricing inicial definido
- onboarding inicial coerente com a oferta atual
- indicadores mínimos acompanháveis:
  - ativação
  - retenção
  - conversão
  - churn
  - ticket médio

## Ordem recomendada de go-live

1. Estabilização técnica
   - fechar gaps de deploy, observabilidade, backup e rollback
2. Validação pré-produção
   - rodar smoke dos fluxos críticos
   - validar autenticação, billing e importações em ambiente publicado
3. Go-live controlado
   - liberar para grupo pequeno
   - acompanhar por alguns dias
   - só então ampliar distribuição

## Checklist executivo final

- [ ] domínio e TLS válidos
- [ ] variáveis corretas em produção
- [ ] backup e restore testados
- [ ] deploy e rollback funcionando
- [ ] logs, métricas e alertas ativos
- [ ] autenticação validada em ambiente publicado
- [ ] checkout, webhook e portal Stripe validados
- [ ] testes críticos verdes
- [ ] procedimento de incidente disponível

## Limites deste documento

Este arquivo não deve virar:

- lista longa de pendências
- roadmap de produto
- status funcional por tela
- repositório de decisões já consolidadas

Quando um item aqui virar pendência operacional concreta, ele deve ser acompanhado no [../../../docs/ROADMAP.md](../../../docs/ROADMAP.md).
