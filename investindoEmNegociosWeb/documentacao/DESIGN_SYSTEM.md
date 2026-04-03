# Design System - Investindo em Negócios

Documento normativo de padrões visuais e de interface reutilizáveis do frontend.

## Objetivo e escopo

Este documento existe para:

- padronizar tokens visuais e componentes reutilizáveis
- reduzir inconsistência entre telas
- facilitar revisão de UI antes de merge
- manter o frontend coerente com o que já existe no código

Este documento não deve ser usado para:

- backlog de produto
- status funcional
- arquitetura da solução
- copy comercial

Fonte real dos tokens atuais:

- [styles.scss](../src/styles.scss)

Observação importante:

- a direção `Command Premium` existe apenas como exploração no [systemDesigner.md](./systemDesigner.md) e no `Design Lab`
- ela não substitui os tokens oficiais enquanto não for validada explicitamente

## Princípios de UI

- clareza primeiro: informação financeira precisa ser fácil de ler
- semântica de cor: cor comunica estado, não decoração
- densidade controlada: telas ricas sem poluição visual
- consistência: mesma linguagem em botões, badges, cards, formulários e navegação
- acessibilidade: foco visível, contraste suficiente e alvos confortáveis

## Heurísticas de Nielsen

Toda decisão relevante de interface deve ser confrontada com estas 10 heurísticas:

1. visibilidade do status do sistema
- o usuário precisa entender rapidamente o que está acontecendo
- telas financeiras devem mostrar atualização, processamento, sucesso, erro e pendência de forma explícita

2. correspondência com o mundo real
- linguagem deve usar termos financeiros familiares
- evitar jargão técnico desnecessário, especialmente para `Basic`

3. controle e liberdade do usuário
- fluxos precisam permitir cancelar, voltar e corrigir
- ações irreversíveis devem ter recuo claro

4. consistência e padrões
- o mesmo tipo de informação deve manter o mesmo padrão visual
- não reinventar shell, tabela, filtro ou card a cada tela

5. prevenção de erros
- preferir interface que evita erro, em vez de só tratar erro depois
- exemplos: confirmar exclusão, limitar ações destrutivas, destacar período e contexto antes de confirmar

6. reconhecimento em vez de memorização
- menus, estados, filtros e ações devem ser autoexplicativos
- o usuário não deve precisar lembrar regras escondidas para operar o sistema

7. flexibilidade e eficiência de uso
- o produto deve ser simples para `Basic` e eficiente para `Intermediate` e `Advanced`
- a mesma base visual precisa suportar diferentes densidades sem mudar a identidade

8. estética e design minimalista
- minimalista aqui significa essencial e legível, não vazio ou fraco
- remover ruído visual que não melhora decisão

9. ajudar a reconhecer, diagnosticar e recuperar erros
- mensagens devem dizer o que falhou, onde falhou e qual o próximo passo
- nunca usar erro genérico quando o usuário precisa agir

10. ajuda e documentação
- interfaces mais densas devem oferecer contexto suficiente
- labels, subtítulos, callouts e empty states fazem parte da ajuda embutida do produto

## Boas práticas obrigatórias

- usar uma base visual única para todos os perfis
- variar profundidade e densidade por perfil, não identidade
- priorizar leitura financeira antes de ornamentação
- limitar cor de destaque a poucos papéis semânticos
- tratar `Basic` como referência de clareza
- tratar `Intermediate` e `Advanced` como ampliação de contexto, não como licença para poluir a tela
- projetar estados `loading`, `empty`, `error` e `success` desde o início
- validar cada componente em desktop e mobile

## Tokens oficiais

### Tipografia

- fonte principal: `Inter`
- fallback: `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
- token oficial de fonte:
  - `--font-sans`

Escala oficial:

- `--text-xs`: `12px`
- `--text-sm`: `14px`
- `--text-md`: `16px`
- `--text-lg`: `18px`
- `--text-xl`: `20px`
- `--text-2xl`: `24px`
- `--text-3xl`: `30px`
- `--text-4xl`: `36px`
- `--text-5xl`: `48px`

Regra prática:

- números financeiros devem usar peso `600` ou `700`
- títulos e KPIs devem priorizar contraste e hierarquia, não tamanho excessivo

### Espaçamento

Grid base:

- múltiplos de `8px`

Tokens oficiais:

- `--space-1`: `8px`
- `--space-2`: `16px`
- `--space-3`: `24px`
- `--space-4`: `32px`
- `--space-5`: `40px`
- `--space-6`: `48px`

### Cores e superfícies

Tema claro:

- `--bg`: `#f8fafc`
- `--surface`: `#ffffff`
- `--surface-2`: `#f1f5f9`
- `--surface-3`: `#e2e8f0`
- `--sidebar`: `#ffffff`
- `--border`: `#e5e7eb`
- `--border-strong`: `#cbd5e1`
- `--text`: `#0f172a`
- `--text-secondary`: `#475569`
- `--text-muted`: `#64748b`

