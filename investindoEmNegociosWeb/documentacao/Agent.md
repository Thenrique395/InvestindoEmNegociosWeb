# FrontEnd Agent

Agente especializado no frontend web Angular.

## Objetivo

Este agente existe para orientar o Codex a:

- implementar mudancas coerentes com a arquitetura atual do frontend web
- preservar SSR, navegacao, consumo da API, gating de UX e consistencia visual
- reduzir drift entre codigo, testes e documentacao especializada do frontend
- bloquear atalhos no cliente que mascarem regra de negocio ou seguranca do backend

## Escopo

Este agente cuida de:

- `InvestindoEmNegociosWeb/investindoEmNegociosWeb`
- rotas, guards, telas, componentes e servicos web
- SSR, configuracao da API, UX do produto autenticado e paginas comerciais
- documentacao especializada do frontend

## Quando acionar

Use este agente para:

- Angular standalone, rotas e `loadComponent`
- guards por autenticacao, role e feature
- componentes, formularios e fluxo de navegacao
- integracao com API, interceptors e tratamento de erro
- paginas de marketing, pricing, checkout e portal no frontend
- SSR, PWA, service worker e Capacitor
- testes unitarios e E2E do frontend
- ambiente, base URL e configuracao operacional do app web

## Autoridade deste agente

Dentro do escopo de frontend web, este arquivo e normativo para o Codex.

Ele define:

- como trabalhar no frontend
- quais leituras sao obrigatorias antes de editar
- quais validacoes sao obrigatorias
- quais limites arquiteturais nao podem ser quebrados

Se houver duvida de execucao no frontend, este agente prevalece sobre guias genericos.
Se houver conflito com regra operacional geral, `../../../Agent.md` prevalece.

## Fontes de verdade

Consultar sempre:

- `../../../Agent.md`
- `./README.md`
- `../../../docs/README.md`
- `../../../docs/PRODUCT.md`
- `../../../docs/BUSINESS_RULES.md`
- `../../../docs/ARCHITECTURE.md`
- `../../../docs/ROADMAP.md`

Consultar quando aplicavel:

- `./DESIGN_SYSTEM.md`
- `./systemDesigner.md`
- `../../../InvestindoEmNegociosApi/docs/AUTHORIZATION_MATRIX.md`
- `../../../InvestindoEmNegociosApi/docs/API_CONTRATO_ERROS.md`

## Artefatos do frontend

Usar estes pontos de referencia para navegar mais rapido:

- rotas principais: `InvestindoEmNegociosWeb/investindoEmNegociosWeb/src/app/app.routes.ts`
- configuracao global da aplicacao: `InvestindoEmNegociosWeb/investindoEmNegociosWeb/src/app/app.config.ts`
- base da API: `InvestindoEmNegociosWeb/investindoEmNegociosWeb/src/app/api.config.ts`
- gating por feature: `InvestindoEmNegociosWeb/investindoEmNegociosWeb/src/app/features.ts`
- roles e hierarquia de perfis: `InvestindoEmNegociosWeb/investindoEmNegociosWeb/src/app/roles.ts`
- guards: `InvestindoEmNegociosWeb/investindoEmNegociosWeb/src/app/*guard*.ts`
- interceptors: `InvestindoEmNegociosWeb/investindoEmNegociosWeb/src/app/*interceptor*.ts`
- componentes e telas: `InvestindoEmNegociosWeb/investindoEmNegociosWeb/src/app/`
- testes E2E: `InvestindoEmNegociosWeb/quality-tests/e2e/`
- configuracao de E2E: `InvestindoEmNegociosWeb/quality-tests/playwright.config.ts`
- documentacao especializada local: `InvestindoEmNegociosWeb/investindoEmNegociosWeb/documentacao/`

## Fluxo obrigatorio de leitura

### Mudanca de rota, guard, role, feature gate ou navegacao protegida

Ler nesta ordem:

1. `../../../Agent.md`
2. `./Agent.md`
3. `./README.md`
4. `../../../docs/BUSINESS_RULES.md`
5. `../../../InvestindoEmNegociosApi/docs/AUTHORIZATION_MATRIX.md`

### Mudanca de endpoint consumido, DTO, status HTTP, erro ou interceptor

Ler nesta ordem:

1. `../../../Agent.md`
2. `./Agent.md`
3. `./README.md`
4. `../../../InvestindoEmNegociosApi/docs/API_CONTRATO_ERROS.md`
5. `../../../InvestindoEmNegociosApi/docs/AUTHORIZATION_MATRIX.md`

### Mudanca de componente, formulario, layout ou experiencia visual

Ler nesta ordem:

1. `../../../Agent.md`
2. `./Agent.md`
3. `./README.md`
4. `./DESIGN_SYSTEM.md`
5. `./systemDesigner.md`

### Mudanca de SSR, browser APIs, service worker, PWA ou Capacitor

Ler nesta ordem:

1. `../../../Agent.md`
2. `./Agent.md`
3. `./README.md`
4. `../../../docs/ARCHITECTURE.md`

### Mudanca de pricing, checkout, portal, assinatura ou billing no frontend

Ler nesta ordem:

1. `../../../Agent.md`
2. `./Agent.md`
3. `./README.md`
4. `../../../docs/PRODUCT.md`
5. `../../../docs/BUSINESS_RULES.md`
6. `../../../InvestindoEmNegociosApi/docs/AUTHORIZATION_MATRIX.md`
7. `../../../InvestindoEmNegociosApi/docs/API_CONTRATO_ERROS.md`

## Regras obrigatorias

- frontend nao decide regra de negocio
- UX pode adaptar visibilidade, mas nao substitui policy do backend
- guards de frontend nunca devem ser tratados como seguranca real
- mudancas em SSR precisam proteger acessos a `window`, `document`, `localStorage` e APIs de browser
- a base da API deve permanecer controlada por configuracao explicita de ambiente
- telas publicas e shell autenticado devem continuar desacoplados
- o Codex deve preferir a menor mudanca coerente com o padrao atual do app, sem criar bypass de arquitetura

## Como decidir o escopo

Resolver so no frontend quando:

- a mudanca e puramente de UX, layout, navegacao, apresentacao ou consumo ja compativel da API
- o contrato do backend nao muda
- o gating real continua preservado no servidor

Considerar impacto compartilhado com backend quando:

- endpoint, DTO, status HTTP ou erro mudar
- role, feature gate ou acesso funcional mudar
- fluxo de autenticacao, onboarding, billing ou portal mudar

Considerar impacto compartilhado com mobile quando:

- a mudanca afetar responsividade, toque, viewport, PWA ou Capacitor

Parar e escalar quando:

- a regra funcional estiver ambigua entre docs centrais e comportamento atual
- o frontend precisar inventar regra de acesso que nao exista no backend
- uma mudanca comercial ou de oferta nao estiver decidida na documentacao central

## Criterios de bloqueio

O Codex nao deve seguir adiante sem registrar o problema quando houver:

- mudanca de gating sem revisar `AUTHORIZATION_MATRIX.md`
- mudanca de contrato consumido sem revisar `API_CONTRATO_ERROS.md`
- uso de API de browser em caminho SSR sem protecao adequada
- hardcode de endpoint remoto, segredo ou ambiente por conveniencia
- tentativa de resolver no cliente uma regra que deveria viver no backend

## Checklist por tipo de mudanca

### Rota, guard, role ou feature gate

- revisar `app.routes.ts`, guards e `features.ts` ou `roles.ts`
- revisar coerencia com `AUTHORIZATION_MATRIX.md`
- validar navegacao publica, protegida e fallback

### Componente, formulario ou UX

- revisar estado, validacao, loading e erro
- revisar coerencia com `DESIGN_SYSTEM.md`
- validar desktop e mobile quando a tela for relevante para ambos

### API, interceptor ou autenticacao

- revisar `api.config.ts`, service ou interceptor impactado
- revisar contrato HTTP e comportamento de erro
- validar expiracao, refresh, logout ou fallback quando aplicavel

### SSR, PWA ou Capacitor

- revisar acessos a APIs de browser
- validar hidratacao, renderizacao inicial e comportamento offline quando aplicavel
- evitar dependencia de estado local indisponivel no servidor

### Billing, checkout, pricing ou portal

- revisar coerencia com produto e regras de negocio centrais
- revisar gating visual e comportamento de erro
- nunca assumir sucesso comercial sem confirmacao real do backend

## Validacao minima

Executar conforme aplicavel:

- `npm run build`
- `npm run test:ci`
- `npm run test:e2e` quando a mudanca afetar fluxo critico
- `npm run typecheck` quando a mudanca for estrutural ou ampla

## Formato esperado da entrega

Ao fechar uma tarefa de frontend, o Codex deve informar:

- o que foi alterado
- quais validacoes executou
- quais documentos normativos foram revisados ou atualizados
- quais riscos residuais ou limites permanecem

## Nao fazer

- hardcode de endpoint remoto por conveniencia
- guardar decisao critica apenas no cliente
- usar guard de frontend como se fosse seguranca real
- misturar marketing, billing e app autenticado sem fronteira clara
- maquiar problema de contrato ou autorizacao com ajuste visual apenas no frontend
