# Checklist de Segurança — App de Finanças Pessoais
**Stack:** ASP.NET Core Web API + EF Core (backend) · Angular SPA (front)

Ordem sugerida de implementação, do alicerce ao avançado. Marque conforme avança.

---

## Fase 1 — Alicerce (antes de qualquer feature)

- [ ] **HTTPS forçado**
  - Backend: `app.UseHttpsRedirection();` + `app.UseHsts();` (HSTS só em produção).
  - Em produção, deixe o TLS no reverse proxy (Nginx / Azure App Service / etc.).
- [ ] **Autenticação**
  - Use **ASP.NET Core Identity** para gestão de usuários e hashing de senha (já usa PBKDF2; dá pra trocar por Argon2/bcrypt se quiser).
  - Emita **JWT** com expiração curta (ex.: 15 min) + **refresh token** rotativo armazenado de forma segura.
  - Configure `AddAuthentication().AddJwtBearer(...)` validando issuer, audience, lifetime e a assinatura.
- [ ] **2FA / MFA**
  - Identity já tem suporte a TOTP (Google Authenticator etc.). Vale muito a pena num app de dinheiro.
- [ ] **Autorização a cada requisição (evitar IDOR)**
  - `[Authorize]` nos controllers/endpoints.
  - **Regra de ouro:** toda query filtra pelo usuário logado.
    ```csharp
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    var transacao = await _db.Transacoes
        .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    if (transacao is null) return NotFound(); // ou 403
    ```
  - Nunca confie em `id` vindo do cliente sem checar a posse do recurso.

---

## Fase 2 — Proteção dos dados e entradas

- [ ] **Validação de entrada**
  - DataAnnotations nos DTOs (`[Required]`, `[Range]`, `[StringLength]`) ou **FluentValidation**.
  - Valide faixas e formatos de valores monetários, datas, etc.
- [ ] **Anti-injeção (SQL/NoSQL)**
  - Use **EF Core / LINQ** (já parametriza). Se usar SQL cru, sempre com parâmetros — nunca interpolação de string.
- [ ] **Tratamento de erros seguro**
  - Middleware global de exceções devolvendo `ProblemDetails` genérico.
  - Em produção, **nunca** exponha stack trace nem detalhes do banco. Logue o detalhe internamente.
- [ ] **Criptografia em repouso**
  - Banco com criptografia (ex.: Transparent Data Encryption).
  - Campos ultra-sensíveis (tokens bancários, p.ex.) com criptografia em nível de campo via **Data Protection API** (`IDataProtector`).
- [ ] **Gestão de segredos**
  - **Nada de segredo em `appsettings.json` versionado.**
  - Dev: **User Secrets** (`dotnet user-secrets`).
  - Produção: Azure Key Vault / AWS Secrets Manager / variáveis de ambiente.

---

## Fase 3 — Borda e abuso

- [ ] **Rate limiting**
  - ASP.NET Core tem rate limiting nativo (`AddRateLimiter`). Aplique limites mais rígidos nas rotas de login/registro/refresh.
- [ ] **CORS**
  - Libere **apenas** a origem do seu front Angular. Nada de `AllowAnyOrigin()` em API autenticada.
    ```csharp
    policy.WithOrigins("https://app.seudominio.com")
          .AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    ```
- [ ] **Headers de segurança**
  - `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`.
  - Remova headers que vazam stack (`Server`, `X-Powered-By`).
- [ ] **Proteção CSRF**
  - Se usar **cookies** para o token: cookie `HttpOnly` + `Secure` + `SameSite=Strict` e antiforgery tokens.
  - Se usar **JWT no header `Authorization`**: o CSRF clássico não se aplica, mas aí cuide do XSS (abaixo).

---

## Fase 4 — Front-end Angular (tratamento completo)

### Armazenamento do token (a decisão mais importante)
- [ ] **Evite `localStorage` e `sessionStorage`** para tokens — qualquer XSS consegue lê-los.
- [ ] **Melhor opção:** access token **em memória** (variável/serviço Angular) + refresh token em **cookie `HttpOnly` + `Secure` + `SameSite`** setado pelo backend. O JS nunca toca no refresh.
- [ ] Ao recarregar a página, o access token some da memória → use o refresh (via cookie) para obter um novo silenciosamente.

### HTTP Interceptor
- [ ] **Anexar o token** automaticamente nas requisições para a sua API (e só para ela — não vaze o token para domínios terceiros).
    ```typescript
    export const authInterceptor: HttpInterceptorFn = (req, next) => {
      const token = inject(AuthService).accessToken;
      const apiReq = token && req.url.startsWith(environment.apiUrl)
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;
      return next(apiReq);
    };
    ```
- [ ] **Tratar 401/403 globalmente:** tentar refresh no 401; se falhar, deslogar e redirecionar.

### XSS (a ameaça nº 1 no front)
- [ ] Confie no escape automático do Angular nas interpolações `{{ }}`.
- [ ] **Nunca** use `bypassSecurityTrustHtml/Script/Url` com conteúdo vindo do usuário ou da API.
- [ ] Cuidado redobrado com `[innerHTML]` — só com conteúdo sanitizado.
- [ ] Sem `eval`, sem injeção dinâmica de `<script>`.
- [ ] Reforce com **Content-Security-Policy** vindo do backend (defesa em profundidade).

### Rotas e autorização no front
- [ ] **Route Guards** (`CanActivate`) para esconder telas de quem não está logado/autorizado.
- [ ] **Lembre-se:** guard é só UX. A autorização real é sempre no backend — o usuário pode burlar o front.
- [ ] Lazy-load de módulos sensíveis para não enviar código que o usuário não deveria nem ver.

### Validação
- [ ] Use Reactive Forms / Validators para boa UX (feedback imediato).
- [ ] **Toda validação do front é descartável** do ponto de vista de segurança — o backend revalida tudo.

### Build, segredos e ambiente
- [ ] **Nenhum segredo no bundle.** Tudo no Angular é público. Sem chaves de API privadas, sem connection strings.
- [ ] `environment.prod.ts` só com URLs e chaves **públicas** (ex.: chave publicável de um gateway de pagamento).
- [ ] Habilite produção (`ng build --configuration production`): tree-shaking, minificação, sem source maps expostos.

### Comunicação e dependências
- [ ] Só consuma a API por **HTTPS**; configure CORS no backend para liberar apenas a origem do front.
- [ ] `npm audit` no CI; mantenha Angular e libs atualizados (CVEs de dependências são vetor comum).
- [ ] Cuidado com libs de terceiros que manipulam DOM/HTML — audite antes de adicionar.

### UX de segurança (importante num app de dinheiro)
- [ ] **Logout automático por inatividade.**
- [ ] Não exiba dados sensíveis completos sem necessidade (ex.: mascarar números de conta).
- [ ] Confirmar ações críticas (transferências, exclusões) — idealmente reautenticar/2FA.

---

## Fase 5 — Operação e conformidade

- [ ] **Logging e auditoria**
  - Registre logins, falhas de auth, acessos negados e alterações sensíveis.
  - **Nunca** logue senhas, tokens, números completos de conta/cartão. Use **Serilog** com redaction.
- [ ] **Minimização de dados**
  - Projete os DTOs de saída para retornar só o necessário (sem over-fetching de PII).
- [ ] **Gestão de dependências**
  - `dotnet list package --vulnerable` no backend e `npm audit` no front, idealmente no CI. Considere Dependabot.
- [ ] **LGPD** (você está no Brasil, tratando dados pessoais/financeiros)
  - Base legal para o tratamento, política de privacidade, direito de exclusão (poder apagar dados do usuário), plano de resposta a incidente/vazamento.
  - *Não é aconselhamento jurídico — confirme os detalhes com quem entende.*

---

## Patamar à parte (quando/se for o caso)

- [ ] **Integração bancária (Open Finance) ou pagamentos**
  - Exige requisitos regulatórios e de segurança bem mais rígidos (certificação, mTLS, etc.). Trate como projeto próprio.
- [ ] **API Gateway / WAF** — quando escalar ou virar produto comercial.
- [ ] **Versionamento de API** — para descontinuar versões antigas com segurança.

---

### Prioridade mínima para um MVP seguro
HTTPS → Identity + JWT → autorização por dono do recurso (anti-IDOR) → validação de entrada → erros seguros → segredos fora do código → rate limit no login.

---
---

# Anexo A — Autorização: papéis e planos (backend + Angular)

Cenário: 4 perfis — **Free**, dois planos **pagos** (ex.: Pro e Premium) e **Admin**.

## A.1 — O conceito-chave: papel ≠ plano

São duas coisas diferentes e devem ser modeladas de formas diferentes:

