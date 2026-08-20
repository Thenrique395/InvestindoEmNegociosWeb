# Despesas — cobertura de cenários

Levantamento feito a partir da própria tela (ações públicas do componente, template e
permissões), não da lista de testes existentes: o objetivo é achar o que **não** tem teste.

## Onde cada camada roda

```bash
# unitários (Karma)
cd investindoEmNegociosWeb && npx ng test --watch=false --browsers=ChromeHeadless --include='**/despesas/*.spec.ts'

# E2E com backend em memória
cd quality-tests && npx playwright test e2e/despesas-fluxos.spec.ts e2e/despesas-cenarios.spec.ts e2e/confirm-delete-visual.spec.ts --project=chromium

# E2E contra a API real, perfil Basic
cd quality-tests && RUN_LIVE_SERVER_E2E=1 APP_BASE_URL=http://35.174.50.187:4201 \
  npx playwright test e2e/live-despesas-basic.spec.ts --project=chromium
```

O backend em memória (`e2e/support/despesas-backend.ts`) responde plans, installments,
pagamentos, estornos, antecipações, comprovante e o lookup de formas de pagamento — com falha
programável por rota. Sem ele, um teste de escrita passa sem exercitar o fluxo, porque o
harness base devolve listas vazias e não persiste nada.

## Matriz

| Cenário | Onde |
|---|---|
| **Listagem e período** | |
| Lista do mês, contagem e total do período | `despesas-fluxos` · `despesas-cenarios` |
| Indicadores por situação (pendentes/antecipadas/pagas) | `despesas-cenarios` |
| Navegar mês anterior / próximo | `despesas-cenarios` |
| Ordenar por coluna | `despesas-cenarios` |
| Estado vazio com CTA | `despesas-cenarios` |
| Compra no cartão cai na competência da fatura | `live-despesas-basic` |
| **Filtros** | |
| Status | `despesas-cenarios` |
| Categoria e "Limpar filtros" | `despesas-cenarios` |
| Busca por nome | `despesas-fluxos` · `live-despesas-basic` |
| Pré-filtro por `?q=` | `despesas-cenarios` |
| Abrir formulário por `?novo=1` | `despesas-cenarios` |
| **Cadastro** | |
| À vista | `despesas-fluxos` · `live-despesas-basic` |
| Parcelada no cartão, com N parcelas geradas | `despesas-cenarios` · `live-despesas-basic` |
| Recorrente | `live-despesas-basic` |
| Validação de nome, valor e categoria | unitários · `despesas-cenarios` |
| Clamp de parcelas (36) e de meses (120) | unitários |
| Erro da API mantém o formulário aberto | `despesas-cenarios` |
| Aviso de em qual fatura a compra entrou | unitários · `live-despesas-basic` |
| **Edição** | |
| Editar valor de lançamento avulso | `live-despesas-basic` |
| Escopo em série e em recorrência | unitários |
| Cancelar o escopo reabre o formulário | unitários |
| **Baixa e pagamento** | |
| Marcar como pago em lote | `despesas-cenarios` |
| Erro da API na baixa | `despesas-cenarios` |
| Conta de baixa (Intermediate+) | `despesas-cenarios` |
| Antecipação disponível por perfil | `despesas-cenarios` |
| Antecipação recusa mês corrente | `despesas-cenarios` |
| Estorno de pagamento | `despesas-cenarios` |
| Estorno recusado em parcela não paga | `despesas-cenarios` |
| Comprovante: anexar, erro, sem arquivo, não pago | unitários |
| **Exclusão** | |
| Avulsa, com confirmação | `despesas-fluxos` · `confirm-delete-visual` · unitários |
| Despesa de cartão | `despesas-fluxos` · `live-despesas-basic` · unitários |
| Série ("todas as parcelas") | `despesas-fluxos` · `live-despesas-basic` |
| Recorrente ("somente este mês" / "encerrar") | `despesas-fluxos` · `live-despesas-basic` |
| Em lote | `despesas-cenarios` |
| Lote com série orienta a excluir uma por vez | `despesas-cenarios` |
| Erro da API preserva a linha | `despesas-fluxos` · unitários |
| **Histórico** | |
| Abrir, separar pagas de pendentes, fechar | `despesas-cenarios` |
| **Seleção** | |
| Selecionar item e selecionar todas | `despesas-cenarios` |
| **Permissões** | |
| Basic sem antecipação, conta de baixa e importar fatura | `despesas-cenarios` · `live-despesas-basic` |
| Intermediate com os três | `despesas-cenarios` |

## Aberto

| Item | Situação |
|---|---|
| Fluxo de importação de fatura (upload e conciliação) | Vive em `authenticated-cards-imports-billing-error-flows.spec.ts`, que **falha por motivo anterior a este trabalho**. A tela de Despesas só é responsável pelo botão, e esse está coberto. |
| Paginação da tabela | O `responsive-list` pagina a partir de um volume que os cenários não atingem. Cobrir exige seed grande; fica anotado. |

## Dois achados menores, sem correção

1. **`(pagar)` do `app-despesas-lista` não tem quem o dispare.** O output existe e a tela liga
   em `pagarDespesaPorId`, mas nenhum botão da linha o emite — a baixa individual só acontece
   selecionando a linha e usando "Marcar como pago". Ou falta o botão, ou sobra o output.
2. **A falha da baixa não repassa o motivo da API.** O backend responde, por exemplo,
   "Conta obrigatória."; a tela mostra sempre "Falha ao marcar pagamentos.". As outras
   operações da tela usam `extractApiErrorMessage` e mostram o detalhe.
