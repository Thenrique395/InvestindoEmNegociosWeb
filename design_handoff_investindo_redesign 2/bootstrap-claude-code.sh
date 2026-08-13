#!/usr/bin/env bash
# ============================================================================
#  Investindo em Negócios — Redesign
#  Bootstrap do handoff para o Claude Code
#
#  Execute na RAIZ do repositório investindoEmNegociosWeb, com a pasta
#  design_handoff_investindo_redesign/ já descompactada ali.
#
#      chmod +x design_handoff_investindo_redesign/bootstrap-claude-code.sh
#      ./design_handoff_investindo_redesign/bootstrap-claude-code.sh
#
#  O que ele faz:
#    1. Verifica que está na raiz certa e que o handoff está completo
#    2. Gera CLAUDE.md na raiz com as regras de arquitetura + índice do handoff
#    3. Gera design_handoff_investindo_redesign/PROMPTS.md com os prompts
#       prontos de cada fase, na ordem de execução
#    4. Imprime o primeiro prompt para você colar no Claude Code
#
#  Não altera nenhum arquivo de código. Se CLAUDE.md já existir, faz backup.
# ============================================================================

set -euo pipefail

HANDOFF="design_handoff_investindo_redesign"
APP="investindoEmNegociosWeb"

bold=$'\033[1m'; dim=$'\033[2m'; green=$'\033[32m'; red=$'\033[31m'; yellow=$'\033[33m'; off=$'\033[0m'

ok()   { printf '  %s✓%s %s\n' "$green" "$off" "$1"; }
warn() { printf '  %s!%s %s\n' "$yellow" "$off" "$1"; }
die()  { printf '\n  %s✗ %s%s\n\n' "$red" "$1" "$off"; exit 1; }

printf '\n%sInvestindo em Negócios — bootstrap do handoff%s\n' "$bold" "$off"
printf '%s────────────────────────────────────────────────%s\n\n' "$dim" "$off"

# ---------------------------------------------------------------------------
# 1. Verificações
# ---------------------------------------------------------------------------
printf '%sVerificando o ambiente%s\n' "$bold" "$off"

[ -d "$HANDOFF" ] || die "Pasta $HANDOFF/ não encontrada. Descompacte o zip do handoff aqui."
ok "handoff encontrado"

if [ -d "$APP/src/app" ]; then
  ok "repositório Angular encontrado em $APP/src/app"
  SRC="$APP/src"
elif [ -d "src/app" ]; then
  ok "repositório Angular encontrado em src/app"
  SRC="src"
else
  die "Não encontrei src/app. Execute na raiz do repositório."
fi

DOCS=(README.md ARQUITETURA_ANGULAR.md ORDEM_DE_IMPLEMENTACAO.md COMPONENTES.md TELAS.md PERFIS_E_PERMISSOES.md tokens.css)
missing=0
for d in "${DOCS[@]}"; do
  if [ -f "$HANDOFF/$d" ]; then ok "$d"; else warn "FALTANDO: $d"; missing=1; fi
done
[ "$missing" -eq 0 ] || die "Handoff incompleto. Descompacte o zip novamente."

if [ -d "$HANDOFF/prototipos" ]; then
  n=$(find "$HANDOFF/prototipos" -name '*.dc.html' | wc -l | tr -d ' ')
  ok "$n protótipo(s) em prototipos/"
fi

printf '\n'

# ---------------------------------------------------------------------------
# 2. CLAUDE.md na raiz
# ---------------------------------------------------------------------------
printf '%sGerando CLAUDE.md%s\n' "$bold" "$off"

if [ -f CLAUDE.md ]; then
  cp CLAUDE.md "CLAUDE.md.bak-$(date +%Y%m%d-%H%M%S)"
  warn "CLAUDE.md existente — backup criado"
fi

