# Componentes — especificação

Todos os valores referenciam `tokens.css`. Onde há número absoluto, é porque o valor é fixo e não escala.

---

## 1. Shell

### 1.1 Sidebar

```
width: 212px; flex: none; position: sticky; top: 0; height: 100vh;
background: #002E3E; color: #fff;
display: flex; flex-direction: column;
```

**Marca** — `padding: 18px 18px 16px`, `display:flex; align-items:center; gap:10px`.
Logo `height:26px; width:auto` + wordmark "Investindo em Negócios" em Poppins 12px/700, `letter-spacing:-.01em`, `white-space:nowrap`, uma linha só, sem o "em" em verde.

**Navegação** — `flex:1; display:grid; gap:2px; padding:4px 10px; align-content:start; overflow:auto`.

Rótulo de grupo: `padding:12px 11px 5px`, 9px/700, `letter-spacing:.16em`, uppercase, `#5E7F8B`.
Grupos, nesta ordem: **Visão geral** · **Movimentações** · **Planejamento** · **Análises** · **Conta**.

Item: `height:34px; padding:0 11px; border-radius:9px; gap:10px`, 12px/400, cor `#9FBAC3`. Ícone 16px.
- hover: `background: rgba(255,255,255,.06)`, cor `#fff`
- ativo: `background: rgba(255,255,255,.10)`, cor `#fff`, peso 600, e uma barra `position:absolute; left:0; top:50%; width:3px; height:16px; margin-top:-8px; border-radius:999px; background:#4FB783`

**Rodapé de perfil** — `padding:14px 16px; border-top:1px solid rgba(255,255,255,.08)`. Avatar circular 30px com iniciais em 11px/700 sobre `rgba(255,255,255,.12)`; nome 11px/600 branco; plano 10px `#7E9CA6`. É clicável (abre menu da conta / sair).

### 1.2 Topbar

```
position: sticky; top: 0; z-index: 4;
height: 56px; padding: 0 28px;
display: flex; align-items: center; gap: 14px;
background: rgba(255,255,255,.92); backdrop-filter: blur(8px);
border-bottom: 1px solid #E4EBEF;
```

- **Busca**: `flex:1; max-width:360px; height:34px; padding:0 11px; border:1px solid #E4EBEF; border-radius:10px; background:#F8FAFB`. Ícone de lupa 14px, texto placeholder 12px `#9FB2BB`, e o atalho `⌘K` à direita em 10px sobre `#EDF2F5`, `border-radius:5px`, `padding:2px 6px`. Hover: borda `#C3D2DA`, fundo branco.
- **Ações à direita** (`margin-left:auto; gap:10px`): pílula **Assistente** (`height:30px; padding:0 12px; border-radius:999px; background:rgba(52,144,99,.12); color:#2A7551`, 12px/600, ícone de balão 14px); ícone-botão de ocultar valores; ícone-botão de tema; ícone-botão de notificações com ponto `#D9483F` de 6px no canto superior direito.
- Ícone-botão: 30px, `border-radius:9px`, cor `#7A929E`; hover fundo `#F1F5F7` e cor `#0A2430`.

### 1.3 Área de conteúdo

```
flex: 1; padding: 26px 28px 40px;
display: flex; flex-direction: column; gap: 16px;
```
Fundo do app `#F4F7F9`. Sem largura máxima — a grade interna de cada tela controla a leitura.

---

## 2. Page header

Padrão reutilizável no topo de cada tela.

```
display: flex; align-items: flex-end; justify-content: space-between;
gap: 20px; flex-wrap: wrap;
```

**Bloco de texto** (esquerda):
- eyebrow: 10px/700, `letter-spacing:.18em`, uppercase, `#7A929E`
- título: Poppins 26px/600, `letter-spacing:-.025em`, `margin:6px 0 4px`
- descrição: 13px `#46606C`, `max-width:74ch`

