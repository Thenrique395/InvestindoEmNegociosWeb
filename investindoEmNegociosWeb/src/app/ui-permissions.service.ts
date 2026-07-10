import { computed, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { APP_FEATURE_KEYS, AppFeatureKey, hasFeatureForRole } from './features';
import { hasAtLeastRole } from './roles';

@Injectable({ providedIn: 'root' })
export class UiPermissionsService {
  readonly features = APP_FEATURE_KEYS;

  constructor(private readonly authService: AuthService) {}

  can(featureKey: AppFeatureKey): boolean {
    return hasFeatureForRole(this.authService.getRole(), featureKey);
  }

  /**
   * Visões avançadas do Calendário (Agenda, Timeline, filtros e comparações)
   * ficam disponíveis a partir do plano Intermediário. Basic mantém Mês/Semana.
   */
  canUseAdvancedCalendarViews(): boolean {
    return hasAtLeastRole(this.authService.getRole(), 'Intermediate');
  }

  canReadAccounts(): boolean {
    return this.can(APP_FEATURE_KEYS.accountsRead);
  }

  canManageAccounts(): boolean {
    return this.can(APP_FEATURE_KEYS.accountsManage);
  }

  canImportAccounts(): boolean {
    return this.can(APP_FEATURE_KEYS.accountsImport);
  }

  canViewCardStatements(): boolean {
    return this.can(APP_FEATURE_KEYS.cardsStatementsRead);
  }

  canImportInvoices(): boolean {
    return this.can(APP_FEATURE_KEYS.invoiceImportAccess);
  }

  canReadCards(): boolean {
    return this.can(APP_FEATURE_KEYS.cardsRead);
  }

  canCreateUpdateCards(): boolean {
    return this.can(APP_FEATURE_KEYS.cardsCreateUpdate);
  }

  canDeleteCards(): boolean {
    return this.can(APP_FEATURE_KEYS.cardsDelete);
  }

  canReadCategories(): boolean {
    return this.can(APP_FEATURE_KEYS.categoriesRead);
  }

  canManageCategories(): boolean {
    return this.can(APP_FEATURE_KEYS.categoriesManage);
  }

  canAccessInvestments(): boolean {
    return this.can(APP_FEATURE_KEYS.investmentsAccess);
  }
}