| Conceito | O que é | Como modelar | Muda quando |
|---|---|---|---|
| **Admin** | Função/cargo (RBAC) | **Role** | Quase nunca |
| **Free / Pro / Premium** | Nível de assinatura (entitlement) | **Claim + Policy** | A cada cobrança/upgrade/downgrade |

Tratar plano como se fosse role funciona no começo, mas vira dor de cabeça depois. Admin como role; plano como claim verificada por policies.

## A.2 — Caminho de toda requisição

Uma requisição autenticada passa por camadas (gates) que se somam:

1. **Papel (role)** — a ação é só de admin?
2. **Plano (tier)** — o plano do usuário libera o recurso?
3. **Dono do recurso** — o dado pertence a este usuário? (anti-IDOR)
4. **Cota/limite** — está dentro do limite do plano?

Só passa se todas as camadas aplicáveis aprovarem.

## A.3 — Backend: Admin como role

Com ASP.NET Core Identity, papéis ficam em `AspNetRoles`/`AspNetUserRoles` e entram como claim no JWT.

```csharp
[Authorize(Roles = "Admin")]
[HttpGet("admin/usuarios")]
public IActionResult ListarUsuarios() { ... }
```

Use role só para Admin (e talvez "Suporte"). É binário e raramente muda.

## A.4 — Backend: planos como claim + policy

Guarde o plano do usuário (coluna no usuário ou tabela `Assinaturas`) e coloque-o como claim no token: `plan = "free" | "pro" | "premium"`.

Defina as policies no `Program.cs`:

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequerPago", p => p.RequireClaim("plan", "pro", "premium"));
    options.AddPolicy("RequerPremium", p => p.RequireClaim("plan", "premium"));
});
```

Para **hierarquia** de planos (free < pro < premium), use um requirement de "plano mínimo" em vez de listar planos em cada policy:

```csharp
public class PlanoMinimoRequirement : IAuthorizationRequirement
{
    public int Nivel { get; }
    public PlanoMinimoRequirement(int nivel) => Nivel = nivel;
}

public class PlanoMinimoHandler : AuthorizationHandler<PlanoMinimoRequirement>
{
    private static readonly Dictionary<string, int> Niveis = new()
    {
        ["free"] = 0, ["pro"] = 1, ["premium"] = 2
    };

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx, PlanoMinimoRequirement req)
    {
        var plan = ctx.User.FindFirst("plan")?.Value ?? "free";
        if (Niveis.GetValueOrDefault(plan, 0) >= req.Nivel)
            ctx.Succeed(req);
        return Task.CompletedTask;
    }
}
```

## A.5 — Backend: autorização por endpoint (a matriz)

A autorização é **por action, não por controller**. O atributo no controller é o *baseline*; cada endpoint soma restrições. A única forma de abrir um endpoint além do baseline é `[AllowAnonymous]`.

```csharp
[ApiController]
[Route("api/transacoes")]
[Authorize] // BASE: por padrão, precisa estar logado
public class TransacoesController : ControllerBase
{
    // Qualquer usuário logado — inclui FREE (herda só o [Authorize] do controller)
    [HttpGet]
    public IActionResult Listar() { ... }

    // Só planos PAGOS (soma: logado E pago)
    [HttpGet("exportar")]
    [Authorize(Policy = "RequerPago")]
    public IActionResult Exportar() { ... }

    // Só PREMIUM
    [HttpGet("analise-preditiva")]
    [Authorize(Policy = "RequerPremium")]
    public IActionResult AnalisePreditiva() { ... }

    // Aberto a TODOS, até sem login (sobrepõe a base)
    [HttpGet("status")]
    [AllowAnonymous]
    public IActionResult Status() { ... }
}
```

Mapeamento intenção → atributo:

| O que você quer | No endpoint |
|---|---|
| Qualquer usuário logado (free incluso) | nada (herda `[Authorize]`) |
| Só planos pagos | `[Authorize(Policy = "RequerPago")]` |
| Só premium | `[Authorize(Policy = "RequerPremium")]` |
| Aberto a todos, sem login | `[AllowAnonymous]` |

Dois cuidados:
- **"Liberado para todos" é ambíguo:** *qualquer logado* (só `[Authorize]`, sem policy) vs *qualquer um sem login* (`[AllowAnonymous]`). Em finanças, `[AllowAnonymous]` quase só para health-check, login e registro.
- **Baseline correto:** como só dá para *somar* restrições, ponha no controller a regra **menos restritiva** (geralmente `[Authorize]`) e aperte por endpoint. Se puser uma policy de plano no controller, nenhum endpoint dele consegue voltar a aceitar free (a não ser abrindo geral com `[AllowAnonymous]`, que tira o login junto).

Se a matriz crescer, **Minimal APIs com route groups** deixam o agrupamento por política explícito:

```csharp
var pagos = app.MapGroup("/api/transacoes").RequireAuthorization("RequerPago");
pagos.MapGet("/exportar", ExportarHandler);
pagos.MapGet("/relatorios", RelatoriosHandler);
```

## A.6 — Backend: dono do recurso (anti-IDOR)

Não é atributo/policy — é checagem por dado, em toda query:

```csharp
var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
var conta = await _db.Contas
    .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
if (conta is null) return NotFound();
```

## A.7 — Backend: cota/limite por plano

"Pode acessar a feature" (autorização) ≠ "está dentro do limite" (regra de negócio). Ex.: free cria no máximo 2 contas. Isso vai na camada de serviço:

```csharp
var qtd = await _db.Contas.CountAsync(c => c.UserId == userId);
var limite = plano switch { "free" => 2, "pro" => 10, _ => int.MaxValue };
if (qtd >= limite)
    return Forbid(); // ou 422 "faça upgrade"
```

## A.8 — Backend: o plano muda no meio da sessão

A claim `plan` é "carimbada" no JWT no login. Se o usuário faz downgrade ou a assinatura expira, o token velho ainda diz `premium`. Soluções:

- **Access tokens curtos (ex.: 15 min):** a cada refresh, releia o plano do banco e emita a claim atualizada. Desatualização de no máximo ~15 min.
- **Revalidar no banco** nos pontos sensíveis, em vez de confiar só na claim.

Recomendação para finanças: combinar os dois — token curto no geral + checagem no banco nas ações de alto valor.

## A.9 — Angular: o front espelha, o backend barra

O front replica as regras só para UX (não mostrar o que vai dar erro). Quem **garante** é o backend.

**(a) Saber papel e plano** — de um endpoint `/me` (autoritativo), não só do JWT decodificado:

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<UserInfo | null>(null);
  readonly user = this._user.asReadonly();

  readonly isAdmin = computed(() => this._user()?.roles.includes('Admin') ?? false);
  readonly plan = computed(() => this._user()?.plan ?? 'free');
  readonly planLevel = computed(() => {
    const niveis: Record<string, number> = { free: 0, pro: 1, premium: 2 };
    return niveis[this.plan()] ?? 0;
  });

  hasPlan(min: 'pro' | 'premium'): boolean {
    return this.planLevel() >= (min === 'premium' ? 2 : 1);
  }
}
```

**(b) Route Guards** (espelham `[Authorize]` / policies):

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.user() ? true : router.createUrlTree(['/login']);
};

export const planGuard = (min: 'pro' | 'premium'): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.user()) return router.createUrlTree(['/login']);
  return auth.hasPlan(min) ? true : router.createUrlTree(['/upgrade']);
};
```

**(c) Rotas espelhando a matriz do backend:**

```typescript
export const routes: Routes = [
  { path: 'login', component: LoginComponent },                                          // AllowAnonymous
  { path: 'transacoes', component: TransacoesComponent, canActivate: [authGuard] },      // free incluso
  { path: 'exportar', component: ExportComponent, canActivate: [planGuard('pro')] },     // pago
  { path: 'analise', component: AnaliseComponent, canActivate: [planGuard('premium')] }, // premium
  { path: 'admin', component: AdminComponent, canActivate: [authGuard, adminGuard] },    // admin
];
```

**(d) Esconder botões/telas** — `*ngIf` ou diretiva estrutural própria:

```typescript
@Directive({ selector: '[appHasPlan]', standalone: true })
export class HasPlanDirective {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private auth = inject(AuthService);

