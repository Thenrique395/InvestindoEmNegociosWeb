import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUsersService, AdminUserSummary } from '../admin-users.service';
import { UserRole } from '../roles';
import { forkJoin, of } from 'rxjs';

type AdminUserRow = AdminUserSummary & {
  pendingRole: UserRole;
  pendingActive: boolean;
  dirty: boolean;
};

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: AdminUserRow[] = [];
  loading = false;
  error = '';
  savingId: string | null = null;
  deletingId: string | null = null;

  roles: UserRole[] = ['Basic', 'Intermediate', 'Advanced', 'Admin'];

  constructor(private adminUsers: AdminUsersService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.adminUsers.list().subscribe({
      next: (users) => {
        this.users = users.map((user) => ({
          ...user,
          pendingRole: user.role,
          pendingActive: user.isActive,
          dirty: false
        }));
      },
      error: () => (this.error = 'Não foi possível carregar os usuários.'),
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
    if (!window.confirm(`Tem certeza que deseja ${label} este usuário?`)) return;
    user.pendingActive = next;
    this.syncDirty(user);
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
    this.error = '';

    forkJoin(requests.length ? requests : [of(user)]).subscribe({
      next: (responses) => {
        const last = responses[responses.length - 1] as AdminUserSummary;
        user.role = user.pendingRole = last.role;
        user.isActive = user.pendingActive = last.isActive;
        user.dirty = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Não foi possível salvar as alterações.';
      },
      complete: () => {
        this.savingId = null;
      }
    });
  }

  removeUser(user: AdminUserRow): void {
    if (this.deletingId || this.savingId) return;
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação é irreversível.')) return;

    this.deletingId = user.id;
    this.error = '';
    this.adminUsers.remove(user.id).subscribe({
      next: () => {
        this.users = this.users.filter((u) => u.id !== user.id);
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Não foi possível excluir o usuário.';
      },
      complete: () => {
        this.deletingId = null;
      }
    });
  }

  private syncDirty(user: AdminUserRow): void {
    user.dirty = user.pendingRole !== user.role || user.pendingActive !== user.isActive;
  }
}