**Bloco de ações** (direita, `flex:none; gap:10px`):
- seletor de período quando aplicável (segmented ou setas ‹ ›)
- ação secundária: botão de borda
- ação principal: botão azul

Quando a tela tem navegação de mês, as setas ficam neste bloco: ícone-botão 32px, `border:1px solid #D6E0E6; border-radius:9px`, fundo branco, hover `#F1F5F7`.

---

## 3. Cards

### 3.1 Card de métrica (KPI)

Dois formatos:

**(a) Cards soltos com gap** — usado em Metas, Contas, Orçamento, Cartões.
```
/* container */ display: flex; flex-wrap: wrap; gap: 16px;
/* card */      flex: 1 1 210px; min-width: 0;
                background: #fff; border: 1px solid #E4EBEF;
                border-radius: 16px; padding: 18px 20px;
```

**(b) Faixa unida com divisores** — usado em Investimentos, Calendário, Dashboard.
```
/* container */ display: flex; flex-wrap: wrap;
                background: #fff; border: 1px solid #E4EBEF;
                border-radius: 16px; overflow: hidden;
/* célula */    flex: 1 1 200px; min-width: 0; padding: 18px 20px;
                box-shadow: 1px 0 0 #EEF3F5, 0 1px 0 #EEF3F5;
```
O `box-shadow` no lugar de `border-right` é deliberado: quando a faixa quebra em duas linhas, a sombra desenha divisor à direita **e** abaixo, então não sobra linha solta na borda nem falta divisor entre as linhas.

**Conteúdo do card**, na ordem:
1. Linha de cabeçalho: ícone-caixa 30px (`border-radius:9px`, fundo em tint da cor semântica) + rótulo 11px/700 `letter-spacing:.14em` uppercase `#7A929E` + botão de tooltip `?` empurrado para a direita
2. Valor: Poppins 26px/600 (ou 20px na faixa unida), `letter-spacing:-.03em`, `margin-top:10px`, `tabular-nums`
3. Nota: 12px `#7A929E`, `margin-top:6px`

**Tooltip `?`**: 18px circular, `border:1px solid #D6E0E6`, texto 10px/700 `#9FB2BB`, `cursor:help`, com `title` descrevendo o cálculo.

### 3.2 Card de conteúdo / seção

```
background: #fff; border: 1px solid #E4EBEF;
border-radius: 16px; padding: 20px 22px;
```
Título 15px/600 + descrição 12px `#7A929E` `margin-bottom:14–18px`. Seções que contêm tabela usam `border-radius:18px; padding:0` e recebem o padding nas faixas internas.

### 3.3 Card de insight / alerta

Mesma caixa, com borda e fundo tintados pela severidade:
- atenção: `border-color: rgba(201,122,21,.24)`, itens internos com fundo `rgba(201,122,21,.08)`
- crítico: `border-color: rgba(217,72,63,.24)`, itens com `rgba(217,72,63,.05)` e borda `rgba(217,72,63,.18)`
- positivo: `rgba(52,144,99,.24)` / `rgba(52,144,99,.07)`

Cabeçalho com ícone 15px na cor de texto da severidade + título 14px/600.

### 3.4 Card com hover (clicável)

```
transition: border-color 160ms, box-shadow 180ms, transform 180ms cubic-bezier(.2,.7,.3,1);
:hover { transform: translateY(-2px); border-color: #C3D2DA;
         box-shadow: 0 14px 30px -20px rgba(3,32,44,.4); }
```
Dois pixels bastam. É a borda escurecendo que faz o card parecer erguido, não a sombra.

### 3.5 Estado vazio

```
display: flex; flex-direction: column; align-items: center; gap: 14px;
padding: 52–64px 24px; text-align: center;
background: #fff; border: 1px solid #E4EBEF; border-radius: 16px;
```
Ícone-caixa 46–52px `border-radius:14–16px` fundo `#F1F5F7` cor `#9FB2BB` · título 15–16px/600 · texto 13px `#7A929E` `max-width:44ch` · botão azul de ação.

