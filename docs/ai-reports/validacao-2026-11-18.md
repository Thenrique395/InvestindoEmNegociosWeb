# Validação e consolidação — 2026-11-18

Escopo solicitado: regressões financeiras, E2E, dependências, consolidação Git e documentação, nessa ordem. Resultados locais; nenhuma publicação ou alteração de ambiente remoto.

## Resultado por camada

| Camada | Comando e diretório | Resultado |
|---|---|---|
| API | `bash scripts/quality-backend.sh`, repo API | 55 smoke aprovados; suíte completa com 683 aprovados e 1 ignorado; NuGet sem alertas |
| Migrations | SDK de `~/.dotnet/dotnet`, `dotnet test --configuration Release --no-build --filter FullyQualifiedName~DbMigrationExtensionsTests`, repo API, com `IEN_TEST_POSTGRES` | 3 aprovados, nenhum ignorado, PostgreSQL 16 descartável |
| Frontend | `npm run quality:frontend`, pasta Angular | Typecheck, handoff, 907 unitários, build de produção, testes legais e auditoria de produção passaram; comando geral terminou com falha na auditoria completa por 28 alertas altos |
| Cobertura Angular | Karma | Statements 50,38%; branches 40,39%; functions 42,04%; lines 52,67%; mínimos configurados aprovados |
| Contrato | `npm run test:contract`, quality-tests | 13 enums alinhados |
| Responsivo | `npm run test:e2e -- e2e/financial-models-responsive.spec.ts` | 6 aprovados; dashboard/despesas em 390, 1024 e 1440 px |
| E2E completo inicial | `npm run test:e2e`, quality-tests | 197 aprovados, 64 ignorados, nenhuma falha; 261 previstos |
| E2E após atualização | `npm run test:contract` e `npm run test:e2e`, quality-tests | Novamente 13 enums alinhados; 197 aprovados, 64 ignorados e nenhuma falha |
| Ferramentas de qualidade | `npm run audit:all`, quality-tests, após atualização | Zero vulnerabilidades reportadas |
| Lighthouse atualizado | `APP_ENVIRONMENT=development npx lhci collect --config=performance/lighthouserc.json --numberOfRuns=1` e `npx lhci assert --config=performance/lighthouserc.json` | Coleta SSR local e assertions aprovadas, sem upload; performance 0,96, acessibilidade 1, boas práticas 1, SEO 1 |
| Compose | `docker compose -f ARQUIVO config --no-interpolate --quiet` | API PRD/deploy e Web aprovados; valida sintaxe, não disponibilidade real nem credenciais |
| Git | `git diff --check` em API e Web | Sem erros |

## Regressões financeiras verificadas

`CorrectionRegressionTests` executou contra SQLite real, com restrições e leitura em novos contextos:

- Orçamento atualizado de 100 para 200 persiste; outro espaço mantém 900; busca de item de outro espaço é rejeitada.
- Edição de parcela paga estorna o líquido e reabre a parcela; nova edição não duplica o estorno. Variantes com/sem conta e exclusão de parcela/plano verificam limpeza dos pagamentos e transações compensatórias.
- Snapshots da mesma competência ficam separados por espaço; contexto de job é restaurado após execução assíncrona.
- Acesso a comprovantes exige proprietário/espaço; endpoint e bloqueio de arquivos estáticos legados têm regressão HTTP.

PostgreSQL descartável: migração desde o modelo legado preservou orçamento de 123 e patrimônio de 321, atribuiu o espaço padrão e suportou dois bootstraps sem migração pendente. Container removido ao terminar. Isso não equivale a migrar uma cópia de produção.

A suíte também inclui testes unitários de cache A/B/sem contexto/A, dívida exclusivamente de empréstimo e preservação de objetivo/senha de espaço. Não são homologação conjunta via navegador e banco.

## Dependências

- API: NuGet sem vulnerabilidades reportadas.
- Angular em produção (`--omit=dev`): zero alertas.
- Angular completo: 28 alertas altos derivados de `picomatch`, incluindo ferramentas de build/teste. A auditoria não foi ignorada nem seu limiar relaxado.
- Quality-tests: antes, 42 alertas (22 moderados, 19 altos e 1 crítico); depois, zero. Atualizados `@lhci/cli` 0.15.1 → 0.16.1 e `lighthouse` → 13.6.0; removidos overrides antigos e atualizado `brace-expansion` dentro da faixa compatível via `npm audit fix`, sem `--force`.
- A auditoria de quality-tests agora é bloqueante no workflow próprio.

O [aviso GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), atualizado em 2026-11-17, afeta `picomatch <=4.0.7` e informa ausência de versão corrigida. O registro npm também tinha 4.0.7 como versão mais recente. Critério para fechar: correção compatível publicada, atualização do lockfile, auditoria completa e regressões aprovadas. Não fazer downgrade de Angular para satisfazer a sugestão automática da auditoria.

Referências de atualização: [Lighthouse 13.6.0](https://github.com/GoogleChrome/lighthouse/releases/tag/v13.6.0) e [Lighthouse CI 0.16.1](https://github.com/GoogleChrome/lighthouse-ci/releases/tag/v0.16.1).

## Consolidação e limites

- Branch nos dois repos: `chore/consolidacao-validacao-2026-11-18`.
- API: `f501ffc`, consolidação das correções financeiras, espaços, segurança e runtime .NET 10.
- Web: `6f9ecb1`, consolidação Angular, E2E, SSR/publicação legal e ferramentas de qualidade.
- Os commits consolidam alterações locais preexistentes junto ao trabalho desta execução. Não constituem revisão exaustiva de todas as regras do produto.
- Os 64 testes live são opt-in e ficaram ignorados na execução padrão. E2E local usa interceptações de API; não comprova integração completa com banco/gateways. Permanecem pendentes testes live em ambiente autorizado e homologação externa de cobrança.
- Item 1 da lista do chat (revisão do escopo das consultas de pagamentos) não foi incluído no pedido atual e continua pendente.
- Permanecem decisões sobre restauração, custo B3, exclusão com assinatura e política de recálculo de snapshots. Não foram aprovadas por inferência do código.
- Build mantém avisos CommonJS; compilação da API mantém avisos de nulabilidade. Não foram tratados como falhas novas deste trabalho.

## Evidências

Logs e relatórios JSON ficam em [validacao-2026-11-18](validacao-2026-11-18/). Evidência de Lighthouse é uma coleta local, não benchmark de produção. Auditorias retratam os avisos disponíveis na data da execução e não garantem ausência de outras vulnerabilidades.

Os logs versionados foram normalizados apenas para remover sequências de cor ANSI e espaços finais; comandos, resultados e falhas foram preservados.
