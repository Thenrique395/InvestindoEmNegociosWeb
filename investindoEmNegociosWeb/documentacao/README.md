# Documentação do Frontend

Este diretório concentra a documentação funcional e operacional do produto web.

## Objetivo deste índice

Este arquivo existe para:

- apontar a fonte de verdade especializada do frontend
- separar documentação central de produto da documentação específica da aplicação web
- reduzir duplicação entre status funcional, testes, design system e backlog local
- deixar claro quando consultar cada documento deste diretório

## Leitura rápida

Use este diretório quando a dúvida for sobre:

- status funcional real da aplicação web
- cobertura e auditoria de testes do frontend
- design system, tokens e padrões visuais
- backlog local do frontend
- cenários de teste manuais e de regressão

Não use este diretório como fonte principal para:

- estratégia comercial
- definição oficial de planos
- regras transversais de billing
- regras centrais de negócio e autorização do sistema inteiro

## Visão rápida da aplicação

Esta aplicação é o frontend web do produto `Investindo em Negócios`.

Ela cobre:

- landing pública e páginas comerciais
- autenticação e recuperação de acesso
- onboarding e área autenticada
- receitas, despesas, metas, contas, cartões e investimentos
- assinatura, billing e portal de cobrança
- área administrativa protegida por role/feature

## Visão resumida da solução

Componentes principais da solução:

- frontend web: `InvestindoEmNegociosWeb/investindoEmNegociosWeb`
- backend API: `../../../InvestindoEmNegociosApi/InvestindoEmNegocio`
- banco principal: PostgreSQL

Fluxo principal:

1. o navegador acessa o frontend
2. o frontend autentica e consome a API
3. a API aplica regras de negócio e persiste no PostgreSQL

## Stack principal

- Angular 19
- SSR com `@angular/ssr`
- Angular Router com `loadComponent`
- HttpClient com interceptor de autenticação
- Tailwind + SCSS
- Service Worker
- Playwright para E2E
- Karma/Jasmine para testes unitários
- Capacitor para empacotamento mobile

Integrações e stack relacionadas:

- API ASP.NET Core 9
- PostgreSQL
- JWT com refresh token
- Stripe no fluxo comercial e de assinatura

## Como rodar

No diretório `InvestindoEmNegociosWeb/investindoEmNegociosWeb`:

- desenvolvimento: `npm run start`
- build: `npm run build`
- build produção: `npm run build:prod`
- unit tests: `npm run test:ci`
- e2e: `npm run test:e2e`

## Pontos centrais do frontend

- rotas principais: `src/app/app.routes.ts`
- configuração global da aplicação: `src/app/app.config.ts`
- base da API: `src/app/api.config.ts`
- gating por feature: `src/app/features.ts`
- roles e hierarquia de perfis: `src/app/roles.ts`
- camada agregadora de dados: `src/app/data/api-data.service.ts`

## Integrações principais

- API backend via `/api/v1`
- autenticação JWT com refresh no interceptor
- Stripe no fluxo comercial e de assinatura
- service worker para comportamento PWA

## Operação e ambiente

Informações de endpoint público podem variar por ambiente e não devem ser tratadas como fonte permanente neste arquivo.

Use:

- variáveis de ambiente locais para `baseUrl`
- pipelines e arquivos de deploy para endereços publicados
- health checks e documentação OpenAPI do ambiente ativo para validação operacional

## Qualidade

Frontend:

- unit tests: `npm run test:ci`
- E2E padrão: `npm run test:e2e`

Backend relacionado:

- testes da API: `dotnet test InvestindoEmNegociosApi/InvestindoEmNegocio.sln /p:UseAppHost=false`
- playbooks técnicos: consultar `../../../InvestindoEmNegociosApi/docs/README.md`

## Cuidados atuais

- a base da API ainda tem fallback para endpoint remoto em `src/app/api.config.ts`; tratar mudanças de ambiente com cuidado
- o frontend espelha parte do gating por role/feature para UX, mas a fonte final continua sendo o backend
- mudanças em rotas protegidas precisam permanecer coerentes com a matriz de autorização da API
- neste momento, rotas como `assistente`, `snapshots` e `emprestimos` merecem revisão para alinhar o frontend ao backend atual

## Relação com a documentação central

- o mapa principal da documentação compartilhada desta pasta de trabalho está em [../../../docs/README.md](../../../docs/README.md)
- estratégia de produto, planos, billing comercial e regras centrais vivem no `docs/` da raiz
- este diretório deve concentrar documentação especializada do frontend web
- quando um conteúdo daqui virar direção central de produto, ele deve ser consolidado no `docs/` da raiz e aqui ficar apenas como apoio especializado

Leitura prática:

- use o `docs/README.md` da raiz para decidir qual documento é fonte principal
- use este diretório quando a dúvida for específica de status funcional, testes, design system ou operação da aplicação web

## Quando consultar este diretório

- ao revisar o estado funcional real das telas e módulos do frontend no roadmap central
- ao verificar cobertura, falhas conhecidas ou confiança da suíte de testes web
- ao ajustar linguagem visual, tokens ou padrões de interface
- ao revisar backlog local da aplicação web
- ao executar ou atualizar cenários manuais e de regressão do frontend

## Fonte de verdade

- Status do produto e backlog central: [../../../docs/ROADMAP.md](../../../docs/ROADMAP.md)
- Design system e padrões visuais: [systemDesigner.md](./systemDesigner.md)

## Planejamento e produto

- Backlog futuro priorizado: [../../../docs/ROADMAP.md](../../../docs/ROADMAP.md)
- Custos e plano de go-live: [PRD_CUSTOS_E_PROXIMOS_PASSOS.md](./PRD_CUSTOS_E_PROXIMOS_PASSOS.md)

## Documentação externa relacionada

- Matriz de autorização da API: [../../../InvestindoEmNegociosApi/docs/AUTHORIZATION_MATRIX.md](../../../InvestindoEmNegociosApi/docs/AUTHORIZATION_MATRIX.md)

## O que não deve viver aqui

- copy comercial oficial e estratégia de planos
- regras centrais de produto já consolidadas no `docs/` da raiz
- contrato técnico do backend
- decisões formais que deveriam estar em `docs/DECISIONS/`

## Regra de manutenção

- Não duplicar contratos ou padrões do backend neste diretório.
- Quando um item sair do backlog e virar entrega, atualizar primeiro o `docs/ROADMAP.md` da raiz.

## Quando atualizar este README

- quando surgir um novo documento especializado do frontend
- quando a função de um documento existente mudar
- quando o fluxo principal de consulta deste diretório deixar de refletir a realidade
