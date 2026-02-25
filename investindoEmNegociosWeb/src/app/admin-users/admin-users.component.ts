import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUsersService, AdminUserFeatureAccess, AdminUserSummary } from '../admin-users.service';
import { UserRole } from '../roles';
import { forkJoin, of } from 'rxjs';
import { UiFeedbackService } from '../ui-feedback.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

type AdminUserRow = AdminUserSummary & {
  pendingRole: UserRole;
  pendingActive: boolean;
  dirty: boolean;
};

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: AdminUserRow[] = [];
  loading = false;
  savingId: string | null = null;
  deletingId: string | null = null;
  confirmOpen = false;
  confirmTitle = 'Confirmar ação';
  confirmMessage = '';
  confirmLabel = 'Confirmar';
  confirmVariant: 'warning' | 'danger' | 'primary' = 'warning';
  featuresOpenForUserId: string | null = null;
  featuresLoadingForUserId: string | null = null;
  featureSavingKey: string | null = null;
  readonly featureModeOptions: Array<'inherit' | 'enabled' | 'disabled'> = ['inherit', 'enabled', 'disabled'];
  private featuresByUserId: Record<string, AdminUserFeatureAccess[]> = {};
  private pendingAction: { kind: 'toggle'; user: AdminUserRow; nextActive: boolean } | { kind: 'delete'; user: AdminUserRow } | null = null;

  roles: UserRole[] = ['Basic', 'Intermediate', 'Advanced', 'Admin'];

  constructor(
    private adminUsers: AdminUsersService,
    private uiFeedback: UiFeedbackService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.adminUsers.list().subscribe({
      next: (users) => {
        this.users = users.map((user) => ({
          ...user,
          pendingRole: user.role,
          pendingActive: user.isActive,
          dirty: false
        }));
      },
      error: () => {
        this.uiFeedback.error('Não foi possível carregar os usuários.');
        this.loading = false;
      },
      complete: () => (this.loading = false)
    });
  }

  updateRole(user: AdminUserRow, role: UserRole): void {
    if (this.savingId) return;
    user.pendingRole = role;
    this.syncDirty(user);
  }

  toggleStatus(user: AdminUserRow): void {
    if (this.savingId || this.deletingId) return;
    const next = !user.pendingActive;
    const label = next ? 'desbloquear' : 'bloquear';
    this.openConfirm({
      title: next ? 'Desbloquear usuário' : 'Bloquear usuário',
      message: `Tem certeza que deseja ${label} este usuário?`,
      confirmLabel: next ? 'Desbloquear' : 'Bloquear',
      variant: 'warning'
    }, { kind: 'toggle', user, nextActive: next });
  }

  saveChanges(user: AdminUserRow): void {
    if (this.savingId || this.deletingId) return;
    if (!user.dirty) return;

    const requests = [];
    if (user.pendingRole !== user.role) {
      requests.push(this.adminUsers.updateRole(user.id, user.pendingRole));
    }
    if (user.pendingActive !== user.isActive) {
      requests.push(this.adminUsers.updateStatus(user.id, user.pendingActive));
    }

    if (!requests.length) {
      user.dirty = false;
      return;
    }

    this.savingId = user.id;

    forkJoin(requests.length ? requests : [of(user)]).subscribe({
      next: (responses) => {
        const last = responses[responses.length - 1] as AdminUserSummary;
        user.role = user.pendingRole = last.role;
        user.isActive = user.pendingActive = last.isActive;
        user.dirty = false;
        this.uiFeedback.success('Alterações salvas com sucesso.');
      },
      error: (err) => {
        this.uiFeedback.error(err?.error?.detail || 'Não foi possível salvar as alterações.');
      },
      complete: () => {
        this.savingId = null;
      }
    });
  }

  removeUser(user: AdminUserRow): void {
    if (this.deletingId || this.savingId) return;
    this.openConfirm({
      title: 'Excluir usuário',
      message: 'Tem certeza que deseja excluir este usuário? Esta ação é irreversível.',
      confirmLabel: 'Excluir',
      variant: 'danger'
    }, { kind: 'delete', user });
  }

  toggleFeatures(user: AdminUserRow): void {
    if (this.featuresLoadingForUserId || this.savingId || this.deletingId) return;
    if (this.featuresOpenForUserId === user.id) {
      this.featuresOpenForUserId = null;
      return;
    }

    this.featuresOpenForUserId = user.id;
    if (this.featuresByUserId[user.id]?.length) return;

    this.featuresLoadingForUserId = user.id;
    this.adminUsers.listFeatures(user.id).subscribe({
      next: (features) => {
        this.featuresByUserId[user.id] = features;
      },
      error: (err) => {
        this.uiFeedback.error(err?.error?.detail || 'Não foi possível carregar as permissões por feature.');
      },
      complete: () => {
        this.featuresLoadingForUserId = null;
      }
    });
  }

  getFeatures(userId: string): AdminUserFeatureAccess[] {
    return this.featuresByUserId[userId] || [];
  }

  getFeatureMode(feature: AdminUserFeatureAccess): 'inherit' | 'enabled' | 'disabled' {
    if (feature.overrideEnabled === true) return 'enabled';
    if (feature.overrideEnabled === false) return 'disabled';
    return 'inherit';
  }

  onFeatureModeChange(user: AdminUserRow, feature: AdminUserFeatureAccess, mode: 'inherit' | 'enabled' | 'disabled'): void {
    if (this.featureSavingKey || this.featuresLoadingForUserId) return;
    this.featureSavingKey = `${user.id}:${feature.featureKey}`;

    const request$ = mode === 'inherit'
      ? this.adminUsers.clearFeatureOverride(user.id, feature.featureKey)
      : this.adminUsers.setFeatureOverride(user.id, feature.featureKey, mode === 'enabled');

    request$.subscribe({
      next: (features) => {
        this.featuresByUserId[user.id] = features;
      },
      error: (err) => {
        this.uiFeedback.error(err?.error?.detail || 'Não foi possível atualizar o override da feature.');
      },
      complete: () => {
        this.featureSavingKey = null;
      }
    });
  }

  isFeatureBusy(userId: string, featureKey: string): boolean {
    return this.featureSavingKey === `${userId}:${featureKey}`;
  }

  featureLabel(featureKey: string): string {
    switch (featureKey) {
      case 'investments.access':
        return 'Investimentos';
      case 'cards.access':
        return 'Cartões';
      case 'accounts.access':
        return 'Contas';
      case 'categories.access':
        return 'Categorias';
      case 'invoice-import.access':
        return 'Importação de fatura';
      case 'admin.users.manage':
        return 'Admin · Usuários';
      case 'admin.parameters.manage':
        return 'Admin · Parâmetros';
      case 'admin.robots.manage':
        return 'Admin · Robôs';
      case 'admin.categories.manage':
        return 'Admin · Categorias';
      default:
        return featureKey;
    }
  }

  modeLabel(mode: 'inherit' | 'enabled' | 'disabled'): string {
    if (mode === 'enabled') return 'Habilitar';
    if (mode === 'disabled') return 'Bloquear';
    return 'Padrão';
  }

  confirmAction(): void {
    if (!this.pendingAction) {
      this.confirmOpen = false;
      return;
    }
    const action = this.pendingAction;
    this.confirmOpen = false;
    this.pendingAction = null;
    if (action.kind === 'toggle') {
      this.applyToggleStatus(action.user, action.nextActive);
      return;
    }
    if (action.kind === 'delete') {
      this.applyDeleteUser(action.user);
    }
  }

  cancelConfirm(): void {
    this.confirmOpen = false;
    this.pendingAction = null;
  }

  private applyToggleStatus(user: AdminUserRow, next: boolean): void {
    user.pendingActive = next;
    this.syncDirty(user);
  }

  private applyDeleteUser(user: AdminUserRow): void {
    this.deletingId = user.id;
    this.adminUsers.remove(user.id).subscribe({
      next: () => {
        this.users = this.users.filter((u) => u.id !== user.id);
        this.uiFeedback.success('Usuário removido com sucesso.');
      },
      error: (err) => {
        this.uiFeedback.error(err?.error?.detail || 'Não foi possível excluir o usuário.');
      },
      complete: () => {
        this.deletingId = null;
      }
    });
  }

  private openConfirm(
    data: { title: string; message: string; confirmLabel?: string; variant?: 'warning' | 'danger' | 'primary' },
    pending: { kind: 'toggle'; user: AdminUserRow; nextActive: boolean } | { kind: 'delete'; user: AdminUserRow }
  ): void {
    this.confirmTitle = data.title;
    this.confirmMessage = data.message;
    this.confirmLabel = data.confirmLabel || 'Confirmar';
    this.confirmVariant = data.variant || 'warning';
    this.pendingAction = pending;
    this.confirmOpen = true;
  }

  private syncDirty(user: AdminUserRow): void {
    user.dirty = user.pendingRole !== user.role || user.pendingActive !== user.isActive;
  }
  trackByIndex(index: number): number {
    return index;
  }

  trackByUser(_: number, user: AdminUserRow): string {
    return user.id;
  }

  trackByFeature(_: number, feature: AdminUserFeatureAccess): string {
    return feature.featureKey;
  }

}
