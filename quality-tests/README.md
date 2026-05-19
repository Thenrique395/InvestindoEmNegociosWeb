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
npm run test:performance
npm run test:load
```

Por padrao, o Playwright sobe o app Angular em `http://127.0.0.1:4300`.
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
