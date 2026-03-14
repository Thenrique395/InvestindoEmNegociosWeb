# Cenários de Teste

Pasta de cenários funcionais complementares aos testes automatizados.

## Arquivos atuais

- `1.10_insight-automatico-financeiro.md`
- `1.11_configuracoes-preferencias-lgpd.md`
- `1.2_carry-over-day-competencia.md`
- `1.2_intelligence-mode-b-c.md`
- `1.4_importacao-automatica-fatura.md`
- `2.2_competencia-cartao-closing-day.md`
- `4.3_fatura-por-competencia.md`
- `5.1_tipos-transacao-transferencia.md`

## Quando criar um novo cenário

- quando a feature tem regra de negócio relevante e não cabe só no teste automatizado
- quando a validação manual ou exploratória ainda é importante
- quando o fluxo envolve múltiplos estados, perfis ou integrações

## Convenção de nome

- padrão: `XX.Y_nome-da-feature.md`
- sempre alinhado ao item correspondente de `STATUS_FUNCIONALIDADES.md`

## Estrutura mínima

```md
# XX.Y - Nome da feature

## Objetivo

## Pré-condições

## Cenários principais

## Cenários de exceção

## Regressão

## Critérios de aceite
```

## Regra de manutenção

- atualizar o cenário quando a regra funcional mudar
- não usar esta pasta para checklist solto ou backlog
- quando a cobertura automatizada eliminar a necessidade do cenário manual, simplificar o arquivo em vez de duplicar validação
