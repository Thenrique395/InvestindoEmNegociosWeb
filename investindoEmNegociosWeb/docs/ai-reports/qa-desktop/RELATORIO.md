# QA visual do desktop — app real × handoff

Varredura em 1440px, com captura pareada de cada tela e do protótipo correspondente.
Evidências nesta pasta: `app-<tela>.png` e `proto-<Tela>.png`; recortes de bloco em `zoom-*.png`.

Como reproduzir:

```bash
cd quality-tests
npx playwright test e2e/desktop-qa-visual.spec.ts --project=chromium   # telas inteiras
npx playwright test e2e/desktop-qa-zoom.spec.ts --project=chromium     # recortes de bloco
```

As duas listagens precisam de dados: o harness devolve `plans`/`installments` vazios, e o
estado vazio não se compara com um protótipo cheio. O `desktop-qa-visual.spec.ts` semeia os
mesmos lançamentos do protótipo, para a comparação ser direta.

---

## Corrigido nesta rodada

### 1. A marca aparecia pela metade em toda tela autenticada 🔴

O logo da sidebar trocava com o tema:

```html
[src]="isLightTheme() ? '...Negocios2.png' : '...Negocios.png'"
```

`...Negocios2.png` é a versão para **fundo claro** — o "N" é navy. A sidebar é navy fixo nos
dois temas (está escrito no próprio SCSS: "não acompanha o tema claro/escuro do app, é
superfície de marca"), então no tema claro — o padrão — metade da marca desaparecia contra o
fundo. Sobrava só o traço verde do "I".

Corrigido: a sidebar usa sempre a versão para fundo escuro. O input `isLightTheme` da sidebar
saiu junto, porque não tinha outro uso.

### 2. Card de indicador com o valor recuado — alcança 20 telas 🔴

`COMPONENTES.md` §3.1 descreve o conteúdo do card em três blocos: linha de cabeçalho
(ícone 30px + rótulo + tooltip empurrado para a direita), **valor** com `margin-top:10px`, e
nota com `margin-top:6px`.

O app punha o valor **dentro** da coluna do rótulo, num grid de três colunas — o valor nascia
42px à direita da borda do card, e a leitura vertical rótulo → valor → nota quebrava.

Medido depois da correção, com a origem no canto do card:

| Elemento | Protótipo | App |
|---|---|---|
| ícone | x21 y19 · 30×30 | x21 y19 · 30×30 |
| rótulo | x60 y28 · 11px/700 | x59 y27 · 11px/700 |
| valor | x21 y60 · Poppins 26px/600 | x21 y59 · Poppins 26px/600 |
| nota | x21 y104 · 12px | x21 y96 · 12px |

Resta 8px de diferença na posição da nota, vindo do `line-height` do valor (o protótipo usa
~1.4, o app usa `--lh-tight`). O handoff não fixa esse valor.

### 3. Todo botão do app estava sem padding horizontal 🔴

Medindo o rodapé do diálogo de exclusão: `Cancelar` tinha **59px** — a largura exata da
palavra. O bloco base de `.btn-*` em `styles.scss` declara `padding: 0 var(--space-7)` dentro
de `:where(...)`, que tem especificidade **zero**; o Preflight do Tailwind zera `padding` e
`border` com seletor de tag (`button, input, …`, especificidade 0,0,1) e ganhava sempre.

É o mesmo bug que o arquivo já documentava para `background` — a correção de então tratou a
cor e deixou padding e borda para trás. Agora as duas propriedades moram numa regra sem
`:where()`.

Medido depois: `Cancelar` 59 → **91px**, `Excluir apenas esta` 126 → **158px**, ambos com
`padding: 0 16px`, como no protótipo.

### 4. Exclusão de lançamento avulso não perguntava nada 🔴

`openRemocao` abria confirmação só para série ou recorrência; o lançamento simples caía direto
em `removerDespesa`. Um clique no ícone de lixeira da tabela e a despesa sumia — contra a
regra de ação destrutiva com confirmação.

O diálogo do protótipo (`Despesas-e-Receitas.dc.html`, estado `confirmar`) foi implementado
como `app-confirm-delete`, sobre o `app-modal` (três faixas), com:

- ícone 44px em tint de despesa, título Poppins 18px, e o texto nomeando o lançamento e o
  valor em negrito;
- escolha de escopo em **rádio**, quando há série ou recorrência — antes eram dois botões
  destrutivos lado a lado no rodapé, e a diferença entre "esta" e "todas" só aparecia no texto
  do botão, sem estado visível antes do clique;
- rótulo do botão destrutivo acompanhando a escolha (`Excluir apenas esta` ↔
  `Encerrar recorrência` / `Excluir série`);
- escopo voltando ao mais conservador toda vez que o diálogo abre.

Os textos das três combinações vivem em `confirm-delete.model.ts`, com teste — errar um par
(dizer "recorrência" para uma série de parcelas) faz a pessoa apagar o que não queria.
Receitas passou a usar o mesmo diálogo.

Coberto por `quality-tests/e2e/confirm-delete-visual.spec.ts` (4 casos), inclusive o do avulso.

---

## Aberto, por tela

### Contas — a mais distante do protótipo 🔴

Fase 5.5, que o plano ainda não iniciou. O QA confirma:

- **Cards de conta**: o protótipo tem ícone, nome, subtítulo, badge `Principal`, ações
  discretas no topo e **dois** botões (`Ver extrato`, `Transferir`) mais a estrela de favorito.
  O app empilha até cinco botões (`Extrato`, `Transferir`, `Tornar principal`, `Editar`,
  `Remover`) que quebram linha, além de um interruptor solto ao lado dos badges.
- **Cadastro e transferência inline**: o app desenha os dois formulários na própria página; o
  protótipo abre modal. Os campos de data são `input[type=date]` nativos, sem estilo e em
  formato `mm/dd/yyyy`.
- **Motor de importação**: seis botões, com `Importar OFX` e `Importar CSV` **repetidos**.
  O protótipo tem um `Importar extrato`.
- **Extrato**: o protótipo mostra a tabela de movimentações com `Ver extrato completo`; o app
  mostra filtros e o motor de importação, sem a tabela.
- **Últimas transferências**: seção inteira do protótipo que não existe no app.
- **Distribuição de saldo**: a legenda aparece duas vezes (cards + lista) e o donut usa
  azul/vermelho em vez da paleta `--chart-*`. Vermelho para uma conta lê como despesa.
- **Ordem das ações do topo** invertida: o protótipo vai de `Atualizar saldos` (texto) para
  `+ Nova conta` (primário), da esquerda para a direita.
- **Chips de período**: falta `Tudo`.
- **Faixa de indicadores**: o protótipo separa `Contas ativas` numa faixa própria; o app o
  coloca junto dos quatro de valor.

### Cartões — estrutura certa, acabamento pendente 🟡

- Rótulos internos do cartão (`Limite utilizado`, `Fatura em aberto`, `Vencimento`,
  `Melhor dia de compra`, `Ciclo`) estão em **eyebrow uppercase**; no protótipo são texto
  normal de 12px. Mesma divergência aparece nos filtros de Contas.
- Barra de limite sem cor por faixa (o protótipo usa verde/amarelo/vermelho conforme o uso).
- Linha do ciclo: o protótipo resolve em uma linha (`Lançamentos`, `Parcelas`, `Total`,
  `Ver fatura`); o app abre três cards grandes (`Total`, `Pago`, `Em aberto`).
- `Ano` é campo livre; no protótipo é stepper `− 2026 +`.
- `Importar fatura` não aparece no card de faturas (só em Despesas).

### Despesas e Receitas — quase alinhadas 🟢

- Título da tela: **26px** no app (`--fs-page-title`), **24px** no protótipo, e o app inclui o
  ano ("Despesas de agosto de 2026" × "Despesas de agosto").
- Pílula de comparação: o protótipo resolve numa frase só —
  `Comparado a julho: − R$ 486,20 (−4%)`, 12px/600 em verde. O app separa rótulo, tooltip e
  valor, e escreve "julho de 2026".
- A tabela bate: cabeçalho 10px/700 uppercase, mesma ordem de colunas, mesma altura de linha.

### Shell (todas as telas) 🟡

- A topbar do app carrega o bloco de usuário (avatar + nome + plano) que o protótipo não tem —
  a identidade vive no rodapé da sidebar, e ela está lá também. É a mesma informação duas
  vezes na mesma tela.
- O app tem dois controles a mais na topbar (ocultar valores, tema). Decisão da Fase 3,
  registrada; não é regressão.
- A sidebar do app lista mais itens que o protótipo — decisão P13, registrada.

---

## Sugestão de ordem

1. **Contas** (5.5) — é reescrita de tela, não acabamento.
2. **Rótulo em eyebrow onde o protótipo usa texto normal** — varre Cartões, Contas e outras;
   vale mapear com um levantamento antes de sair mudando.
3. **Cartões** (5.4) — barra por faixa, linha do ciclo, stepper de ano.
4. **Despesas/Receitas** — título e pílula de comparação.
5. **Bloco de usuário duplicado no shell** — decisão de produto, não só de layout.
