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