---

## 4. Tabela

```
/* seção */    background:#fff; border:1px solid #E4EBEF; border-radius:18px; overflow:hidden
/* scroller */ overflow-x: auto
/* trilho */   min-width: <soma das colunas + gaps>px
```

**Cabeçalho**: `padding:10px 22px; background:#F8FAFB; border-bottom:1px solid #EEF3F5`, texto 10px/700 `letter-spacing:.1em` uppercase `#7A929E`.

**Linha**: `padding:11–12px 22px; border-bottom:1px solid #F2F6F8`, altura mínima 56px.
Hover: `background:#F8FAFB`, transição 140ms. Sem borda, sem sombra — em tabela, sombra por linha vira ruído.

**Cabeçalho e linha compartilham o mesmo `grid-template-columns`.** Colunas de conteúdo variável usam `minmax(<piso>, <fr>)`; colunas de valor e ação são fixas em px.

**Célula de nome**: título 13px/600 + subtítulo 11px `#9FB2BB`, ambos com `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` e o pai com `min-width:0`.

**Célula monetária**: `text-align:right`, 13px/600, `tabular-nums`, `white-space:nowrap`. Complemento (parcela, percentual) em 10px abaixo.

**Célula de status**: badge — `padding:3px 10px; border-radius:999px`, 11px/600, fundo em tint e texto na cor de texto da severidade.

**Célula de ações**: `display:flex; justify-content:flex-end; gap:4px`. Ícone-botão 28px `border-radius:8px` cor `#9FB2BB`; hover fundo `#EDF2F5` cor `#0A2430`. Ação destrutiva: hover fundo `rgba(217,72,63,.10)` cor `#B3372F`.

**Seleção em lote**: checkbox 15px `border:1.5px solid #C3D2DA; border-radius:4px`; marcado `background:#2563EB; border-color:#2563EB` com check branco 10px. Ao ter seleção, aparece uma barra acima da tabela: `padding:12px 24px; background:rgba(37,99,235,.06); border-bottom:1px solid #EEF3F5`, com contagem em 12px/600 `#1D4ED8`, os seletores de conta e as ações em lote à direita.

**Rodapé**: `padding:13–14px 22px`, contagem à esquerda em 12px `#7A929E`, paginação à direita. Página atual: 30px, `background:#002E3E`, texto branco 12px/600, `border-radius:8px`. Outras: `border:1px solid #E4EBEF`, cor `#46606C`.

**Linha de total**: `padding:14px 22px; background:#FBFCFD; border-top:1px solid #EEF3F5`, mesmas colunas, rótulo "Total" em 12px/700 uppercase `letter-spacing:.06em` `#7A929E`.

**Mobile**: a tabela vira lista de cards — `border:1px solid #E4EBEF; border-radius:12px; padding:14px 16px`, com nome e valor na primeira linha e badge + metadados na segunda. Nunca scroll horizontal infinito.

---

## 5. Formulário

### 5.1 Input de texto

```
height: 42px; padding: 0 12px;
border: 1px solid #E4EBEF; border-radius: 10px; background: #F8FAFB;
font: 400 13px Inter; color: #0A2430; outline: none;
:focus { border-color:#2563EB; background:#fff; box-shadow:0 0 0 4px rgba(37,99,235,.12); }
```
Label acima: 12px/600, `gap:6px`. Hint abaixo: 11px `#9FB2BB`.

### 5.2 Campo monetário

Mesma caixa, com prefixo `R$` em 12px `#7A929E` antes do input, que fica `flex:1; border:none; background:transparent; font:600 14px Inter` e `tabular-nums`. Vírgula para centavos.

### 5.3 Dropdown (padrão obrigatório para valor múltiplo)

