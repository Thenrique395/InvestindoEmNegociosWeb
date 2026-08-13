# Telas — especificação

Cada seção descreve a tela, seu conteúdo real e o arquivo Angular que ela substitui. Rótulos entre aspas são literais e vêm do código atual — não reescrever.

Todas as telas compartilham shell, page header e os componentes de `COMPONENTES.md`.

---

## 1. Dashboard

**Arquivo-alvo**: `app/dashboard/` · **Protótipo**: `Protótipo - Dashboard.dc.html`

O comportamento por perfil está em `PERFIS_E_PERMISSOES.md`. Aqui, os blocos:

**Cabeçalho** — eyebrow "Visão geral · <mês> de <ano>", título "Bom dia, <nome>" (varia por hora), linha de contexto ("Mês positivo até aqui. Três contas vencem nos próximos 7 dias."), segmented Mês/Trimestre/Ano à direita.

**Faixa de KPIs** — faixa unida com divisores, `grid-template-columns` fixo por perfil (3 ou 5 colunas). A primeira célula tem gradiente sutil `linear-gradient(180deg, rgba(0,46,62,.04), transparent)` e `border-radius:16px 0 0 16px`. Valor em `clamp(21px, 2.4vw, 34px)` na primeira célula, `clamp(17px, 1.7vw, 24px)` nas demais. Cada rótulo tem tooltip.

Rótulos e tooltips:
- **Saldo do período** / "Quanto sobrou até hoje" — Essencial
- **Saldo disponível** — demais perfis
- **Patrimônio líquido** — "Tudo que você tem menos tudo que você deve."
- **Receitas** — "Tudo que entrou no período escolhido: salário, freelance, reembolsos."
- **Despesas** — "Tudo que saiu ou ainda vai sair no período, pago ou em aberto."
- **Comprometido** — "Cartões, parcelas e contas com vencimento futuro."

**Saúde financeira** (só Completo) — índice de 0 a 100 com os fatores que o compõem em barras.

**Evolução** — gráfico de linha ou barras de 6 (Inteligente) ou 12 meses (Completo), receita × despesa. Substituído pelo bloco de "histórico começando" quando há menos de dois meses de dados.

**Precisa da sua atenção** — lista de pendências: contas atrasadas, orçamento estourado, meta fora do ritmo. Cada item com ação direta.

**Orçamento do mês** — as categorias com uso, cor por limiar e o estouro em destaque.

**Metas** — cards com ritmo e quanto falta por mês.

**Recorrências do mês** — grade compacta de assinaturas, contas fixas e parcelas, com cor da categoria, dia de recorrência e valor. Rodapé com total fixo de saídas, peso na renda e contagem.

**Investimentos** (Completo) — patrimônio, variação no ano, proventos, e as posições principais em 2×2.

**Atividades recentes** — últimos lançamentos.

**Insights** — texto contextual, com estilo conservador / moderado / arrojado.

---

## 2. Calendário

**Arquivo-alvo**: `app/calendario/` · **Protótipo**: `Protótipo - Calendário.dc.html`
**Modelo**: `calendar-agenda.model.ts`

Título "Calendário Financeiro", descrição "Visualize todos os seus compromissos financeiros em um único lugar." Ações: "Hoje" e "Novo evento financeiro".

**Cinco KPIs** em faixa unida: Receitas previstas · Despesas previstas · Saldo previsto · Compromissos (com "Vencimentos no mês: N") · Pendências.

**Quatro visões** em segmented: **Mês** (grade), **Semana**, **Agenda**, **Linha do tempo**.

**Filtro por grupo** em segmented compacto: Todos · Receitas · Despesas · Cartões · Financiamentos · Metas. Recalcula os KPIs e a grade.

**Legenda** com tooltip por tipo de evento:
- Receitas — "Entradas previstas: salário, freelance, reembolsos e outras receitas."
- Despesas — "Contas e despesas com vencimento no período."
- Fechamento de fatura — "Dia em que a fatura do cartão fecha."
- Vencimento de fatura — "Dia em que a fatura do cartão precisa ser paga."
- Financiamentos — "Parcelas de financiamentos e empréstimos ativos."
- Metas — "Prazo-alvo das suas metas financeiras."

