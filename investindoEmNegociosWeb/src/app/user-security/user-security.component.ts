import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ProfileService, SecuritySummary } from '../profile.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { SectionCardComponent } from '../shared/section-card/section-card.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { UiStateComponent } from '../ui-state/ui-state.component';

@Component({
  selector: 'app-user-security',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent, PageHeaderComponent, SectionCardComponent, TransactionSummaryCardComponent, UiStateComponent],
  templateUrl: './user-security.component.html',
  styleUrls: ['./user-security.component.scss']
})
export class UserSecurityComponent {
  summary: SecuritySummary | null = null;
  loading = true;
  revoking = false;
  confirmRevokeOpen = false;

  constructor(
    private readonly profileService: ProfileService,
    private readonly uiFeedback: UiFeedbackService
  ) {
    this.load();
  }

  revokeSessions(): void {
    this.confirmRevokeOpen = true;
  }

  performRevokeSessions(): void {
    this.confirmRevokeOpen = false;
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