  @Input() set appHasPlan(min: 'pro' | 'premium') {
    this.vcr.clear();
    if (this.auth.hasPlan(min)) this.vcr.createEmbeddedView(this.tpl);
  }
}
```

```html
<button *appHasPlan="'pro'" (click)="exportar()">Exportar relatório</button>
<a *ngIf="auth.isAdmin()" routerLink="/admin">Painel admin</a>
```

**(e) Rede de segurança: tratar 401/403** no interceptor. O front pode estar desatualizado (downgrade, expiração) ou alguém pode chamar a API direto — o backend responde 403 e o interceptor centraliza:

```typescript
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) router.navigate(['/login']);   // não autenticado
      if (err.status === 403) router.navigate(['/upgrade']); // logado, plano insuficiente
      return throwError(() => err);
    })
  );
};
```

## A.10 — Divisão de trabalho (resumo)

| Camada | Papel | Vale como segurança? |
|---|---|---|
| Guards + `*ngIf` (Angular) | Esconder o que daria erro; boa UX | Não |
| `[Authorize]` / policies (backend) | Barrar acesso por papel/plano | Sim |
| Checagem de dono + cota (backend) | Impedir IDOR e estouro de limite | Sim |
| 403 + interceptor | Reagir quando o front está desatualizado | Sim (no backend) |

Regra final: **se existisse só o guard do Angular e não a checagem no backend, qualquer um abriria o DevTools e chamaria o endpoint na mão.** O front é conveniência; o backend é a fronteira.

---
---

# Anexo B — Observabilidade com OpenTelemetry (stack Grafana)

Stack alvo: **OpenTelemetry** (instrumentação) → **OTel Collector** → **Tempo** (traces) · **Prometheus** (métricas) · **Loki** (logs) → **Grafana** (visualização e alertas).

Princípio: o app (Angular + .NET) só fala **OTLP** com o Collector. Quem conhece Tempo/Prometheus/Loki é o Collector — então trocar de backend depois não exige mexer no app.

## B.1 — Os três sinais

- **Traces** — o caminho de uma requisição (Angular → API → banco), com o tempo de cada etapa. Mostra *por que* algo demorou.
- **Métricas** — números agregados no tempo: req/s, latência p95, taxa de erro, CPU/memória.
- **Logs** — eventos pontuais, correlacionados ao trace que os gerou.

## B.2 — Backend .NET: pacotes

```
OpenTelemetry.Extensions.Hosting
OpenTelemetry.Instrumentation.AspNetCore
OpenTelemetry.Instrumentation.Http
OpenTelemetry.Instrumentation.EntityFrameworkCore
OpenTelemetry.Instrumentation.Runtime
OpenTelemetry.Exporter.OpenTelemetryProtocol
```

## B.3 — Backend .NET: configuração (`Program.cs`)

O ASP.NET Core é nativo OTel (usa `System.Diagnostics.Activity`). Exporta tudo via OTLP para o Collector:

```csharp
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("financas-api"))
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()          // HTTP de entrada
        .AddHttpClientInstrumentation()          // HTTP de saída
        .AddEntityFrameworkCoreInstrumentation() // queries no banco
        .AddOtlpExporter())                      // -> Collector
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()             // GC, threads, memória
        .AddOtlpExporter());

builder.Logging.AddOpenTelemetry(o => o.AddOtlpExporter());
```

Por padrão o OTLP exporter aponta para `http://localhost:4317`. Em produção, configure o endpoint do Collector via variável de ambiente `OTEL_EXPORTER_OTLP_ENDPOINT`.

Traces das requisições e das queries do EF Core vêm **de graça**, sem tocar nas controllers.

## B.4 — Backend .NET: spans manuais (lógica de negócio)

```csharp
private static readonly ActivitySource Activity = new("Financas.Transacoes");

using var span = Activity.StartActivity("CalcularSaldoConsolidado");
span?.SetTag("conta.tipo", tipo);   // categoria, NUNCA o saldo/valor
```

## B.5 — Frontend Angular: trace de ponta a ponta

Com propagação de contexto W3C, o navegador injeta o header `traceparent` nas chamadas à API e o backend continua o **mesmo** trace (clique → requisição → query, tudo conectado).

```typescript
const provider = new WebTracerProvider();
provider.register({ propagator: new W3CTraceContextPropagator() });

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation({
      // só propaga o traceparent para a SUA API
      propagateTraceHeaderCorsUrls: [/https:\/\/api\.seudominio\.com/],
    }),
  ],
});
```

Requisitos:
- Liberar o header `traceparent` no **CORS** do backend: `.WithHeaders("traceparent", ...)`.
- Telemetria de browser é barulhenta → use **amostragem** (não envie 100%).

## B.6 — OTel Collector: config para o stack Grafana

`otel-collector-config.yaml` — recebe OTLP do app e distribui para Tempo/Prometheus/Loki. O processador de **redaction/attributes** é a rede de segurança contra vazamento.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:
  # remove atributos sensíveis ANTES de exportar
  attributes/redact:
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: user.cpf
        action: delete
      - key: user.email
        action: delete

exporters:
  otlp/tempo:                 # traces -> Tempo
    endpoint: tempo:4317
    tls: { insecure: true }
  prometheusremotewrite:      # métricas -> Prometheus
    endpoint: http://prometheus:9090/api/v1/write
  otlphttp/loki:              # logs -> Loki (ingestão OTLP nativa)
    endpoint: http://loki:3100/otlp

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/redact, batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [attributes/redact, batch]
      exporters: [otlphttp/loki]