**Grade do mês** — 7 colunas, células de `min-height:84px`, `border-radius:10px`, `gap:6px`. Cada célula: número do dia, pontos coloridos por tipo de evento presente (6px, deduplicados), e o saldo do dia no rodapé em 10px/600 colorido por sinal.
- hoje: `border-color:#9FB2BB`, número em peso 700
- selecionado: `border-color:#2563EB`, `background:rgba(37,99,235,.07)`, número `#1D4ED8`
- fora do mês: `background:#FBFCFD`, número `#C3D2DA`

Clicar no dia abre abaixo a lista de compromissos daquele dia, com barra de cor de 4px à esquerda, título, metadados, badge de status, valor e botão "Dar baixa" nos previstos e atrasados.

**Visões Semana / Agenda / Linha do tempo** — mesma lista, agrupada: semana em um bloco; agenda em duas quinzenas; linha do tempo em Hoje / Amanhã / Esta semana / Ainda em <mês>. Cada grupo tem cabeçalho com o saldo do período.

**Coluna direita**: "Resumo de hoje" com contagem por tipo · "Próximos 7 dias" · "Pendências" (card de severidade crítica, com dias de atraso).

**Status**: Previsto (neutro) · Pago / Recebido (verde) · Atrasado (vermelho).

---

## 3. Despesas e 4. Receitas

**Arquivos-alvo**: `app/despesas/`, `app/receitas/`, `app/shared/responsive-list`
**Protótipo**: `Protótipo - Despesas e Receitas.dc.html` (as duas telas no mesmo arquivo — na implementação são componentes separados compartilhando a lista responsiva)

**Três cards de resumo**, com os textos exatos do código:

Despesas:
- "Pendentes" / "Contas abertas para o período atual." / tooltip: "Total de despesas pendentes do mês: contas abertas com vencimento no período que ainda não foram pagas."
- "Antecipadas" / "Pagamentos feitos antes do vencimento." / tooltip: "Total de despesas antecipadas no mês: parcelas pagas antes do vencimento que ainda pertencem ao período."
- "Pagas" / "Saídas já liquidadas neste período."

Receitas:
- "Recebidas" / "Entradas já confirmadas neste período."
- "Pendentes" / "Valores previstos que ainda não entraram."
- "Comparativo" / "Como este mês está ficando frente ao anterior."

**Hero de período** — grade `minmax(0,1fr) 340px`. À esquerda: eyebrow, navegação de mês com setas ao lado do título, descrição, e a pílula de comparação com o mês anterior. **A polaridade importa**: queda de despesa é verde com seta para baixo; alta de receita é verde com seta para cima. À direita, card de total do período com as ações "Importar fatura" (só despesas) e "Adicionar despesa/receita".

**Barra de ações em lote** — aparece com seleção. Contagem, seletor de conta de baixa/crédito, e as ações: "Marcar como paga/recebida", "Solicitar antecipação" / "Duplicar", "Excluir", "Limpar".

**Filtros integrados** — Status (dropdown) · Categoria (dropdown) · Busca · chips de status rápido.

**Tabela** — colunas:
- Despesas: Nome · Categoria · Pagamento · Status · Venc. · Valor · Ações
- Receitas: Fonte · Categoria · Tipo · Status · Receb. · Valor · Ações

`grid-template-columns: 28px minmax(180px,2.1fr) minmax(110px,1fr) minmax(120px,1.15fr) 126px 66px 112px 100px`, dentro de scroller com `min-width:1010px`.

**Status de despesa** (do enum real): Em aberto · Parcialmente paga · Paga · Antecipada · Atrasada · Cancelada.
**Status de receita**: Recebida · Pendente · Em atraso.

