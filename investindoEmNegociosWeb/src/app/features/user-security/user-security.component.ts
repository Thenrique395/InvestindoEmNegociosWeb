import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ProfileService, SecuritySummary } from '../../core/profile.service';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { extractApiErrorMessage } from '../../core/utils/api-error.utils';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { SectionCardComponent } from '../../shared/section-card/section-card.component';
import { TransactionSummaryCardComponent } from '../../shared/transactions/transaction-summary-card.component';
import { UiStateComponent } from '../../shared/ui-state/ui-state.component';

@Component({
  selector: 'app-user-security',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ConfirmDialogComponent, PageHeaderComponent, SectionCardComponent, TransactionSummaryCardComponent, UiStateComponent],
  templateUrl: './user-security.component.html',
  styleUrls: ['./user-security.component.scss']
})
export class UserSecurityComponent {
  private readonly _summary = signal<SecuritySummary | null>(null);
  readonly summary = this._summary.asReadonly();
  private readonly _loading = signal(true);
  readonly loading = this._loading.asReadonly();
  private readonly _revoking = signal(false);
  readonly revoking = this._revoking.asReadonly();
  private readonly _confirmRevokeOpen = signal(false);
  readonly confirmRevokeOpen = this._confirmRevokeOpen.asReadonly();

  constructor(
    private readonly profileService: ProfileService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly destroyRef: DestroyRef
  ) {
    this.load();
  }

  revokeSessions(): void {
    this._confirmRevokeOpen.set(true);
  }

  cancelRevokeSessions(): void {
    this._confirmRevokeOpen.set(false);
  }

  performRevokeSessions(): void {
    this._confirmRevokeOpen.set(false);
    if (this.revoking()) return;
    this._revoking.set(true);
    this.profileService.revokeOwnSessions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.uiFeedback.success(`${response.revokedSessions} sessão(ões) revogada(s).`);
        this.load();
      },
      error: (err) => {
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao revogar sessões.'));
        this._revoking.set(false);
      },
      complete: () => {
        this._revoking.set(false);
      }
    });
  }

  private load(): void {
    this._loading.set(true);
    this.profileService.getSecuritySummary().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (summary) => {
        this._summary.set(summary);
        this._loading.set(false);
      },
      error: () => {
        this._summary.set(null);
        this._loading.set(false);
      }
    });
  }
}
