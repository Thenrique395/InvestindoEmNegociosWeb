# Handoff: Redesign visual — Investindo em Negócios

## Visão geral

Este pacote contém a proposta de redesign visual e de UX do sistema **Investindo em Negócios** (app Angular em `investindoEmNegociosWeb`). A proposta **evolui** o sistema atual — não substitui. Sidebar + topbar + área de conteúdo permanecem; a paleta, a tipografia, a densidade e os componentes foram refinados a partir dos valores já existentes em `src/styles/design-tokens.scss`.

Não há tela nova inventada: cada protótipo foi construído lendo o componente Angular correspondente (`*.component.html`, `*.model.ts`) e preservando rótulos, estados e regras de negócio reais.

## Sobre os arquivos deste pacote

Os arquivos `.dc.html` são **referências de design em HTML** — protótipos que mostram aparência e comportamento pretendidos. **Não são código de produção para copiar.** A tarefa é **recriar esses designs no Angular existente**, usando os padrões já estabelecidos no projeto: componentes standalone, `signal()`, `ChangeDetectionStrategy.OnPush`, SCSS por componente e os utilitários de `styles.scss`.

Cada protótipo é um arquivo único que abre no navegador. Alguns concentram várias telas (Despesas e Receitas no mesmo arquivo; Dashboard com seletor de perfil) — a divisão em componentes Angular deve seguir a estrutura de pastas que já existe no repositório, não a divisão dos arquivos de protótipo.

## Fidelidade

**Alta fidelidade (hifi).** Cores, tipografia, espaçamento, raios, sombras e microinterações estão definidos e devem ser reproduzidos com precisão. Todos os valores estão em `tokens.css` neste pacote, prontos para virarem variáveis em `design-tokens.scss`.

Os dados são mockados e ilustrativos. A regra de negócio, os rótulos e os estados vêm do código real.

## Decisões que atravessam todas as telas

1. **Azul continua sendo a cor de ação de UI** (`#2563EB`). Verde (`#349063`) é reservado para receita/positivo, e o navy da marca (`#002E3E`) para a sidebar e superfícies escuras. Isso resolve o conflito anterior em que verde era ao mesmo tempo cor de marca e cor semântica.

2. **Densidade equilibrada.** Linha de tabela 56px, input 42px, item de navegação 34px. Corpo em 13px, metadados em 11–12px.

3. **Cards discretos.** Fundo branco, borda de 1px `#E4EBEF`, raio 16px, sem sombra em repouso. Sombra apenas em hover (elevação de 2px) e em camadas flutuantes (modal, dropdown, toast).

4. **Toda faixa de indicadores é `display:flex; flex-wrap:wrap`** com `flex:1 1 210px` em cada card — nunca `grid` com `auto-fit`. Grid deixa célula vazia à direita quando a contagem não divide pelo número de colunas; flex faz a última linha crescer e preencher.

5. **Todo campo de valor múltiplo é dropdown**, nunca chips em linha. Chips não escalam quando o usuário cadastra 20 categorias. O padrão está descrito em `COMPONENTES.md`.

6. **Toda tabela tem `overflow-x:auto` com `min-width` explícito no filho.** Cabeçalho e linhas usam o mesmo `grid-template-columns`, então nunca desalinham.

7. **Números sempre com `font-variant-numeric: tabular-nums`** (classe `.ffx` nos protótipos), alinhados à direita em coluna monetária.

8. **Todo indicador tem tooltip** explicando o que ele significa e como é calculado — o usuário pediu isso explicitamente.

9. **Shell idêntico em toda tela**: sidebar 212px, topbar 56px, conteúdo `26px 28px 40px` com `gap:16px`, logo 26px, item de navegação 34px, busca 34px com `max-width:360px`. Nenhuma tela desvia.

## Arquivos deste pacote

| Arquivo | Conteúdo |
|---|---|
| `README.md` | Este documento |
| `ARQUITETURA_ANGULAR.md` | **Regras de componentização — leia antes de escrever código** |
| `tokens.css` | Todos os tokens de design com comentário de uso |
| `COMPONENTES.md` | Especificação de cada componente: medidas, cores, estados |
| `TELAS.md` | Especificação tela por tela: layout, conteúdo, comportamento |
| `PERFIS_E_PERMISSOES.md` | O que cada plano vê no menu e no dashboard |
| `ORDEM_DE_IMPLEMENTACAO.md` | Sequência de execução em 4 fases, com arquivos-alvo |
| `prototipos/*.dc.html` | Os protótipos navegáveis |
| `assets/` | Logo usado nos protótipos |
| `bootstrap-claude-code.sh` | Prepara o repositório para o Claude Code (ver abaixo) |

## Início rápido

Descompacte este pacote na raiz do repositório e rode:

```bash
chmod +x design_handoff_investindo_redesign/bootstrap-claude-code.sh
./design_handoff_investindo_redesign/bootstrap-claude-code.sh
```

O script verifica que o handoff está completo, gera um `CLAUDE.md` na raiz com as regras de arquitetura (carregadas automaticamente em toda conversa do Claude Code), cria `PROMPTS.md` com o prompt pronto de cada fase na ordem correta, e imprime o primeiro para você colar. Não altera nenhum arquivo de código.

## Como abrir os protótipos

Os arquivos em `prototipos/` dependem do runtime `support.js` e da pasta `_ds/` que ficam na raiz do projeto de design original. Para consulta visual, o mais prático é abrir os protótipos no próprio projeto de design. Neste pacote eles servem como **referência de estrutura e valores** — a especificação escrita em `TELAS.md` e `COMPONENTES.md` é auto-suficiente para implementar sem abri-los.

## Assets

`assets/logo-header.png` — copiado de `src/assets/logoHeaderInvestindoemNegocios.png` do próprio repositório. Nenhum asset novo foi criado.

Ícones: **Lucide**, traço 1,7–1,8px, tamanho 15–16px em UI e 20–22px em ilustração. Nos protótipos os caminhos SVG estão inline; na implementação, use o pacote Lucide já disponível ou mantenha os SVGs inline extraídos dos protótipos.

Tipografia: **Poppins** para títulos e valores, **Inter** para corpo. Inter já está no projeto via `@fontsource-variable/inter`; Poppins precisa ser adicionada.

## Fora de escopo neste pacote

Os protótipos de site de vendas (`Site - *.dc.html`) e o board de propostas (`Redesign Investindo em Negócios.dc.html`) ficaram no projeto de design e não entram nesta implementação — são material de marketing e documentação da direção visual, não telas do sistema autenticado.
