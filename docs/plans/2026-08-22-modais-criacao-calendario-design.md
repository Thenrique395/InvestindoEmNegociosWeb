# Modais de criação no Calendário — desenho

> ✅ **CONCLUÍDO** — os cinco modais foram entregues (ver "Resultado" abaixo) e estão em uso no
> Calendário. Este arquivo é registro de desenho, não trabalho pendente.
>
> Um detalhe mudou desde então: na reestruturação `core/shared/features` (commit `68f2962`) os
> componentes saíram de `shared/` para **`features/shared/`**, por serem componentes de domínio
> reusados entre telas e não primitivos. Os caminhos citados no corpo do documento refletem o
> lugar antigo.

**Data:** 2026-08-22

## Problema

O menu "Novo evento financeiro" do Calendário apenas navega para outra rota
(`createFor('/receitas')`). Cada item deve abrir seu próprio modal, sem sair da
tela, com os mesmos campos e as mesmas regras da página correspondente.

## Estado encontrado

Os cinco formulários já existem e já são modais, mas em três formatos diferentes:

| Entidade | Formato hoje |
|---|---|
| Cartão | **Contêiner inteligente** — `[open] [card] (close) (saved)`, injeta `CardsStore`, salva sozinho |
| Receita | Painel burro (`app-receitas-form`) — 12 inputs, 9 outputs |
| Despesa | Painel burro (`app-despesas-form`) — 20 inputs, 12 outputs |
| Meta | Modal *inline* em `metas.component.html` |
| Financiamento | Modal *inline* em `loans.component.html` |

A lógica de criação (validação, máscaras, categorias, gravação) mora nas
telas-pai: 1.156 linhas em Receitas, 1.676 em Despesas. Só a gravação está em
serviço (`addIncome`, `addExpense`, `addCard`, `GoalsService.create`,
`LoansService.create`). Não existe store para receita/despesa.

## Decisão

Seguir o padrão que **já existe** no `app-cartao-form`, em vez de inventar outro:
um contêiner por entidade que carrega estado + validação + gravação, e desenha
por dentro o painel existente.

```
[open]        abre e fecha
[dataInicial] pré-preenche a data com o dia selecionado no calendário
(saved)       gravou — quem chamou recarrega
(close)       fechou sem gravar
```

O contêiner faz **apenas criação**. Edição arrasta escopo de recorrência,
comprovante e histórico, que são assunto da listagem, e fica na página.

## Restrição de segurança — onboarding

`app-receitas-form`, `app-despesas-form` e `app-cartao-form` também são usados
pelo **onboarding**, que os dirige com motor próprio (`modalIncome`,
`saveIncomeModal`, …) e em modo deliberadamente enxuto:

```
[valorSugestao]="null"  [resumoTexto]="''"  [permiteCriarCategoria]="false"
```

Essas flags são carga estrutural. Portanto:

1. O contrato dos painéis **não muda**. O contêiner novo envolve, não altera.
2. O onboarding **não é migrado** para o contêiner novo — ele ligaria justamente
   as três coisas que o onboarding desligou de propósito.

## Resultado

Todos os cinco entregues.

| Entidade | Componente | Cria | Edita | Página migrada |
|---|---|---|---|---|
| Cartão | `app-cartao-form` (já existia) | ✔ | ✔ | — |
| Receita | `app-receita-form-modal` | ✔ | — | Receitas usa no "Novo" |
| Despesa | `app-despesa-form-modal` | ✔ | — | — |
| Meta | `app-meta-form-modal` | ✔ | ✔ | Metas usa nos dois |
| Financiamento | `app-loan-form-modal` | ✔ | ✔ | Financiamentos usa nos dois |

Receita e despesa ficaram só com criação porque editar arrasta escopo de
recorrência, comprovante e histórico. Meta e financiamento não têm esses fluxos,
então o contêiner atende os dois casos via `[goal]` / `[contract]` e as páginas
deletaram o formulário inline — 
`metas.component.ts` e `loans.component.ts` perderam estado e métodos que agora
vivem num lugar só.

## Decisões tomadas durante a execução

**Modal montado sob `@if`, não sempre presente.** Renderizar os cinco
incondicionalmente construía o formulário inteiro — e as dependências dele,
incluindo `RouterLink` — no carregamento do Calendário, para nada. Dez testes do
Calendário quebraram com `No provider found for ActivatedRoute` e apontaram isso.
De quebra, fechar destrói o componente e descarta o rascunho sem precisar zerar
à mão.

**Testes que mudaram de casa, não sumiram.** `simulate`, `create` e
`chooseSystem` saíram de `loans.component.spec.ts` para
`loan-form-modal.component.spec.ts`, com comentário dizendo de onde vieram. O que
ficou na página (atualizar a lista, fechar o form ao excluir o contrato em
edição) ganhou teste novo.

**Valores de exemplo do financiamento preservados.** O formulário abre com
"Empréstimo pessoal / R$ 10.000 / 18% / 24 meses" para dar simular na hora.
Esvaziar mudaria o comportamento de quem já usa a tela.

## Fora de escopo

- Editar receita e despesa pelo Calendário
- Migrar o onboarding (ver restrição acima)
- Migrar a página de Despesas para o contêiner — ela ainda tem o motor próprio
  no caminho de criação