```

Notas:
- **Tempo** recebe OTLP direto (porta 4317).
- **Prometheus** via `remote-write` (habilite `--web.enable-remote-write-receiver` no Prometheus). Alternativas: o exporter `prometheus` (Prometheus faz scrape) ou o receiver OTLP nativo do Prometheus.
- **Loki** já ingere OTLP nativamente no endpoint `/otlp` (o antigo exporter `loki` foi descontinuado).

## B.7 — Grafana: a correlação é o pulo do gato

Configure os data sources (Tempo, Prometheus, Loki) e ligue as correlações:

- **Trace → Logs:** no data source do Tempo, ative "Trace to logs" apontando para o Loki via `trace_id`. Aí você clica num trace lento e vê os logs daquela requisição.
- **Métrica → Trace (exemplars):** liga um pico de latência ao trace exato que o causou.
- **Logs → Trace:** do Loki de volta ao Tempo pelo `trace_id`.

É isso que transforma três telas separadas numa investigação fluida.

## B.8 — Dev local: atalho

Para subir o stack inteiro localmente, a imagem **`grafana/otel-lgtm`** (Loki, Grafana, Tempo, Prometheus/Mimir) roda tudo num container, já com endpoint OTLP em `4317`/`4318`. Ótima para desenvolver sem montar a infra completa.

## B.9 — ⚠️ Telemetria num app financeiro vaza dados (regra de ouro)

Telemetria vai para um sistema externo com muitos acessos — é um dos lugares mais comuns de vazamento. Conecta direto com a segurança das outras seções.

- **Nunca** em spans/tags/métricas/logs: saldo, valor de transação, número de conta/cartão, CPF, e-mail, nome, tokens, senhas.
- Marque **categorias e IDs internos** (`conta.tipo`, `usuario.id = guid`), nunca o **conteúdo**.
- Cuidado com **URLs e query strings** capturadas pelo auto-instrumentation (jamais passe dado sensível na URL).
- Use o **processador de redaction no Collector** (B.6) como última barreira.
- **LGPD:** dados de telemetria também são dados pessoais — entram no inventário de tratamento e na política de retenção.

Regra de ouro: **telemetria responde "o quê e quão rápido", nunca "com quais dados".**

## B.10 — O que vigiar (alertas úteis num app de finanças)

- [ ] Latência p95/p99 por endpoint (especialmente login e transações).
- [ ] Taxa de erro 5xx e 4xx.
- [ ] **Pico de falhas de login / 401** (possível brute force).
- [ ] **Pico de 403** (tentativas de acessar recurso de outro plano/usuário — possível IDOR ou abuso).
- [ ] Latência das queries no banco (via instrumentação do EF Core).
- [ ] Saúde de runtime: uso de memória, GC, fila de threads.
- [ ] Disponibilidade (health checks).

---
---

# Anexo C — Monetização e assinaturas (Mercado Pago)

Cenário: planos **Free / Pro / Premium** + **Admin**. Provedor principal **Mercado Pago**; **Stripe** entra só como contingência se houver problema com o MP.

## C.1 — Estratégia e arquitetura

Princípio central: **o seu banco é a fonte da verdade do plano; os provedores são só o encanamento de cobrança.** O Mercado Pago nunca "diz" qual o plano do usuário — ele avisa por **webhook** que algo mudou, e o seu sistema atualiza a assinatura e, a partir dela, a claim `plan`.

Como o Stripe é apenas seguro, **não se constrói nada de Stripe agora**. O que garante a portabilidade não é a interface, e sim a **camada de tradução na borda** (anti-corruption layer): o vocabulário do MP (`preapproval`, `recycling`, `authorized`...) fica preso na borda e nunca vaza para o domínio. Lá dentro só existem a sua `Subscription` e o seu `SubscriptionStatus`.

```csharp
public interface IPaymentProvider
{
    PaymentProvider Provider { get; }
    Task<(string providerId, string initPoint)> CriarAssinaturaAsync(
        string planoProviderId, string payerEmail, string externalReference);
    Task CancelarAsync(string providerSubscriptionId);
}
```

Calibragem (evitar over-engineering): vale a entidade interna própria + o tradutor isolado num único lugar; a interface fina é bônus (ajuda nos testes). **Não** vale registry de provedores, lógica de seleção ou qualquer config de Stripe — YAGNI.

## C.2 — Modelagem de dados

```csharp
public class Subscription
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public PlanTier Plan { get; set; }                 // Free | Pro | Premium
    public BillingPeriod Period { get; set; }          // Monthly | Yearly
    public PaymentProvider Provider { get; set; }      // MercadoPago
    public string ProviderSubscriptionId { get; set; } // id do preapproval
    public SubscriptionStatus Status { get; set; }     // Pending | Active | PastDue | Paused | Canceled
    public decimal Valor { get; set; }                 // SEMPRE decimal
    public string Moeda { get; set; }                  // "BRL"
    public DateTime? CurrentPeriodEnd { get; set; }    // até quando o acesso vale
    public DateTime UpdatedAt { get; set; }
}
```

Catálogo de planos em **tabela no banco** (gerenciável pelo Admin), provider-aware para o Stripe encaixar depois:

```csharp
public class PlanPrice
{
    public PlanTier Plan { get; set; }
    public BillingPeriod Period { get; set; }
    public PaymentProvider Provider { get; set; }
    public string ProviderPlanId { get; set; }    // preapproval_plan_id
    public decimal Amount { get; set; }           // decimal
    public string Currency { get; set; }          // "BRL"
}
```

Mapeamento de status (MP → domínio):

| Mercado Pago | `SubscriptionStatus` | Acesso? |
|---|---|---|
| `authorized` + pagamento `processed` | `Active` | Sim |
| `pending` (aguardando 1º pagamento) | `Pending` | Não ainda |
| pagamento em `recycling` | `PastDue` | Sim, em carência |
| `paused` | `Paused` | Conforme política |
| `cancelled` | `Canceled` | Até `CurrentPeriodEnd` |

`CurrentPeriodEnd`: a cada pagamento `processed`, estende `= data do pagamento + período + carência`. Em `recycling`, marca `PastDue` mas mantém o acesso até o fim do período. Mantenha uma tabela `SubscriptionEvent` com o id de cada evento processado (auditoria + base da idempotência).

## C.3 — Fluxo de checkout (redirect hospedado)

Decisão de PCI: usar o **checkout hospedado** do MP (`init_point`) para que o cartão nunca passe pelo backend. Alternativa: Checkout Bricks (tokeniza no navegador).

Setup, uma vez por plano (guarda o `id` em `PlanPrice.ProviderPlanId`):

```jsonc
POST /preapproval_plan
{
  "reason": "Plano Pro - Mensal",
  "auto_recurring": { "frequency": 1, "frequency_type": "months",
                      "transaction_amount": 29.90, "currency_id": "BRL" },
  "back_url": "https://app.seudominio.com/assinatura/retorno"
}
```

Assinatura, por usuário:

```csharp
[Authorize]
[HttpPost("assinaturas/checkout")]
public async Task<IActionResult> Checkout(CheckoutRequest req)
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    var preco  = await _catalogo.ObterAsync(req.Plano, req.Periodo, PaymentProvider.MercadoPago);

    var sub = await _subs.CriarPendenteAsync(userId, req.Plano, req.Periodo); // âncora de correlação
    var (providerId, initPoint) = await _mercadoPago.CriarAssinaturaAsync(
        planoProviderId: preco.ProviderPlanId,
        payerEmail:      User.FindFirstValue(ClaimTypes.Email),
        externalReference: sub.Id.ToString());
    await _subs.VincularProviderIdAsync(sub.Id, providerId);

    return Ok(new { checkoutUrl = initPoint }); // quem libera acesso é o webhook, não isto
}
```

```typescript
assinar(plano: 'pro' | 'premium') {
  this.http.post<{ checkoutUrl: string }>('/api/assinaturas/checkout', { plano, periodo: 'monthly' })
    .subscribe(r => window.location.href = r.checkoutUrl);
}
```

Regras de ouro: o retorno ao `back_url` **não** libera acesso (só o webhook); o `external_reference` carrega o id da assinatura pendente; criação **idempotente**; a página de retorno faz polling com "confirmando pagamento…".

## C.4 — Webhooks (o coração)

Ordem do handler: **validar assinatura → idempotência → buscar o recurso real → traduzir e aplicar → responder 200**.

Validação da assinatura (template `id:{data.id};request-id:{x-request-id};ts:{ts};`, HMAC-SHA256 hex):

```csharp
public bool ValidarAssinatura(HttpRequest req, string secret)
{
    var assinatura = req.Headers["x-signature"].ToString();   // "ts=...,v1=..."
    var requestId  = req.Headers["x-request-id"].ToString();
    var dataId     = req.Query["data.id"].ToString().ToLowerInvariant();

    var partes = assinatura.Split(',')
        .Select(p => p.Split('=', 2)).Where(p => p.Length == 2)
        .ToDictionary(p => p[0].Trim(), p => p[1].Trim());

    if (!partes.TryGetValue("ts", out var ts) || !partes.TryGetValue("v1", out var hashRecebido))
        return false;

    var manifest = $"id:{dataId};request-id:{requestId};ts:{ts};";
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var hash = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(manifest))).ToLowerInvariant();

    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(hash), Encoding.UTF8.GetBytes(hashRecebido));
}
```

Handler:

```csharp
[AllowAnonymous]
[HttpPost("webhooks/mercadopago")]
public async Task<IActionResult> Webhook()
{
    if (!_mp.ValidarAssinatura(Request, _opt.WebhookSecret)) return Unauthorized();

    var topic    = Request.Query["type"].ToString();
    var dataId   = Request.Query["data.id"].ToString();
    var eventKey = $"{topic}:{dataId}:{Request.Headers["x-request-id"]}";

    if (await _events.JaProcessadoAsync(eventKey)) return Ok();

    await _assinaturas.ProcessarEventoMpAsync(topic, dataId);
    await _events.MarcarProcessadoAsync(eventKey);
    return Ok();
}
```

Trabalho real (payload magro → busca o estado verdadeiro):

```csharp
if (topic == "subscription_preapproval")
{
    var pre = await _mpApi.ObterPreapprovalAsync(dataId);   // GET /preapproval/{id}
    var sub = await _subs.ObterPorProviderIdAsync(pre.Id, pre.ExternalReference);
    if (sub is null) return;

    sub.Status = MapearStatus(pre.Status);
    if (sub.Status == SubscriptionStatus.Active)
        sub.CurrentPeriodEnd = CalcularFimDoPeriodo(pre);
    sub.UpdatedAt = DateTime.UtcNow;

    await _subs.SalvarAsync(sub);
    await _planos.SincronizarPlanoDoUsuarioAsync(sub.UserId);
}
```

Regras: assinatura validada antes de tudo; **sempre** buscar o recurso na API (não confiar no corpo); idempotência obrigatória (eventos repetem e chegam fora de ordem); responder 200 rápido (enfileirar em volume). Dev local: túnel (ngrok) + simulador de webhooks do painel.

## C.5 — Ligação com a autorização

Fonte única da verdade do plano:

```csharp
public static PlanTier PlanoEfetivo(Subscription? sub)
{
    if (sub is null) return PlanTier.Free;
    var dentroDoPeriodo = sub.CurrentPeriodEnd > DateTime.UtcNow;
    var bloqueado = sub.Status is SubscriptionStatus.Paused;
    return (dentroDoPeriodo && !bloqueado) ? sub.Plan : PlanTier.Free;
}
```

Consequência boa: quem cancela ou está em `PastDue` mantém acesso enquanto dentro do período já pago.

Propagação até a claim:
- **Token curto (15 min) + refresh re-carimba a claim** — o `/refresh` relê `PlanoEfetivo` e emite a claim `plan` atualizada. Defasagem máxima = vida do token.
- O webhook chama `SincronizarPlanoDoUsuarioAsync`, que atualiza um cache rápido do plano efetivo no usuário.
- **Upgrade instantâneo (UX):** a página de retorno faz polling; ao ver `Active`, dispara um refresh do token na hora.
- **Downgrade/cancelamento:** normalmente honra-se o período pago (não corta na hora). Invalidação imediata só por fraude/chargeback, via claim `token_version` (incrementa a versão no banco → middleware rejeita tokens antigos).
- **Ações de alto valor:** revalidar `PlanoEfetivo` no banco/cache no momento da execução, não confiar só na claim.

Ciclo completo: pagamento → webhook → `Subscription` → plano efetivo → claim no refresh → policies (Anexo A) → endpoints.

## C.6 — Casos de borda

- **Falha de pagamento (dunning/recycling):** marcar `PastDue`, manter acesso até `CurrentPeriodEnd`, avisar o usuário; se não regularizar, cai para `Free` no fim do período.
- **Webhook perdido → reconciliação (crítico):** job periódico (Hangfire/Quartz) que consulta `GET /preapproval/search` e ajusta o banco à verdade do MP.
- **Upgrade/downgrade:** `PUT /preapproval/{id}` mudando `transaction_amount` + seu `Plan`. O MP **não faz proration automática** → o mais simples é valer no próximo ciclo.
- **Cancelamento:** `PUT status=cancelled`, acesso mantido até o fim do período (cancelar no fim do período é o padrão bom).
- **Reembolso/chargeback:** chargeback é o caso de revogar acesso na hora (`token_version`).
- **Trial (`free_trial`):** acesso do plano pago sem cobrança; ao fim, primeira cobrança (falha → dunning).
- **Checkout abandonado:** job de limpeza expira `Pending` com mais de ~24h.
- **Assinatura duplicada:** antes do checkout, verificar se já existe assinatura `Active`.
- **Mudança de preço:** novos pegam o preço novo; existentes ficam no antigo até `PUT` (geralmente grandfathering + aviso).

## C.7 — Gestão pelo usuário

O MP **não tem** um Customer Portal hospedado como o Stripe — essa tela você constrói. Oferece: ver plano e próxima cobrança, trocar plano, cancelar, reativar, histórico.

```csharp
public record AssinaturaResumo(
    string Plano, string Status, decimal Valor, string Moeda,
    DateTime? ProximaCobranca, bool CancelaNoFimDoPeriodo);

