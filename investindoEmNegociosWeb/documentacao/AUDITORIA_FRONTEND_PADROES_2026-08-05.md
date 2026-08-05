# Auditoria de padrões do frontend - 2026-08-05

Documento de revisão do frontend web do Investindo em Negócios.

## Escopo

Esta auditoria revisa a base de código e a documentação local do frontend, com foco em:

- consistência visual
- uso do design system
- componentes compartilhados
- padrões de tela
- pontos fora do padrão que tendem a gerar telas divergentes

Limite desta revisão:

- não foi uma auditoria visual completa com captura de todas as telas em navegador
- a análise foi feita por inspeção de código, documentação e inventário de componentes
- antes de implementar correções visuais maiores, validar as telas principais em navegador real

## Resumo executivo

O frontend já tem uma boa base para padronização. Existem componentes compartilhados importantes e várias telas recentes já usam essa base, especialmente `Receitas`, `Despesas`, `Dashboard`, `Orçamento` e parte de `Investimentos`.

O principal problema hoje não é ausência de design system. O problema é adoção desigual. Algumas telas usam os componentes novos, outras ainda usam estruturas próprias de tabela, modal, empty state, filtro e cards. Isso cria diferenças de fonte, espaçamento, altura, densidade e comportamento.

Prioridade recomendada:

1. alinhar o contrato de tokens entre documentação e SCSS
2. padronizar listas/tabelas e estados vazios
3. unificar confirmações/modais
4. reduzir utilitários visuais soltos em templates
5. criar uma checagem simples de regressão visual para telas principais

## O que já está no caminho certo

### Componentes compartilhados relevantes

A base já possui componentes que devem ser tratados como padrão:

- `app-page-header`
- `app-section-card`
- `app-filter-bar`
- `app-period-hero`
- `app-period-total-card`
- `app-period-action-card`
- `app-transaction-summary-card`
- `app-responsive-list`
- `app-empty-state`
- `app-ui-state`
- `app-status-badge`
- `app-tooltip`
- `app-modal`
- `app-form-field`
- `app-segmented-selector`
- `app-donut-chart`
- `app-confirm-sheet`

Esses componentes já dão uma linguagem consistente para páginas operacionais.

### Boas referências atuais

As telas de `Receitas` e `Despesas` estão entre as melhores referências de padrão:

- usam cards de resumo compartilhados
- usam `app-period-hero`
- usam `app-filter-bar`
- usam listas especializadas sobre o padrão de `app-responsive-list`
- usam `app-modal` nos formulários
- usam `app-confirm-sheet` para decisões críticas

O dashboard também avançou bem:

- gráfico de evolução patrimonial mais delicado
- legendas interativas para ocultar séries
- componentes de atividades recentes e lembretes
- donuts de categorias reaproveitando um componente compartilhado
- cards superiores refletindo o filtro de período

## Divergências encontradas

### P1 - Contrato de tokens divergente entre documento e código

O `DESIGN_SYSTEM.md` documenta tokens como:

- `--space-1`, `--space-2`, `--space-3`
- `--control-h: 48px`
- `--text-xs: 13px`, `--text-sm: 15px`, etc.

No código, a base atual usa também:

- `--spacing-1`, `--spacing-2`, `--spacing-3`
- `--control-height`
- `--font-size-caption`, `--font-size-label`, `--font-size-body`

Além disso, `src/styles.scss` define `html { font-size: 14px; }`, então tokens em `rem` não batem diretamente com os pixels documentados.

Impacto:

- cada tela pode escolher um vocabulário diferente
- componentes novos e antigos podem parecer de famílias diferentes
- fica difícil saber qual token é fonte de verdade

Recomendação:

- escolher uma nomenclatura oficial única
- preferir `--spacing-*`, `--font-size-*`, `--control-height` como camada nova
- manter aliases antigos só para compatibilidade
- atualizar `DESIGN_SYSTEM.md` para refletir exatamente o SCSS atual
- definir `--control-h`/`--control-height` com altura real de controle do sistema

### P1 - Tipografia ainda mistura padrões