Semântica oficial:

- `--primary`: `#2563eb`
- `--success`: `#22c55e`
- `--danger`: `#ef4444`
- `--warning`: `#f59e0b`
- `--info`: `#0ea5e9`
- `--on-primary`: `#f8fafc`

Tema escuro:

- `--bg`: `#0b1220`
- `--surface`: `#111827`
- `--surface-2`: `#0f172a`
- `--surface-3`: `#1f2937`
- `--sidebar`: `#020617`
- `--border`: `#1f2937`
- `--border-strong`: `#334155`
- `--text`: `#e5e7eb`
- `--text-secondary`: `#94a3b8`
- `--text-muted`: `#64748b`

### Raio, sombra e controle

- `--radius-md`: `12px`
- `--radius-lg`: `16px`
- `--control-h`: `48px`
- `--shadow-sm`
- `--shadow-md`

Regra prática:

- não criar novos raios e sombras arbitrariamente sem necessidade real
- preferir os tokens existentes antes de inventar variações locais

## Componentes reutilizáveis

### Botões

Classes atualmente usadas:

- `.btn-primary`
- `.btn-danger`
- `.btn-warning`
- `.btn-ghost`
- `.btn-cancel`
- `.btn-edit`
- `.ghost`
- `.icon-action`
- `.icon-action--edit`
- `.icon-action--danger`
- `.icon-action--info`
- `.sm`

Regras:

- altura padrão: `--control-h`
- padding base: `var(--space-1) var(--space-2)`
- raio base: `12px`
- peso de texto: `700`
- hover deve aumentar contraste, não mudar drasticamente o estilo
- ação destrutiva deve usar `.btn-danger`
- ação primária deve usar `.btn-primary`
- ação secundária discreta deve usar `.btn-ghost` ou `.ghost`

Evitar:

- criar nova classe de botão sem documentar aqui
- usar botão visualmente primário para ação secundária

Padrão para ações compactas em listas:

- usar `.icon-action`
- tamanho base atual: `42x42`
- raio atual: `14px`
- usar modificadores semânticos para edição, perigo e informação

### Inputs e formulários

Elementos base:

- `input`
- `select`
- `textarea`

Padrão atual:

- fundo em `--surface`
- borda em `--border`
- raio em `--radius-md`
- placeholder em `--text-muted`
- foco com `outline` visível

Regras:

- formulários devem ter CTA principal e ação secundária claramente distintas
- não usar estados inválidos só por cor; combinar cor com texto/mensagem
- labels devem permanecer legíveis e consistentes

### Badges e estados semânticos

Semântica sugerida:

- pendente: `warning`
- pago/recebido: `success`
- cancelado: `danger`
- antecipado: `info`
- parcial: `warning` com nuance

Regras:

- usar borda + fundo suave + texto escuro/legível
- não usar texto claro em fundo claro
- status deve ser identificável também sem depender apenas de cor

### Cards

Padrão esperado:

- fundo neutro
- hierarquia clara entre label, valor e observação
- sem uso agressivo de cor semântica no fundo de cards de leitura geral

Padrões que já aparecem no frontend:

- `.card`
- `.panel`
- `.status-panel`
- `.privacy-pill`

Usos típicos:

- KPI
- resumo financeiro
- blocos de configuração
- estados vazios guiados

Regra:

- preferir uma dessas famílias já existentes antes de criar novo container visual
- manter borda, superfície e espaçamento coerentes com os tokens globais
- cards de leitura devem privilegiar contraste e organização, não enfeite visual

### Modais e confirmações

Regra obrigatória:

- não usar `window.confirm`

Estrutura mínima:

- título
- descrição curta
- ação principal ou destrutiva
- ação secundária com padrão de cancelamento

Padrões reais já existentes:

- `ConfirmDialogComponent`
- `.modal`
- `.modal__backdrop`
- `.modal__card`
- `.modal__actions`
- `.signup-modal`

