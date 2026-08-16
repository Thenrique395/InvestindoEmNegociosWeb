# Checklist de validacao visual com Playwright

Documento operacional para revisar visualmente as telas principais do frontend depois de refatores, ajustes de design system ou mudancas em componentes compartilhados.

## Objetivo

Garantir que as telas principais continuam consistentes em:

- hierarquia de fontes
- espacamento e alinhamento
- cards, listas, tabelas, filtros e modais
- responsividade desktop/mobile
- estados com dados, vazio, loading e erro
- tema claro e tema escuro, quando aplicavel
- ausencia de overflow, texto cortado ou componentes sobrepostos

Este checklist complementa os testes E2E funcionais. Ele nao substitui `typecheck`, unit tests ou build.

## Comandos base

Diretorio:

```bash
cd /Users/henriquesantos/Desktop/Codes/InvestindoEmNegocios/InvestindoEmNegociosWeb/quality-tests
```

Validacao visual assistida em navegador:

```bash
npm run test:e2e:visual
```

Validacao visual apontando para um servidor ja aberto:

```bash
APP_BASE_URL=http://localhost:4200 npm run test:e2e:visual
```

Runner interativo:

```bash
APP_BASE_URL=http://localhost:4200 npm run test:e2e:ui
```

Quando o servidor Angular rejeitar `127.0.0.1`, repetir com `localhost` antes de tratar como regressao visual:

```bash
APP_BASE_URL=http://localhost:4200 npm run test:e2e:headed
```

## Ordem recomendada

1. Rodar `npm run typecheck` no app.
2. Rodar `npm run test:ci` no app quando a mudanca tocar componentes compartilhados.
3. Rodar `npm run build:prod` no app.
4. Abrir Playwright headed ou UI.
5. Validar desktop.
6. Validar mobile.
7. Registrar divergencias com tela, viewport, estado e acao necessaria.

## Viewports minimos

Desktop:

- 1440 x 900
- 1280 x 720

Mobile:

- 390 x 844
- 360 x 800

Tablet, quando a tela tiver tabela densa:

- 768 x 1024

## Regras de aceite visual

Uma tela passa quando:

- o titulo principal usa hierarquia igual ao padrao da area autenticada
- filtros, acoes e cards nao mudam de altura ao interagir
- listas/tabelas usam alinhamento, densidade e estados coerentes
- valores monetarios ficam legiveis e nao quebram de forma estranha
- botoes de acao primaria/secundaria seguem cor, peso e icone esperados
- tooltips, dropdowns e modais nao ficam cortados
- nenhum texto sobrepoe outro elemento
- nenhum card fica com conteudo vazando em mobile
- loading e erro aparecem dentro do contexto correto

## Checklist por tela

### Dashboard - `/dashboard`

- [ ] Cards superiores refletem o periodo selecionado.
- [ ] Alternancia mensal/trimestral/anual atualiza todos os cards e graficos.
- [ ] Grafico de evolucao patrimonial tem linhas finas, eixo discreto e legenda interativa.
- [ ] Legenda permite ocultar/exibir series sem quebrar escala ou layout.
- [ ] Atividades recentes e lembretes mantem o mesmo padrao visual.
- [ ] Donuts de receitas/despesas por categoria mostram valor centralizado.
- [ ] Mobile empilha secoes sem cortar valores ou acoes.

### Receitas - `/receitas`

- [ ] Hero do periodo, total do mes e CTA seguem o padrao de `Despesas`.
- [ ] Filtros mantem altura e alinhamento em desktop/mobile.
- [ ] Lista usa densidade e tipografia do padrao compartilhado.
- [ ] Status pendente/recebida fica claro sem competir com o valor.
- [ ] Modal de nova receita respeita labels, campos e botoes do design system.
- [ ] Acao de marcar como recebida recarrega dados refletidos no dashboard.

### Despesas - `/despesas`

- [ ] Hero do periodo e resumo estao alinhados ao padrao de `Receitas`.
- [ ] Despesas pagas, pendentes e a vencer usam badges consistentes.
- [ ] Lista nao repete informacao em excesso na mesma linha.
- [ ] Modal de despesa mantem largura, espacamento e botoes padronizados.
- [ ] Confirmacoes financeiras usam o mesmo padrao visual.
- [ ] Acao de pagar/alterar despesa recarrega dados refletidos no dashboard.

### Contas - `/contas`

- [ ] Cards de resumo nao destoam dos cards financeiros principais.
- [ ] Lista de contas preserva leitura de saldo, tipo e acoes.
- [ ] Estados vazio e erro orientam o usuario sem texto excessivo.
- [ ] Formularios de conta seguem `app-modal`/campos compartilhados quando aplicavel.
- [ ] Mobile nao corta saldo nem botoes de acao.

### Cartoes - `/cartoes`

- [ ] Cards de cartao mantem proporcao e hierarquia consistente.
- [ ] Faturas e lancamentos nao usam tabela visualmente diferente das demais listas.
- [ ] Importacao de fatura nao foge do padrao de modal/confirmacao.
- [ ] Estados de erro de importacao aparecem com destaque suficiente.
- [ ] Mobile preserva leitura de limite, fechamento e vencimento.

### Calendario - `/calendario`

