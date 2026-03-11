# Documentação do Frontend

Este diretório concentra a documentação funcional e operacional do produto web.

## Fonte de verdade

- Status do produto: [STATUS_FUNCIONALIDADES.md](./STATUS_FUNCIONALIDADES.md)
- Cobertura de testes: [MATRIZ_COBERTURA_TESTES.md](./MATRIZ_COBERTURA_TESTES.md)
- Auditoria da suíte live: [AUDITORIA_TESTES_LIVE.md](./AUDITORIA_TESTES_LIVE.md)
- Arquitetura e visão geral das aplicações: [DOCUMENTACAO_APLICACOES.md](./DOCUMENTACAO_APLICACOES.md)
- Design system e padrões visuais: [systemDesigner.md](./systemDesigner.md)

## Planejamento e produto

- Backlog futuro priorizado: [FEATURE_PRIORIDADES.md](./FEATURE_PRIORIDADES.md)
- Custos e plano de go-live: [PRD_CUSTOS_E_PROXIMOS_PASSOS.md](./PRD_CUSTOS_E_PROXIMOS_PASSOS.md)

## Cenários de teste

- Índice dos cenários manuais e de regressão: [Cenarios de teste/README.md](./Cenarios%20de%20teste/README.md)

## Documentação externa relacionada

- Padrões oficiais de backend: [../../../InvestindoEmNegociosApi/docs/BACKEND_PADROES_IMPLEMENTACAO.md](../../../InvestindoEmNegociosApi/docs/BACKEND_PADROES_IMPLEMENTACAO.md)
- Matriz de autorização da API: [../../../InvestindoEmNegociosApi/docs/AUTHORIZATION_MATRIX.md](../../../InvestindoEmNegociosApi/docs/AUTHORIZATION_MATRIX.md)
- Plano de cobertura de testes do backend: [../../../InvestindoEmNegociosApi/docs/PLANO_COBERTURA_TESTES_BACKEND.md](../../../InvestindoEmNegociosApi/docs/PLANO_COBERTURA_TESTES_BACKEND.md)

## Regra de manutenção

- Não duplicar contratos ou padrões do backend neste diretório.
- Quando um item sair do backlog e virar entrega, atualizar primeiro `STATUS_FUNCIONALIDADES.md`.
- Quando um teste mudar o nível de confiança do produto, atualizar `MATRIZ_COBERTURA_TESTES.md` e, se for live, `AUDITORIA_TESTES_LIVE.md`.