Foram encontrados usos mistos de:

- tokens globais
- `var(--font-size-*)`
- `var(--text-*)`
- utilitários Tailwind arbitrários como `text-[0.75rem]`
- `font-size` local em SCSS
- `clamp(...)` em componentes e tokens

Impacto:

- telas podem ficar com fontes "fora do padrão"
- valores financeiros podem variar demais entre cards
- labels e textos auxiliares perdem consistência

Recomendação:

- definir escala oficial por uso, não só por tamanho:
  - caption
  - label
  - body
  - card title
  - card metric
  - page title
- evitar `clamp` em cards compactos e listas
- usar tamanho responsivo por layout, não por fonte escalando com viewport
- remover `letter-spacing` negativo dos tokens principais

### P1 - Listas e tabelas ainda têm implementações próprias

Existe `app-responsive-list`, mas várias telas ainda usam tabelas diretas ou estruturas locais.

Exemplos:

- `Investimentos` usa múltiplas `<table>` com `.table-wrap`
- áreas admin usam tabelas com classes Tailwind diretas

Status:

- feito em 2026-08-05: `Orçamento` migrou a tabela de categorias para `app-responsive-list`
- feito em 2026-08-05: `Relatórios` migrou a tabela de despesas por categoria para `app-responsive-list`
- feito em 2026-08-05: `Empréstimos` migrou parcelas da listagem, prévia de simulação e detalhe do contrato para `app-responsive-list`

Impacto:

- responsividade desigual
- alinhamento e densidade inconsistentes
- estados vazios e carregamento diferentes por tela
- maior custo para melhorar tabela/lista no futuro

Recomendação:

- transformar `app-responsive-list` ou criar `app-data-table` como padrão oficial
- migrar as telas financeiras que ainda estão pendentes:
  - `Investimentos`
- deixar tabelas admin como segunda etapa, pois são menos críticas para o usuário final

### P1 - Confirmações coexistem em dois padrões

Hoje há pelo menos dois padrões:

- `src/app/confirm-dialog`
- `src/app/shared/confirm-dialog`
- `src/app/shared/confirm-sheet`

Uso atual observado:

- `Receitas`, `Despesas`, `Cartões`, `Empréstimos` usam `app-confirm-sheet`
- `Metas`, `Categorias`, `Contas`, `Espaços`, `Admin` e preferências ainda usam `app-confirm-dialog`
- existe também modal customizado no fluxo de importação de fatura

Impacto:

- ações críticas parecem diferentes por módulo
- o usuário aprende dois modelos de decisão
- maior risco de acessibilidade e manutenção duplicada

Recomendação:

- definir `app-confirm-sheet` como padrão para ações financeiras e destrutivas
- manter `app-confirm-dialog` apenas se houver caso muito específico
- migrar os usos antigos aos poucos
- remover o componente antigo depois da migração

### P1 - Investimentos concentra muita UI própria

A tela de investimentos é a mais densa e tem muitos padrões locais:

- gráficos próprios
- várias tabelas
- filtros próprios
- cards próprios
- modais grandes
- estados vazios locais

Ao mesmo tempo, ela já usa parte dos componentes novos, como `app-page-header`, `app-filter-bar`, `app-segmented-selector` e `app-transaction-summary-card`.

Status:

- feito em 2026-08-05: o bloco `Meus Ativos` foi extraído para `app-investment-assets-list` e passou a usar `app-responsive-list`
- feito em 2026-08-05: a aba `Proventos` foi extraída para `app-investment-dividends-panel`
- feito em 2026-08-05: a aba `Consolidação` foi extraída para `app-investment-consolidation-panel` e os lançamentos consolidados passaram a usar `app-responsive-list`
- ainda pendente: demais blocos de `Investimentos`, como evolução, rentabilidade/análise e modais

Impacto:

- alto risco de divergência visual
- difícil manter mobile com qualidade
- qualquer ajuste de estilo tende a exigir alterações grandes

Recomendação:

- não redesenhar tudo de uma vez
- extrair por blocos:
  - resumo executivo
  - evolução do patrimônio
  - posições
  - aportes/resgates
  - proventos
  - modais
- migrar listas para um padrão compartilhado
- manter linguagem financeira, mas aproximar densidade e espaçamento das telas de Receitas/Despesas

### P2 - Empty states ainda são inconsistentes

Existe `app-empty-state`, mas ainda há estados vazios locais.

Exemplos:

- `Investimentos`: vários `<div class="empty">`
- `Dashboard`: empty states próprios em atividades/categorias
- `Cartões`: empty state próprio na listagem
- `Calendário`: mensagens locais dentro do dia
- `Topbar` e busca global usam mensagens próprias

Impacto:

- telas sem dados parecem menos polidas
- CTAs de primeiro uso variam demais
- estados vazios deixam de orientar o usuário de forma consistente

Recomendação:

- usar `app-empty-state` para estados de página/lista
- permitir variações compactas dentro de dropdowns ou células
- documentar quando o empty state local é aceitável

### P2 - Utilitários Tailwind arbitrários aparecem em templates de produto

Há uso de classes como:

- `rounded-[12px]`
- `text-[0.875rem]`
- `p-[1.1rem]`
- `bg-[color-mix(...)]`
- `text-[var(--text-muted)]`

Isso não é errado em todos os casos, mas hoje está misturado com SCSS e componentes compartilhados.

Impacto:

- revisão visual fica mais difícil
- os tokens existem, mas são contornados com valores locais
- aumenta chance de telas com pequenas diferenças de fonte e espaçamento

Recomendação:

- utilitários arbitrários devem ser exceção
- templates de produto devem preferir componentes ou classes semânticas
- se um padrão se repetir duas vezes, virar componente/classe compartilhada

### P2 - Dashboard tem bom desenho, mas ainda carrega muita lógica visual no `HomeComponent`

O dashboard está funcional e visualmente melhor, mas `HomeComponent` concentra muitos dados e muitas regras:

- refresh periódico
- período mensal/trimestral/anual
- contas
- receitas
- despesas
- patrimônio
- insights
- notificações
- gráficos
- categorias

Impacto:

- ajustes pequenos no dashboard ficam arriscados
- difícil testar cada bloco isoladamente
- componentes visuais dependem de muita regra da página

Recomendação:

- manter o visual atual
- extrair apenas quando houver manutenção real
- candidatos:
  - modelo de período do dashboard
  - builder dos cards superiores
  - builder da evolução patrimonial
  - builder de atividades/lembretes

### P2 - Área pública e área autenticada parecem usar padrões separados

As páginas públicas e de autenticação usam mais estilos próprios, imagens, overlays e `rgba`.

Isso é aceitável para landing/login, mas precisa ser deliberado.

Impacto:

- risco de o login/landing parecerem outro produto
- ajustes globais de token podem não refletir no público

Recomendação:

- declarar dois contextos no design system:
  - produto autenticado
  - superfície pública/comercial
- compartilhar tipografia, botões e tokens semânticos
- permitir composição visual mais livre somente na área pública

## Fora do padrão que merece atenção

### Letter spacing negativo

Os tokens atuais incluem:

- `--tracking-display: -0.04em`
- `--tracking-title: -0.02em`

Isso pode deixar títulos mais sofisticados em algumas telas, mas também aumenta risco de desalinhamento visual e piora de legibilidade em tamanhos compactos.

Recomendação:

- usar `letter-spacing: 0` como padrão
- manter tracking positivo apenas para eyebrow/labels em caixa alta

### Tamanhos com `clamp` em UI operacional

`clamp(...)` aparece em tokens de display e em alguns componentes.

Recomendação:

- manter `clamp` apenas em hero comercial ou páginas públicas
- evitar em cards, dashboards densos, tabelas e painéis operacionais

### Botões com texto e ícones manuais

Há vários botões com caracteres como `+`, `×`, `←`, `→` e SVG inline.

Recomendação:

- manter SVG inline somente onde já for padrão consolidado
- para novas telas, preferir ícones compartilhados ou biblioteca de ícones
- padronizar ações comuns:
  - adicionar
  - editar
  - excluir
  - importar
  - navegar mês