- [ ] Navegacao mensal tem botoes e altura coerentes com outras telas.
- [ ] Dias com compromissos financeiros sao legiveis em desktop e mobile.
- [ ] Marcadores de receita/despesa nao poluem a grade.
- [ ] Agenda/lista do dia selecionado segue o padrao de listas compactas.
- [ ] Empty state de dia sem eventos nao parece erro.

### Categorias - `/categorias`

- [ ] Lista de categorias usa densidade e acoes alinhadas ao restante do produto.
- [ ] Cores de categoria aparecem como apoio visual, nao como informacao principal unica.
- [ ] Confirmacao de exclusao segue o padrao definido para decisoes criticas.
- [ ] Empty state indica claramente como criar a primeira categoria.
- [ ] Mobile mantem nome, tipo e acoes sem overflow.

### Metas - `/metas`

- [ ] Cards de metas usam hierarquia visual consistente.
- [ ] Barras/progresso tem contraste adequado.
- [ ] Acoes de editar, concluir e remover ficam previsiveis.
- [ ] Estados vazio e concluido nao parecem cards quebrados.
- [ ] Mobile preserva valor atual, alvo e progresso.

### Orcamento - `/orcamento`

- [ ] Lista compartilhada de categorias mantem alinhamento no desktop.
- [ ] Formulario de adicionar categoria nao compete com o resumo.
- [ ] Progresso planejado/realizado usa cores coerentes com receitas/despesas.
- [ ] Navegacao de mes nao quebra em mobile.
- [ ] Confirmacao de remover item segue o padrao financeiro.

### Relatorios - `/relatorios`

- [ ] KPIs do periodo seguem a mesma escala dos cards do dashboard.
- [ ] Tabela/lista de despesas por categoria usa padrao compartilhado.
- [ ] Exportar CSV fica visivel sem virar acao primaria indevida.
- [ ] Graficos e listas preservam legenda, valor e percentual.
- [ ] Mobile mantem leitura sem scroll horizontal desnecessario.

### Investimentos - `/investimentos`

- [ ] Resumo executivo, evolucao e distribuicao estao visualmente integrados.
- [ ] Abas mantem altura e estado ativo consistentes.
- [ ] `Meus Ativos` usa lista compartilhada e nao tabela divergente.
- [ ] Consolidacao de aportes e lancamentos consolidados mantem o mesmo padrao.
- [ ] Proventos, rentabilidade e analise nao misturam fontes fora da escala.
- [ ] Modais de lancamento e importacao mantem largura, campos e botoes padronizados.
- [ ] Mobile permite revisar posicoes sem overflow horizontal pesado.

### Emprestimos - `/emprestimos`

- [ ] Simulacao e contratos usam cards/listas consistentes.
- [ ] Parcelas expansivas mantem o padrao `app-responsive-list`.
- [ ] Status pago/em aberto fica claro em desktop e mobile.
- [ ] Acao de pagar parcela nao muda layout inesperadamente.
- [ ] Detalhe do contrato preserva leitura de cronograma.

### Simulador - `/simulador`

- [ ] Formulario de parametros segue grid e campos padronizados.
- [ ] Resultado da simulacao nao parece uma tela separada do produto.
- [ ] Tabela/projecao diaria respeita densidade e responsividade.
- [ ] Seletor de periodo mantem estado ativo claro.
- [ ] Mobile empilha formulario e resultado em ordem natural.

### Historico mensal - `/snapshots`

- [ ] Gerar snapshot fica como acao clara, sem competir com historico.
- [ ] Lista de snapshots mantem data, saldo e diferencas legiveis.
- [ ] Empty/loading indicam estado real da consulta.
- [ ] Mobile nao corta valores financeiros.

## Checklist transversal

- [ ] Sidebar e topbar mantem largura, alinhamento e estado ativo.
- [ ] Busca global nao sobrepoe conteudo em telas estreitas.
- [ ] Notificacoes e menu de usuario abrem sem cortar no viewport.
- [ ] Assistente IA nao cobre botoes essenciais quando aberto.
- [ ] Tooltips nao ficam presos fora da area visivel.
- [ ] Modais sempre tem foco inicial, titulo claro e botao de fechar.
- [ ] Confirmacoes destrutivas/financeiras usam o mesmo componente visual.
- [ ] Estados de erro nao usam toast como unica fonte de informacao.
- [ ] Tela em mobile nao exige scroll horizontal, exceto tabela justificada.

## Registro de divergencias

Use este formato ao encontrar problema:

```md
- Tela:
- Rota:
- Viewport:
- Estado:
- Problema:
- Componente provavel:
- Prioridade:
- Acao sugerida:
```

Prioridade:

- `P1`: quebra layout, impede acao, corta valor importante ou confunde decisao financeira.
- `P2`: divergencia visual clara, mas fluxo continua utilizavel.
- `P3`: polimento, texto, espacamento fino ou melhoria cosmetica.

## Evidencia recomendada

Para cada ciclo visual importante, guardar:

- screenshots de desktop e mobile
- nome do commit ou branch
- comando usado
- ambiente usado (`local`, `DEV`, `PRD`)
- lista curta de divergencias encontradas

As evidencias podem ficar em `docs/ai-reports/` quando forem exploratorias ou no relatorio da tarefa quando forem parte de uma entrega.
