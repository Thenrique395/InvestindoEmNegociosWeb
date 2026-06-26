import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ProfileService, SecuritySummary } from '../profile.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { extractApiErrorMessage } from '../utils/api-error.utils';

@Component({
  selector: 'app-user-security',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-security.component.html',
  styleUrls: ['./user-security.component.scss']
})
export class UserSecurityComponent {
  summary: SecuritySummary | null = null;
  loading = true;
  revoking = false;

  constructor(
    private readonly profileService: ProfileService,
    private readonly uiFeedback: UiFeedbackService
  ) {
    this.load();
  }

  revokeSessions(): void {
    if (this.revoking) return;
    this.revoking = true;
    this.profileService.revokeOwnSessions().subscribe({
      next: (response) => {
        this.uiFeedback.success(`${response.revokedSessions} sessão(ões) revogada(s).`);
        this.load();
      },
      error: (err) => {
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao revogar sessões.'));
        this.revoking = false;
      },
      complete: () => {
        this.revoking = false;
      }
    });
  }

  private load(): void {
    this.loading = true;
    this.profileService.getSecuritySummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.loading = false;
      },
      error: () => {
        this.summary = null;
        this.loading = false;
      }
    });
  }
}
