# Auditoria — Cadastro de Receitas e Despesas

Rastreio dos bugs/ajustes mapeados nas telas de cadastro (frontend + backend + regras).

**Legenda de status**
- ✅ **Feito** — implementado + testes unitários + build passando (local)
- 🧪 **Falta E2E no DEV** — código pronto, mas ainda **não validado ao vivo** no DEV
- ⬜ **A fazer**
- 🔒 **Bloqueado** — depende de decisão de produto

> ⚠️ Nada foi para PRD. Todos os itens ✅ ainda precisam de **teste E2E no DEV** antes de promover.

---

## 🔴 Crítico / Alto

| # | Item | Status |
|---|------|--------|
| 1 | **Recorrência morre após 6 meses.** Horizonte ampliado de 6 → **60 meses (5 anos)** (`PlansService.RecurringHorizonMonths`). Mitiga o "sumiço" para qualquer uso realista sem infra nova. *Recorrência verdadeiramente infinita (job mensal / projeção) fica como evolução futura, se desejado.* | ✅ / 🧪 |
| 2 | **"Salvar" com valor/nome vazio não dá feedback.** Agora mostra mensagem clara ("Informe a fonte/nome" / "Informe um valor maior que zero"). | ✅ / 🧪 |

## 🟡 Médio

| # | Item | Status |
|---|------|--------|
| 3 | **Nº de parcelas sem teto real.** Backend: teto de 480 no validator; Frontend: clamp cartão ≤ 36 e duração ≤ 120. | ✅ / 🧪 |
| 4 | **Edição de parcela sem validação consistente.** Novo `UpdateInstallmentRequestValidator` (valor > 0 e ≤ teto) → Problem Details padrão. | ✅ / 🧪 |
| 5 | **Valor gigante → 500.** Backend: teto `MoneyLimits.MaxAmount` (~1 bi, dentro de numeric(14,2)); Frontend: máscara limitada a 11 dígitos. | ✅ / 🧪 |
| 6 | **"Duração (meses)" muda o tipo do plano silenciosamente** e prometia "indefinidamente". Com o #1 (60 meses) a recorrência dura anos; copy corrigida para "Deixe em branco para repetir todo mês; ou informe por quantos meses". | ✅ / 🧪 |

## 🟢 Baixo

| # | Item | Status |
|---|------|--------|
| 7 | **Date picker (calendário) em todas as telas de cadastro** + faixa de datas (bloqueia 9999/1900). Componente `app-date-picker` reutilizável. | ✅ / 🧪 |
| 8 | **Fricção ao editar valor** — campo seleciona tudo ao focar. | ✅ / 🧪 |
| 9 | **Select de categoria** padronizado para `[ngValue]`. | ✅ / 🧪 |
| 10 | **Permissão inconsistente** — `DeleteAsync` de parcela retorna "não encontrado" em dono errado (como os outros métodos), sem vazar existência. | ✅ / 🧪 |

---

## Telas com date picker aplicado (item 7)

Receitas · Despesas · Metas · Perfil · Empréstimos (contrato + pagamento) · Detalhe do empréstimo · Investimentos (compra/venda/movimento) · Onboarding (nascimento).
(Cartões e Signup não têm campo de data real — dia-do-mês e CPF.)

## Cobertura de testes (local)

- Frontend: **536 testes** (inclui date-picker, teto de valor, feedback ao salvar) + build de produção OK.
- Backend: **639 testes** passando + build OK.

### ⚠️ Achado incidental (fora do escopo desta auditoria)
2 testes de **GoalProgressService** (`Expense_Progress_Counts_Only_Effected_In_Scope_And_Period` e `Income_Progress_Uses_Only_Received`) falham por **dependência de data** — o dado do teste é fixado em julho/2026, mas a data atual é agosto/2026 e o goal de "Limite" usa a janela do mês corrente. **Confirmado que falham também sem as mudanças desta auditoria** (via `git stash`), ou seja, é pré-existente e não regressão. Vale abrir como item separado (área de Metas).

## Próximos passos

1. **E2E no DEV** de todos os itens ✅ (principalmente o date picker: popover dentro dos modais, tema, digitação↔calendário; e a recorrência gerando 60 meses).
2. (Opcional) Recorrência **infinita** de verdade (job mensal de top-up ou projeção) — hoje são 60 meses.
3. (Separado) Corrigir os 2 testes date-dependent de Metas.
