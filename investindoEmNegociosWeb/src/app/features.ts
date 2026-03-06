import { UserRole } from './roles';

export const APP_FEATURE_KEYS = {
  investmentsAccess: 'investments.access',
  cardsAccess: 'cards.access',
  accountsAccess: 'accounts.access',
  categoriesAccess: 'categories.access',
  invoiceImportAccess: 'invoice-import.access',
  adminUsersManage: 'admin.users.manage',
  adminParametersManage: 'admin.parameters.manage',
  adminRobotsManage: 'admin.robots.manage',
  adminCategoriesManage: 'admin.categories.manage'
} as const;

export type AppFeatureKey = (typeof APP_FEATURE_KEYS)[keyof typeof APP_FEATURE_KEYS];

const FEATURE_MATRIX: Record<UserRole, ReadonlySet<AppFeatureKey>> = {
  Basic: new Set([
    APP_FEATURE_KEYS.cardsAccess,
    APP_FEATURE_KEYS.accountsAccess,
    APP_FEATURE_KEYS.categoriesAccess
  ]),
  Intermediate: new Set([
    APP_FEATURE_KEYS.cardsAccess,
    APP_FEATURE_KEYS.accountsAccess,
    APP_FEATURE_KEYS.categoriesAccess,
    APP_FEATURE_KEYS.invoiceImportAccess
  ]),
  Advanced: new Set([
    APP_FEATURE_KEYS.cardsAccess,
    APP_FEATURE_KEYS.accountsAccess,
    APP_FEATURE_KEYS.categoriesAccess,
    APP_FEATURE_KEYS.invoiceImportAccess,
    APP_FEATURE_KEYS.investmentsAccess
  ]),
  Admin: new Set(Object.values(APP_FEATURE_KEYS))
};

export function hasFeatureForRole(role: UserRole | null | undefined, featureKey: AppFeatureKey): boolean {
  if (!role) return false;
  return FEATURE_MATRIX[role]?.has(featureKey) ?? false;
}