**Modal de cadastro** — descrição, valor, vencimento, categoria (dropdown), forma de pagamento (dropdown: Cartão de crédito · Débito em conta · Boleto · Pix · Dinheiro), campo de cartão que aparece só quando a forma é cartão, e o bloco "Parcelar ou repetir" / "Receita recorrente" com stepper de parcelas e o valor de cada uma calculado.

**Regra de parcelado** — ao editar ou dar baixa em um lançamento parcelado, o sistema **pergunta se a ação vale só para esta parcela ou para todas as seguintes**. Modal de escolha antes de aplicar.

**Importar fatura** — upload de PDF, leitura, e a lista de compras identificadas com categoria sugerida por compra, editável antes de confirmar.

**Mobile** — a tabela vira lista de cards; o total do mês vai para o header navy; filtros como chips roláveis.

---

## 5. Cartões

**Arquivo-alvo**: `app/cartoes/`, `app/invoice-import/` · **Protótipo**: `Protótipo - Cartões.dc.html`

**Quatro KPIs**: total em aberto · próxima fatura · limite usado · faturas do período.

**Card visual do cartão** — retângulo com gradiente navy (`linear-gradient(135deg,#002E3E,#0A4A5C)`), bandeira, últimos quatro dígitos em `letter-spacing:.14em`, e abaixo a barra de limite usado com o valor e o teto.

**Faturas** — lista por mês com status (aberta, fechada, paga) e valor.

**Configuração do cartão** — dia de fechamento e dia de vencimento em steppers **digitáveis** (1–31), ano digitável, e o cálculo do **melhor dia de compra** atualizando ao vivo.

**Importação de fatura** — mesmo fluxo descrito em Despesas.

---

## 6. Contas

**Arquivo-alvo**: `app/contas/` · **Protótipo**: `Protótipo - Contas.dc.html`

**Cinco KPIs**: saldo total · em conta corrente · em poupança/reserva · a receber · a pagar.

**Lista de contas** — cada conta com instituição, tipo, agência/número mascarados e saldo. Distribuição do saldo entre contas em barras.

**Transferências** — grade compacta das transferências recentes entre contas, com origem → destino e valor.

**Extrato** — últimos lançamentos da conta selecionada.

**Modal de nova conta** — instituição (dropdown), tipo (dropdown), apelido, saldo inicial.
**Modal de transferência** — origem, destino, valor, data.

---

## 7. Categorias

**Arquivo-alvo**: `app/categories/`

Não tem protótipo dedicado — segue o padrão de tabela e o dropdown de categoria já especificados.

Lista com nome, cor, tipo (despesa/receita), contagem de lançamentos e média dos últimos 3 meses. Ação de criar, editar cor e arquivar. A paleta de cor é a lista `--chart-1` a `--chart-7` de `tokens.css` — sem seletor livre.

---

## 8. Metas

**Arquivo-alvo**: `app/metas/` · **Protótipo**: `Protótipo - Metas.dc.html`
**Modelo**: `goal-view.model.ts`

Título "Metas", descrição "Planeje, acompanhe e evolua seus objetivos financeiros."

**Três tipos com semântica própria** — isto é o coração da tela:

| Tipo | Natureza | Alvo | Realizado | Restante | Percentual |
|---|---|---|---|---|---|
| Despesa | consumo (passar é ruim) | Limite | Gasto | Disponível | % utilizado |
| Receita | conquista (chegar é bom) | Objetivo | Recebido | Falta receber | % alcançado |
| Investimento | conquista | Meta de aporte | Aportado | Falta aportar | % alcançado |

**Quatro KPIs**: Metas ativas · Atingidas · Precisam de atenção · Progresso médio.

**Seis abas**: Todas · Despesas · Receitas · Investimentos · Concluídas · Arquivadas.

**Card de meta** — ícone por tipo, título, badge de tipo, badge de estado, recorrência; três valores nomeados pelo tipo; barra com cor por limiar; dica contextual ("Passou R$ X do limite deste período." / "Previsto (não contabilizado): R$ X." / "Precisa de R$ X por mês para chegar no prazo."); ações no rodapé.

