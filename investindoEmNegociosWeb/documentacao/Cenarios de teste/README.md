# Cenarios de teste

Pasta padrão para registrar cenários funcionais de cada feature implementada.

## Regra de uso
- Para toda feature nova, criar 1 arquivo de cenário nesta pasta.
- Nome sugerido: `XX.Y_nome-da-feature.md` (seguindo o item do `STATUS_FUNCIONALIDADES.md`).
- Atualizar o cenário quando a regra de negócio mudar.
- Todo arquivo deve conter cenários de sucesso e de exceção.
- Regra mínima por feature:
  - 2 cenários de sucesso
  - 2 cenários de exceção/erro
  - 1 cenário de regressão (garantir que não quebrou comportamento existente)

## Template mínimo
```md
# XX.Y - Nome da feature

## Objetivo
Descrever o que precisa ser validado.

## Pré-condições
- Dado 1
- Dado 2

## Cenários
1. Cenário A
- Passos
- Resultado esperado

2. Cenário B
- Passos
- Resultado esperado

## Cenários de exceção
1. Exceção A
- Passos
- Resultado esperado (mensagem de erro, status HTTP, rollback, etc.)

2. Exceção B
- Passos
- Resultado esperado

## Cenário de regressão
1. Regressão A
- Passos
- Resultado esperado

## Critérios de aceite
- [ ] Critério 1
- [ ] Critério 2
- [ ] Casos de exceção validados
- [ ] Regressão validada
```
