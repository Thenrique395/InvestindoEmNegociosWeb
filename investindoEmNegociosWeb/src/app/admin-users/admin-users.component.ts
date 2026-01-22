import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUsersService, AdminUserSummary } from '../admin-users.service';
import { UserRole } from '../roles';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: AdminUserSummary[] = [];
  loading = false;
  error = '';
  savingId: string | null = null;

  roles: UserRole[] = ['Basic', 'Intermediate', 'Advanced', 'Admin'];

  constructor(private adminUsers: AdminUsersService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.adminUsers.list().subscribe({
      next: (users) => (this.users = users),
      error: () => (this.error = 'Não foi possível carregar os usuários.'),
      complete: () => (this.loading = false)
    });
  }

  updateRole(user: AdminUserSummary, role: UserRole): void {
    if (this.savingId) return;
    if (user.role === role) return;

    const previous = user.role;
    user.role = role;
    this.savingId = user.id;
    this.error = '';

    this.adminUsers.updateRole(user.id, role).subscribe({
      next: (updated) => {
        user.role = updated.role;
        user.isActive = updated.isActive;
      },
      error: () => {
        user.role = previous;
        this.error = 'Não foi possível atualizar a permissão.';
      },
      complete: () => {
        this.savingId = null;
      }
    });
  }
}
