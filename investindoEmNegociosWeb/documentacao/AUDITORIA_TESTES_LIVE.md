# Auditoria da Suíte Live E2E

Data da auditoria: 2026-03-10

## Critério adotado

Um cenário live só é tratado como cobertura válida quando:

- valida a regra funcional esperada
- não depende de mock de API ou sessão
- não aceita estado inconsistente só porque a UI mostrou algo temporariamente
- confirma persistência real quando a operação altera dados

Classificações usadas:

- `Robusto`: valida comportamento funcional com evidência suficiente do servidor ou com persistência confirmada após recarregar
- `Parcial`: cobre uma parte importante do fluxo, mas ainda não fecha a regra de negócio ponta a ponta
- `Acompanhar`: ainda válido como smoke, mas mais acoplado ao estado atual da interface ou a mensagens específicas
- `Bug real`: o teste está correto e expôs defeito funcional no produto

## Resultado por arquivo

### `live-core.spec.ts`

- `conclui onboarding real e entra no dashboard autenticado`
  Classificação: `Robusto`
  Motivo: valida cadastro, login, onboarding multi-etapa e chegada ao dashboard autenticado.

- `cria um cartao real e exibe na listagem`
  Classificação: `Bug real`
  Motivo: o cartão não persiste após reload no servidor atual. A auditoria encontrou a causa provável no frontend: o campo `Número do cartão` mascara com espaços, mas o `pattern` antigo aceitava só dígitos, bloqueando o submit nativo do formulário.

- `abre o dashboard real e alterna os paineis de periodo e risco`
  Classificação: `Robusto`
  Motivo: valida navegação funcional do dashboard e mudança de contexto temporal.

- `cria uma meta real e registra na listagem`
  Classificação: `Robusto`
  Motivo: agora espera `POST /goals` e confirma presença após reload.

- `exibe a conta principal real e respeita a restricao do plano Basic`
  Classificação: `Robusto`
  Motivo: valida regra de autorização funcional do plano Basic e abertura do extrato real.

### `live-access.spec.ts`

- `abre a receita real e evidencia ausencia de categorias ativas`
  Classificação: `Acompanhar`
  Motivo: a regra validada é boa, mas depende do estado inicial real do usuário recém-onboarded e pode mudar se o onboarding passar a provisionar categorias persistentes.

- `abre a despesa real e evidencia ausencia de categorias ativas`
  Classificação: `Acompanhar`
  Motivo: mesma limitação do cenário de receitas.

- `abre categorias por rota direta para usuario Basic`
  Classificação: `Robusto`
  Motivo: valida acesso real à rota, criação de categoria e renderização no contexto do usuário.

- `redireciona usuario Basic ao tentar abrir calendario`
  Classificação: `Robusto`
  Motivo: valida bloqueio real por perfil via rota direta.

- `redireciona usuario Basic ao tentar abrir investimentos`
  Classificação: `Robusto`
  Motivo: valida bloqueio real por perfil via rota direta.

- `redireciona usuario Basic ao tentar abrir admin parametros`
  Classificação: `Robusto`
  Motivo: valida bloqueio real por perfil via rota direta.

### `live-profile.spec.ts`

- `abre preferencias e centro de dados reais`
  Classificação: `Robusto`
  Motivo: valida presença das duas telas reais e controles principais.

- `abre o perfil real e carrega os dados do usuario`
  Classificação: `Robusto`
  Motivo: valida dados efetivos preenchidos no onboarding.

- `abre a pagina real de seguranca`
  Classificação: `Robusto`
  Motivo: smoke funcional da área de segurança com mensagem oficial atual.

- `exporta dados reais do usuario`
  Classificação: `Robusto`
  Motivo: valida download real de exportação.

- `salva preferencia real de notificacao`
  Classificação: `Robusto`
  Motivo: valida `PUT /preferences`, payload retornado e persistência após reload.

- `faz logout real e bloqueia retorno direto ao dashboard`
  Classificação: `Robusto`
  Motivo: valida encerramento real de sessão e bloqueio posterior.

