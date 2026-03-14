# Auditoria da Suíte Live E2E

Data da revisão: `2026-03-14`

Observação operacional:
- os cenários de perfis elevados (`Intermediate`, `Advanced`, `Admin`) dependem de credenciais live carregadas no ambiente
- sem essas credenciais, os testes desses perfis são ignorados por desenho e isso não deve ser lido como regressão funcional

## Critério adotado

Um cenário live só conta como cobertura forte quando:
- usa navegador real e servidor real
- não depende de mock de API ou sessão
- valida a regra funcional esperada, não o acidente da implementação
- confirma persistência real quando altera dados

Classificações:
- `Robusto`: cobre a regra funcional com boa evidência
- `Parcial`: cobre uma parte importante, mas ainda não fecha a regra ponta a ponta
- `Acompanhar`: útil como smoke, mas depende de premissa funcional ainda instável

## Resultado atual por arquivo

### `live-finance-modules.spec.ts`
- `cria um empréstimo real e persiste o contrato`
  Classificação: `Bloqueado por ambiente`
  Motivo: o servidor remoto atual responde `404` para `/api/v1/loans`, então a suíte live faz `skip` explícito para não mascarar deploy incompleto.
- `gera um snapshot real do mês e exibe na listagem`
  Classificação: `Bloqueado por ambiente`
  Motivo: o servidor remoto atual responde `404` para `/api/v1/monthlysnapshots`.
- `troca o plano real para Intermediate anual e depois cancela a renovação`
  Classificação: `Bloqueado por ambiente`
  Motivo: o servidor remoto atual responde `404` para `/api/v1/subscriptions`.
- `revoga sessões reais e atualiza o resumo de segurança`
  Classificação: `Bloqueado por ambiente`
  Motivo: o servidor remoto atual responde `404` para `/api/v1/preferences/security-summary`.

### `live-core.spec.ts`
- `conclui onboarding real e entra no dashboard autenticado`
  Classificação: `Robusto`
- `cria um cartao real e exibe na listagem`
  Classificação: `Robusto`
- `abre o dashboard real e alterna os paineis de periodo e risco`
  Classificação: `Robusto`
- `cria uma meta real e registra na listagem`
  Classificação: `Robusto`
- `exibe a conta principal real e respeita a restricao do plano Basic`
  Classificação: `Robusto`

### `live-access.spec.ts`
- `abre a receita real e evidencia ausencia de categorias ativas`
  Classificação: `Acompanhar`
  Motivo: depende da decisão de produto sobre usuário recém-onboarded receber ou não categorias persistidas.
- `abre a despesa real e evidencia ausencia de categorias ativas`
  Classificação: `Acompanhar`
  Motivo: mesma dependência semântica do caso de receita.
- `abre categorias por rota direta para usuario Basic`
  Classificação: `Robusto`
- `redireciona usuario Basic ao tentar abrir calendario`
  Classificação: `Robusto`
- `redireciona usuario Basic ao tentar abrir investimentos`
  Classificação: `Robusto`
- `redireciona usuario Basic ao tentar abrir admin parametros`
  Classificação: `Robusto`

### `live-profile.spec.ts`
- `abre preferencias e centro de dados reais`
  Classificação: `Robusto`
- `abre o perfil real e carrega os dados do usuario`
  Classificação: `Robusto`
- `abre a pagina real de seguranca`
  Classificação: `Robusto`
- `exporta dados reais do usuario`
  Classificação: `Robusto`
- `salva preferencia real de notificacao`
  Classificação: `Robusto`
- `faz logout real e bloqueia retorno direto ao dashboard`
  Classificação: `Robusto`
- `exclui a conta descartavel via fluxo lgpd real`
  Classificação: `Robusto`

### `live-writeflows.spec.ts`
- `cria categoria de despesa real, lanca despesa e marca como pago`
  Classificação: `Robusto`
- `cria categoria de receita real, lanca receita e marca como recebida`
  Classificação: `Robusto`
- `cria categoria e remove a categoria personalizada real`
  Classificação: `Robusto`
- `cria receita recorrente real e filtra por tipo recorrente`
  Classificação: `Robusto`
- `edita despesa real em aberto e reflete novo valor`
  Classificação: `Robusto`
- `edita e exclui receita recorrente real`
  Classificação: `Robusto`
- `tenta estornar pagamento real e preserva a despesa como paga quando o servidor rejeita`
  Classificação: `Robusto`
- `exclui receita real avulsa pela confirmacao simples`
  Classificação: `Robusto`

### `live-role-profiles.spec.ts`
- `Intermediate exibe menu compatível com o perfil e libera importação de fatura`
  Classificação: `Parcial`
  Motivo: valida gating e entrada no fluxo, mas não a operação final.
- `Intermediate acessa calendario mas nao investimentos nem admin`
  Classificação: `Robusto`
- `Advanced exibe wealth no menu e carrega ações principais de investimentos`
  Classificação: `Robusto`
- `Advanced acessa investimentos e calendario mas nao admin`
  Classificação: `Robusto`
- `Admin exibe menus administrativos e carrega módulos críticos`
  Classificação: `Robusto`
- `Admin acessa telas administrativas reais`
  Classificação: `Robusto`

### `live-role-writeflows.spec.ts`
- `Intermediate cria categoria real e a usa no fluxo de importação de fatura`
  Classificação: `Robusto`
  Motivo: agora usa arquivo real, preview real, persistência real em `despesas` e `/plans`, além de validar deduplicação no reimport.
- `Advanced cria um lançamento real em investimentos`
  Classificação: `Robusto`
- `Admin altera o role de um usuário real e restaura no fim do fluxo`
  Classificação: `Robusto`

## Resumo atual

- `Robusto`: 32 cenários
- `Parcial`: 1 cenário
- `Acompanhar`: 2 cenários
- `Bloqueado por ambiente`: 4 cenários
- `Bug real aberto na suíte live`: 0

## Pendências reais após esta revisão

1. Decidir a regra funcional do onboarding sobre provisionamento de categorias.
   Isso afeta os dois cenários classificados como `Acompanhar`.

2. Publicar no servidor remoto os módulos `loans`, `monthlysnapshots`, `subscriptions` e `preferences/security-summary`.
   Enquanto isso não ocorrer, esses cenários devem continuar em `skip` explícito na suíte live.

3. Expandir a cobertura real de `cartões` para remoção/erro com o mesmo padrão de persistência confirmado por API.

4. Manter a auditoria sincronizada com a suíte.
   A versão anterior deste documento já estava descolada do estado real do projeto e não deve voltar a ser tratada como fonte de verdade sem rerodada completa.