**Estados**: Ativa · Em atenção · Excedida · Atrasada · Atingida · Pausada · Concluída · Arquivada.

**Menu de ações** por meta: Ver detalhes · Editar · Registrar aporte (só investimento) · Pausar/Reativar · Concluir (só com 100%) · Arquivar · Excluir.

**Formulário que muda por tipo** — o rótulo do valor acompanha o tipo; categoria e limiares de alerta (atenção/crítico) aparecem para despesa e receita, e são substituídos por uma nota explicativa no investimento. Recorrência: Período único · Mensal · Trimestral · Semestral · Anual — muda a data de término sugerida.

**Modal de aporte** — valor, atalhos de valor comum, data, observação, e a prévia do progresso resultante.

**Detalhes** — os quatro valores nomeados pelo tipo, o previsto não contabilizado, e a evolução por período em barras.

---

## 9. Empréstimos e Financiamentos

**Arquivo-alvo**: `app/loans/`

Sem protótipo dedicado. Segue o padrão de tabela e cards.

Contratos com saldo devedor, parcela, parcelas pagas / total, taxa e vencimento. Barra de amortização por contrato. KPIs: total devedor · parcela mensal somada · próximo vencimento · quitação prevista.

---

## 10. Orçamento

**Arquivo-alvo**: `app/orcamento/` · **Protótipo**: `Protótipo - Orçamento.dc.html`
**Modelo**: `budget-overview.model.ts`

Título "Orçamento · <mês> <ano>", descrição "Defina o quanto planeja gastar por categoria e acompanhe o realizado do mês."

Ações: navegação de mês · "Copiar do mês anterior" · "Exportar CSV" · "Adicionar categoria".

**Quatro KPIs**: Planejado · Realizado · Variação · Uso do orçamento. Limiares: acima de 80% atenção, acima de 100% estourado.

**Tabela editável na linha** — colunas Categoria · Planejado · Realizado · Variação · Uso · Ações. Clicar no valor planejado abre o campo ali mesmo com Salvar e Sair; o botão fechado tem borda tracejada em hover para sinalizar que é editável. Filtros: Todas · Em atenção · Estouradas. Linha de total no rodapé.

**Coluna direita**:
- **Ritmo do mês** — dias passados, ideal gasto até hoje, acima/abaixo do ritmo, sobra por dia restante
- **Composição planejada** — rosca com o planejado total no centro
- **Estouraram o planejado** — card crítico com o excedente por categoria

**Modal de adicionar categoria** — dropdown mostrando **a média dos últimos 3 meses ao lado de cada categoria**, atalho "Usar a média", e a prévia do planejado total depois de adicionar.

**Remoção** — modal de confirmação explicando que os lançamentos realizados não são afetados.

---

## 11. Investimentos

**Arquivo-alvo**: `app/investments/` · **Protótipo**: `Protótipo - Investimentos.dc.html`
**Modelo**: `investments-overview.model.ts`

Título "Carteira e evolução", descrição "Acompanhe patrimônio, posições, rentabilidade e proventos — gestão e registro, sem recomendação de ativos."

**A regra central do modelo**: aporte, valorização e proventos são grandezas separadas e **nunca somadas**. Valorização = mercado − investido, e pode ser negativa. Sem cotação, o valor cai para o preço médio — **nunca inventar preço**.

**Cinco KPIs** em faixa flex: Valor de mercado · Total investido · Valorização · Proventos (12m) · Aporte do mês. Cada um com tooltip explicando a distinção.

**Cinco abas**: Resumo · Consolidação · Proventos · Rentabilidade · Análise.

**Resumo** — evolução do patrimônio (linha cheia = mercado, tracejada = aporte acumulado) com seletor de 6/12/24 meses · rosca de distribuição por tipo · tabela de posições.

Tabela de posições: Ativo · Qtd. · Preço médio · Atual · Investido · Mercado · Result. Cada linha marca a fonte do preço: "cotação" ou "preço médio". Chips de filtro por tipo. Linha de total.