## Plano recomendado

### Fase 1 - Ajustar base do design system

Objetivo: remover ambiguidade.

Entregas:

- atualizar `DESIGN_SYSTEM.md` para refletir tokens reais
- decidir se o padrão é `--spacing-*` ou `--space-*`
- alinhar `--control-h` e `--control-height`
- remover ou reduzir letter spacing negativo
- documentar escala oficial de fonte por uso

Critério de pronto:

- uma pessoa olhando o SCSS e a documentação encontra os mesmos nomes e valores

### Fase 2 - Padronizar listas e estados vazios

Objetivo: fazer telas financeiras parecerem da mesma família.

Ordem sugerida:

1. `Investimentos`

Já concluído:

- `Orçamento`: categorias usam `app-responsive-list`
- `Relatórios`: despesas por categoria usam `app-responsive-list`
- `Empréstimos`: parcelas da listagem, simulação e detalhe usam `app-responsive-list`
- `Investimentos`: primeiro bloco extraído (`Meus Ativos`) e migrado para `app-responsive-list`
- `Investimentos`: aba `Proventos` extraída para `app-investment-dividends-panel`
- `Investimentos`: aba `Consolidação` extraída para `app-investment-consolidation-panel`, com lançamentos consolidados em `app-responsive-list`

Entregas:

- migrar tabelas para `app-responsive-list` ou `app-data-table`
- substituir `.empty` por `app-empty-state`
- padronizar sort, seleção, empty, loading e ações

Critério de pronto:

- mobile e desktop mantêm o mesmo padrão de leitura
- listas importantes não usam tabela customizada sem justificativa

### Fase 3 - Unificar decisões críticas

Objetivo: o usuário sempre reconhecer ações destrutivas/financeiras.

Entregas:

- definir `app-confirm-sheet` como padrão principal
- migrar confirmações antigas aos poucos
- remover componente duplicado quando não houver uso
- revisar modal customizado de importação de fatura

Critério de pronto:

- ações de excluir, pagar, receber, cancelar, importar e alterar recorrência usam o mesmo padrão visual

### Fase 4 - Reduzir UI solta em templates

Objetivo: diminuir divergência futura.

Entregas:

- substituir blocos repetidos por componentes
- evitar novos `rounded-[...]`, `text-[...]`, `p-[...]` em telas principais
- extrair padrões repetidos de cards pequenos, listas compactas e banners

Critério de pronto:

- novas telas conseguem nascer usando componentes existentes em vez de montar UI do zero

### Fase 5 - Validar visualmente as telas principais

Objetivo: impedir regressão visual depois da padronização.

Telas mínimas para validação:

- Dashboard
- Receitas
- Despesas
- Contas
- Cartões
- Orçamento
- Relatórios
- Investimentos

Checks mínimos:

- desktop
- mobile
- tema claro
- tema escuro, se aplicável
- estado vazio
- estado com dados
- loading/erro quando existir

## Próximas fatias pequenas sugeridas

1. Corrigir o contrato de tokens entre `DESIGN_SYSTEM.md`, `src/styles.scss` e `src/styles/design-tokens.scss`.
2. Continuar `Investimentos` por blocos, priorizando `Rentabilidade`, `Análise` ou os modais de lançamento.
3. Padronizar `confirm-dialog` antigo para `confirm-sheet` nas telas financeiras.
4. Criar um checklist de validação visual com Playwright para as 8 telas principais.

## Decisão recomendada

Não recomendo redesenhar o frontend agora. A melhor abordagem é consolidar o padrão já aprovado nas telas que ficaram boas.

O padrão mais forte hoje é:

- cards de resumo compactos
- `app-section-card` para blocos
- `app-filter-bar` para filtros
- `app-responsive-list` para listagens
- `app-confirm-sheet` para decisões financeiras
- donuts e gráficos leves, com linhas finas e legenda interativa quando fizer sentido

Esse padrão deve virar a referência oficial para as próximas correções.
