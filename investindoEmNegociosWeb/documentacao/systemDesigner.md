# System Designer Workspace

Workspace de exploração visual para desenhar, comparar e escolher componentes antes de consolidar a versão final no [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## Papel deste arquivo

Use este arquivo para:

- explorar alternativas visuais
- comparar variantes de componentes
- registrar decisões de composição antes da versão final
- manter referências rápidas de UX e interface

Não use este arquivo para:

- definir regra final de design system
- registrar backlog de produto
- duplicar arquitetura, roadmap ou documentação central

Regra prática:

- `systemDesigner.md` = laboratório
- `DESIGN_SYSTEM.md` = padrão aprovado

## Como usar

Fluxo sugerido por componente:

1. definir o objetivo do componente
2. listar variantes candidatas
3. comparar pontos fortes e fracos
4. escolher uma direção principal
5. mover o padrão aprovado para o `DESIGN_SYSTEM.md`

Se houver Figma, prints ou referências externas, anexar os links e notas aqui primeiro.

## Critérios de escolha

Antes de aprovar um componente, verificar:

- legibilidade imediata
- hierarquia visual clara
- consistência com tokens existentes
- adaptação mobile
- clareza do estado ativo, hover, foco, loading e disabled
- adequação ao contexto financeiro do produto
- reuso em mais de uma tela
- aderência às 10 heurísticas de Nielsen

## Reset do laboratório

Este workspace foi reiniciado com estas regras:

- parar de explorar direção visual solta sem critério
- começar pelos componentes-base do produto
- validar cada componente isoladamente antes de recompor a tela
- usar as heurísticas de Nielsen como régua obrigatória
- tratar `Basic` como referência de clareza
- ampliar densidade para `Intermediate` e `Advanced` sem mudar a identidade

Direção-base atual:

- `Finance Command Center`

Leitura atual:

- ainda é a melhor base para o produto
- mas agora a avaliação deve vir primeiro por usabilidade e consistência, não por “estilo”

Regra prática de decisão:

- primeiro perguntar se o componente é claro e previsível
- depois perguntar se ele é eficiente e reutilizável
- só depois discutir sofisticação visual

## Componentes em exploração

### Botões

Objetivo:

- definir a linguagem final de ação primária, secundária, destrutiva e compacta

Pontos para escolher:

- peso visual do botão primário
- quando usar ghost vs secundário
- padrão de `icon-action`
- comportamento de botões em toolbar de tabela

Variantes candidatas:

- primário sólido com alto contraste
- secundário com borda
- ghost discreto para ações de apoio
- ícone isolado para listas e tabelas

Decisão atual:

- manter a família atual como base
- revisar contraste e consistência entre `.btn-ghost`, `.ghost` e `.btn-edit`

Componentes reais já usados no código:

- `.btn-primary`
- `.btn-danger`
- `.btn-warning`
- `.btn-edit`
- `.btn-ghost`
- `.ghost`
- `.btn-cancel`
- `.icon-action`
- `.icon-action--edit`
- `.icon-action--danger`
- `.icon-action--info`
- `.sm`

Leitura do estado atual:

- `.btn-primary` está forte e já comunica CTA principal com clareza
- `.btn-danger` funciona bem como ação destrutiva sem exagero visual
- `.btn-warning` já existe, mas ainda parece menos consolidado como família
- `.btn-edit` e `.btn-ghost` encostam no mesmo território visual
- `.ghost` e `.btn-ghost` são redundantes como conceito
- `.btn-cancel` já tem um papel mais claro do que `.ghost` para fechamento e recuo
- `.icon-action` está bem posicionada para tabelas e listas, mas ainda depende de disciplina de uso

Direção recomendada:

- manter `.btn-primary` como CTA principal oficial
- manter `.btn-danger` para destrutivo
- manter `.btn-cancel` para recuo, fechar, desistir e cancelar fluxo
- manter `.icon-action*` para ações compactas em linhas de tabela e listas
- reduzir o uso livre de `.ghost`
- convergir `.ghost`, `.btn-ghost` e `.btn-edit` para uma família secundária mais clara ao longo do tempo

Catálogo funcional proposto:

| Papel | Classe atual preferida | Quando usar | Observação |
|---|---|---|---|
| Primário | `.btn-primary` | salvar, criar, confirmar, continuar | CTA principal do bloco |
| Secundário | `.btn-ghost` | apoio, alternância, ações não destrutivas | evitar competir com o primário |
| Cancelamento | `.btn-cancel` | fechar modal, desistir, voltar no fluxo | melhor que usar ghost genérico |
| Destrutivo | `.btn-danger` | excluir, remover, confirmar ação irreversível | reservar para ações de risco |
| Atenção | `.btn-warning` | alertas ou exceções operacionais | uso pontual |
| Compacto por linha | `.icon-action*` | tabelas, listas, cards com ação rápida | preferir ícone + `aria-label` |

Questões abertas:

- `.ghost` deve ser removida ou virar alias controlado de `.btn-ghost`?
- `.btn-edit` precisa continuar existindo como classe própria ou pode virar `.btn-ghost` com contexto?
- botões secundários em desktop e mobile devem ter a mesma densidade?

Exemplo de decisão recomendada:

- `Salvar`, `Assinar`, `Continuar`: `.btn-primary`
- `Cancelar`, `Fechar`, `Voltar`: `.btn-cancel`
- `Editar` em formulários ou seções: `.btn-ghost`
- `Editar` e `Excluir` em listas densas: `.icon-action--edit` e `.icon-action--danger`

### Inputs e filtros

Objetivo:

- consolidar padrão de formulário e barra de filtros

Pontos para escolher:

- densidade ideal
- agrupamento de filtros
- estilo de select e date picker
- mensagem de erro inline

Variantes candidatas:

- formulário compacto para dashboard
- formulário confortável para cadastro
- filtros em linha
- filtros em card agrupado

Decisão atual:

- usar campos globais nativos como base
- preferir filtros agrupados por contexto, não campos soltos espalhados

Famílias reais já usadas no código:

- `input`, `select` e `textarea` globais em `styles.scss`
- agrupadores locais como:
  - `.filters`
  - `.filter`
  - `.table-filters`
  - `.chart-filters`
  - `.meta-form`
  - `.grid-form`
- blocos utilitários mais visuais em áreas administrativas e checkout

Leitura do estado atual:

- a base global dos campos está boa e coerente com os tokens
- o sistema já usa bem `input` e `select` sem precisar de uma biblioteca pesada
- os agrupamentos de filtro ainda variam bastante de tela para tela
- há dois contextos visuais diferentes convivendo:
  - formulários de cadastro e edição
  - filtros rápidos de listas, gráficos e tabelas
- a inconsistência maior hoje não está no campo em si, e sim no agrupamento, densidade e ritmo visual

Direção recomendada:

- manter `input`, `select` e `textarea` globais como base oficial
- usar formulário confortável para criação, edição e configuração
- usar filtro compacto para tabelas, listas e análises
- evitar inventar nova casca visual para cada tela quando o problema é só layout

Catálogo funcional proposto:

| Papel | Estrutura preferida | Quando usar | Observação |
|---|---|---|---|
| Campo padrão | `input/select/textarea` globais | cadastro, edição, configuração | base oficial |
| Formulário em grid | `.grid-form` ou bloco equivalente | formulários com múltiplos campos relacionados | preferir em desktop |
| Formulário inline | `.form.inline` ou equivalente | ações rápidas e pequenos ajustes | usar com parcimônia |
| Filtros de tabela | `.table-filters` | busca, ordenação e recorte de listas | manter próximos da tabela |
| Filtros de análise | `.chart-filters` | troca de recorte visual e métricas | manter leves e compactos |
| Grupo de filtros | `.filters` + `.filter` | filtros simples de módulos tradicionais | boa base para consistência futura |

Checklist de aprovação para novos formulários e filtros:

- o usuário está cadastrando ou só refinando visualização?
- o formulário precisa de conforto ou de velocidade?
- os campos estão agrupados por significado?
- o mobile continua legível sem esmagar labels e controles?
- mensagens de erro ficam perto do campo?
- o CTA principal continua visível e hierarquizado?

Questões abertas:

- filtros compactos devem ganhar um container oficial único para o sistema?
- vale promover `.filters` e `.filter` para padrão mais global?
- em telas densas, quando quebrar filtros em duas linhas em vez de forçar uma só?

Exemplo de direção recomendada:

- cadastro e edição: formulário confortável com labels claras e CTA no rodapé
- listas operacionais: `table-filters` compactos acima da tabela
- análise e dashboards: `chart-filters` leves, com baixo peso visual

### Cards e painéis

Objetivo:

- diferenciar card informativo, card de ação e painel de configuração

Pontos para escolher:

- quando usar borda simples
- quando usar fundo semântico suave
- padrão de KPI
- padrão de painel com cabeçalho + ações

Variantes candidatas:

- card limpo de leitura
- card com header e ação
- painel de configuração
- bloco de status destacado

Decisão atual:

- usar `.card`, `.panel` e `.status-panel` como famílias-base
- revisar só os usos que estejam fugindo do padrão

Famílias reais já usadas no código:

- `.card`
- `.panel`
- `.status-panel`
- `.privacy-pill`
- extensões locais como:
  - `.executive-card`
  - `.chart-card`
  - `.action-card`
  - `.danger-card`

Leitura do estado atual:

- `.card` é a base mais flexível e mais reaproveitada do sistema
- `.panel` funciona melhor para páginas de configuração e blocos administrativos
- `.status-panel` faz sentido para estados únicos de jornada, como billing pendente
- `.privacy-pill` funciona como micro-card informativo, não como card estrutural
- algumas telas criaram subclasses úteis, mas o risco é começar a proliferar variações sem governança

Direção recomendada:

- usar `.card` como container padrão para leitura e conteúdo principal
- usar `.panel` para configuração, privacidade, preferências e telas com header de seção
- usar `.status-panel` para jornadas de estado único, confirmação, pendência e falha
- manter subclasses só quando acrescentarem função clara, não apenas estética local

Catálogo funcional proposto:

| Papel | Classe base preferida | Quando usar | Observação |
|---|---|---|---|
| Card padrão | `.card` | KPI, resumo, listas, gráficos, blocos gerais | base principal do sistema |
| Painel de seção | `.panel` | preferências, dados do usuário, áreas administrativas | melhor para header + corpo |
| Painel de status | `.status-panel` | sucesso, pendência, falha, confirmação | linguagem mais focada em jornada |
| Microbloco informativo | `.privacy-pill` | badges informativas e indicadores leves | não usar como container principal |

Checklist de aprovação para novos cards:

- o componente precisa mesmo de uma nova subvariante?
- a diferença é funcional ou apenas cosmética?
- a nova classe pode herdar de `.card` ou `.panel`?
- o mesmo padrão funciona em desktop e mobile?
- o cabeçalho, ações e corpo continuam legíveis com dados financeiros densos?

Questões abertas:

- `executive-card` deve virar padrão oficial de KPI?
- `chart-card` deve ser documentado como extensão oficial para visualizações?
- cards de risco ou atenção merecem família semântica própria ou só header/badge contextual?

Exemplo de direção recomendada:

- Home e dashboards: `.card` + subvariante aprovada de KPI quando necessário
- Preferências, segurança e LGPD: `.panel`
- Billing pendente, sucesso ou falha: `.status-panel`
- Estatutos curtos e indicadores auxiliares: `.privacy-pill`

### Tabelas e listas

Objetivo:

- escolher padrão de densidade, ações e estados vazios

Pontos para escolher:

- zebra ou sem zebra
- ação por linha com ícone ou texto
- responsividade em telas menores
- cabeçalho fixo ou simples

Variantes candidatas:

- tabela densa
- tabela confortável
- lista em cards no mobile

Decisão atual:

- pendente

Famílias reais já usadas no código:

- tabelas HTML com `thead` e `tbody`
- wrappers como `.table-wrap`
- filtros locais como `.table-filters`
- paginação local como `.table-pagination`
- tabela customizada da calculadora:
  - `.table`
  - `.table__head`
  - `.table__row`
- componentes de apoio:
  - `EmptyStateComponent`
  - `StatusBadgeComponent`

Leitura do estado atual:

- o produto já usa bem tabela HTML tradicional para listas operacionais
- `.table-wrap` aparece como padrão recorrente para overflow horizontal
- `EmptyStateComponent` e `StatusBadgeComponent` já ajudam bastante a dar consistência
- ainda existe mistura entre:
  - tabela HTML clássica
  - tabela estilizada por utilitários locais
  - tabela customizada em `div` na calculadora
- essa mistura não é necessariamente errada, mas precisa de critério para não parecer cada tela de um jeito

Direção recomendada:

- usar tabela HTML tradicional como padrão principal para dados operacionais
- usar `.table-wrap` como wrapper padrão para responsividade horizontal
- usar `StatusBadgeComponent` para status recorrentes em vez de inventar label local a cada tela
- usar `EmptyStateComponent` sempre que uma lista estiver vazia e houver CTA útil
- manter a tabela da calculadora como padrão específico de módulo, não como base global do produto inteiro

Catálogo funcional proposto:

| Papel | Estrutura preferida | Quando usar | Observação |
|---|---|---|---|
| Lista operacional | `table + thead/tbody` | despesas, receitas, usuários, robôs, extratos, posições | padrão principal do sistema |
| Wrapper responsivo | `.table-wrap` | qualquer tabela com muitas colunas | obrigatório em casos densos |
| Filtro de tabela | `.table-filters` ou bloco equivalente | listas com ordenação, busca e filtro | manter próximo da tabela |
| Paginação | `.table-pagination` | listas longas sem scroll infinito | padrão simples e previsível |
| Estado vazio | `app-empty-state` | ausência de dados com CTA ou orientação | preferir a componente central |
| Badge de status | `app-status-badge` | pago, pendente, atrasado, ativo, etc. | evitar status solto por texto cru |
| Tabela especial de cálculo | `.table`, `.table__head`, `.table__row` | calculadoras e visões didáticas | tratar como exceção especializada |

Checklist de aprovação para novas tabelas:

- precisa mesmo ser tabela ou a informação funciona melhor em cards?
- haverá leitura principal em desktop ou em mobile?
- há colunas demais para uma tela pequena?
- o `overflow-x` foi tratado sem quebrar a leitura?
- ações por linha estão claras e consistentes?
- status estão usando badge reutilizável?
- existe estado vazio legível?

Questões abertas:

- listas muito densas no mobile devem sempre virar scroll horizontal ou em alguns casos virar cards?
- a família `.table-wrap` deveria ser promovida para um padrão global em vez de continuar local a alguns módulos?
- faz sentido consolidar cabeçalhos e células base em uma classe compartilhada em vez de depender de utilitários espalhados?

Exemplo de direção recomendada:

- despesas, receitas, usuários, robôs e contas: tabela HTML padrão + `app-status-badge` + `app-empty-state`
- investimentos e empréstimos: tabela HTML padrão + `.table-wrap` + paginação quando necessário
- calculadora: manter a tabela em `div` como padrão especializado do módulo, sem promover para uso geral

### Modais e confirmações

Objetivo:

- consolidar um padrão único de diálogo

Pontos para escolher:

- largura padrão
- posição das ações
- tom do conteúdo destrutivo
- quando usar modal vs página dedicada

Variantes candidatas:

- modal compacto
- modal médio com formulário
- confirmação destrutiva curta

Decisão atual:

- usar `ConfirmDialogComponent` e estrutura `.modal*` como base obrigatória

### Empty, loading e erro

Objetivo:

- padronizar estados transversais

Pontos para escolher:

- quanto texto usar
- quando ter CTA
- diferença entre vazio inicial e vazio filtrado
- padrão de skeleton vs spinner

Variantes candidatas:

- empty state com ilustração leve
- empty state textual
- skeleton para lista/tabela
- spinner para ação curta

Decisão atual:

- pendente

### Navegação e shell

Objetivo:

- revisar coerência do shell autenticado em desktop e mobile

Pontos para escolher:

- densidade da sidebar
- comportamento da bottom navigation
- destaque de item ativo
- header contextual por tela

Variantes candidatas:

- navegação lateral mais sóbria
- navegação lateral mais destacada
- mobile com foco em ações rápidas

Decisão atual:

- pendente

## Tabela de decisão rápida

| Componente | Estado | Próximo passo |
|---|---|---|
| Botões | Em revisão | unificar família secundária e ghost |
| Inputs e filtros | Aberto | escolher densidade padrão |
| Cards e painéis | Em revisão | consolidar usos por tipo |
| Tabelas e listas | Aberto | definir padrão desktop/mobile |
| Modais | Em revisão | validar largura e ações |
| Empty/loading/error | Aberto | definir padrão por contexto |
| Navegação e shell | Aberto | revisar consistência visual |

## Quando atualizar

Atualize este arquivo quando:

- uma nova família de componente precisar ser desenhada
- houver dúvida entre duas abordagens visuais
- uma tela exigir padrão reutilizável ainda não consolidado

Quando a escolha estiver madura, mover a versão aprovada para o [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).
