import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { InvoiceImportService } from '../invoice-import.service';

type InvoiceItem = {
  date?: string;
  description: string;
  amount?: string;
};

type InvoiceExtract = {
  total?: string;
  dueDate?: string;
  closeDate?: string;
  cardName?: string;
  bankName?: string;
  items: InvoiceItem[];
};

@Component({
  selector: 'app-invoice-import',
  standalone: true,
  imports: [NgIf, NgFor],
  providers: [InvoiceImportService],
  template: `
    <div *ngIf="open" class="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" (click)="close.emit()"></div>
      <div class="relative w-full max-w-[980px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)]">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="eyebrow">Fatura do cartao</p>
            <h2 class="text-[var(--text-xl)]">Importar fatura (PDF)</h2>
            <p class="muted text-sm">Os dados sao extraidos no servidor para validacao antes de salvar.</p>
          </div>
          <button type="button" class="btn-ghost sm" (click)="close.emit()">Fechar</button>
        </div>

        <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_280px]">
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-[var(--text)]">Selecionar PDF</p>
                <p class="text-xs text-[var(--text-muted)]">
                  Envie a fatura em PDF para extrair total, datas e itens.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <label class="btn-primary sm cursor-pointer">
                  <input type="file" accept="application/pdf" class="hidden" (change)="onFileSelected($event)" />
                  Escolher arquivo
                </label>
                <button type="button" class="btn-ghost sm" (click)="clear()" [disabled]="loading">Limpar</button>
              </div>
            </div>

            <div class="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              <p class="font-semibold text-[var(--text)]">{{ fileName || 'Nenhum arquivo selecionado' }}</p>
              <p *ngIf="loading">Enviando e processando o PDF...</p>
              <p *ngIf="error" class="text-[var(--danger)]">{{ error }}</p>
              <p *ngIf="!loading && !error">Formatos suportados: PDF</p>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Total</p>
                <p class="text-[var(--text-lg)] font-semibold text-[var(--text)]">{{ extract.total || 'Nao identificado' }}</p>
              </div>
              <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Vencimento</p>
                <p class="text-[var(--text-lg)] font-semibold text-[var(--text)]">{{ extract.dueDate || 'Nao identificado' }}</p>
              </div>
              <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Fechamento</p>
                <p class="text-[var(--text-lg)] font-semibold text-[var(--text)]">{{ extract.closeDate || 'Nao identificado' }}</p>
              </div>
              <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Cartao / Banco</p>
                <p class="text-[var(--text-sm)] font-semibold text-[var(--text)]">
                  {{ extract.cardName || 'Cartao' }} · {{ extract.bankName || 'Banco' }}
                </p>
              </div>
            </div>

            <div class="mt-4">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-[var(--text)]">Itens encontrados</p>
                <span class="text-xs text-[var(--text-muted)]">{{ extract.items.length }} item(s)</span>
              </div>
              <div class="mt-2 max-h-[260px] overflow-auto rounded-xl border border-[var(--border)]">
                <table class="w-full text-left text-xs text-[var(--text-muted)]">
                  <thead class="sticky top-0 bg-[var(--surface-2)] text-[var(--text)]">
                    <tr>
                      <th class="px-3 py-2">Data</th>
                      <th class="px-3 py-2">Descricao</th>
                      <th class="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngIf="!extract.items.length">
                      <td class="px-3 py-3" colspan="3">Nenhum item identificado.</td>
                    </tr>
                    <tr *ngFor="let item of extract.items">
                      <td class="px-3 py-2">{{ item.date || '-' }}</td>
                      <td class="px-3 py-2">{{ item.description }}</td>
                      <td class="px-3 py-2 text-right">{{ item.amount || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="mt-2 text-[11px] text-[var(--text-muted)]">
                Dica: se algum valor nao for encontrado, voce pode ajustar manualmente antes de salvar.
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p class="text-sm font-semibold text-[var(--text)]">Texto extraido</p>
            <p class="text-xs text-[var(--text-muted)]">Use para validar se os dados batem com a fatura.</p>
            <div class="mt-3 max-h-[420px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[11px] text-[var(--text)]">
              <pre class="whitespace-pre-wrap">{{ rawText || 'Nenhum texto extraido.' }}</pre>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button type="button" class="btn-cancel" (click)="close.emit()">Fechar</button>
          <button type="button" class="btn-primary" [disabled]="!fileName">Salvar fatura (proximo passo)</button>
        </div>
      </div>
    </div>
  `
})
export class InvoiceImportComponent {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  loading = false;
  error = '';
  fileName = '';
  rawText = '';
  extract: InvoiceExtract = { items: [] };

  private invoiceImport = inject(InvoiceImportService);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const maxSize = 15 * 1024 * 1024;
    const isPdfType = file.type === 'application/pdf';
    const isPdfName = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfType && !isPdfName) {
      this.error = 'Formato nao suportado. Use um PDF.';
      input.value = '';
      return;
    }
    if (file.size > maxSize) {
      this.error = 'Arquivo muito grande. Limite de 15MB.';
      input.value = '';
      return;
    }
    this.fileName = file.name;
    this.error = '';
    this.loading = true;
    this.rawText = '';
    this.extract = { items: [] };

    this.invoiceImport.extract(file).subscribe({
      next: (response) => {
        this.extract = {
          total: response.total,
          dueDate: response.dueDate,
          closeDate: response.closeDate,
          cardName: response.cardName,
          bankName: response.bankName,
          items: response.items || []
        };
        this.rawText = response.rawText || '';
      },
      error: (err) => {
        this.error = err?.error?.detail || err?.error?.title || 'Nao foi possivel ler o PDF.';
      },
      complete: () => {
        this.loading = false;
        input.value = '';
      }
    });
  }

  clear(): void {
    this.fileName = '';
    this.rawText = '';
    this.error = '';
    this.extract = { items: [] };
  }

}