O botão fechado:
```
height: 42px; padding: 0 12px; display:flex; align-items:center; justify-content:space-between; gap:10px;
border: 1px solid #E4EBEF; border-radius: 10px; background: #F8FAFB;
font: 400 13px Inter; text-align: left; cursor: pointer;
/* aberto */ border-color:#2563EB; background:#fff; box-shadow:0 0 0 4px rgba(37,99,235,.12);
```
Conteúdo: ponto colorido 9px (`border-radius:3px`) na cor da categoria + rótulo com ellipsis; chevron 15px `#7A929E` à direita que gira 180° em 160ms quando aberto.
Quando nada está selecionado, o rótulo é placeholder em `#9FB2BB` e o ponto fica transparente.

O menu:
```
position: absolute; top: 100%; left: 0; right: 0; z-index: 6; margin-top: 6px;
max-height: 210px; overflow-y: auto; padding: 5px;
background: #fff; border: 1px solid #E4EBEF; border-radius: 12px;
box-shadow: 0 20px 44px -18px rgba(3,32,44,.45);
```
Opção: `padding:9px 10px; border-radius:9px; gap:10px`, 13px. Ponto colorido + rótulo + (opcional) metadado à direita em 11px `#9FB2BB` + check azul 14px visível só na selecionada. Hover `background:#F4F7F9`. Selecionada: `background:rgba(37,99,235,.08)`, cor `#1D4ED8`, peso 600.

Opcional no topo: campo de busca (`padding:10px 12px; border-bottom:1px solid #EEF3F5`). Opcional no rodapé: ação "Criar nova…" (`border-top:1px solid #EEF3F5; background:#FBFCFD`, cor `#1D4ED8`, 12px/600).

O menu entra com fade de 200ms. Abrir um dropdown fecha os outros da mesma tela.

### 5.4 Stepper numérico

```
height: 38px; display:flex; align-items:center; overflow:hidden;
border: 1px solid #E4EBEF; border-radius: 10px; background: #fff;
```
Botão − : `width:28–34px; border-right:1px solid #EEF3F5`, símbolo 15px `#46606C`. Botão + espelhado com `border-left`. No meio, um `<input>` `flex:1; min-width:0; text-align:center; border:none; background:transparent; font:600 12–14px`, `tabular-nums`. **O campo aceita digitação** — os botões são atalho, não a única entrada. Valor digitado é sanitizado e limitado ao intervalo válido.

### 5.5 Toggle

```
width: 42px; height: 24px; border-radius: 999px;
background: #DCE4E8;  /* ligado: #2563EB */
/* pino */ position:absolute; top:3px; left:3px (ligado: left:21px);
           width:18px; height:18px; border-radius:999px; background:#fff;
           transition: left 180ms ease;
```
Ao lado, título 12–13px/600 e explicação 11–12px `#7A929E`.

### 5.6 Segmented control

```
/* trilho */ display:inline-flex; padding:3px; border-radius:10px; background:#EDF2F5;
/* aba */    padding:7px 14px; border:none; border-radius:8px; background:transparent;
             color:#7A929E; font:600 12px Inter; cursor:pointer;
/* ativa */  background:#fff; color:#0A2430; box-shadow:0 1px 2px rgba(3,32,44,.08);
```
Variante compacta: `padding:6px 12px`, `border-radius:7px` e trilho `border-radius:9px`.

### 5.7 Chips de filtro (valor único, poucas opções)

`height:30px; padding:0 12px; border-radius:999px; border:1px solid #D6E0E6; background:#fff; color:#46606C`, 11px/600.
Ativo: `background:#002E3E; border-color:#002E3E; color:#fff`.

---

## 6. Botões

| Tipo | Estilo | Hover |
|---|---|---|
| Primário | `height:36–40px; padding:0 16–20px; border:none; border-radius:10px; background:#2563EB; color:#fff; font:600 13px` | `#1D4ED8` |
| Secundário | mesma caixa, `border:1px solid #D6E0E6; background:#fff; color:#0A2430` | `background:#F1F5F7` |
| Fantasma | sem borda, fundo transparente, cor `#46606C` | `background:#F1F5F7` |
| Destrutivo | `border:1px solid rgba(217,72,63,.28); background:#fff; color:#B3372F` | `background:rgba(217,72,63,.07)` |
| Destrutivo sólido | `background:#D9483F; color:#fff` | `#B3372F` |
| Desabilitado | `background:#DCE4E8; color:#9FB2BB` | — |

