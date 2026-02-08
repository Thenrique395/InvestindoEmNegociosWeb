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

