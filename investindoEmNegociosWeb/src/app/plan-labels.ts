import { MARKETING_PLANS } from './marketing-plans';
import type { UserRole } from './roles';

/**
 * Rótulo comercial de cada perfil — camada de exibição apenas.
 *
 * O código e a API continuam falando `Basic` / `Intermediate` / `Advanced`
 * (decisão D3): renomear atravessaria auth, guards e banco. Aqui só traduzimos
 * para o nome que o usuário vê no site e na sidebar.
 *
 * Os nomes vêm de `marketing-plans.ts`, que é a fonte única — assim, mudar
 * "Controle" para outra coisa na landing muda também o rodapé da sidebar.
 */
const ROLE_TO_PLAN_CODE: Record<Exclude<UserRole, 'Admin'>, string> = {
  Basic: 'basic',
  Intermediate: 'intermediate',
  Advanced: 'advanced',
};

export function planLabelForRole(role: UserRole | null | undefined): string {
  if (!role) return '';
  if (role === 'Admin') return 'Administrador';

  const code = ROLE_TO_PLAN_CODE[role];
  const plan = MARKETING_PLANS.find((p) => p.code === code);
  return plan ? `Plano ${plan.name}` : '';
}
