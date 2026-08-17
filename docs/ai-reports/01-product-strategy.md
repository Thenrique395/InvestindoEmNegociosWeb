# 01 — Product Strategy: Melhoria da tela de Dashboard

> Skill: `product-strategist` · Data: 2026-07-03 · Escopo: `/dashboard` (HomeComponent)

## Contexto do produto

InvestindoEmNegocios é um app de finanças pessoais com planos por perfil
(**Basic → Intermediate → Advanced**) e monetização por assinatura (rota
`/planos`, checkout integrado). O Dashboard é a **primeira tela após o login**
e o hub que direciona o usuário para receitas, despesas, metas, cartões,
contas, patrimônio e assistente financeiro.

## O que o Dashboard entrega hoje

| Bloco | Perfil mínimo | Observação |
| --- | --- | --- |
| Onboarding guiado (3 passos) | Basic | Redireciona p/ `/onboarding` se incompleto |
| Dashboard simplificado (herói + insight + resumo do mês + movimentos) | Basic | Variante própria, com paginação de insights |
| KPIs (Saldo Disponível Real, Patrimônio, Receitas, Despesas, Dívida em cartões) | Basic/Intermediate | Stat-cards compartilhados com tooltip |
| Saldos por conta + outras moedas | Advanced | |
| Histórico de patrimônio (6 meses) | Advanced | |
| Resumo de dívidas + próximos vencimentos | Intermediate | |
| Assinaturas recorrentes | Intermediate | |
| Saúde financeira (IA) | Intermediate | |
| Insight engine / robô de risco (score, cobertura, recomendações) | Intermediate | 3 fontes: notificação do robô, risk assessment, insight engine |
| Metas (progresso e aportes) | Basic | |
| Donuts de despesas/receitas por categoria | Basic | |
| Movimentos recentes | Basic | |

## A melhoria faz sentido para o produto?

**Sim, com foco em consolidação — não em novas features.** Justificativa:

1. **O Dashboard é o coração da retenção.** É a tela mais visitada e a que
   materializa a proposta de valor ("saber quanto pode gastar"). Qualquer
   fricção aqui impacta retenção e conversão de plano.
2. **A tela já é rica em funcionalidade; o risco atual é de percepção de
   qualidade, não de falta de recurso.** Detectamos bug de navegação
   (movimento de receita levando à tela de despesas), textos sem acentuação
   em labels de acessibilidade e inconsistência visual entre os donuts do
   dashboard e o componente de donut usado em Relatórios/Investimentos.
3. **Custo técnico crescente.** O componente tem ~2.100 linhas de TS e ~1.000
   de HTML concentrando duas experiências (Basic e Intermediate/Advanced).
   Cada evolução futura (ex.: novos insights do robô) fica mais cara e
   arriscada. Investir agora em modularização reduz o custo marginal das
   próximas iniciativas do roadmap.
4. **Upsell por perfil depende desta tela.** As seções gated por role
   (patrimônio, dívidas, IA) são a vitrine dos planos superiores. Elas
   precisam continuar funcionando exatamente como estão (regra de negócio
   intocada) — melhorias devem ser transparentes a permissões.

## O que NÃO deve ser feito agora

- Não adicionar novos widgets/gráficos (não há evidência de demanda; aumentaria o custo do refactor).
- Não alterar as regras de gating por perfil (Basic/Intermediate/Advanced) — são regra de negócio e pricing.
- Não mexer no fluxo de onboarding (há testes E2E dedicados a ele).

## Métricas de sucesso sugeridas

- Zero regressão nos fluxos E2E existentes (smoke, role-regression).
- Build de produção e typecheck verdes.
- Redução mensurável de código duplicado no HomeComponent (linhas/duplicações).
- Correção do bug de navegação de movimentos recentes (receita → `/receitas`).

## Recomendação

Prosseguir com uma melhoria **incremental e segura**: corrigir bugs de UX e
acessibilidade, padronizar com o design system existente e preparar (via
plano documentado) a modularização do componente — sem tocar regra de negócio,
permissões ou SSR.
