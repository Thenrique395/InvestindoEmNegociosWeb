import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { DataPortabilityService } from '../data-portability.service';
import { AuthService } from '../auth.service';
import { ProfileService, PrivacySummary } from '../profile.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { Router } from '@angular/router';
import { extractApiErrorMessage } from '../utils/api-error.utils';

@Component({
  selector: 'app-user-data',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './user-data.component.html',
  styleUrls: ['./user-data.component.scss']
})
export class UserDataComponent {
  exporting = false;
  importing = false;
  deletingAccount = false;
  replaceExisting = true;
  selectedFile: File | null = null;
  confirmImportOpen = false;
  confirmDeleteOpen = false;
  lastExportAt: Date | null = null;
  lastImportAt: Date | null = null;
  privacySummary: PrivacySummary | null = null;
  privacyLoading = true;
  deletePayload = {
    currentPassword: '',
    confirmationText: ''
  };

  get canImportData(): boolean {
    const role = this.authService.getRole();
    return role === 'Intermediate' || role === 'Advanced' || role === 'Admin';
  }

  constructor(
    private readonly portabilityService: DataPortabilityService,
    private readonly profileService: ProfileService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly uiFeedback: UiFeedbackService
  ) {
    this.loadPrivacySummary();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.item(0) ?? null;
  }

  clearFile(input: HTMLInputElement): void {
    input.value = '';
    this.selectedFile = null;
    this.confirmImportOpen = false;
  }

  exportData(): void {
    if (this.exporting) return;
    this.exporting = true;
    this.portabilityService.exportData().subscribe({
      next: (response) => {
        const fileName = this.resolveFileName(response.headers.get('content-disposition')) || 'investindo-export.json';
        const blob = response.body ?? new Blob([], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
        this.lastExportAt = new Date();
        this.uiFeedback.success('Exportação concluída.');
      },
      error: (err: HttpErrorResponse) => {
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao exportar dados.'));
        this.exporting = false;
      },
      complete: () => {
        this.exporting = false;
      }
    });
  }

  requestImport(): void {
    if (this.importing || !this.selectedFile) return;
    this.confirmImportOpen = true;
  }

  cancelImportRequest(): void {
    this.confirmImportOpen = false;
  }

  requestDeleteAccount(): void {
    if (this.deletingAccount) return;
    this.confirmDeleteOpen = true;
  }

  cancelDeleteRequest(): void {
    this.confirmDeleteOpen = false;
  }

  confirmDeleteAccount(): void {
    if (this.deletingAccount) return;
    this.deletingAccount = true;
    this.confirmDeleteOpen = false;

    this.profileService.deleteOwnAccount(this.deletePayload).subscribe({
      next: () => {
        this.authService.clearSession();
        this.uiFeedback.success('Conta excluída com sucesso.');
        this.router.navigateByUrl('/');
      },
      error: (err: HttpErrorResponse) => {
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao excluir conta.'));
        this.deletingAccount = false;
      },
      complete: () => {
        this.deletingAccount = false;
      }
    });
  }

  importData(input: HTMLInputElement): void {
    if (this.importing || !this.selectedFile) return;
    this.confirmImportOpen = false;

    this.importing = true;
    this.portabilityService.importData(this.selectedFile, this.replaceExisting).subscribe({
      next: (result) => {
        this.lastImportAt = new Date();
        this.uiFeedback.success(`Importação concluída. ${result.importedRecords} registro(s) processado(s).`);
        this.clearFile(input);
      },
      error: (err: HttpErrorResponse) => {
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao importar dados.'));
        this.importing = false;
      },
      complete: () => {
        this.importing = false;
      }
    });
  }

  private resolveFileName(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const simpleMatch = /filename="?([^\";]+)"?/i.exec(contentDisposition);
    return simpleMatch?.[1] ?? null;
  }

  private loadPrivacySummary(): void {
    this.privacyLoading = true;
    this.profileService.getPrivacySummary().subscribe({
      next: (summary) => {
        this.privacySummary = summary;
        this.privacyLoading = false;
      },
      error: () => {
        this.privacySummary = null;
        this.privacyLoading = false;
      }
    });
  }
}
