# Documentação das Aplicações

## 1. Visão geral
O ecossistema é composto por:
- **Frontend web** em Angular SSR (`investindoEmNegociosWeb`).
- **Backend API** em .NET 9 (`InvestindoEmNegocio`).
- **Banco de dados** PostgreSQL.
- **Proxy reverso e TLS** com Traefik.

Ambiente atual publicado:
- Frontend: `https://app.35.174.50.187.sslip.io`
- API Docs: `https://api.35.174.50.187.sslip.io/docs`
- Health API: `https://api.35.174.50.187.sslip.io/health/ready`

---

## 2. Estrutura de repositórios

## 2.1 Frontend
- Caminho: `InvestindoEmNegociosWeb/investindoEmNegociosWeb`
- Stack:
  - Angular 19 (standalone components + lazy loading)
  - SSR com `@angular/ssr` + Express
  - Tailwind + SCSS + tokens CSS
  - Karma/Jasmine para testes unitários
  - Lighthouse CI para performance

## 2.2 Backend
- Caminho: `InvestindoEmNegocio/InvestindoEmNegocio`
- Stack:
  - ASP.NET Core 9
  - EF Core + Npgsql
  - JWT auth
  - OpenAPI/Scalar
  - Serilog + OpenTelemetry
  - Health checks

---

## 3. Arquitetura técnica

Fluxo principal:
1. Usuário acessa frontend.
2. Traefik roteia `app.*` para o container do frontend.
3. Frontend consome API em `api.*`.
4. Traefik roteia `api.*` para backend.
5. Backend persiste/consulta no PostgreSQL.

Camadas do backend:
- `Controllers` (entrada HTTP)
- `Application` (regras de negócio, serviços, DTOs)
- `Domain` (entidades, enums, contratos de repositório)
- `Infrastructure` (EF, auth, repositórios, logging)

---

## 4. Frontend em detalhes

## 4.1 Rotas principais
- Públicas:
  - `/` (vitrine)
  - `/login`
  - `/calculadora`
- Autenticadas:
  - `/dashboard`
  - `/despesas`
  - `/receitas`
  - `/cartoes`
  - `/metas`
  - `/investimentos`
  - `/perfil`, `/preferencias`, `/seguranca`, `/dados`
- Admin:
  - `/admin/usuarios`
  - `/admin/parametros`

## 4.2 Qualidade e performance
Scripts relevantes (`package.json`):
- `npm run quality:frontend`
  - typecheck + testes + build de produção
- `npm run perf:lighthouse`
  - build de produção + Lighthouse CI

Arquivos-chave:
- `angular.json` (budgets e configurações de build)
- `.lighthouserc.json` (thresholds de qualidade)
- `src/server.ts` (SSR, compressão e cache de assets)

---

## 5. Backend em detalhes

## 5.1 Domínios/funcionalidades cobertas
Controladores disponíveis:
- Auth, Profile, Preferences, Onboarding
- Categories, Cards, Installments, Plans
- Goals, GoalContributions
- Investments + Benchmarks/Market Data
- Notifications
- DataPortability (export/import)
- InvoiceImport
- Admin (users/categories/parameters)

## 5.2 Capacidade operacional
- Health checks:
  - `/health/live`
  - `/health/ready`
- OpenAPI:
  - `/openapi/v1.json` e `/docs`
- Logs estruturados (Serilog)
- Instrumentação OTEL (traços/métricas/logs)
- Rate limiting configurável

---

## 6. Infra e deploy

## 6.1 Containers
- Frontend + Traefik: `InvestindoEmNegociosWeb/docker-compose.yml`
- Backend + Postgres: `InvestindoEmNegocio/docker-compose.yml`

## 6.2 TLS e roteamento
- Traefik usa:
  - Docker provider
  - Let’s Encrypt (resolver `letsencrypt`)
  - Redirect HTTP -> HTTPS

## 6.3 Variáveis essenciais

Frontend (`InvestindoEmNegociosWeb/.env`):
- `LETSENCRYPT_EMAIL`
- `FRONTEND_HOST`
- `API_HOST`

Backend (`InvestindoEmNegocio/.env`):
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `DB_CONN`
- `JWT_SECRET_KEY`
- `BRAPI_TOKEN`
- `API_HOST`

---

## 7. Testes e validações recomendadas

## 7.1 Frontend
- `npm run quality:frontend`
- `npm run perf:lighthouse`

## 7.2 Backend
- Build:
  - `dotnet build`
- Testes:
  - `dotnet test`
- Carga (k6):
  - scripts em `InvestindoEmNegocio/perf/scripts`
  - configs em `InvestindoEmNegocio/perf/config`

## 7.3 Smoke de produção
- `curl -I https://app.35.174.50.187.sslip.io`
- `curl -I https://api.35.174.50.187.sslip.io/health/ready`
- `curl -I https://api.35.174.50.187.sslip.io/docs`

---

## 8. Segurança e boas práticas para PRD
- Não versionar segredos em repositório.
- Rotacionar JWT secret e tokens externos.
- Manter backup diário e teste de restore.
- Monitorar p95/p99 e taxa de erro.
- Manter rollback operacional simples.
- Considerar remover porta pública da API (`5059`) e deixar acesso via Traefik.

---

## 9. Guia rápido de troubleshooting

## 9.1 TLS inválido/default cert no Traefik
- Verificar `LETSENCRYPT_EMAIL` real no `.env`.
- Verificar host rules (`FRONTEND_HOST`, `API_HOST`).
- Ver logs:
  - `docker logs investindoemnegociosweb-traefik-1`

## 9.2 `docker compose` sem arquivo
- Executar no diretório correto do projeto.

## 9.3 Erro de variável não definida
- Conferir `.env` local da VPS.
- Rodar `docker compose config` para validar interpolação.

## 9.4 API lenta/carga
- Usar scripts k6 (`perf/` no backend).
- Verificar p95 por endpoint antes de otimizar.

---

## 10. Documentos relacionados
- `README.md` (frontend)
- `systemDesigner.md` (design system)
- `PRD_CUSTOS_E_PROXIMOS_PASSOS.md` (plano de produção)
- `TRAEFIK_SETUP.md` (setup de proxy/TLS)

