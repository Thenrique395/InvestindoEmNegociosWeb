# Preparação da entrega — 2026-11-18

## PRs e escopo

- [API #56](https://github.com/Thenrique395/InvestindoEmNegociosApi/pull/56): persistência, isolamento por espaço, ledger/estornos, comprovantes privados, sessões e .NET 10.
- [Web #26](https://github.com/Thenrique395/InvestindoEmNegociosWeb/pull/26): Angular, modelos financeiros, E2E, publicação legal/SSR e ferramentas de qualidade.
- Ambos em rascunho, branch `chore/consolidacao-validacao-2026-11-18`; main não alterada.
- [Validação local e limites](validacao-2026-11-18.md). Os resultados desse relatório são anteriores aos ajustes de workflow descritos abaixo; as aplicações não foram modificadas nesta preparação.

## Revisão de entrega

Corrigidos: consultas de saúde/logs do DEV backend agora usam explicitamente `docker-compose.deploy.yml`; workflow Quality Tests deixa `APP_BASE_URL` vazia quando não existe destino e preserva o servidor Angular local. YAML validado com Ruby/Psych e scripts de shell extraídos validados com `bash -n`. Compose validado sintaticamente, sem executar deploy. Documentação da API corrigida para o nome e os inputs reais de `Deploy Production`.

## Sequência para DEV

1. Aguardar CI aprovado para os SHAs finais dos dois PRs. O frontend tem bloqueio conhecido de auditoria: 28 alertas de desenvolvimento derivados de picomatch sem correção publicada; gate não relaxado.
2. Confirmar isolamento do banco DEV, backup e preservação dos comprovantes legados antes de substituir a API. A mudança de armazenamento exige levar arquivos existentes ao volume privado.
3. Revisar e integrar os PRs na ordem API → frontend. Push/merge em main dispara automaticamente os workflows `Deliver Backend` e `Deploy Frontend` em development. Não promover só por ter testes locais aprovados.
4. Registrar SHAs das imagens efetivamente implantadas. Validar `/health/ready`, migrations, frontend apontando à API DEV, login/logout e orçamento/estornos/isolações com contas sintéticas.
5. Rodar smoke de pós-deploy e testes live com configuração explícita de DEV. Smoke que intercepta login apenas confirma configuração; homologação real requer API/banco.

## Condições antes de produção

- DEV integrado aprovado e registros por SHA.
- Auditorias obrigatórias aprovadas; dados legais reais configurados.
- Backup/restore verificado, preservação dos comprovantes e plano de recuperação da migration.
- Cobrança sandbox e decisões funcionais pendentes tratadas conforme escopo de lançamento.
- O workflow `Deploy Production` usa `image_tag` para o backend; o Compose também referencia a imagem frontend. Confirmar o par exato de imagens antes de executar, evitando promover frontend `main` sem validar o SHA correspondente.

## Estado

PRs criados e branches publicadas. Nenhum merge, deploy DEV ou publicação PRD realizado nesta preparação. DEV do candidato continua pendente; o bloqueio de auditoria do frontend impede considerar a entrega conjunta pronta. CI remoto acompanhado separadamente por SHA.

## Estado da entrega — conferido em 2026-11-18

| Repositório | PR | Commit de código validado | CI remoto | Entrega |
|---|---|---|---|---|
| API | [#56](https://github.com/Thenrique395/InvestindoEmNegociosApi/pull/56) | `285119d` | [Aprovado](https://github.com/Thenrique395/InvestindoEmNegociosApi/actions/runs/44311077325): 55 smoke e 684 testes, nenhum ignorado; PostgreSQL incluído | Rascunho, sem merge |
| Web | [#26](https://github.com/Thenrique395/InvestindoEmNegociosWeb/pull/26) | `c85d963` | [Falhou na auditoria completa](https://github.com/Thenrique395/InvestindoEmNegociosWeb/actions/runs/44311082320): 28 alertas altos; 907 testes, build e auditoria de produção aprovados | Rascunho, sem merge |

As branches foram publicadas. Nenhum deploy DEV ou PRD foi realizado nesta entrega. Os resultados acima pertencem aos SHAs indicados; atualizações documentais posteriores não equivalem a uma nova execução de testes. O gate do frontend permanece bloqueante.

O próximo passo da entrega é resolver o bloqueio de dependência do frontend, obter CI aprovado para o candidato e confirmar banco DEV isolado e preservação dos comprovantes legados antes do merge. Depois, validar a integração real em DEV. Os 64 E2E live continuam pendentes; as duas execuções locais tiveram 197 aprovados cada, com API interceptada. Homologação de cobrança em sandbox permanece separada.