{
  printf '# %s — redesign visual\n\n' "Investindo em Negócios"
  printf 'Regras permanentes para qualquer implementação de tela neste repositório.\n'
  printf 'A especificação completa está em `%s/`.\n\n' "$HANDOFF"

  printf '## Leia antes de escrever código\n\n'
  printf '| Documento | Para quê |\n|---|---|\n'
  printf '| `%s/README.md` | Contexto do redesign e decisões que atravessam tudo |\n' "$HANDOFF"
  printf '| `%s/ARQUITETURA_ANGULAR.md` | **Regras de componentização — leia primeiro** |\n' "$HANDOFF"
  printf '| `%s/ORDEM_DE_IMPLEMENTACAO.md` | Em que ordem construir, com arquivos-alvo |\n' "$HANDOFF"
  printf '| `%s/COMPONENTES.md` | Medidas, cores e estados de cada componente |\n' "$HANDOFF"
  printf '| `%s/TELAS.md` | Especificação de cada uma das 16 telas |\n' "$HANDOFF"
  printf '| `%s/PERFIS_E_PERMISSOES.md` | O que cada plano vê no menu e no dashboard |\n' "$HANDOFF"
  printf '| `%s/tokens.css` | Todos os tokens, comentados |\n\n' "$HANDOFF"

  printf '## Regras invioláveis\n\n'
  printf '1. **Nenhum hex literal** fora de `%s/styles/design-tokens.scss`. Toda cor, raio, espaçamento e duração vem de variável.\n' "$SRC"
  printf '2. **Nenhum componente novo sem antes checar `%s/shared/`.** Se um primitivo já existe, use; se falta uma variação, estenda o primitivo — não crie um irmão.\n' "$SRC/app"
  printf '3. **Faixa de indicadores é `display:flex; flex-wrap:wrap`** com `flex:1 1 210px` por card. Nunca `grid` com `auto-fit` — deixa célula vazia à direita.\n'
  printf '4. **Todo campo de valor múltiplo é dropdown** (`app-select-menu`), nunca chips em linha. Chips não escalam.\n'
  printf '5. **Toda tabela** vive dentro de scroller com `overflow-x:auto` e `min-width` explícito no filho; cabeçalho e linhas compartilham o mesmo `grid-template-columns`.\n'
  printf '6. **Todo stepper numérico aceita digitação.** Os botões são atalho, não a única entrada.\n'
  printf '7. **Todo indicador tem tooltip** explicando o que é e como é calculado.\n'
  printf '8. **Modal em três faixas**: cabeçalho `flex:none`, corpo `flex:1; min-height:0; overflow-y:auto`, rodapé `flex:none`.\n'
  printf '9. **Toda mutação confirmada oferece "Desfazer"** no toast. Toda ação destrutiva pede confirmação.\n'
  printf '10. **Item sem permissão não aparece no menu.** Não desabilitar, não mostrar upsell dentro da tela.\n'
  printf '11. **Estados de vazio, carregando e erro** fazem parte da tela. Não entregue só o caminho felizde.\n'
  printf '12. **Números com `tabular-nums`**, alinhados à direita em coluna monetária.\n\n'

  printf '## Padrões Angular deste projeto\n\n'
  printf '- Componentes standalone, `ChangeDetectionStrategy.OnPush`\n'
  printf '- Estado em `signal()` / `computed()`; sem `BehaviorSubject` para estado de view\n'
  printf '- SCSS por componente; utilitários globais em `%s/styles.scss`\n' "$SRC"
  printf '- Regra de negócio em `*.model.ts` puro e testável, fora do componente\n'
  printf '- Formatação de moeda, data e percentual centralizada — nunca inline no template\n\n'

  printf '## Semântica de cor\n\n'
  printf '- **Azul `#2563EB`** — ação de UI (botão primário, link, foco, seleção)\n'
  printf '- **Verde `#349063`** — receita e positivo. Texto legível: `#2A7551`\n'
  printf '- **Vermelho `#D9483F`** — despesa, estouro, atraso. Texto: `#B3372F`\n'
  printf '- **Âmbar `#C97A15`** — atenção, 80–100%% do limite. Texto: `#9A5C0E`\n'
  printf '- **Navy `#002E3E`** — sidebar, superfície escura, marca\n\n'
  printf 'Limiar de consumo (orçamento, limite de cartão, meta de despesa): até 80%% verde, 80–100%% âmbar, acima de 100%% vermelho.\n'
  printf 'Limiar de conquista (meta de receita, meta de aporte): 100%% ou mais verde, em ritmo azul, fora de ritmo âmbar ou vermelho.\n\n'

  printf '## Antes de considerar uma tela pronta\n\n'
  printf 'Rode o checklist da última seção de `%s/ARQUITETURA_ANGULAR.md` e teste em 1440px, 1024px e 390px.\n' "$HANDOFF"
} > CLAUDE.md

ok "CLAUDE.md escrito ($(wc -l < CLAUDE.md | tr -d ' ') linhas)"
printf '\n'