Todos: `transition: background 140ms, border-color 140ms, color 140ms, transform 100ms`, `:active { transform: scale(.985) }`, `:focus-visible { box-shadow: 0 0 0 3px rgba(37,99,235,.35) }`.

Botão em envio troca o rótulo por "Salvando…" e desabilita, **sem mudar de largura** e sem spinner sobreposto.

---

## 7. Modal

```
/* backdrop */ position:fixed; inset:0; z-index:20; display:grid; place-items:center;
               padding:32px; background:rgba(0,20,28,.45); backdrop-filter:blur(2px);
/* caixa */    width:min(<largura>, 100%); max-height:88–90vh;
               display:flex; flex-direction:column;
               background:#fff; border-radius:16–18px;
               box-shadow:0 40px 90px -30px rgba(0,20,28,.6);
```

Larguras: confirmação 430px · formulário curto 480–520px · formulário completo 560–620px.

Estrutura em três faixas — **cabeçalho e rodapé são `flex:none`, o corpo é `flex:1; min-height:0; overflow-y:auto`.** Sem isso a rolagem quebra o layout.

- **Cabeçalho**: `padding:20–22px 24–26px 16–18px; border-bottom:1px solid #EEF3F5`. Eyebrow + título Poppins 19–20px/600 + subtítulo 12px `#46606C`. Botão de fechar 30–32px `border-radius:9px` à direita.
- **Corpo**: `padding:20–22px 24–26px; display:flex; flex-direction:column; gap:16–18px`.
- **Rodapé**: `padding:14–16px 24–26px; border-top:1px solid #EEF3F5; background:#FBFCFD`. Nota contextual à esquerda em 11px `#9FB2BB`, Cancelar + ação principal à direita.

Blocos agrupados dentro do corpo: `padding:16px; border:1px solid #EEF3F5; border-radius:12px; background:#FBFCFD`.

Modal de confirmação destrutiva: sem faixa de cabeçalho separada — ícone-caixa 44px em tint vermelho, título 18px/600, texto explicando a consequência, e o rodapé com Cancelar + botão vermelho sólido. Exige a palavra de confirmação quando a ação é irreversível.

---

## 8. Toast

```
position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 30;
display: flex; align-items: center; gap: 10px;
padding: 13px 18px; border-radius: 12px;
background: #002E3E; color: #fff;
box-shadow: 0 20px 44px -18px rgba(0,20,28,.7);
```
Check verde `#4FB783` 16px + mensagem 13px/600. Entra em fade+subida de 200ms, permanece 2,6s (4s quando traz "Desfazer"), sai em fade.

**Toda confirmação destrutiva ou irreversível carrega "Desfazer".** Sem isso o toast só informa, não protege.

---

## 9. Gráficos

Padrão único para todos.

**Linhas de grade**: `stroke:#EEF3F5; stroke-width:1`, horizontais apenas, 3 a 4 linhas.

**Série de linha**: `stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round`, sem pontos por padrão. Área sob a linha: gradiente vertical da cor da série com opacidade .18 → 0.

**Série de comparação** (aporte, benchmark, planejado): mesma espessura reduzida a 2px e `stroke-dasharray:5 5`.

**Barras**: `border-radius:6px 6px 2px 2px`. Comparação lado a lado usa duas barras de 16–28px com 2–3px entre elas.

