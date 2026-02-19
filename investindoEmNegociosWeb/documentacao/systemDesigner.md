# System Designer - Investindo em Negócios

Este documento define os padrões oficiais de UI para o frontend.
Objetivo: manter consistência visual, previsibilidade de componentes e boa usabilidade.

---

## 1) Princípios de design
- Clareza primeiro: informações financeiras devem ser fáceis de ler.
- Semântica de cor: verde/vermellho para significado, não para decoração.
- Densidade controlada: telas ricas, mas sem ruído visual.
- Consistência: mesma linguagem em botões, badges, gráficos e tabelas.
- Acessibilidade: foco visível, contraste adequado e alvo de clique confortável.

---

## 2) Identidade visual

## 2.1 Tipografia
- Fonte principal: `Inter`.
- Fallback: `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`.
- Escala por token:
  - `--text-xs`: 12px
  - `--text-sm`: 14px
  - `--text-md`: 16px
  - `--text-lg`: 18px
  - `--text-xl`: 20px
  - `--text-2xl`: 24px
  - `--text-3xl`: 30px
  - `--text-4xl`: 36px
  - `--text-5xl`: 48px
- Números financeiros devem usar `font-weight` 600/700.

## 2.2 Espaçamento
- Grid base: múltiplos de 8px.
- Tokens:
  - `--space-1`: 8px
  - `--space-2`: 16px
  - `--space-3`: 24px
  - `--space-4`: 32px
  - `--space-5`: 40px
  - `--space-6`: 48px

---

## 3) Tokens oficiais (src/styles.scss)

## 3.1 Light
- Background: `--bg: #f8fafc`
- Surface: `--surface: #ffffff`
- Surface auxiliar: `--surface-2: #f1f5f9`, `--surface-3: #e2e8f0`
- Bordas: `--border: #e5e7eb`, `--border-strong: #cbd5e1`
- Texto: `--text: #0f172a`, `--text-secondary: #475569`, `--text-muted: #64748b`
- Semântica:
  - `--primary: #2563eb`
  - `--success: #22c55e`
  - `--danger: #ef4444`
  - `--warning: #f59e0b`
  - `--info: #0ea5e9`

## 3.2 Dark
- Background: `--bg: #0b1220`
- Surface: `--surface: #111827`
- Sidebar: `--sidebar: #020617`
- Bordas: `--border: #1f2937`, `--border-strong: #334155`
- Texto: `--text: #e5e7eb`, `--text-secondary: #94a3b8`

## 3.3 Sombras e raio
- Raio padrão:
  - `--radius-md: 12px`
  - `--radius-lg: 16px`
- Sombras:
  - `--shadow-sm` para elementos leves
  - `--shadow-md` para cards, menus e overlays

---

## 4) Componentes e padrões

## 4.1 Botões
Classes oficiais:
- `btn-primary`
- `btn-danger`
- `btn-warning`
- `btn-ghost`
- `btn-cancel`

Regras:
- Altura padrão: `--control-h` (48px).
- Estado hover com aumento sutil de contraste/sombra.
- Não inventar novas variações sem documentar aqui.
- Em listas densas, priorizar botão icon-only (42x42, raio 14px).

## 4.2 Inputs e formulários
- `input/select/textarea` com borda suave e fundo `--surface`.
- Placeholder em `--text-muted`.
- Foco com `outline` visível.
- Ações de formulário: `btn-primary sm` + `btn-cancel sm`.

## 4.3 Badges de status
Padrão obrigatório:
- `border` + `bg` suave + texto escuro.
- Nunca usar texto claro em fundo claro.

Semântica sugerida:
- Pendente: amber
- Pago/Recebido: emerald
- Cancelado: rose
- Antecipado: sky
- Parcial: orange

## 4.4 Tooltips
- Gatilho: ícone circular "i" com borda sutil.
- Caixa: radius 12px, borda `--border-strong`, `shadow-lg`.
- Conteúdo: objetivo (1 a 2 frases).

## 4.5 Modais e confirmações
- Não usar `window.confirm`.
- Usar modal padrão com:
  - título
  - descrição curta
  - ação primária/perigosa
  - botão secundário `btn-cancel`

---

## 5) Layout e navegação

## 5.1 Sidebar
- Largura base: ~260px.
- Visual silencioso (sem cor forte no fundo).
- Item ativo com destaque discreto.

## 5.2 Topbar
- Ações alinhadas à direita.
- Tema, notificações e menu de usuário padronizados.

## 5.3 Cards
- Fundo neutro.
- Conteúdo com hierarquia clara (label > valor > observação).
- Não usar fundo semântico agressivo em cards de leitura geral.

---

## 6) Tabelas e listas
- Cabeçalho com tipografia menor e contraste suficiente.
- Colunas numéricas alinhadas e formatadas por locale.
- Ações agrupadas e consistentes (editar/excluir/info).
- Densidade adequada para desktop e adaptação para mobile.

---

## 7) Gráficos

## 7.1 Princípios
- Mostrar o necessário para decisão.
- Evitar excesso de séries simultâneas.
- Legendas legíveis e consistentes com o tema.

## 7.2 Cores recomendadas
- Carteira/resultado positivo: `--success`
- Perda/despesa: `--danger`
- Comparativos/benchmark: `--primary` e `--info` como apoio.

## 7.3 Interação
- Hover com tooltip de valores.
- Eixos com rótulos legíveis e sem sobreposição.
- Mesma altura visual entre cards de gráfico lado a lado.

---

## 8) Acessibilidade e UX
- Alvos clicáveis >= 40px.
- Navegação por teclado preservada.
- Estados de foco sempre visíveis.
- Contraste mínimo para texto e controles.
- Estados vazios com mensagem clara + CTA.

---

## 9) Internacionalização e datas
- Locale padrão: `pt-BR`.
- Data padrão de exibição: `DD/MM/AAAA`.
- Parse de datas sem deslocamento de fuso local.
- Valores monetários formatados por locale/currency ativo.

---

## 10) Performance visual
- Evitar assets grandes sem necessidade.
- Definir `width/height` em imagens para evitar layout shift.
- Evitar fontes externas bloqueantes na renderização crítica.
- Preferir carregamento lazy para rotas/componentes não críticos.

---

## 11) Checklist de revisão de UI (antes de merge)
- [ ] Usa tokens de cor/espaçamento/tipografia oficiais.
- [ ] Botões e badges seguem classes padrão.
- [ ] Sem `window.confirm`.
- [ ] Responsivo em desktop/mobile.
- [ ] Sem regressão de contraste/foco.
- [ ] Estados de loading/empty/error tratados.
- [ ] Semântica financeira consistente (cores e sinais).