[Authorize]
[HttpGet("assinaturas/minha")]
public async Task<ActionResult<AssinaturaResumo>> Minha()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    var sub = await _subs.ObterAtivaAsync(userId);          // só a DELE
    if (sub is null) return Ok(new AssinaturaResumo("free", "none", 0, "BRL", null, false));
    return Ok(new AssinaturaResumo(sub.Plan.ToString().ToLower(), sub.Status.ToString(),
        sub.Valor, sub.Moeda, sub.CurrentPeriodEnd, sub.Status == SubscriptionStatus.Canceled));
}

[Authorize]
[HttpPost("assinaturas/cancelar")]
public async Task<IActionResult> Cancelar()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    var sub = await _subs.ObterAtivaAsync(userId);          // anti-IDOR
    if (sub is null) return NotFound();
    await _mercadoPago.CancelarAsync(sub.ProviderSubscriptionId);
    return Ok();
}
```

Atualização de cartão: direcionar o usuário ao próprio Mercado Pago (zero PCI) ou usar Bricks para tokenizar e dar `PUT` no `card_token_id`. Princípios: toda mudança passa pelo backend → MP, confirmada por webhook; endpoints operam só sobre a assinatura do próprio usuário; cancelamento é ação sensível (confirmar, idealmente reautenticar).

## C.8 — Segurança da monetização (consolidação)

**Borda / webhook**
- [ ] Validar a assinatura HMAC antes de qualquer processamento (a assinatura é a autenticação).
- [ ] Idempotência por `eventKey` + estado absoluto + guarda por `UpdatedAt`.
- [ ] Defesa de replay por `ts` com cautela (não apertar a janela; reenvios legítimos atrasam).
- [ ] HTTPS no webhook e em tudo.

**Fronteiras de confiança**
- [ ] Acesso liberado só por webhook, nunca pelo retorno do checkout.
- [ ] O cliente nunca manda preço/plano-id/status/valor — o backend busca no catálogo.
- [ ] Anti-IDOR em todo endpoint de billing (só a assinatura do próprio usuário).
- [ ] Rate limiting na criação de checkout.

**Segredos e PCI**
- [ ] Access token do MP e webhook secret num cofre, nunca versionados.
- [ ] Credenciais de teste e produção separadas.
- [ ] Dados de cartão nunca tocam o backend (checkout hospedado ou Bricks).

**Integridade, auditoria e ambiente**
- [ ] Trilha `SubscriptionEvent` para auditoria e reconciliação.
- [ ] Logs sem vazamento (nunca token do MP, cartão ou PII).
- [ ] Invalidação imediata por fraude/chargeback via `token_version`.
- [ ] Ações de admin sobre assinaturas com `[Authorize(Roles="Admin")]` e auditadas.

---
---

# Anexo D — Fundamentos de dados financeiros

A base que sustenta importação, relatórios, cobrança e escala. Se o modelo de dinheiro estiver errado aqui, tudo herda o erro.

## D.1 — Representação monetária

**Nunca `float`/`double` para dinheiro** — ponto flutuante binário não é exato e o erro acumula (`0.1 + 0.2 = 0.30000000000000004`).

Opções reais: **`decimal`** (recomendado para .NET — base 10, exato, mapeia direto para `decimal`/`numeric` do banco) ou **inteiro em centavos** (elimina ambiguidade, é o que os provedores de pagamento usam por baixo, mas dá mais atrito em relatórios/percentuais). Para finanças pessoais, `decimal` paga melhor.

Precisão explícita no banco (sem isso o EF pode truncar em silêncio):

```csharp
modelBuilder.Entity<Transacao>().Property(t => t.Valor).HasPrecision(18, 2);
// use mais escala (ex.: 18,6) para taxas de câmbio
```

Arredondamento: escolha **uma** política (em finanças, bancário/`MidpointRounding.ToEven`) e arredonde só **na borda** (exibição/liquidação), mantendo precisão cheia nos cálculos. Para dividir um valor, use alocação por "maior resto" para as partes somarem exatamente o total.

Dinheiro é **(valor + moeda)** — nunca misture moedas em aritmética. Centralize num value object:

```csharp
public readonly record struct Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Não é possível somar moedas diferentes.");
        return this with { Amount = Amount + other.Amount };
    }
}
```

Mesmo começando só com BRL, modele o campo de moeda desde já (mapeia como *owned type* no EF). Ao converter, guarde taxa + valor convertido + timestamp (dado de auditoria).

## D.2 — Modelagem do domínio

Decisão grande: **modelo simples (single-entry)** vs **ledger (double-entry)**. Para finanças pessoais, recomendado o **modelo simples com valor sinalizado**, mas com **transferência de primeira classe** (a melhor ideia do ledger). Double-entry completo só compensa com necessidade de rigor contábil.

```csharp
public class Conta
{
    public Guid Id { get; set; }
    public string UserId { get; set; }        // tudo é do dono (anti-IDOR)
    public string Nome { get; set; }
    public ContaTipo Tipo { get; set; }       // Corrente | Poupanca | Cartao | Dinheiro
    public string Moeda { get; set; }
    public decimal SaldoInicial { get; set; }
}

public class Transacao
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public Guid ContaId { get; set; }
    public Guid? CategoriaId { get; set; }    // null em transferência
    public decimal Valor { get; set; }        // SINALIZADO: + entra, − sai
    public DateTime Data { get; set; }
    public TransacaoTipo Tipo { get; set; }   // Receita | Despesa | Transferencia
    public Guid? TransferenciaId { get; set; }// liga as duas pernas
    public string? Descricao { get; set; }
}

