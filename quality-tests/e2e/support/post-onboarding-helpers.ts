// O usuario criado por completeLiveOnboarding fica no plano Basic, que não tem permissão
// para gerenciar categorias (feature.categories.manage). Por isso os testes de pós-onboarding
// usam categorias padrão já disponíveis (feature.categories.read), em vez de criar categorias
// personalizadas.
export const DEFAULT_EXPENSE_CATEGORY = 'Alimentação';
export const DEFAULT_INCOME_CATEGORY = 'Freela';

// As páginas de despesas/receitas filtram por padrão o período (mês) atual, então novos
// lançamentos precisam de uma data dentro do mês corrente para aparecerem na listagem.
export function todayAsDDMMYYYY(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}${month}${now.getFullYear()}`;
}

// ApiDataService.refresh()/refreshIncomes() ignoram chamadas a menos de 1,5s da última
// atualização. O onboarding já dispara um refresh ao concluir, então aguardamos esse
// intervalo passar antes de criar novos lançamentos, senão a tabela não reflete o novo
// item sem reload.
export const REFRESH_THROTTLE_MS = 1600;
