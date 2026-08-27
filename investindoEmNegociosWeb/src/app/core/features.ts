import { UserRole } from './roles';

/**
 * Feature keys aligned with the backend authorization model.
 *
 * The backend is the source of truth for feature names.
 * Prefer the `feature.*` keys for new code.
 */
export const APP_FEATURE_KEYS = {
  investmentsAccess: 'feature.investments.access',

  accountsRead: 'feature.accounts.read',
  accountsManage: 'feature.accounts.manage',
  accountsImport: 'feature.accounts.import',

  cardsRead: 'feature.cards.read',
  cardsCreateUpdate: 'feature.cards.create-update',
  cardsDelete: 'feature.cards.delete',
  cardsStatementsRead: 'feature.cards.statements',

  categoriesRead: 'feature.categories.read',
  categoriesManage: 'feature.categories.manage',

  invoiceImportAccess: 'feature.invoice-import.access',

  budgetAccess: 'feature.budget.access',
  scenariosAccess: 'feature.scenarios.access',
  reportsAccess: 'feature.reports.access',

  adminUsersManage: 'feature.admin.users.manage',
  adminParametersManage: 'feature.admin.parameters.manage',
  adminRobotsManage: 'feature.admin.robots.manage',
  adminCategoriesManage: 'feature.admin.categories.manage',

  /**
   * @deprecated Use accountsRead/accountsManage depending on the screen/action.
   * Temporary alias kept to avoid breaking existing routes while the frontend is migrated.
   */
  accountsAccess: 'feature.accounts.read',

  /**
   * @deprecated Use cardsRead/cardsCreateUpdate/cardsDelete depending on the screen/action.
   * Temporary alias kept to avoid breaking existing routes while the frontend is migrated.
   */
  cardsAccess: 'feature.cards.read',

  /**
   * @deprecated Use categoriesRead/categoriesManage depending on the screen/action.
   * Temporary alias kept to avoid breaking existing routes while the frontend is migrated.
   */
  categoriesAccess: 'feature.categories.read'
} as const;

export type AppFeatureKey = (typeof APP_FEATURE_KEYS)[keyof typeof APP_FEATURE_KEYS];

const BASIC_FEATURES: AppFeatureKey[] = [
  APP_FEATURE_KEYS.cardsRead,
  APP_FEATURE_KEYS.cardsCreateUpdate,
  APP_FEATURE_KEYS.accountsRead,
  APP_FEATURE_KEYS.categoriesRead,
  APP_FEATURE_KEYS.cardsDelete,
  APP_FEATURE_KEYS.cardsAccess,
  APP_FEATURE_KEYS.accountsAccess,
  APP_FEATURE_KEYS.categoriesAccess
];

const INTERMEDIATE_FEATURES: AppFeatureKey[] = [
  ...BASIC_FEATURES,
  APP_FEATURE_KEYS.accountsManage,
  APP_FEATURE_KEYS.accountsImport,
  APP_FEATURE_KEYS.cardsStatementsRead,
  APP_FEATURE_KEYS.categoriesManage,
  APP_FEATURE_KEYS.invoiceImportAccess,
  APP_FEATURE_KEYS.budgetAccess,
  APP_FEATURE_KEYS.scenariosAccess,
  APP_FEATURE_KEYS.reportsAccess
];

const ADVANCED_FEATURES: AppFeatureKey[] = [
  ...INTERMEDIATE_FEATURES,
  APP_FEATURE_KEYS.investmentsAccess
];

const FEATURE_MATRIX: Record<UserRole, ReadonlySet<AppFeatureKey>> = {
  Basic: new Set(BASIC_FEATURES),
  Intermediate: new Set(INTERMEDIATE_FEATURES),
  Advanced: new Set(ADVANCED_FEATURES),
  Admin: new Set(Object.values(APP_FEATURE_KEYS))
};

export function hasFeatureForRole(role: UserRole | null | undefined, featureKey: AppFeatureKey): boolean {
  if (!role) return false;
  return FEATURE_MATRIX[role]?.has(featureKey) ?? false;
}