public class Categoria
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public string Nome { get; set; }
    public CategoriaTipo Tipo { get; set; }   // Receita | Despesa
    public Guid? ParentId { get; set; }       // subcategorias
}
```

Duas convenções que evitam a maioria dos bugs:
- **Valor sinalizado + `Tipo`**: o sinal no `Valor` torna o saldo trivial (`SaldoInicial + SUM(Valor)`); o `Tipo` serve só para classificar em relatórios.
- **Transferência não é receita nem despesa**: duas linhas com o mesmo `TransferenciaId` (uma negativa, uma positiva), sem categoria. **Exclua transferências dos relatórios de receita/despesa** — senão conta como gasto um dinheiro que só mudou de bolso (erro nº 1 do gênero).

Notas: cartão de crédito é conta com saldo negativo (dívida); pagar a fatura é uma transferência. Índice em `(UserId, ContaId, Data)`.

## D.3 — Integridade e consistência

**Atomicidade** — a transferência (duas pernas) é tudo-ou-nada, dentro de uma transação de banco:

```csharp
public async Task TransferirAsync(string userId, Guid origem, Guid destino, decimal valor, DateTime data)
{
    if (valor <= 0) throw new ArgumentException("Valor deve ser positivo.");

    var strategy = _db.Database.CreateExecutionStrategy();   // cobre retentativas transitórias
    await strategy.ExecuteAsync(async () =>
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        var transferId = Guid.NewGuid();

        _db.Transacoes.Add(new Transacao { UserId = userId, ContaId = origem,
            Valor = -valor, Tipo = TransacaoTipo.Transferencia, TransferenciaId = transferId, Data = data });
        _db.Transacoes.Add(new Transacao { UserId = userId, ContaId = destino,
            Valor = +valor, Tipo = TransacaoTipo.Transferencia, TransferenciaId = transferId, Data = data });

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
    });
}
```

Invariante: `SUM(Valor) por TransferenciaId = 0` (garantido por construção; vale conferir na reconciliação).

**Concorrência** — concorrência otimista com *rowversion* evita "lost update":

```csharp
[Timestamp] public byte[] RowVersion { get; set; } // SQL Server; Postgres: IsRowVersion (xmin)
```

Colisão → `DbUpdateConcurrencyException` → recarregar e reaplicar, nunca gravar por cima.

**Idempotência** — operações que criam dinheiro exigem chave de idempotência (header `Idempotency-Key`) registrada na mesma transação de banco. Na importação, a idempotência vem de uma **chave natural** (id do extrato ou hash de conta+data+valor+descrição) com índice único.

**Integridade referencial** — `Conta`/`Categoria` como FKs; **nunca cascatear delete de transações** (use soft-delete).

## D.4 — Auditoria e imutabilidade

**Soft-delete** com *global query filter* (todo SELECT já ignora os excluídos):

```csharp
public interface ISoftDelete { DateTime? DeletedAt { get; set; } }
modelBuilder.Entity<Transacao>().HasQueryFilter(t => t.DeletedAt == null);
```

**Imutabilidade**: estrito (correção via estorno) vs pragmático (editar mas guardar o estado anterior). Para finanças pessoais, o pragmático basta — o proibido é editar e perder o que era antes.

**Trilha de auditoria** centralizada num interceptor do `SaveChanges` (carimba colunas, converte delete em soft-delete, grava antes/depois):

```csharp
public class AuditInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData e, InterceptionResult<int> result, CancellationToken ct = default)
    {
        var ctx = e.Context!; var agora = DateTime.UtcNow; var userId = _currentUser.Id;
        foreach (var entry in ctx.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
                { entry.Entity.CreatedAt = agora; entry.Entity.CreatedBy = userId; }
            if (entry.State == EntityState.Modified)
                { entry.Entity.UpdatedAt = agora; entry.Entity.UpdatedBy = userId; }
            if (entry.State == EntityState.Deleted && entry.Entity is ISoftDelete sd)
                { entry.State = EntityState.Modified; sd.DeletedAt = agora; }
            ctx.Add(MontarRegistroDeAuditoria(entry, userId, agora));
        }
        return base.SavingChangesAsync(e, result, ct);
    }
}
```

Alternativa com menos código: **tabelas temporais** (system-versioned) do banco. O log de auditoria é **append-only** (só inserção); para alta exigência, encadeie hashes para torná-lo à prova de adulteração.

**LGPD**: tensão entre "nunca apagar" e direito de exclusão → resolver por **anonimização** (remover identificadores pessoais mantendo o registro) ou exclusão após o prazo de retenção legal. Decisão de política — confirmar com especialista (não é aconselhamento jurídico).

## D.5 — Cálculo de saldo

**Derivar vs materializar.** Derivar (`SaldoInicial + SUM(Valor)`) é sempre correto e, em escala pessoal, rápido sobre o índice `(UserId, ContaId, Data)`. Materializar dá leitura O(1) mas exige manter a coluna em sincronia em toda escrita (risco de inconsistência + concorrência).

**Recomendado: derive primeiro** (correção > micro-otimização):

```csharp
public async Task<decimal> SaldoAsync(string userId, Guid contaId, DateTime? ateData = null)
{
    var q = _db.Transacoes.Where(t => t.UserId == userId && t.ContaId == contaId);
    if (ateData is not null) q = q.Where(t => t.Data <= ateData);
    var soma  = await q.SumAsync(t => t.Valor);
    var conta = await _db.Contas.FirstAsync(c => c.Id == contaId && c.UserId == userId);
    return conta.SaldoInicial + soma;
}
```

Bônus: o saldo **em qualquer data** sai de graça (`ateData`), alimentando gráficos de evolução.

**Quando ficar lento** (otimize só ao medir): **snapshots** periódicos (saldo = snapshot mais recente + soma desde então). Se materializar mesmo, faça update **atômico** (`UPDATE Conta SET Saldo = Saldo + @delta`) na transação do lançamento, com rowversion, e um **job de reconciliação** que recalcula a partir das transações e corrige desvios.

**Multi-moeda**: saldo é por conta, por moeda — nunca some moedas diferentes; patrimônio total exige conversão com taxa armazenada.

---
---

# Anexo E — Funcionalidades centrais de finanças

Pega o modelo do Anexo D e o coloca para trabalhar: dados entrando (importação, Open Finance), sendo organizados (categorização) e mantidos no tempo (agendados).

## E.1 — Importação de extratos (OFX/CSV)

Esqueleto sempre igual: **parsear → de-duplicar → casar conta/categoria → confirmar**. A de-duplicação é o passo crítico (reimportar arquivo/meses sobrepostos corrompe saldo).

**OFX** (formato bom): cada transação traz um **`FITID`** único do banco — o anti-duplicata nativo, a "chave natural" do Anexo D.

```csharp
public record TransacaoImportada(string FitId, DateTime Data, decimal Valor, string Descricao);

public class ImportFingerprint
{
    public Guid ContaId { get; set; }
    public string ExternalId { get; set; } // FITID (OFX) ou hash (CSV)
    // índice ÚNICO em (ContaId, ExternalId)
}
```

OFX é XML-like (SGML nas versões 1.x) — use uma lib de OFX para .NET (verificar uma atual e mantida no NuGet).

**CSV** (formato chato): sem padrão (colunas/ordem/data/separador variam por banco) e **sem id de transação** → de-duplicação por **hash** de `conta + data + valor + descrição normalizada` (imperfeito; mostre candidatos a duplicata em vez de descartar). Use **CsvHelper** + **perfis de mapeamento** por banco:

```csharp
public class PerfilCsv
{
    public string Banco { get; set; }
    public string ColunaData { get; set; }
    public string ColunaValor { get; set; }
    public string ColunaDescricao { get; set; }
    public string FormatoData { get; set; }      // "dd/MM/yyyy"
    public char Separador { get; set; }           // ',' ou ';'
    public string SeparadorDecimal { get; set; }  // "," no Brasil
}
```

Princípios: importar dentro de uma **transação de banco** (tudo ou nada); arquivos grandes em **background** (Hangfire) com progresso; **prévia antes de confirmar** (mostrar o que entra, duplicatas e sem-categoria); tratar arquivo como **entrada não-confiável** (validar tamanho/formato, limite de linhas, e prefixar células CSV que comecem com `= + - @` contra injeção de fórmula); cada transação amarrada ao `UserId` e a uma conta dele.

## E.2 — Open Finance / agregadores

**Decisão honesta: não integre o Open Finance direto** — exige autorização do Banco Central. Use um **agregador** (já é a parte regulada):
- **Pluggy** — focada no Brasil, cobre ~90% dos bancos, autorizada pelo BC como Iniciadora de Transação de Pagamento. Escolha natural para app brasileiro.
- **Belvo** — open finance para a América Latina; melhor se houver ambição LatAm.

Princípios (repetem padrões já vistos):
- **Credenciais nunca tocam o backend** — o usuário autentica no **widget hospedado** do agregador (mesmo princípio do cartão no Anexo C).
- **Consentimento explícito, temporário e gerido pelo usuário** — só o usuário renova/revoga; você precisa do **CPF + nome** para iniciar; e a regulação **exige uma tela de gestão de consentimentos** no seu app (não é opcional). O consentimento expira (~12 meses) e precisa renovar.
- **De-duplicação reaproveita o Anexo D** — o id de transação do agregador vira o `ExternalId` do `ImportFingerprint`:

```csharp
var fp = new ImportFingerprint { ContaId = conta.Id, ExternalId = txAgregador.Id };
// índice único (ContaId, ExternalId) → re-sincronizar não duplica
```

- **Sincronização tem limites de frequência** (regra da rede do Open Finance) → backfill inicial + incremental por webhook, não polling agressivo.
- **Conexões quebram** (consentimento expira, MFA, banco muda) → modele estados (`Ativa`, `RequerReconexao`, `Revogada`) e avise o usuário.

Monetização: sync automático é custo recorrente (cobrado por conexão) → forte candidato a recurso **Pro/Premium**, enquanto a importação por arquivo fica no Free.

## E.3 — Categorização

Três níveis complementares:
1. **Manual** — fonte de verdade final, sempre existe (`CategoriaId` no Anexo D).
2. **Por regras** — determinístico, transparente; melhor custo-benefício, comece por aqui.
3. **Automática (sugestão)** — tira trabalho repetitivo, mas sempre revisável.

Regras como dado (editável pelo usuário):

```csharp
public class RegraCategorizacao
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public string Padrao { get; set; }
    public TipoMatch Match { get; set; }   // Contem | ComecaCom | Regex
    public Guid CategoriaId { get; set; }
    public int Prioridade { get; set; }
    public bool Ativa { get; set; }
}

