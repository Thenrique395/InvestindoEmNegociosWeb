# Plano de Ambientes DEV e PRD

> **Status atual (2026-08-28): o PRD está NO AR** — a pausa de 2026-06-15 acabou. O ambiente foi
> recriado em **VPS Lightsail dedicada (`http://44.222.213.37`)**, não como segunda stack na
> mesma máquina do DEV, que é o que este plano originalmente propunha (seção 2.1, "mesma VPS,
> containers e portas diferentes"). **A estratégia de separar por porta na mesma VPS foi
> abandonada em favor de máquinas separadas.**
>
> Consequências para a leitura deste documento:
> - as portas `5059` (DEV) e `5060` (PRD) **não existem mais**. Hoje: DEV com backend em `5055`
>   e frontend em `4201`; PRD servindo tudo por Caddy na `80`. Topologia real em `../../docs/RUNBOOK.md`;
> - o item sobre o fallback de `api.config.ts` apontando para `5060` perdeu o objeto — mas
>   **confira o valor atual do fallback** antes de assumir que está certo;
> - o que continua valendo: deploy de PRD manual e deliberado, e a ordem banco → API → frontend.
>
> Falta só **HTTPS** nos dois ambientes (sem domínio ainda).

Este documento define a ordem recomendada para separar os ambientes do projeto. A ordem correta e mais segura e:

1. Banco de dados
2. API
3. Frontend

O objetivo e ter um ambiente DEV para validar alteracoes com mais liberdade e um ambiente PRD/estavel para uso sem receber features quebradas constantemente.

## Objetivo dos Ambientes

| Ambiente | Finalidade | Entrega | Estabilidade |
| --- | --- | --- | --- |
| DEV | Validar features em desenvolvimento | Push/merge em `main` | Pode quebrar ocasionalmente |
| PRD | Ambiente estavel de uso | Workflow manual de producao | Deve receber apenas versoes aprovadas |

## Checklist do Estado Atual

Este checklist reflete o que foi encontrado no repositorio. Itens de VPS, GitHub UI e banco real ainda precisam de validacao fora do codigo.

### Ja encontrado no repositorio

- [x] Plano DEV/PRD documentado neste arquivo.
- [x] Backend com workflow usando GitHub Environments `development` e `production`.
- [x] Backend com testes, cobertura, build de imagem por SHA e deploy automatico em DEV.
- [x] Backend com workflow manual separado para deploy em PRD.
- [x] Backend com compose parametrizado por `API_PORT`, `DB_CONN`, secrets e healthcheck.
- [x] Frontend com workflow usando GitHub Environments `development` e `production`.
- [x] Frontend com quality gate, build de imagem por SHA e deploy automatico em DEV.
- [x] Frontend com workflow manual separado para deploy em PRD.
- [x] Frontend com deploy separado por stack (`invest-web-dev` e `invest-web-prd`).
- [x] Frontend com compose parametrizado por `FRONTEND_PORT` e `API_BASE_URL`.
- [x] Suite de quality tests aceita `APP_BASE_URL`, permitindo validar uma URL DEV/PRD existente.

### Parcial ou inconsistente

- [x] Confirmar na UI do GitHub se os environments `development` e `production` existem com vars/secrets completos.
- [x] Definir aprovacao de PRD por workflow manual separado, sem depender de required reviewer no GitHub Environment.
- [x] Padronizar estrategia de branch: `main` entrega DEV; PRD e promovido manualmente pelo workflow de producao.
- [x] Padronizar portas da API: DEV publica em `5059` e PRD publica em `5060`; a API continua ouvindo em `5059` dentro do container.
- [x] Definir modelo oficial de deploy: por enquanto sera `compose` unico com variaveis por ambiente.
- [x] Remover fallback fixo do frontend e exigir `API_BASE_URL` correta por ambiente. **FEITO** —
  conferido em 2026-08-28 em `src/app/core/api.config.ts` (o arquivo mudou de lugar na
  reestruturação `core/shared/features`): a base agora vem de `window.__API_BASE_URL__` no
  navegador (injetado por `/config.js` a partir do env do container) ou de
  `process.env['API_BASE_URL']` no SSR, com fallback final `http://localhost:4200/api/v1`.
  O fallback antigo apontava para o PRD na porta `5060` — risco eliminado, o default agora é local — **atencao**: aponta para PRD (`5060`), que esta pausado desde 2026-06-15, nao para DEV (`5059`); se algum build novo rodar sem `API_BASE_URL` configurada, o frontend tentara falar com um backend pausado em vez de com DEV (revisado em 2026-06-28; valor real no codigo confirmado, doc anterior dizia `5059` por engano).
- [x] Adicionar validacao pos-deploy do frontend para garantir que a tela abriu e chamou a API certa.

### Ainda pendente ou nao confirmado

- [ ] Criar/confirmar banco DEV separado.
- [ ] Criar/confirmar banco PRD separado.
- [ ] Criar/confirmar usuarios separados de banco.
- [ ] Aplicar e validar schema/migrations nos dois bancos.
- [ ] Configurar e testar backup/restore do PRD.
- [ ] Validar API DEV com `/health`, login, banco correto, CORS e logs.
- [ ] Validar API PRD com `/health`, login, banco correto, CORS e logs.
- [ ] Validar frontend DEV apontando para API DEV.
- [ ] Validar frontend PRD apontando para API PRD.
- [ ] Validar fluxo completo em cada ambiente: pagina publica, login, dashboard, despesas, receitas, cartoes e logout.
- [ ] Definir dominios finais ou manter estrategia por portas ate a publicacao oficial.
- [ ] Ambiente PRD (porta `5060`) esta PAUSADO desde 2026-06-15 — ver `../../docs/DECISIONS/2026-06-15-pausar-ambiente-prd-focar-dev.md`; retomar somente apos decisao explicita.

## 1. Banco de Dados

Separar o banco vem primeiro porque ele define o isolamento real dos dados. Se DEV e PRD usarem o mesmo banco, qualquer teste no DEV ainda pode afetar dados do ambiente estavel.

**Atencao:** no servidor atual, os bancos `meu_mentor_db` e `meu_mentor_prd` tem papeis invertidos (o que parece DEV e PRD e vice-versa) — validar nomes reais antes de qualquer migracao ou script. Ver `InvestindoEmNegociosApi/docs/DEPLOY_GITHUB_ENVIRONMENTS.md`.

### 1.1. Criar bancos separados

Criar dois bancos distintos:

- Banco DEV
- Banco PRD/estavel

Exemplo de nomes:

- `InvestindoEmNegocios_DEV`
- `InvestindoEmNegocios_PRD`

### 1.2. Definir usuarios e permissoes

Criar credenciais separadas por ambiente:

- Usuario DEV acessa somente o banco DEV.
- Usuario PRD acessa somente o banco PRD.

Evitar usar o mesmo usuario/senha nos dois ambientes.

### 1.3. Aplicar schema e migrations

Antes de subir a API, garantir que os dois bancos tenham:

- schema criado;
- migrations aplicadas;
- dados iniciais necessarios;
- indices e constraints iguais.

### 1.4. Definir estrategia de dados

Decidir como o DEV sera alimentado:

- dados fake/sinteticos;
- copia mascarada do PRD;
- base vazia para testes controlados.

Para comeco, o mais seguro e usar dados fake ou uma base vazia.

### 1.5. Backup

Antes de usar o PRD como ambiente estavel:

- configurar backup;
- definir frequencia;
- validar restauracao pelo menos uma vez.

## 2. API

Depois do banco separado, a API deve ser separada por ambiente. Cada API precisa apontar para seu proprio banco.

### 2.1. Definir portas e nomes dos containers

Na mesma VPS, usar containers e portas diferentes.

Exemplo:

| Ambiente | Container | Porta externa | Banco |
| --- | --- | --- | --- |
| DEV | `investindo-api-dev` | `5059` | Banco DEV |
| PRD | `investindo-api-prd` | `5060` | Banco PRD |

### 2.2. Separar variaveis de ambiente

Criar variaveis/secrets separados:

- `DEV_DATABASE_CONNECTION`
- `DEV_JWT_SECRET`
- `DEV_*`
- `PRD_DATABASE_CONNECTION`
- `PRD_JWT_SECRET`
- `PRD_*`

Nao reaproveitar secrets sensiveis entre DEV e PRD quando nao for necessario.

### 2.3. Separar imagens Docker

Evitar que DEV sobrescreva PRD.

Tags sugeridas:

- `ghcr.io/.../api:dev`
- `ghcr.io/.../api:prd`
- opcional: `ghcr.io/.../api:<sha-do-commit>`

### 2.4. Criar compose separado

Criar arquivos separados:

- `docker-compose.api.dev.yml`
- `docker-compose.api.prd.yml`

Cada compose deve ter:

- nome de container proprio;
- porta propria;
- variaveis proprias;
- tag Docker propria.

### 2.5. Criar pipelines da API

Fluxo atual:

- Push/merge em `main`: roda testes, builda imagem por SHA, publica no GHCR e faz deploy DEV.
- Workflow manual `Deploy Backend Production`: promove uma imagem por SHA para PRD.

O workflow manual aceita informar a imagem exata. Se o campo ficar vazio, usa a imagem do SHA selecionado ao executar o workflow.

### 2.6. Validar API antes do frontend

Antes de mexer no front, validar:

- endpoint `/health`;
- login/autenticacao;
- conexao com banco correto;
- migrations aplicadas;
- logs sem erro;
- CORS liberado para o front correspondente.

## 3. Frontend

O frontend deve ser separado por ultimo, porque ele depende das URLs da API de cada ambiente.

### 3.1. Definir URLs

Sem dominio oficial ainda, pode usar portas na VPS:

| Ambiente | Front | API |
| --- | --- | --- |
| DEV | `http://35.174.50.187:4201` | `http://35.174.50.187:5055/api/v1` |
| PRD | `http://44.222.213.37` | `http://44.222.213.37/api/v1` (mesma origem, via Caddy) |

> Conferido por `docker ps` nas duas VPS em 2026-08-28. A tabela anterior colocava os dois
> ambientes na mesma máquina (`35.174.50.187`, portas `4200`/`5060`) — **isso não é mais
> verdade**: o PRD ganhou VPS própria e essas portas estão fechadas.

Quando houver dominio:

- DEV: `dev.investindoemnegocios.com`
- PRD: `app.investindoemnegocios.com`

### 3.2. Separar containers e portas

Exemplo:

| Ambiente | Container | Porta externa |
| --- | --- | --- |
| DEV | `investindo-web-dev` | `4201` |
| PRD | `investindo-web-prd` | `4200` |

### 3.3. Separar imagens Docker

Tags sugeridas:

- `ghcr.io/.../web:dev`
- `ghcr.io/.../web:prd`
- opcional: `ghcr.io/.../web:<sha-do-commit>`

Evitar usar apenas `latest`, porque isso facilita sobrescrever o ambiente errado.

### 3.4. Separar compose do frontend

Criar:

- `docker-compose.frontend.dev.yml`
- `docker-compose.frontend.prd.yml`

Cada arquivo deve configurar:

- imagem correta;
- nome de container correto;
- porta correta;
- `API_BASE_URL` correto.

### 3.5. Criar pipelines do frontend

Fluxo atual:

- Push/merge em `main`: roda quality gate, builda imagem por SHA, publica no GHCR, faz deploy DEV e valida o frontend DEV.
- Workflow manual `Deploy Frontend Production`: promove uma imagem por SHA para PRD e roda validacao pos-deploy.

O workflow manual aceita informar a imagem exata. Se o campo ficar vazio, usa a imagem do SHA selecionado ao executar o workflow.

### 3.6. Validar frontend

Checklist:

- abrir tela publica;
- login funcionando;
- dashboard carregando dados do ambiente correto;
- calendario e calculadoras acessiveis para perfil Basic;
- logout funcionando;
- nenhuma chamada apontando para API errada.

## Ordem de Execucao Recomendada

1. Criar banco DEV.
2. Criar banco PRD/estavel.
3. Criar usuarios separados para cada banco.
4. Aplicar migrations nos dois bancos.
5. Configurar backup do banco PRD.
6. Criar deploy da API DEV.
7. Criar deploy da API PRD.
8. Validar API DEV e PRD separadamente.
9. Criar deploy do frontend DEV apontando para API DEV.
10. Criar deploy do frontend PRD apontando para API PRD.
11. Validar que push/merge em `main` entrega apenas DEV.
12. Validar que PRD so muda quando o workflow manual de producao e executado.
13. Validar fluxo completo:
    - feature entra em DEV automaticamente;
    - depois o mesmo SHA e promovido manualmente para PRD.

## Decisoes Pendentes

- Nome final dos bancos.
- Se DEV usara dados fake ou copia mascarada.
- Portas oficiais da API DEV e PRD.
- Se a mesma VPS vai hospedar banco, API e front ou se o banco ficara fora da VPS.
- Se os dominios serao configurados agora ou depois.
- Estrategia de backup e restore.

## Regra Principal

Nunca deixar DEV e PRD compartilharem o mesmo banco quando DEV for usado para testar features em desenvolvimento.

Separar apenas o frontend nao e suficiente. A separacao real comeca no banco, passa pela API e termina no frontend.
