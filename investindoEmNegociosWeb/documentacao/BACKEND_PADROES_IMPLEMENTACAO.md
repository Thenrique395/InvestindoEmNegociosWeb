# Backend — Padrões Obrigatórios de Implementação

Este documento define o padrão técnico para qualquer mudança no backend (`InvestindoEmNegocio`).
Objetivo: manter consistência, previsibilidade, testabilidade e evolução segura.

## 1) Princípios obrigatórios

- **SOLID** em todos os serviços e casos de uso.
- **Clean Code**: código legível, sem duplicação, com nomes explícitos.
- **Arquitetura Limpa** (camadas + regra de dependência).
- **Falhar com clareza**: erros com contexto técnico e resposta consistente na API.
- **Sem “atalho de urgência”** em produção (hotfix sem padrão vira dívida técnica).

## 2) Regra de dependência (Arquitetura Limpa)

Dependências sempre apontam para dentro:

- `Domain` -> não depende de ninguém.
- `Application` -> depende de `Domain`.
- `Infrastructure` -> implementa contratos de `Application/Domain`.
- `API` -> orquestra entrada/saída, chama `Application`.

Proibido:

- `Domain` depender de EF Core, HTTP, cache, fila, framework web.
- Controller com regra de negócio.
- Repositório sendo chamado direto por Controller sem passar por caso de uso.

## 3) Padrões por camada

### Domain
- Entidades e Value Objects com invariantes.
- Sem anemias: entidade valida o próprio estado.
- Regras centrais do negócio ficam aqui.

### Application
- Casos de uso orientados por feature (ex.: registrar movimento, recalcular posição).
- Contratos por interface (`I...Service`, `I...Repository`).
- DTOs de entrada/saída e validações.
- Orquestração de transação e políticas de negócio.

### Infrastructure
- Implementação de repositórios, provedores externos, cache, persistência.
- Mapping e configuração EF sem regra de negócio.
- Integrações externas isoladas atrás de interfaces.

### API
- Controllers finos: validação básica + chamada do caso de uso + retorno HTTP.
- Sem lógica de cálculo complexa em endpoint.
- Contratos versionados e respostas padronizadas.

## 4) Convenções de código

- Métodos curtos e coesos (uma responsabilidade).
- Nomes explícitos em português ou inglês, mas sem misturar no mesmo contexto.
- Evitar `Utils` genérico; prefira classes com intenção clara.
- Nada de `magic numbers`: usar constantes nomeadas.
- `CancellationToken` em operações assíncronas IO-bound.
- Sem `catch` vazio; sempre logar ou transformar em erro de domínio/aplicação.

## 5) Tratamento de erros e observabilidade

- Erro de validação -> `400`.
- Recurso não encontrado -> `404`.
- Regra de negócio violada -> `409` ou `422` (definir padrão por endpoint e manter).
- Erro inesperado -> `500` com `traceId`.
- Log estruturado com correlação (`traceId`/`correlationId`) e contexto mínimo (userId, entidade, operação).

## 6) Persistência e banco

- Toda mudança de modelo exige migration.
- Índices para consultas críticas (listar posições, histórico, notificações).
- Evitar N+1; preferir query projetada para DTO quando possível.
- Atualizações concorrentes sensíveis devem considerar controle de concorrência.

## 7) Segurança

- Autorização por papel/permissão no endpoint e/ou caso de uso.
- Nunca confiar em dados de entrada sem validação.
- Não logar segredo/token/senha.
- Limitar superfície de dados em responses (retornar apenas o necessário).

## 8) Testes mínimos por PR

- **Unitário** para regra de negócio nova/alterada.
- **Integração** para fluxo que envolve banco e/ou endpoint crítico.
- Cobrir cenários feliz + erro esperado + borda relevante.
- PR sem teste para regra nova só em exceção justificada.

## 9) Checklist de Pull Request (backend)

- [ ] Respeita camadas da Arquitetura Limpa.
- [ ] Sem regra de negócio no Controller.
- [ ] Sem dependência indevida em `Domain`.
- [ ] Inclui testes necessários.
- [ ] Inclui migration (quando aplicável).
- [ ] Logs e tratamento de erro consistentes.
- [ ] Não quebra contrato público da API sem versionamento.

## 10) Definição de pronto (Definition of Done)

Uma implementação backend só está pronta quando:

1. Atende regra de negócio com testes.
2. Segue padrão de arquitetura e naming.
3. Não introduz regressão de performance evidente.
4. Está observável (logs/trace) e operável em produção.
5. Está documentada (endpoint, decisão técnica e impacto).

## 11) Não negociáveis

- Não mover para produção código sem revisão.
- Não adicionar feature quebrando regra de dependência.
- Não usar “temporário” sem abrir item de dívida técnica com prazo.