public Guid? Sugerir(string descricao, IReadOnlyList<RegraCategorizacao> regras)
{
    var d = Normalizar(descricao); // minúsculas, sem acento, espaços colapsados
    foreach (var r in regras.Where(x => x.Ativa).OrderBy(x => x.Prioridade))
        if (Casa(d, r)) return r.CategoriaId;
    return null; // "Sem categoria" → usuário decide
}
```

Cuidados: **normalizar a descrição**; oferecer "aplicar a regra ao histórico".

Automática — comece simples (histórico do próprio usuário, sem ML):

```csharp
var sugestao = await _db.Transacoes
    .Where(t => t.UserId == userId && t.CategoriaId != null
             && t.DescricaoNormalizada == descricaoNormalizada)
    .GroupBy(t => t.CategoriaId).OrderByDescending(g => g.Count())
    .Select(g => g.Key).FirstOrDefaultAsync();
```

Ordem de complexidade acima disso: categorização do próprio agregador → classificador de texto → LLM (que esbarra na regra do Anexo B: não mandar dado financeiro/PII a serviço externo sem cuidado). Para o MVP, regras + histórico bastam.

**Regra de ouro: sugerir, nunca decidir sozinho.** Marque a origem (`Manual | Regra | Auto`) e nunca sobrescreva o que o usuário definiu na mão. Transferências não se categorizam; categorias têm hierarquia (`ParentId`); "Sem categoria" é trabalho pendente da tela de revisão.

## E.4 — Tarefas agendadas

**Hangfire** (recomendado) — persistência no banco, dashboard, retries e tipos de job prontos. **Quartz.NET** — agendamento mais poderoso, mas você monta persistência/monitoramento.

Catálogo de jobs (consolidando a conversa):
- Transações recorrentes / contas fixas (abaixo).
- Lembretes de vencimento.
- Reconciliação de assinaturas (Anexo C) e de saldo (Anexo D).
- Limpeza de `Pending` abandonado (Anexo C) e de importações órfãs (E.1).
- Sync incremental do Open Finance, respeitando limites (E.2).
- Aviso de consentimento prestes a expirar (E.2).

Transações recorrentes — um molde materializado por um job diário:

```csharp
public class Recorrencia
{
    public Guid Id { get; set; }
    public string UserId { get; set; }
    public Guid ContaId { get; set; }
    public Guid? CategoriaId { get; set; }
    public decimal Valor { get; set; }      // sinalizado (Anexo D)
    public string Cron { get; set; }
    public DateTime? ProximaData { get; set; }
    public bool Ativa { get; set; }
}

public async Task GerarRecorrenciasDoDiaAsync()
{
    var devidas = await _db.Recorrencias
        .Where(r => r.Ativa && r.ProximaData <= DateTime.UtcNow.Date).ToListAsync();
    foreach (var r in devidas)
    {
        var competencia = r.ProximaData!.Value.ToString("yyyy-MM"); // chave de idempotência
        if (await _db.Transacoes.AnyAsync(t => t.RecorrenciaId == r.Id && t.Competencia == competencia))
            continue; // já gerada neste período
        _db.Transacoes.Add(new Transacao { /* copia do molde */ RecorrenciaId = r.Id, Competencia = competencia });
        r.ProximaData = CalcularProxima(r);
    }
    await _db.SaveChangesAsync();
}
```

Índice único em `(RecorrenciaId, Competencia)` impede duplicar a conta fixa se o job rodar duas vezes.

Regras de ouro dos jobs:
- **Assuma execução "pelo menos uma vez", nunca "exatamente uma vez"** → todo job que mexe em dinheiro é idempotente (chave natural + índice único).
- Use a persistência do Hangfire (sobrevive a restart).
- Cuide do fuso (`America/Sao_Paulo` + horário de verão); "meia-noite" em UTC não é meia-noite aqui.
- Monitore falhas com alerta (Anexo B) — job de reconciliação que falha em silêncio é perigoso.
- Ao escalar, rode workers em processo separado da API.
- Lembretes respeitam a preferência do usuário e não levam dado sensível além do necessário.

---
---

# Anexo F — Arquitetura e escala

Metade consolidação do que já vínhamos fazendo, metade olhar para escala. Stack de decisão: **Clean Architecture + DDD + SOLID, sem CQRS**; **sem Redis** (Postgres faz o papel de cache); **Signals** no front; escala via **PaaS** mantendo a app stateless.

## F.1 — Organização do backend (Clean Architecture + DDD + SOLID)

Camadas em projetos separados, com a **regra da dependência** (o código aponta sempre para dentro):

- **Domain** (centro) — entidades, value objects, regras puras (`Transacao`, `Conta`, `Money`, invariante da transferência, `PlanoEfetivo`). **Zero dependências** externas.
- **Application** — casos de uso (`TransferirUseCase`, `ProcessarEventoMpUseCase`, `ImportarExtratoUseCase`) e **define as interfaces** das quais depende (`IPaymentProvider`, `ITransacaoRepository`, `ICacheService`, `IClock`). Depende só do Domain.
- **Infrastructure** — implementa as interfaces: EF Core, cliente do Mercado Pago, agregador Open Finance, Hangfire, cache. Aqui mora a camada-tradutor (anti-corruption).
- **Presentation/API** — controllers/Minimal APIs, DTOs, policies de autorização (Anexo A).

```
API ──▶ Application ──▶ Domain ◀── Infrastructure
                 ▲                        │
                 └──── implementa ────────┘   (via DI, em runtime)
```

A Application **declara** `IPaymentProvider`; a Infrastructure **implementa**. Dependência aponta para dentro, execução vai para fora = **inversão de dependência** (o "D"). É o que torna trocar Mercado Pago por Stripe um detalhe de infra.

SOLID aterrissado: **S** cada classe um motivo para mudar (use case orquestra, repo persiste, tradutor traduz); **O** novo provedor = nova implementação, sem alterar o existente; **L** qualquer `IPaymentProvider` funciona no lugar esperado; **I** interfaces pequenas e focadas; **D** Application depende de abstrações que ela define.

DDD em doses: **agregados** (transferência de duas pernas; assinatura), **value objects** (`Money`, `Cpf`, `Email`), **entidades ricas** (comportamento junto do dado, não modelo anêmico), **linguagem ubíqua**. Fora: event sourcing, CQRS, abstrações vazias.

**Aviso:** o risco da Clean Architecture é o over-engineering (interface para tudo, camadas que só repassam). Crie abstração quando há motivo real (provedor que troca, algo que se mocka em teste); o resto, direto. É sobre direção das dependências, não sobre maximizar camadas. Estrutura física: **monolito modular** (um deploy, módulos separados).

## F.2 — Performance de dados

**Índices** — o maior retorno. A tabela `Transacao` cresce sem parar; o índice composto certo resolve a maioria dos problemas:

```csharp
modelBuilder.Entity<Transacao>().HasIndex(t => new { t.UserId, t.ContaId, t.Data });
```

Ordem: **igualdade primeiro, range por último**. Outros pelo uso real: `(ContaId, ExternalId)` único (dedup), `(RecorrenciaId, Competencia)` único (agendados). Não indexe tudo — cada índice custa nas escritas.

**Paginação** — nunca retorne tudo. Para o feed do usuário, **keyset (cursor)** em vez de OFFSET (que degrada nas páginas finais):

```csharp
var pagina = await _db.Transacoes
    .Where(t => t.UserId == userId && t.ContaId == contaId)
    .Where(t => t.Data < ultimaData || (t.Data == ultimaData && t.Id < ultimoId))
    .OrderByDescending(t => t.Data).ThenByDescending(t => t.Id)
    .Take(50).ToListAsync();
