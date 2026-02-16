import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataPortabilityService } from '../data-portability.service';
import { UiFeedbackService } from '../ui-feedback.service';

@Component({
  selector: 'app-user-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-data.component.html',
  styleUrls: ['./user-data.component.scss']
})
export class UserDataComponent {
  exporting = false;
  importing = false;
  replaceExisting = true;
  selectedFile: File | null = null;
  lastExportAt: Date | null = null;
  lastImportAt: Date | null = null;

  constructor(
    private readonly portabilityService: DataPortabilityService,
    private readonly uiFeedback: UiFeedbackService
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.item(0) ?? null;
  }

  clearFile(input: HTMLInputElement): void {
    input.value = '';
    this.selectedFile = null;
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
        this.uiFeedback.error(this.resolveError(err, 'Falha ao exportar dados.'));
        this.exporting = false;
      },
      complete: () => {
        this.exporting = false;
      }
    });
  }

  importData(input: HTMLInputElement): void {
    if (this.importing || !this.selectedFile) return;
    const confirmText = this.replaceExisting
      ? 'Isso vai substituir os dados atuais pelo arquivo selecionado. Deseja continuar?'
      : 'Isso vai adicionar dados do arquivo sem apagar os atuais. Deseja continuar?';
    if (!window.confirm(confirmText)) return;

    this.importing = true;
    this.portabilityService.importData(this.selectedFile, this.replaceExisting).subscribe({
      next: (result) => {
        this.lastImportAt = new Date();
        this.uiFeedback.success(`Importação concluída. ${result.importedRecords} registro(s) processado(s).`);
        this.clearFile(input);
      },
      error: (err: HttpErrorResponse) => {
        this.uiFeedback.error(this.resolveError(err, 'Falha ao importar dados.'));
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

  private resolveError(err: HttpErrorResponse, fallback: string): string {
    const apiDetail = err?.error?.detail as string | undefined;
    const apiTitle = err?.error?.title as string | undefined;
    return apiDetail || apiTitle || fallback;
  }
}
