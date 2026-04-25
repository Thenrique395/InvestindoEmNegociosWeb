import { computed, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { APP_FEATURE_KEYS, AppFeatureKey, hasFeatureForRole } from './features';

@Injectable({ providedIn: 'root' })
export class UiPermissionsService {
  readonly features = APP_FEATURE_KEYS;

  constructor(private readonly authService: AuthService) {}

  can(featureKey: AppFeatureKey): boolean {
    return hasFeatureForRole(this.authService.getRole(), featureKey);
  }

  canReadAccounts(): boolean {
    return this.can(APP_FEATURE_KEYS.accountsRead);
  }

  canManageAccounts(): boolean {
    return this.can(APP_FEATURE_KEYS.accountsManage);
  }

  canReadCards(): boolean {
    return this.can(APP_FEATURE_KEYS.cardsRead);
  }

  canManageCards(): boolean {
    return this.can(APP_FEATURE_KEYS.cardsManage);
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
