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

## 5) Regras de ouro
- Cards nao usam fundo verde/vermelho, exceto cards de status/resumo com tom suave.
- Verde/vermelho geralmente em numeros, icones ou badges; fundo semantico apenas quando ajudar a leitura.
- Espacamento sempre multiplo de 8px.
- Sidebar "silenciosa", sem cores gritantes.
- Dashboard mostra pouco e importante.
- Graficos sem poluicao visual.

## 6) Componentes-chave
### Card financeiro
- Fundo neutro.
- Icone pequeno com fundo leve.
- Valor grande e descricao curta.

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
- Primario: fundo --primary, texto claro.
- Ghost: fundo transparente, borda sutil.
- Hover com leve realce.

## 11) Inputs e forms
- Bordas suaves, foco com cor de acao.
- Placeholder em texto muted.

## 12) Estados vazios
- Mensagem objetiva + CTA.
- Sem ilustrações pesadas.

## 13) Graficos
- Linha fina, cores semanticas.
- Grade leve e discreta.

## 14) Acessibilidade
- Contraste minimo recomendado.
- Alvos clicaveis >= 40px de altura.
- Estados de foco visiveis.

## 15) Tom visual
- Deve parecer produto financeiro moderno.
- Nao parecer "planilha bonita".
- Nao parecer "sistema corporativo interno".