# ---------------------------------------------------------------------------
# 3. PROMPTS.md
# ---------------------------------------------------------------------------
printf '%sGerando PROMPTS.md%s\n' "$bold" "$off"

{
  cat <<'PROMPTS'
# Prompts para o Claude Code

Um prompt por sessão, na ordem. Não pule a fase 1 — ela muda a aparência de
todas as telas de uma vez e é a base de tudo que vem depois.

O `CLAUDE.md` na raiz já carrega as regras automaticamente em toda conversa,
então os prompts abaixo não precisam repeti-las.

---

## Sessão 0 — orientação

```
Leia design_handoff_investindo_redesign/README.md,
ARQUITETURA_ANGULAR.md e ORDEM_DE_IMPLEMENTACAO.md.

Depois me diga, sem escrever código ainda:
1. quais arquivos do repositório a fase 1 toca
2. quais primitivos de shared/ já existem e quais faltam criar
3. qualquer conflito que você veja entre o handoff e o código atual
```

Vale gastar uma sessão só nisso. O que ele responder aqui mostra se entendeu
o material antes de mexer em nada.

---

## FASE 1 — base do sistema

### Sessão 1.1 — tokens e tipografia

```
Implemente os itens 1.1 e 1.2 da fase 1 do ORDEM_DE_IMPLEMENTACAO.md.

Converta design_handoff_investindo_redesign/tokens.css para a convenção SCSS
já usada em src/styles/design-tokens.scss. Preserve os nomes de variável
existentes que já batem com os novos valores; adicione os que faltam.

Em src/styles.scss: adicione Poppins (600 e 700), a escala de texto dos
tokens, o utilitário de tabular-nums, os resets de link, os keyframes do
skeleton e as transições padrão de botão com :focus-visible.

Não toque em nenhum componente nesta sessão.
```

### Sessão 1.2 — sidebar e topbar

```
Implemente os itens 1.3 e 1.4 da fase 1.

Sidebar e topbar conforme as seções 1.1 e 1.2 do COMPONENTES.md, com as
medidas exatas. A visibilidade dos itens de menu por perfil vem do
PERFIS_E_PERMISSOES.md — item sem permissão não aparece.
```

### Sessão 1.3 — shell e page header

```
Implemente os itens 1.5 da fase 1: shell (padding e gap da área de conteúdo)
e o componente app-page-header conforme a seção 2 do COMPONENTES.md.

O page header precisa suportar: eyebrow opcional, título, descrição,
metadados, ação principal, ação secundária e seletor de período.
```

### Sessões 1.4 a 1.9 — primitivos, um por sessão

Faça **um por conversa**. São a base de tudo; vale revisar cada um antes de
seguir.

```
Implemente o app-select-menu conforme a seção 5.3 do COMPONENTES.md e o
contrato de componentização do ARQUITETURA_ANGULAR.md.

Este é o primitivo mais usado do sistema — aparece em praticamente toda tela.
Cubra: placeholder, ponto de cor por item, busca opcional, ação de criar no
rodapé, teclado (setas, Enter, Esc) e fechar ao clicar fora.
```

Depois, na mesma forma, um por sessão:

- `app-number-stepper` — seção 5.4. **Campo digitável**, com sanitização e limites.
- `app-segmented-selector` — seção 5.6. Já existe; ajuste ao novo visual.
- `app-kpi-strip` — seção 3.1, formato (b). Flex com quebra, divisor por sombra, tooltip por card.
- `app-metric-card` — seção 3.1, formato (a).
- `app-responsive-list` — seção 4. **O item mais pesado da fase 1.** Já existe; refaça com scroller + min-width, colunas compartilhadas, seleção em lote e paginação. Destrava cinco telas.
- `app-modal` — seção 7. Três faixas, rolagem só no corpo.
- Toast com "Desfazer" — seção 8. Estenda o UiFeedbackService existente.
- `app-empty-state` e o skeleton de `app/ui-state/` — seções 3.5 e 10.

---

## FASE 2 — telas do dia a dia

Uma tela por sessão, na ordem do ORDEM_DE_IMPLEMENTACAO.md.

```
Implemente a tela de Dashboard conforme a seção 1 do TELAS.md e o
PERFIS_E_PERMISSOES.md.

Faça o perfil Completo primeiro — é o superconjunto. Depois recorte para
Inteligente e Essencial. Use os primitivos de shared/ já criados; se precisar
de uma variação, estenda o primitivo em vez de criar um componente irmão.

Antes de finalizar, rode o checklist do ARQUITETURA_ANGULAR.md.
```

Depois, trocando a tela e a seção:

- **Despesas** — TELAS.md seção 3
- **Receitas** — TELAS.md seção 4. *Extraia primeiro o que é comum com Despesas; muda só conteúdo e polaridade da comparação.*
- **Cartões** — seção 5
- **Contas** — seção 6
- **Calendário** — seção 2
- **Categorias** — seção 7

**Sessão dedicada, antes de Despesas:**

```
Implemente o modal de escolha de escopo para lançamentos parcelados:
ao editar ou dar baixa, perguntar se a ação vale só para esta parcela ou
para todas as seguintes.

Vai em shared/ — é usado por Despesas, Cartões e Calendário. Implemente uma
vez só.
```

---

## FASE 3 — planejamento e análise

```
Implemente a tela de Metas conforme a seção 8 do TELAS.md.

Leia src/app/metas/goal-view.model.ts antes de escrever qualquer coisa. A
semântica consumo × conquista é o núcleo da tela: em meta de despesa passar do
alvo é ruim, em meta de receita e de aporte chegar ao alvo é bom. Os rótulos
dos três valores mudam por tipo.
```

Depois: **Orçamento** (seção 10) · **Investimentos** (seção 11) · **Empréstimos** (seção 9) · **Relatórios** (12) · **Simulador** (13) · **Assistente** (14) · **Perfil** (15) · **Configurações** (16).

**Sobre Investimentos** — é a maior tela do sistema, cinco abas. Vale uma
sessão por aba:

```
Implemente a aba Resumo da tela de Investimentos conforme a seção 11 do
TELAS.md, lendo investments-overview.model.ts primeiro.

Regra de negócio, não estética: aporte, valorização e proventos são grandezas
separadas e nunca somadas. Valorização = mercado − investido, e pode ser
negativa. Sem cotação disponível, o valor cai para o preço médio — nunca
inventar preço, e a linha deve marcar qual fonte usou.
```

---

## FASE 4 — fluxos e transversais

- **Autenticação** — TELAS.md, seção de telas de fluxo
- **Onboarding** — idem
- **Checkout e plano**
- **Dashboard administrativo** — PERFIS_E_PERMISSOES.md
- **Tema escuro** — segundo conjunto de tokens, não CSS duplicado. As cores dark estão no fim do ORDEM_DE_IMPLEMENTACAO.md
- **Mobile** — revisão de todas as telas: tabela vira cards, header navy com o total, bottom nav de 5 itens com FAB central

```
Implemente o tema escuro conforme o item 4.5 do ORDEM_DE_IMPLEMENTACAO.md.

Um segundo conjunto de tokens em design-tokens.scss, ativado por atributo no
elemento raiz via theme.service.ts. Não duplique CSS de componente: se algum
componente precisar de regra própria no dark, é sinal de que ele tem cor
hardcoded — corrija a origem.
```

---

## Quando algo sair do padrão

```
A tela X está divergindo do padrão em Y.

Confira contra COMPONENTES.md e o checklist do ARQUITETURA_ANGULAR.md, e
corrija na origem: se o desvio está no primitivo, conserte o primitivo, não
a tela.
```
PROMPTS
} > "$HANDOFF/PROMPTS.md"

ok "PROMPTS.md escrito"
printf '\n'

# ---------------------------------------------------------------------------
# 4. Próximos passos
# ---------------------------------------------------------------------------
printf '%sPronto%s\n' "$bold" "$off"
printf '%s────────────────────────────────────────────────%s\n\n' "$dim" "$off"
printf '  CLAUDE.md            regras carregadas em toda conversa\n'
printf '  %s/PROMPTS.md   prompts de cada fase, na ordem\n\n' "$HANDOFF"

printf '%sAbra o Claude Code e cole este primeiro prompt:%s\n\n' "$bold" "$off"
cat <<EOF
${dim}────────────────────────────────────────────────${off}
Leia design_handoff_investindo_redesign/README.md,
ARQUITETURA_ANGULAR.md e ORDEM_DE_IMPLEMENTACAO.md.

Depois me diga, sem escrever código ainda:
1. quais arquivos do repositório a fase 1 toca
2. quais primitivos de shared/ já existem e quais faltam criar
3. qualquer conflito que você veja entre o handoff e o código atual
${dim}────────────────────────────────────────────────${off}
EOF
printf '\n  Os prompts seguintes estão em %s/PROMPTS.md\n\n' "$HANDOFF"
