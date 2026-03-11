# Documentação das Aplicações

Visão consolidada da solução, com foco em arquitetura, responsabilidades e operação.

## Componentes

- Frontend web: `InvestindoEmNegociosWeb/investindoEmNegociosWeb`
- Backend API: `InvestindoEmNegociosApi/InvestindoEmNegocio`
- Banco de dados principal: PostgreSQL

## Stack principal

### Frontend

- Angular 19
- SSR com `@angular/ssr`
- Tailwind + SCSS
- Karma/Jasmine para testes unitários
- Playwright para E2E

### Backend

- ASP.NET Core 9
- EF Core + Npgsql
- JWT
- OpenAPI/Scalar
- Serilog + OpenTelemetry
- Health checks

## Arquitetura

Fluxo principal:

1. O navegador acessa o frontend.
2. O frontend autentica e consome a API.
3. A API aplica regras de negócio e persiste no PostgreSQL.

Camadas do backend:

- `Controllers`: contrato HTTP e policies
- `Application`: casos de uso, serviços e DTOs
- `Domain`: entidades, enums e contratos
- `Infrastructure`: persistência, autenticação, integrações e observabilidade

## Áreas funcionais principais

- Autenticação, perfil, onboarding e preferências
- Despesas, receitas, parcelas e pagamentos
- Cartões, contas, transferências e importações
- Metas e contribuições
- Investimentos, benchmarks e patrimônio
- Administração, parâmetros e robôs
- Portabilidade de dados e LGPD

## Operação e ambiente

Informações operacionais de endpoint público podem mudar por ambiente e não devem ser tratadas como fonte de verdade permanente neste arquivo.

Use:

- variáveis de ambiente locais para base URLs
- pipelines e arquivos de deploy para endereços publicados
- health checks e documentação OpenAPI do ambiente ativo para validação operacional

## Qualidade

### Frontend

- Unitários: `npm test -- --watch=false`
- E2E padrão: `npm run test:e2e`
- E2E live: `RUN_LIVE_SERVER_E2E=1 npm run test:e2e:live`

### Backend

- Testes: `dotnet test InvestindoEmNegociosApi/InvestindoEmNegocio.sln /p:UseAppHost=false`
- Smoke e playbooks: ver `InvestindoEmNegociosApi/docs`

## Documentos relacionados

- [README.md](./README.md)
- [STATUS_FUNCIONALIDADES.md](./STATUS_FUNCIONALIDADES.md)
- [MATRIZ_COBERTURA_TESTES.md](./MATRIZ_COBERTURA_TESTES.md)
- [../../../InvestindoEmNegociosApi/docs/README.md](../../../InvestindoEmNegociosApi/docs/README.md)
