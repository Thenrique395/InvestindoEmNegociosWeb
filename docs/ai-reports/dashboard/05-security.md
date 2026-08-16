# Dashboard — 05 Segurança: permissões entre perfis

> Skill: `api-security-best-practices` · Data: 2026-07-03
> Escopo: mudanças da rodada "melhoria completa do dashboard por perfil"

## Veredito

**Nenhuma permissão alterada, nenhum vazamento entre perfis introduzido.**

## Análise das mudanças

### 1. Nenhum arquivo de autorização tocado

`auth.guard.ts`, `role.guard.ts`, `roles.ts`, `auth.service.ts`,
`auth.interceptor.ts` e `app.routes.ts` **não foram modificados** nesta rodada
(verificável no diff local).

### 2. Seções novas respeitam o gating existente

| Seção nova | Condição de exibição | Fonte de dados |
| --- | --- | --- |
| Fluxo mensal (3 meses) — Basic | dentro de `@if (isBasicProfile)` | `expensesRaw`/`incomesRaw` (dados que o próprio Basic já recebe hoje) |
| Próximos vencimentos — Basic | idem | `expensesRaw` (idem) |
| Fluxo mensal (6 meses) — Int/Adv | dentro de `@if (!isBasicProfile ...)` | idem |
| Plano do mês (observar/ações) — Int/Adv | `!isBasicProfile` | `insightHighlights`/`insightTodoItems`, já carregados só com `hasAccess('Intermediate')` nos `load*()` |
| Upgrade CTA Basic | `isBasicProfile` | estático + rota pública `/planos` |
| Upgrade CTA Intermediate | `!isBasicProfile && !hasAccess('Advanced')` | estático |

**Ponto-chave:** os gráficos novos derivam de dados que o backend **já
autoriza** para cada perfil — nenhuma chamada de API nova foi adicionada,
nenhum endpoint restrito passou a ser consumido por perfil inferior.

### 3. CTA de upgrade não vaza funcionalidade

O card de upgrade lista features como texto estático e leva à rota pública
`/planos`. Não renderiza dados de endpoints restritos nem simula seções
bloqueadas como ativas (requisito "não mostrar bloqueado como liberado" ✓).

### 4. Banner de erros não expõe informação sensível

`loadErrorMessage` concatena apenas **nomes de seções definidos no código**
("dívidas", "patrimônio"...), nunca corpo de resposta da API, status HTTP ou
stack trace. Sem risco de information disclosure.

### 5. Sem novos sinks XSS

Componentes novos usam exclusivamente interpolação Angular (auto-escape),
`[routerLink]` com rotas fixas vindas do payload já saneado (mesmo tratamento
`String()`/`slice` preexistente) e SVG estático. Sem `innerHTML`,
`bypassSecurityTrust*` ou manipulação de DOM.

### 6. Validação ativa por E2E

`role-regression.spec.ts` (5/5 ✅ nesta rodada) confirma pós-mudança:
- Basic não vê investimentos/admin e **não dispara** chamadas a
  `/api/v1/(admin|investments|loans|financialassistant...)`;
- Zero respostas 403 (frontend não tenta endpoints negados);
- Advanced vê seções patrimoniais; Admin vê módulos administrativos.

O spec temporário de QA verificou adicionalmente: Basic sem "Saldos por conta";
Intermediate com CTA Advanced e sem "Saldos por conta"; Advanced sem CTA de
upgrade e com "Saldos por conta".

## Recomendações (inalteradas da rodada anterior)

1. P3 — Cobertura E2E de "endpoints restritos" também para Intermediate.
2. P3 — Revisar CSP/headers no servidor SSR (defesa definitiva contra XSS).
