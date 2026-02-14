# System Designer - Investindo em Negocios

Este documento consolida o Design System aplicado ao projeto. Ele define
identidade, tokens, componentes e regras de uso para garantir consistencia.

## 1) Identidade e posicionamento
- Produto financeiro serio, moderno e acessivel.
- Valores: confianca, organizacao, simplicidade e profissionalismo.
- Visual limpo, contraste controlado e cores semanticas discretas.

## 2) Tipografia
- Fonte principal: Inter.
- Fallback: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif.
- Regras:
  - Numeros financeiros: SemiBold.
  - Texto longo: Regular.
  - Nada de fontes decorativas.

## 3) Paleta oficial
### Light (padrao)
- Background: #F8FAFC
- Surface/Card: #FFFFFF
- Sidebar: #FFFFFF
- Border: #E5E7EB

- Texto primario: #0F172A
- Texto secundario: #475569
- Texto muted: #64748B

- Receita (sucesso): #22C55E
- Despesa (perigo): #EF4444
- Info/Saldo: #0EA5E9
- Acao principal: #2563EB

### Dark
- Background: #0B1220
- Surface/Card: #111827
- Sidebar: #020617
- Border: #1F2937

- Texto primario: #E5E7EB
- Texto secundario: #94A3B8
- Texto muted: #64748B

- Semantica igual ao Light (consistencia).

## 4) Tokens globais (referencia)
- Cores base:
  - --bg, --surface, --surface-2, --surface-3
  - --border, --border-strong
  - --text, --text-secondary, --text-muted
- Semantica:
  - --primary, --success, --danger, --info, --warning
- Sombra:
  - --shadow-md (cards e dropdowns)
- Espacamento:
  - --space-1 (8px), --space-2 (16px), --space-3 (24px), --space-4 (32px), --space-5 (40px), --space-6 (48px)
- Tipografia:
  - --text-xs (12px), --text-sm (14px), --text-md (16px), --text-lg (18px), --text-xl (20px), --text-2xl (24px), --text-3xl (30px), --text-4xl (36px), --text-5xl (48px)

## 5) Regras de ouro
- Cards nao usam fundo verde/vermelho, exceto cards de status/resumo com tom suave.
- Verde/vermelho geralmente em numeros, icones ou badges; fundo semantico apenas quando ajudar a leitura.
- Espacamento sempre multiplo de 8px.
- Min/max de clamp seguem base 8px.
- Sidebar "silenciosa", sem cores gritantes.
- Dashboard mostra pouco e importante.
- Graficos sem poluicao visual.

## 6) Componentes-chave
### Card financeiro
- Fundo neutro.
- Icone pequeno com fundo leve.
- Valor grande e descricao curta.
- Tooltip com icone "i" padrao (ver Tooltips).

### Sidebar
- Largura ~240px.
- Icones outline, monocromaticos.
- Item ativo com destaque sutil.
- Sem cores gritantes.

### Topbar
- Slogan discreto.
- Acoes alinhadas a direita.
- Dropdowns com sombra leve.

### Dashboard
- Primeira dobra: visao geral.
- Segunda dobra: analise.
- Estados vazios elegantes (educam o usuario).
- Card "Resultado do mes" como bloco principal:
  - Exibe saldo do mes em destaque.
  - Badge discreto "Receitas x Despesas".
  - Barra proporcional com verde (receitas) e vermelho (despesas).
  - Percentuais visiveis por chip (Receitas/Despesas).

## 7) Icones
- Icones default: cinza/azul neutro.
- Ativo:
  - Receitas: verde.
  - Despesas: vermelho.
  - Demais: azul.
- Fundo do icone em pastilha suave.

## 8) Texto e hierarquia
### Hero / Cabecalho
- Eyebrow: pequeno, semibold, tracking leve.
- Titulo: semibold, line-height enxuto.
- Subtitulo: regular, line-height confortavel.

Exemplo:
Resumo financeiro
Visao geral de janeiro de 2026
Combine receitas, despesas e cartoes para saber o quanto pode gastar.

## 9) Espacamento e grid
- Base 8px.
- Cards com 12-16px de padding interno.
- Gaps em listas: 8-12px.
- Use tokens de espacamento (space-1..6) nos paddings e gaps.

## 10) Botoes
- **Padrao (Tailwind + tokens)**: usar classes globais `btn-primary`, `btn-danger`, `btn-warning`, `btn-ghost`, `btn-cancel`.
- Primario: fundo --primary, texto claro, sombra suave.
- Ghost: fundo transparente, borda sutil.
- Cancelar: borda forte e texto muted (nao usar vermelho).
- Hover com leve realce.

### Tamanhos
- Default: altura `--control-h` (40px).
- Pequeno: adicionar `sm` (altura 40px, padding menor).

### Botoes de acao em listas
- Padrao icon-only, igual ao estilo dos icones do menu.
- Tamanho 42x42, raio 14px, borda sutil e fundo leve.
- Editar (primary) e Excluir (danger) com fundo semantico suave.
- Historico/Info usa tom --info.
- Hover: leve elevacao (shadow) e contraste discreto.
- Nunca usar botao retangular com texto em listas densas.

## 10.2) Badges / Status
- Status devem ser **legiveis** (evitar texto claro em fundo claro).
- Padrao: `border` + `bg-100` + `text-700`.
- Ex.: Pendente (amber), Pago (emerald), Cancelado (rose), Antecipado (sky), Parcial (orange).

## 10.1) Tooltips (padrao)
- Icone: botao circular "i" igual ao dos cards (26x26, borda sutil, bg surface-2).
- Tooltip: caixa 12px de radius, borda forte (--border-strong), fundo surface, shadow-lg.
- Seta (quadrado 8px rotacionado) com mesma borda e fundo do tooltip.
- Texto objetivo (1-2 frases).
- Sempre alinhado a direita quando estiver no topo de cards.

## 11) Inputs e forms
- Bordas suaves, foco com cor de acao.
- Placeholder em texto muted.
- Form actions: `btn-primary sm` e `btn-cancel sm`.

## 12) Estados vazios
- Mensagem objetiva + CTA.
- Sem ilustrações pesadas.

## 13) Graficos
- Evitar excesso de visualizacao simultanea.
- Preferir "Resultado do mes" (barra proporcional) para leitura rapida.
- Verde para receitas, vermelho para despesas.
- Se houver grafico, usar grade leve e linhas finas sem poluicao.

## 14) Acessibilidade
- Contraste minimo recomendado.
- Alvos clicaveis >= 40px de altura.
- Estados de foco visiveis.

## 15) Modais e confirmações
- Evitar `window.confirm`. Usar modal do sistema com:
  - Titulo, descricao curta e acao primaria/perigosa.
  - Botao `btn-cancel` para fechar.
  - `btn-danger` para exclusoes.

## 16) Datas (locale)
- Datas exibidas devem ser `DD/MM/AAAA` (pt-BR).
- Parse de ISO deve **preservar dia local** (sem deslocamento por timezone).

## 17) Tom visual
- Deve parecer produto financeiro moderno.
- Nao parecer "planilha bonita".
- Nao parecer "sistema corporativo interno".
