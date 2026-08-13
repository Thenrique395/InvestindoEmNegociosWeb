# Perfis e permissões

O sistema tem quatro perfis. A diferença entre eles não é só "mais cards" — é **qual pergunta o dashboard responde primeiro** e **quais itens existem no menu**.

Fonte: `dashboard.component.ts`, `financial-overview.model.ts` e a decisão de produto tomada com o cliente.

---

## Menu por perfil

### Essencial

```
Visão geral
  Dashboard
Movimentações
  Despesas
  Receitas
  Cartões
Planejamento
  Metas
  Categorias
```

Não tem: Calendário, Contas, Orçamento, Investimentos, Relatórios, Simulador, Assistente, Empréstimos.

### Inteligente

```
Visão geral
  Dashboard
  Calendário
Movimentações
  Despesas
  Receitas
  Cartões
  Contas
  Categorias
Planejamento
  Metas
  Orçamento
```

Não tem: Investimentos, Relatórios, Simulador, Assistente, Empréstimos.

### Completo

Todos os itens:

```
Visão geral
  Dashboard
  Calendário
Movimentações
  Despesas
  Receitas
  Cartões
  Contas
  Categorias
Planejamento
  Metas
  Orçamento
  Empréstimos e Financiamentos
  Investimentos
Análises
  Relatórios
  Simulador
  Assistente
Conta
  Perfil
  Configurações
```

### Admin

Todo o menu do Completo **mais** o grupo administrativo, e o grupo "Visão geral" ganha **dois** itens de dashboard:

```
Visão geral
  Painel do sistema      ← dashboard administrativo
  Dashboard              ← dashboard financeiro pessoal
...
Administração
  Usuários
  Assinaturas
  Parâmetros
  Robôs
  Auditoria
```

---

## Dashboard por perfil

### Essencial — "quanto sobra este mês"

Três indicadores, nesta ordem:
1. **Saldo do período** — quanto sobrou até hoje
2. **Receitas**
3. **Despesas**

Depois:
- **Projeção de sobra** no fim do mês, com a conta explícita (recebido + a receber − pago − a pagar)
- **Próximos vencimentos** (7 dias)
- **CTA contextual** — um convite único, escolhido pelo que falta: cadastrar cartão, definir a primeira meta, ou revisar categorias sem uso

Sem gráfico de evolução, sem patrimônio, sem distribuição por categoria. O perfil Essencial responde uma pergunta só.

### Inteligente — "estou dentro do planejado"

Cinco indicadores: **Saldo**, **Patrimônio líquido**, **Receitas**, **Despesas**, **Comprometido**.

Depois:
- **Gráfico de evolução** de 6 meses (receita × despesa)
- **Orçamento do mês** — as categorias com uso e estouro
- **Metas** em andamento com ritmo
- **Próximos vencimentos**
- **Recorrências do mês**

### Completo — "como está minha vida financeira"

Mesmos cinco indicadores, mais:
- **Saúde financeira** no topo — o índice e os fatores que o compõem
- **Gráfico de evolução** de 12 meses
- **Dívidas e contas** em duas colunas
- **Investimentos** — patrimônio, variação e as posições principais
- **Orçamento**, **Metas**, **Recorrências**, **Vencimentos**
- **Insights contextuais** com estilo configurável (conservador / moderado / arrojado)

### Admin — dois painéis

**Painel do sistema** (novo): contas ativas, assinaturas, receita recorrente, robôs em execução, falhas recentes, fila de processamento, últimos cadastros e log de auditoria resumido.

**Dashboard**: o dashboard financeiro pessoal completo, idêntico ao perfil Completo.

O item ativo no grupo "Visão geral" alterna entre os dois.

---

## Estado de conta nova

Mesmo com o onboarding completo, no primeiro dia não existe histórico. Gráficos de 6/12 meses e distribuição por categoria não têm o que mostrar.

Regra: **quando há menos de dois meses de dados, o gráfico de evolução é substituído** por um bloco que explica que o histórico começa a aparecer no próximo mês, com um convite para o próximo lançamento. Não desenhar uma linha a partir de dois pontos — isso mente sobre a tendência.

O mesmo vale para distribuição por categoria com menos de três categorias movimentadas.

Não repetir o checklist do onboarding no dashboard. Se o onboarding foi concluído, o usuário já fez aquele percurso.

---

## Restrições de ação por perfil

| Ação | Essencial | Inteligente | Completo | Admin |
|---|---|---|---|---|
| Lançar despesa / receita | sim | sim | sim | sim |
| Cadastrar cartão | sim | sim | sim | sim |
| Cadastrar conta bancária | — | sim | sim | sim |
| Cadastrar categoria | sim | sim | sim | sim |
| Criar meta | sim | sim | sim | sim |
| Montar orçamento | — | sim | sim | sim |
| Importar fatura em PDF | — | sim | sim | sim |
| Registrar investimento / importar B3 | — | — | sim | sim |
| Exportar relatório | — | — | sim | sim |
| Usar Assistente / Simulador | — | — | sim | sim |
| Administração | — | — | — | sim |

Onde a ação não existe para o perfil, **o item simplesmente não aparece no menu** — sem card de upsell dentro da tela, sem botão desabilitado. O upsell fica no CTA contextual do dashboard e na tela de plano em Configurações.
