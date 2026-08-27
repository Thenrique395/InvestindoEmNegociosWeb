export type UserRole = 'Basic' | 'Intermediate' | 'Advanced' | 'Admin';

const ROLE_ORDER: Record<UserRole, number> = {
  Basic: 1,
  Intermediate: 2,
  Advanced: 3,
  Admin: 4
};

const ROLE_VALUES: UserRole[] = ['Basic', 'Intermediate', 'Advanced', 'Admin'];

export function parseRole(value?: string | null): UserRole | null {
  if (!value) return null;
  const normalized = value.trim();
  if (ROLE_VALUES.includes(normalized as UserRole)) {
    return normalized as UserRole;
  }

  const lower = normalized.toLowerCase();
  if (lower === 'basic' || lower === 'basico' || lower === 'básico') return 'Basic';
  if (lower === 'intermediate' || lower === 'intermediario' || lower === 'intermediário') return 'Intermediate';
  if (lower === 'advanced' || lower === 'avancado' || lower === 'avançado') return 'Advanced';
  if (lower === 'admin' || lower === 'administrator' || lower === 'adm') return 'Admin';

  return null;
}

export function hasAtLeastRole(current: UserRole | null | undefined, minimum: UserRole): boolean {
  if (!current) return false;
  return ROLE_ORDER[current] >= ROLE_ORDER[minimum];
}