- `exclui a conta descartavel via fluxo lgpd real`
  Classificação: `Robusto`
  Motivo: valida o fluxo self-service real de exclusão.

### `live-writeflows.spec.ts`

- `cria categoria de despesa real, lanca despesa e marca como pago`
  Classificação: `Robusto`
  Motivo: valida criação, liquidação e persistência após reload.

- `cria categoria de receita real, lanca receita e marca como recebida`
  Classificação: `Robusto`
  Motivo: valida criação, recebimento e persistência após reload.

- `cria categoria e remove a categoria personalizada real`
  Classificação: `Robusto`
  Motivo: agora espera `DELETE /categories` e confirma ausência após reload.

- `cria receita recorrente real e filtra por tipo recorrente`
  Classificação: `Robusto`
  Motivo: valida criação recorrente e filtro funcional na listagem.

- `edita despesa real em aberto e reflete novo valor`
  Classificação: `Robusto`
  Motivo: valida edição real e persistência após reload.

- `edita e exclui receita recorrente real`
  Classificação: `Robusto`
  Motivo: valida edição, exclusão e ausência após reload.

- `tenta estornar pagamento real e preserva a despesa como paga quando o servidor rejeita`
  Classificação: `Robusto`
  Motivo: valida comportamento correto em falha de servidor sem aceitar falso positivo.

- `exclui receita real avulsa pela confirmacao simples`
  Classificação: `Robusto`
  Motivo: valida exclusão real e ausência após reload.

### `live-role-profiles.spec.ts`

- `Intermediate exibe menu compatível com o perfil e libera importação de fatura`
  Classificação: `Parcial`
  Motivo: valida gating e acesso à entrada do fluxo, mas não a importação ponta a ponta.

- `Intermediate acessa calendario mas nao investimentos nem admin`
  Classificação: `Robusto`
  Motivo: valida permissões reais por rota.

- `Advanced exibe wealth no menu e carrega ações principais de investimentos`
  Classificação: `Robusto`
  Motivo: valida acesso funcional ao módulo wealth.

- `Advanced acessa investimentos e calendario mas nao admin`
  Classificação: `Robusto`
  Motivo: valida permissões reais por rota.

- `Admin exibe menus administrativos e carrega módulos críticos`
  Classificação: `Robusto`
  Motivo: valida acesso administrativo real aos módulos centrais.

- `Admin acessa telas administrativas reais`
  Classificação: `Robusto`
  Motivo: valida a navegação real para parâmetros e usuários.

### `live-role-writeflows.spec.ts`

- `Intermediate cria categoria real e a usa no fluxo de importação de fatura`
  Classificação: `Parcial`
  Motivo: confirma que o perfil entra no fluxo e consegue selecionar categoria, mas ainda não importa um arquivo real com resultado final confirmado.

- `Advanced cria um lançamento real em investimentos`
  Classificação: `Robusto`
  Motivo: valida criação real e confirma persistência pela API oficial.

- `Admin altera o role de um usuário real e restaura no fim do fluxo`
  Classificação: `Robusto`
  Motivo: valida mutação administrativa real com rollback controlado.

## Resumo

- `Robusto`: 25 cenários
- `Parcial`: 2 cenários
- `Acompanhar`: 2 cenários
- `Bug real`: 1 cenário

## Pendências reais após a auditoria

- Corrigir o bug de criação de cartão encontrado na auditoria: o campo `Número do cartão` formata com espaços, mas o `pattern` do input aceitava apenas dígitos, bloqueando o submit nativo do formulário.
- Transformar os dois cenários de importação de fatura em fluxo ponta a ponta com arquivo real.
- Decidir se o onboarding deve ou não provisionar categorias persistentes; isso afeta a estabilidade semântica dos dois cenários de ausência de categorias.
- Separar um bloco adicional para falhas funcionais de escrita por perfil, com asserções de mensagem e estado final após erro de servidor.
