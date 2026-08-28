# 08 — Segurança: Revisão do Dashboard (OWASP)

> Skills: `api-security-best-practices` + `vulnerability-scanner` · Data: 2026-07-03
> Escopo: tela `/dashboard` e superfícies que ela toca (frontend). Backend não foi alterado nesta rodada.

## Resumo executivo

**Nenhuma vulnerabilidade nova introduzida e nenhuma crítica encontrada na
tela.** As mudanças desta rodada são atributos ARIA, string de rota interna e
acentuação — sem nova superfície de ataque. A arquitetura de autenticação do
app é acima da média para SPAs.

## Análise por área pedida

### Autenticação — FORTE

- JWT **nunca** exposto ao JavaScript: `access_token`/`refresh_token` vivem em
  **cookies httpOnly** definidos pelo backend ([auth.service.ts:41-42](../../investindoEmNegociosWeb/src/app/core/auth.service.ts#L41-L42));
  o localStorage guarda apenas metadados de sessão (mitiga roubo de token via XSS).
- **CSRF**: interceptor adiciona `X-XSRF-TOKEN` (double-submit cookie
  `XSRF-TOKEN`) em todos os métodos mutantes ([auth.interceptor.ts](../../investindoEmNegociosWeb/src/app/core/auth.interceptor.ts)).
- Rota `/dashboard` protegida por `authGuard` + `roleGuard` (minRole Basic);
  interceptor trata 401/403 com refresh/redirect e throttling de feedback.

### Permissões / exposição por perfil — CORRETO (defesa em profundidade)

- Gating visual via `hasAccess()`/`roleGuard` é **apenas UX**; cada método
  `load*` do dashboard revalida `isLogged`/`hasAccess` antes de chamar a API,
  evitando requisições a endpoints restritos com perfil insuficiente.
- O teste E2E `role-regression` verifica ativamente que perfil Basic **não
  dispara** chamadas a `/api/v1/(admin|investments|loans|financialassistant|...)`
  e que não há respostas 403 — proteção contra regressão de vazamento por perfil.
- A autorização real permanece no backend (403) — o frontend não é a barreira.
- **Regra respeitada:** nenhuma permissão de perfil foi alterada nesta rodada.

### Dados financeiros — OK

- Dashboard só **lê** agregados (saldos, dívidas, score); não persiste valores
  no cliente além do estado em memória do componente.
- Sem `console.log` de dados sensíveis no componente.
- Valores exibidos passam por pipes de formatação (`appCurrency`), não por HTML cru.

### Input validation / XSS — OK

- **Zero sinks perigosos** na tela: sem `innerHTML`, `bypassSecurityTrust*`
  ou manipulação direta de DOM; toda renderização usa interpolação Angular
  (auto-escapada).
- Dados de notificações do robô (`payload.tips`, `scoreBreakdown`) são
  convertidos com `String(...)`, `trim`, `filter` e `slice` (limite de itens)
  antes de exibir — bom saneamento de dados vindos do servidor.
- `queryParams` de recomendações são reduzidos a `Record<string, string>` — sem
  spread de objetos arbitrários na navegação.

### Exposição de dados — OK, com observação

- SSR: a rota `/dashboard` exige auth; conteúdo financeiro não é pré-renderizado
  para anônimos (guard roda também no servidor).
- ⚠️ Observação (não é vulnerabilidade): mensagens de erro de API são exibidas
  via `extractApiErrorMessage` — manter garantia no backend de que `detail`
  nunca inclui stack trace/SQL (validado por testes de API, fora deste escopo).

## OWASP Top 10 (2025) — checagem aplicável ao frontend da tela

| Categoria | Status |
| --- | --- |
| A01 Broken Access Control | ✅ guards + revalidação por chamada + backend 403 + teste de regressão |
| A02 Cryptographic Failures | ✅ token em cookie httpOnly; nada sensível em localStorage |
| A03 Injection/XSS | ✅ sem sinks; interpolação escapada; payloads saneados |
| A05 Security Misconfiguration | ✅ CSRF double-submit; N/A headers (backend/proxy) |
| A07 Identification & Auth Failures | ✅ refresh controlado no interceptor, logout limpa cookies |
| A09 Logging & Monitoring | ⚠️ falhas de seção silenciosas no dashboard (UX/observabilidade, ver 04) |

## Riscos residuais e recomendações (backlog)

1. **P2** — Padronizar telemetria de erros de carregamento das seções do
   dashboard (hoje falha silenciosa → dificulta detectar abuso/instabilidade).
2. **P3** — Adicionar teste E2E para perfil Intermediate equivalente ao de
   Basic (não disparar endpoints admin) — hoje a cobertura foca Basic.
3. **P3** — Revisar CSP/headers no servidor SSR (`server.mjs`) — fora do escopo
   desta tela, mas é a proteção definitiva contra XSS.

## Conclusão

Aprovado. As mudanças da rodada não tocam autenticação, permissões, dados
financeiros ou validação de entrada, e a tela mantém postura de segurança
sólida.
