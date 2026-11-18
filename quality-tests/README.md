# Investindo em Negocios - Quality Tests

Projeto separado para testes de navegador, carga e performance do frontend.

## Estrutura

- `e2e/`: testes Playwright, incluindo fluxos mockados e live.
- `k6/`: testes de carga.
- `performance/`: configuracoes Lighthouse CI.

## Comandos

```bash
npm install
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:smoke
npm run test:e2e:smoke:headed
npm run test:performance
npm run test:load
```

Por padrao, o Playwright sobe o app Angular em `http://127.0.0.1:4300`.
O comando `test:e2e` roda em modo headless, sem janela visivel. Para ver o fluxo abrindo o navegador, use:

```bash
npm run test:e2e:headed
```

Para ver especificamente o fluxo do onboarding com login e navegacao mais lenta:

```bash
npm run test:e2e:onboarding:headed
```

Para ver o fluxo de cadastro novo ate o dashboard:

```bash
npm run test:e2e:signup:headed
```

Para rodar uma suite curta de smoke com login, onboarding, dashboard e permissoes Basic:

```bash
npm run test:e2e:smoke
npm run test:e2e:smoke:headed
```

Para abrir o runner interativo do Playwright:

```bash
npm run test:e2e:ui
```

Para apontar para outro ambiente:

```bash
APP_BASE_URL=https://seu-ambiente npm run test:e2e
```

Os testes live continuam exigindo as variaveis esperadas por `scripts/check-live-env.mjs`.
O comando `test:load` exige o binario `k6` instalado na maquina ou no runner.

## CI

O workflow `Quality Tests` roda sob demanda pelo GitHub Actions.
Ele aceita a suite `e2e` ou `performance` e permite informar `APP_BASE_URL`.
Quando `APP_BASE_URL` fica vazio, o Playwright sobe o app Angular localmente.

## Dependências e validação — 2026-11-18

`npm run audit:all` audita este projeto separadamente da aplicação Angular e é bloqueante no workflow Quality Tests. Lighthouse CI 0.16.1 e Lighthouse 13.6.0 substituem as versões antigas e seus overrides; manter o lockfile versionado. Após a atualização, auditoria sem alertas, contrato com 13 enums e 197 E2E locais aprovados; 64 live opt-in ignorados.

Para verificar Lighthouse localmente sem enviar relatórios: `APP_ENVIRONMENT=development npx lhci collect --config=performance/lighthouserc.json --numberOfRuns=1`, seguido de `npx lhci assert --config=performance/lighthouserc.json`. Isso não substitui o benchmark completo de produção. [Evidências e limites](../docs/ai-reports/validacao-2026-11-18.md).