**Tipos de ativo** (do modelo): Renda Fixa · Ações · Fundos · Cripto · Imóveis · Veículos.

**Rentabilidade** — sete benchmarks, cada um com sua cor: CDI · IPCA · IFIX · IBOV · SMLL · IDIV · IVVB11. Trocar recalcula os três cards (desde o início / 12 meses / último mês), o gráfico e a tabela anual.

**Proventos** — barras dos últimos 12 meses (com a estrutura de barra da seção 9 de `COMPONENTES.md`), total, média mensal, contagem de pagadores, e a lista por ativo.

**Consolidação** — projeção de vencimentos por ano com horizonte ajustável (2 a 8 anos) e a tabela de títulos com data.

**Análise** — alocação alvo editável por tipo com validação de soma 100%, desvio em pontos percentuais, e o card "Próxima ação" apontando a classe mais distante do alvo com valor sugerido. Com a ressalva: reequilíbrio sobre a própria alocação alvo, não recomendação de ativos.

**Modais** — novo lançamento (compra/venda, com o total incluindo ou descontando custos) e importação B3 com progresso e prévia das linhas.

---

## 12. Relatórios

**Arquivo-alvo**: `app/relatorios/`, `app/monthly-snapshots/`

Sem protótipo dedicado nesta rodada. Especificação:

Seletor de período e de tipo de relatório. Receitas × despesas de 6/12 meses em barras comparativas. Distribuição por categoria em barras (não rosca — lista longa lê melhor em barra). Evolução do saldo. Exportação em CSV e PDF. Snapshot mensal com o fechamento de cada mês.

---

## 13. Simulador

**Arquivo-alvo**: `app/cenarios/`, `app/calculator/`

Sliders para aporte mensal, prazo e taxa; projeção comparada de dois ou três cenários no mesmo gráfico; tabela ano a ano. Cada slider mostra o valor atual acima do trilho.

---

## 14. Assistente

**Arquivo-alvo**: `app/assistant/`

Conversa com contexto financeiro do usuário. Sugestões de pergunta como chips no estado inicial. Respostas podem conter cards de dado (mesmo padrão de card de métrica, em escala reduzida). Aviso permanente de que não é recomendação de investimento.

---

## 15. Perfil

**Arquivo-alvo**: `app/user-profile/`, `app/user-security/`

Dados pessoais, foto, senha, sessões ativas, autenticação em dois fatores, privacidade.

---

## 16. Configurações

**Arquivo-alvo**: `app/user-preferences/` · Especificado em `Redesign Investindo em Negócios.dc.html`, seção 14a

**Abas**: Preferências · Notificações · Segurança · Plano.

**Formato regional** — moeda (dropdown) · idioma (dropdown) · presets rápidos ("Português + BRL", "English + USD") · localizações preferidas como chips removíveis com campo de adição.

**Pré-visualização** — mostra data, número e moeda no formato escolhido antes de aplicar.

**Lembretes financeiros** — quatro toggles: Vencimento próximo · Vencimento em atraso · Notificações no app · Notificações por e-mail. Mais o stepper "Dias antes do vencimento para alerta" (0 a 60).

**Zona sensível** — excluir conta permanentemente, com senha atual e a palavra "EXCLUIR" digitada para liberar a ação. Card com borda vermelha, botão destrutivo.

**Barra de salvar fixa no rodapé** com Descartar e Salvar alterações.

---

## Telas de fluxo (fora das 16)

**Autenticação** — `Protótipo - Autenticação.dc.html`. Login, cadastro e recuperação de senha na mesma página, com painel navy à esquerda contando o produto e formulário à direita. Recuperar senha é uma **tela**, não modal — o usuário chega nela por link de e-mail.

**Onboarding** — `Protótipo - Onboarding.dc.html`. Quatro passos com progresso, topbar com opção de sair, e os primeiros lançamentos abrindo o modal de cadastro real.