**Estrutura de barra vertical proporcional** — importante:
```html
<div style="display:flex; align-items:stretch; gap:8px; height:190px">
  <!-- por barra -->
  <div style="flex:1; height:100%; display:flex; flex-direction:column; align-items:center; gap:7px">
    <span style="flex:none">valor</span>
    <div style="flex:1; min-height:0; width:100%; display:flex; align-items:flex-end">
      <div style="width:100%; height:<pct>%; min-height:2px; background:<cor>"></div>
    </div>
    <span style="flex:none">rótulo</span>
  </div>
</div>
```
A barra precisa da própria pista `flex:1; min-height:0`. Se a altura percentual resolver contra a coluna inteira, a barra de valor máximo transborda por cima do texto acima; se a coluna não tiver altura definida, a percentagem não resolve e todas as barras achatam no `min-height`.

**Rosca**: `conic-gradient` com segmentos acumulados, `width/height:148–158px`, furo central via `inset:26–28px` com fundo branco, mostrando o total no meio.

**Legenda**: `display:flex; gap:16–18px`, acima de `border-top:1px solid #F2F6F8`. Marcador 9–10px `border-radius:3px` (barra/área) ou traço 16×3px (linha) + rótulo 12px `#46606C`.

**Barra de progresso**: trilho `height:6–8px; border-radius:999px; background:#EAF0F3`; preenchimento na cor do limiar, `transition: width 500ms cubic-bezier(.2,.7,.3,1)`.

**Limiares de cor** (consumo — orçamento, limite de cartão, meta de despesa):
- até 80%: `#349063`
- 80–100%: `#C97A15`
- acima de 100%: `#D9483F`

**Limiares de cor** (conquista — meta de receita, meta de aporte):
- 100% ou mais: `#349063`
- em ritmo: `#2563EB`
- fora de ritmo ou prazo vencido: `#C97A15` / `#D9483F`

**Tooltip** via atributo `title` nas barras e fatias, com o rótulo e o valor formatado.

---

## 10. Skeleton

```
@keyframes skShimmer { 0% { background-position:180% 0 } 100% { background-position:-80% 0 } }
.sk { background: linear-gradient(90deg,#EDF2F5 20%,#F7FAFB 50%,#EDF2F5 80%);
      background-size: 220% 100%; animation: skShimmer 1.6s linear infinite; }
```
Escuro: `#0E3948 → #164556`.

Regras:
1. Skeleton só no que vem do servidor. Título, eyebrow, cabeçalho de tabela e navegação são estáticos e renderizam de imediato.
2. Mesma caixa do conteúdo real — altura de linha e raio iguais. Nada deve pular quando os dados chegam.
3. Larguras variadas entre 44% e 80%. Blocos idênticos parecem grade quebrada.
4. Abaixo de 300ms de carregamento, não mostre skeleton nenhum.
5. Conteúdo real entra com fade de 180ms.

---

## 11. Microinterações

| Efeito | Propriedade | Duração | Curva |
|---|---|---|---|
| Hover de linha de tabela | `background` | 140ms | ease |
| Hover de botão | `background`, `color` | 140ms | ease |
| Press de botão | `transform: scale(.985)` | 100ms | ease |
| Chevron de dropdown | `transform: rotate(180deg)` | 160ms | ease |
| Elevação de card | `transform: translateY(-2px)`, `box-shadow`, `border-color` | 180ms | `cubic-bezier(.2,.7,.3,1)` |
| Entrada de painel/modal/toast | `opacity` + `translateY(4–6px)` | 200ms | ease |
| Pino de toggle | `left` | 180ms | ease |
| Barra de progresso | `width` | 500ms | `cubic-bezier(.2,.7,.3,1)` |
| Número entrando | contagem | 700ms | ease-out cúbica |
| Skeleton | `background-position` | 1600ms | linear, infinito |
| Revelação ao rolar (só marketing) | `opacity` + `translateY(34px)` | 900ms | `cubic-bezier(.16,.8,.3,1)` |

Uma propriedade por vez. Nada acima de 220ms exceto barra de progresso e contagem de número, que são o próprio dado se atualizando. Contagem de número só nos KPIs principais do dashboard — em tabela, valor que conta vira distração.

`@media (prefers-reduced-motion: reduce)` desliga revelação e contagem.