```

**Projeções** — traga só o que a tela usa, com `AsNoTracking`:

```csharp
.AsNoTracking()
.Select(t => new TransacaoListDto(t.Id, t.Data, t.Valor, t.Descricao, t.CategoriaId))
```

Para relatórios pesados, SQL cru via **Dapper** é aceitável (escrita continua no EF).

**N+1** — vilão silencioso (acessar `t.Categoria.Nome` num loop dispara 1+N queries). Corrija projetando o que precisa (`t.Categoria!.Nome`). Detecte com a observabilidade do Anexo B (rajada de queries idênticas nos traces).

**Agregações de relatório** no banco, nunca em memória:

```csharp
.GroupBy(t => t.CategoriaId)
.Select(g => new { CategoriaId = g.Key, Total = g.Sum(x => x.Valor) })
```

Exclua transferências dos relatórios de receita/despesa (Anexo D).

## F.3 — Caching (sem Redis)

**Primeiro: precisa mesmo?** Com índices e projeções, o Postgres (que já tem cache próprio) aguenta muito. Só cacheie o que **medir** caro (Anexo B). Cache prematuro é dívida.

**Camada 1 — `IMemoryCache`** (de graça, no app) para dados quentes e pequenos (plano efetivo, catálogo de planos, regras de categorização). Limitação: por instância e some no restart — ótimo para instância única.

```csharp
return await _cache.GetOrCreateAsync($"plano:{userId}", async e =>
{
    e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
    return PlanoEfetivo(await _subs.ObterAtivaAsync(userId));
});
```

**Camada 2 — pré-computar no Postgres** (o substituto real do Redis aqui) para agregações de relatório, via **materialized view** atualizada por job:

```sql
CREATE MATERIALIZED VIEW resumo_mensal AS
SELECT user_id, conta_id, date_trunc('month', data) AS mes, categoria_id, SUM(valor) AS total
FROM transacoes WHERE deleted_at IS NULL
GROUP BY user_id, conta_id, mes, categoria_id;
REFRESH MATERIALIZED VIEW CONCURRENTLY resumo_mensal;
```

Meses passados não mudam → relatório histórico vira leitura instantânea (são os "snapshots" do Anexo D).

**Camada 3 — `IDistributedCache`** só ao escalar horizontalmente; **não precisa ser Redis** (há provedores com Postgres como backend; UNLOGGED tables são rápidas para cache descartável).

**Ressalva honesta:** cache no Postgres não tira carga do banco como o Redis tiraria. No seu cenário o banco não é o gargalo, então tudo bem; Redis (ou read replica) só quando o banco for comprovadamente o limite.

**Invalidação:** TTL para dados que toleram defasagem (plano efetivo, 5 min); invalidação por evento para mês corrente / saldo atual. Históricos → TTL longo.

**Mitos derrubados:** rate limiting funciona em memória (instância única); Hangfire roda com Postgres; JWT é stateless (sem sessão para guardar).

**Decisão tomada:** `IMemoryCache` agora, atrás de uma interface `ICacheService` (SOLID — troca futura sem reescrita), cacheando só o semi-estático com TTL curto. **Saldo e dados do mês corrente ficam fora do cache** (derivados do banco) — para a coerência entre instâncias não virar problema no futuro.

```csharp
public interface ICacheService
{
    Task<T?> GetOrSetAsync<T>(string chave, Func<Task<T>> fabrica, TimeSpan ttl);
    Task RemoverAsync(string chave);
}
```

Nota de escala: com múltiplas instâncias, `IMemoryCache` deixa de ser coerente (cada instância tem o seu). Por isso o que precisa de coerência (saldo, plano) deve ser **derivado do banco** ou ir para cache compartilhado — nunca preso em memória local.

## F.4 — Estado no Angular: Signals (não NgRx)

**Signals** — reatividade nativa do Angular: um valor que avisa a tela quando muda (`set`, `computed`). Simples, é o caminho que o framework prioriza. **NgRx** — padrão Redux completo (store, actions, reducers, effects, selectors): previsível e rastreável, mas muito boilerplate e curva de aprendizado.

**Recomendado: Signals.** A maior parte do estado do app é **estado de servidor** (transações, saldo) — problema de data fetching, não de state management pesado. NgRx só brilha com muito estado de cliente compartilhado e complexo, que não é o caso.

Combinação recomendada: **Signals** para UI e estado de cliente (em pequenos "signal stores" — services com signals); **TanStack Query (Angular Query)** para estado de servidor (cache de requisição, revalidação). Meio-termo se crescer: **NgRx SignalStore** (estrutura usando signals por baixo), antes do NgRx completo.

```typescript
@Injectable({ providedIn: 'root' })
export class TransacoesStore {
  private readonly _itens = signal<Transacao[]>([]);
  readonly itens = this._itens.asReadonly();
  readonly total = computed(() => this._itens().reduce((s, t) => s + t.valor, 0));
  constructor(private api: TransacoesApi) {}
  async carregar(contaId: string) { this._itens.set(await this.api.listar(contaId)); }
}
```

## F.5 — Escala horizontal

**Pré-requisito: a aplicação precisa ser stateless** (várias instâncias atrás de load balancer; nenhuma guarda estado que outra precise):
- **Sessão** — já stateless via JWT (Anexo A). Nada a fazer.
- **Cache** — `IMemoryCache` é por instância → cachear só semi-estático com TTL curto; saldo/plano derivados do banco (decisão de F.3).
- **Jobs (Hangfire)** — storage no Postgres coordena para cada job rodar uma vez; idempotência (Anexos C, E) é a rede de segurança.
- **Uploads (importação)** — arquivo no disco de uma instância não existe na outra → **object storage** (S3/equivalente), nunca disco local.

**Caminho mais barato (em ordem):**
1. **Escala vertical primeiro** — subir a máquina. Um servidor bem dimensionado + Postgres indexado aguenta muito. A mais barata.
2. **PaaS gerenciado** quando precisar de mais de uma instância — Azure App Service, Cloud Run, App Runner, Render, Railway. Menor custo total (fatura + seu tempo); alguns escalam a zero.
3. **Kubernetes** só lá na frente — máximo controle, mas complexidade operacional alta (caro no seu tempo).

**O banco foge à lógica:** a app escala fácil, o Postgres não → otimizar query (F.2) → **read replicas** para leitura → particionar só em último caso. Por isso não desperdiçar o banco com cache desnecessário.

**Recomendação prática:** uma instância num PaaS (escala vertical + horizontal a um clique), arquivos em object storage desde já, app mantida stateless de propósito (já vinha sendo).

---
---

# Anexo G — Ordem de prioridade para implementação/ajuste

Derivado da revisão do projeto real (repos `InvestindoEmNegociosApi` e `InvestindoEmNegociosWeb`). Ajustar do que mais dói ao que pode esperar.

## Prioridade 1 — Inegociáveis de dinheiro (antes de qualquer feature)

Erro aqui contamina tudo o resto.

- [ ] Confirmar `decimal` (nunca `float`/`double`) em todas as entidades monetárias e no `schema.sql`, com precisão explícita (`decimal(18,2)`; mais escala para câmbio). (Anexo D.1)
- [ ] Garantir no webhook do provedor: **validação de assinatura** + **idempotência** (evento repetido não duplica; aplica estado absoluto). (Anexo C.4)
- [ ] Confirmar que acesso premium é liberado **só por webhook de pagamento confirmado**, nunca pelo retorno do checkout nem por dado do cliente. (Anexo C.3 / C.5)
- [ ] Confirmar atomicidade da transferência (duas pernas em uma transação de banco; invariante soma-zero). (Anexo D.3)

## Prioridade 2 — Decisão estratégica do billing

Não dá para ajustar o fluxo de cobrança sem fechar isto.

- [ ] Definir de vez: **Stripe ou Mercado Pago** (o código atual usa Stripe; a doc foi desenhada para MP).
- [ ] Se for Stripe definitivo: reescrever o Anexo C na chave do Stripe (Checkout, Customer Portal, eventos `invoice.payment_failed`/`customer.subscription.*`, validação do `Stripe-Signature`) para a documentação parar de divergir do código.
- [ ] Se MP entrar depois: manter a camada agnóstica (`IPaymentProvider`) e tratar como contingência. (Anexo C.1)

## Prioridade 3 — Complementos

- [ ] Agregador de Open Finance (Pluggy/Belvo), se for entrar — hoje a importação parece ser só por arquivo. (Anexo E.2)
- [ ] Revisão do repo Web/Angular: onde guarda o token, route guards, interceptor de 401/403, esconder UI por plano. (Anexo A / Fase 4 do frontend)
- [ ] Fechar o ponto ainda em aberto: **Qualidade e entrega** (testes de autorização, CI/CD, deploy, backup/DR).

## Regras de condução desta fase

- **Ajustar um ponto de cada vez, com teste** — especialmente billing e autorização. Os próprios padrões do repo exigem isso e é o que evita que um ajuste de saldo quebre outro em silêncio.
- **Manter documento e código sincronizados** — ao decidir Stripe vs MP ou mudar uma policy, atualizar o anexo correspondente junto (o repo já tem a cultura de "mudou policy, atualiza a matriz"; basta estender aos anexos).
- **Verificar, não assumir** — os itens da Prioridade 1 são "confirmar/garantir" porque a revisão viu a intenção (padrões e matriz), mas não o detalhe de implementação. Abrir o arquivo e checar antes de marcar como pronto.