Regra:

- novos modais devem nascer a partir do padrão de modal já existente
- backdrop, card, fechamento e ações precisam permanecer consistentes entre fluxos

### Tooltips e ajuda contextual

Padrão esperado:

- gatilho discreto
- conteúdo curto e objetivo
- borda forte o suficiente para destacar sem competir com o conteúdo principal

### Tabelas e listas

Regras:

- cabeçalho com contraste adequado
- números alinhados e formatados por locale
- ações consistentes entre linhas
- densidade adequada para desktop com adaptação para mobile

Padrões que já existem no código:

- tabelas HTML com `thead` em `--surface-2`
- wrappers como `.table-wrap`
- variantes utilitárias como `.table`, `.table--wide`
- listas com `EmptyStateComponent`
- status com `StatusBadgeComponent`

Regra:

- quando houver listagem sem dados, usar estado vazio em vez de tabela “morta”
- evitar criar tabela sem wrapper responsivo em módulos densos
- ações por linha devem reaproveitar padrão de botão ou `icon-action`

### Feedback e alertas

Padrões reais existentes:

- `.inline-alert`
- `.global-alert`
- `.global-alert--feedback`
- blocos locais `.feedback.success` e `.feedback.error`

Regra:

- sucesso, erro, aviso e info devem seguir semântica consistente com os tokens oficiais
- feedback global deve ser usado para retorno de ação transversal
- alertas inline devem ser usados quando o erro ou aviso pertence a um bloco específico da tela

### Estados de interface

Toda tela ou módulo crítico deve considerar:

- `loading`
- `empty`
- `error`

Regra:

- estado vazio deve explicar a situação e, quando fizer sentido, oferecer CTA
- estado de erro deve ser claro e operacional, sem mensagem genérica demais
- estado de loading deve aparecer no mesmo contexto visual da ação ou da área carregada

Padrões reais já existentes:

- `EmptyStateComponent`
- textos como `Carregando...`
- feedback global via `UiFeedbackService`

Regras práticas:

- `loading`: mostrar na própria área afetada, sem bloquear a tela inteira sem necessidade
- `empty`: explicar ausência de dados e, quando aplicável, sugerir próxima ação
- `error`: mensagem curta, acionável e contextual

## Layout e navegação

### Sidebar e navegação principal

Padrão desejado:

- visual silencioso
- item ativo com destaque discreto
- navegação não deve competir com o conteúdo principal

### Topbar

Padrão desejado:

- ações à direita
- tema, notificações e menu do usuário consistentes entre telas

### Mobile dock

Padrão atual:

- shell autenticado com navegação inferior
- safe area respeitada

Regra:

- mobile deve priorizar acesso rápido aos fluxos principais

## Gráficos e visualização analítica

Princípios:

- mostrar o necessário para decisão
- evitar excesso de séries simultâneas
- manter legenda e leitura consistentes com o tema

Uso de cor:

- resultado positivo: `--success`
- perda/despesa: `--danger`
- comparativo/benchmark: `--primary` e `--info`

Regra:

- cards de gráfico lado a lado devem manter altura visual coerente

## Acessibilidade e UX

- alvos clicáveis com pelo menos `40px`
- navegação por teclado preservada
- foco sempre visível
- contraste suficiente para texto e controles
- formulários e estados não devem depender apenas de cor

## Internacionalização e formatação

- locale padrão: `pt-BR`
- data padrão de exibição: `DD/MM/AAAA`
- valores monetários devem respeitar locale e currency ativos
- parse de datas deve evitar deslocamento de fuso local indevido

## Performance visual

- evitar assets grandes sem necessidade
- definir `width` e `height` em imagens quando aplicável
- evitar dependência de fonte externa bloqueante na renderização crítica
- preferir lazy loading em rotas e partes não críticas

## Checklist de revisão de UI

- [ ] usa tokens oficiais de cor, tipografia e espaçamento
- [ ] usa padrões de botão já existentes
- [ ] respeita foco visível e contraste
- [ ] trata `loading`, `empty` e `error`
- [ ] está coerente em desktop e mobile
- [ ] não usa `window.confirm`
- [ ] mantém semântica financeira consistente

## Quando atualizar este documento

- quando um novo token visual oficial for criado
- quando um componente reutilizável mudar de padrão
- quando o frontend consolidar novo padrão de layout ou navegação
- quando o código base em `styles.scss` mudar de forma relevante
