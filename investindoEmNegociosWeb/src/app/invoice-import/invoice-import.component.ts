import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { InvoiceImportService, InvoiceReconciliationResponse } from '../invoice-import.service';
import { FormsModule } from '@angular/forms';
import { StoredCard } from '../data/api-data.service';
import { CategoryDto } from '../categories.service';

type InvoiceItem = {
  date?: string;
  description: string;
  amount?: string;
  isInstallment?: boolean;
  installmentCurrent?: number;
  installmentTotal?: number;
  baseDescription?: string;
  categoryId?: string | null;
  suggestedCategoryId?: string | null;
  suggestedCategoryName?: string | null;
  suggestedCategoryConfidence?: number | null;
  suggestedCategoryScore?: number | null;
  suggestedCategoryConfidenceBand?: string | null;
  suggestedCategoryReasonCode?: string | null;
  suggestedRecurrence?: {
    isRecurringCandidate?: boolean;
    frequency?: string | null;
    score?: number | null;
    confidenceBand?: string | null;
    reasonCode?: string | null;
    evidenceLabel?: string | null;
  } | null;
};

type InvoiceExtract = {
  total?: string;
  dueDate?: string;
  closeDate?: string;
  cardName?: string;
  bankName?: string;
  totalDebitsBrazil?: string;
  currentBalance?: string;
  items: InvoiceItem[];
};

@Component({
  selector: 'app-invoice-import',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule],
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
              <label class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Cartão destino</p>
                <select class="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-[var(--text-sm)] text-[var(--text)]" [(ngModel)]="selectedCardId" (ngModelChange)="onCardChanged()">
                  <option [ngValue]="null">Selecione</option>
                  <option *ngFor="let card of cards; trackBy: trackByCardId" [ngValue]="card.id">
                    {{ card.nome }} · {{ card.numero }}
                  </option>
                </select>
              </label>
              <label class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <p class="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Categoria padrão</p>
                <select class="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-[var(--text-sm)] text-[var(--text)]" [(ngModel)]="selectedCategoryId">
                  <option [ngValue]="null">Sem categoria</option>
                  <option *ngFor="let category of categories; trackBy: trackByCategoryId" [ngValue]="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </label>
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
                      <th class="px-3 py-2">Parcela</th>
                      <th class="px-3 py-2">Categoria</th>
                      <th class="px-3 py-2">Recorrência</th>
                      <th class="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngIf="!extract.items.length">
                      <td class="px-3 py-3" colspan="6">Nenhum item identificado.</td>
                    </tr>
                    <tr *ngFor="let item of extract.items; trackBy: trackByIndex">
                      <td class="px-3 py-2">{{ item.date || '-' }}</td>
                      <td class="px-3 py-2">{{ item.baseDescription || item.description }}</td>
                      <td class="px-3 py-2">
                        <span *ngIf="item.isInstallment && item.installmentCurrent && item.installmentTotal; else noInstallment">
                          {{ item.installmentCurrent }}/{{ item.installmentTotal }}
                        </span>
                        <ng-template #noInstallment>-</ng-template>
                      </td>
                      <td class="px-3 py-2">
                        <select
                          class="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)]"
                          [(ngModel)]="item.categoryId">
                          <option [ngValue]="null">Sem categoria</option>
                          <option *ngFor="let category of categories; trackBy: trackByCategoryId" [ngValue]="category.id">
                            {{ category.name }}
                          </option>
                        </select>
                        <small class="block pt-1 text-[10px] opacity-70" *ngIf="item.suggestedCategoryName">
                          Sugestão: {{ item.suggestedCategoryName }} · {{ confidenceLabel(item.suggestedCategoryScore, item.suggestedCategoryConfidenceBand, item.suggestedCategoryConfidence) }}
                        </small>
                      </td>
                      <td class="px-3 py-2">
                        <span *ngIf="item.suggestedRecurrence?.isRecurringCandidate; else noRecurrence">
                          {{ recurrenceLabel(item.suggestedRecurrence?.frequency) }}
                          <small class="block text-[10px] opacity-70">
                            {{ recurrenceScoreLabel(item.suggestedRecurrence?.score, item.suggestedRecurrence?.confidenceBand) }}
                          </small>
                        </span>
                        <ng-template #noRecurrence>-</ng-template>
                      </td>
                      <td class="px-3 py-2 text-right">{{ item.amount || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="mt-2 text-[11px] text-[var(--text-muted)]">
                Dica: se algum valor nao for encontrado, voce pode ajustar manualmente antes de salvar.
              </p>
            </div>

            <div class="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" *ngIf="extract.items.length">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-[var(--text)]">Conciliação da fatura</p>
                  <p class="text-xs text-[var(--text-muted)]">Compara itens novos com ciclos já existentes do cartão.</p>
                </div>
                <span class="text-xs text-[var(--text-muted)]" *ngIf="reconciling">Recalculando...</span>
              </div>

              <p *ngIf="reconciliation && !reconciling" class="mt-3 text-xs text-[var(--text-muted)]">
                {{ reconciliation.newItems }} novo(s), {{ reconciliation.duplicateItems }} duplicado(s), {{ reconciliation.cycles.length }} ciclo(s) afetado(s).
              </p>

              <div *ngIf="reconciliation?.cycles?.length; else noReconciliationCycles" class="mt-3 overflow-auto rounded-xl border border-[var(--border)]">
                <table class="w-full text-left text-xs text-[var(--text-muted)]">
                  <thead class="bg-[var(--surface-2)] text-[var(--text)]">
                    <tr>
                      <th class="px-3 py-2">Fatura</th>
                      <th class="px-3 py-2">Fech.</th>
                      <th class="px-3 py-2">Venc.</th>
                      <th class="px-3 py-2 text-right">Atual</th>
                      <th class="px-3 py-2 text-right">Novos</th>
                      <th class="px-3 py-2 text-right">Duplicados</th>
                      <th class="px-3 py-2 text-right">Projetado</th>
                      <th class="px-3 py-2 text-right">Diferença</th>
                      <th class="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let cycle of reconciliation?.cycles || []; trackBy: trackByStatementReference">
                      <td class="px-3 py-2">{{ cycle.statementReference }}</td>
                      <td class="px-3 py-2">{{ cycle.statementCloseDate }}</td>
                      <td class="px-3 py-2">{{ cycle.statementDueDate }}</td>
                      <td class="px-3 py-2 text-right">{{ formatMoney(cycle.currentTotalAmount) }}</td>
                      <td class="px-3 py-2 text-right">{{ formatMoney(cycle.importedNewAmount) }}</td>
                      <td class="px-3 py-2 text-right">{{ formatMoney(cycle.duplicateAmount) }}</td>
                      <td class="px-3 py-2 text-right">{{ formatMoney(cycle.projectedTotalAmount) }}</td>
                      <td class="px-3 py-2 text-right">{{ cycle.differenceAmount == null ? '-' : formatMoney(cycle.differenceAmount) }}</td>
                      <td class="px-3 py-2">
                        <span *ngIf="cycle.readyToClose; else cycleOpen">Pronto para fechamento automático</span>
                        <ng-template #cycleOpen>{{ cycle.duplicateItemsCount ? 'Revisar duplicados' : 'Conciliação parcial' }}</ng-template>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <ng-template #noReconciliationCycles>
                <p class="mt-3 text-xs text-[var(--text-muted)]">
                  {{ reconciling ? 'Calculando conciliação...' : 'Selecione um cartão e mantenha itens válidos para ver o fechamento por ciclo.' }}
                </p>
              </ng-template>
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
          <button type="button" class="btn-primary" (click)="salvarImportacao()" [disabled]="!canImport || importing">
            {{ importing ? 'Importando...' : 'Salvar fatura' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class InvoiceImportComponent implements OnChanges {
  @Input() open = false;
  @Input() cards: StoredCard[] = [];
  @Input() categories: CategoryDto[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<{ created: number; skipped: number; failed: number }>();

  loading = false;
  importing = false;
  reconciling = false;
  error = '';
  fileName = '';
  selectedCardId: string | null = null;
  selectedCategoryId: string | null = null;
  rawText = '';
  extract: InvoiceExtract = { items: [] };
  reconciliation: InvoiceReconciliationResponse | null = null;

  private invoiceImport = inject(InvoiceImportService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cards'] && !this.selectedCardId && this.cards.length) {
      this.selectedCardId = this.cards[0].id;
    }
  }

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
        const displayTotal = this.resolveDisplayTotal(response.total, response.totalDebitsBrazil);
        this.extract = {
          total: displayTotal,
          dueDate: response.dueDate,
          closeDate: response.closeDate,
          cardName: response.cardName,
          bankName: response.bankName,
          totalDebitsBrazil: response.totalDebitsBrazil,
          currentBalance: response.currentBalance,
          items: (response.items || []).map((item) => ({
            ...item,
            categoryId: item.suggestedCategoryId ?? null
          }))
        };
        this.rawText = response.rawText || '';
        this.refreshReconciliation();
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
    this.importing = false;
    this.extract = { items: [] };
    this.reconciling = false;
    this.reconciliation = null;
  }

  get canImport(): boolean {
    return !!this.fileName && this.extract.items.length > 0 && !!this.selectedCardId;
  }

  salvarImportacao(): void {
    if (!this.canImport || this.importing) return;
    this.error = '';
    this.importing = true;
    this.invoiceImport
      .import({
        cardId: this.selectedCardId,
        categoryId: this.selectedCategoryId,
        defaultDueDate: this.extract.dueDate || null,
        statementCloseDate: this.extract.closeDate || null,
        invoiceTotal: this.extract.total || null,
        importIdempotencyKey: this.buildImportIdempotencyKey(),
        skipDuplicates: true,
        items: this.extract.items.map((item) => ({
          ...item,
          categoryId: item.categoryId || this.selectedCategoryId || item.suggestedCategoryId || null
        }))
      })
      .subscribe({
        next: (result) => {
          this.imported.emit(result);
          this.clear();
          this.close.emit();
        },
        error: (err) => {
          this.error = err?.error?.detail || err?.error?.title || 'Falha ao salvar a fatura.';
        },
        complete: () => {
          this.importing = false;
        }
      });
  }

  private buildImportIdempotencyKey(): string {
    const normalizedItems = this.extract.items
      .map((item) => `${(item.baseDescription || item.description || '').trim().toUpperCase()}|${item.amount || ''}|${item.date || ''}`)
      .sort();
    return [
      this.selectedCardId || 'NO_CARD',
      this.selectedCategoryId || 'NO_CATEGORY',
      this.extract.dueDate || 'NO_DUE_DATE',
      ...normalizedItems
    ].join('::');
  }

  private resolveDisplayTotal(total?: string, totalDebitsBrazil?: string): string | undefined {
    if (!this.isZeroMoney(total)) return total;
    if (!this.isZeroMoney(totalDebitsBrazil)) return totalDebitsBrazil;
    return total;
  }

  private isZeroMoney(value?: string): boolean {
    if (!value) return true;
    const numeric = value
      .replace(/[^\d,-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = Number.parseFloat(numeric);
    return Number.isFinite(parsed) ? parsed === 0 : true;
  }

  trackByIndex(index: number): number {
    return index;
  }

  confidenceLabel(score?: number | null, band?: string | null, value?: number | null): string {
    const resolvedScore = score ?? (value == null ? null : Math.round(value * 100));
    const resolvedBand = band || (resolvedScore == null
      ? null
      : resolvedScore >= 95
        ? 'high'
        : resolvedScore >= 85
          ? 'medium'
          : 'low');
    if (resolvedScore == null) return '';
    if (resolvedBand === 'high') return `Alta (${resolvedScore}/100)`;
    if (resolvedBand === 'medium') return `Boa (${resolvedScore}/100)`;
    return `Inicial (${resolvedScore}/100)`;
  }

  recurrenceLabel(frequency?: string | null): string {
    if (!frequency) return 'Recorrente';
    if (frequency === 'Monthly') return 'Recorrente mensal';
    return `Recorrente ${frequency.toLowerCase()}`;
  }

  recurrenceScoreLabel(score?: number | null, band?: string | null): string {
    if (score == null) return '';
    if (band === 'high') return `Alta (${score}/100)`;
    if (band === 'medium') return `Boa (${score}/100)`;
    return `Inicial (${score}/100)`;
  }

  trackByCardId(_index: number, card: StoredCard): string {
    return card.id;
  }

  trackByCategoryId(_index: number, category: CategoryDto): string {
    return category.id;
  }

  trackByStatementReference(_index: number, cycle: { statementReference: string }): string {
    return cycle.statementReference;
  }

  onCardChanged(): void {
    this.refreshReconciliation();
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  private refreshReconciliation(): void {
    if (!this.selectedCardId || !this.extract.items.length) {
      this.reconciliation = null;
      this.reconciling = false;
      return;
    }

    this.reconciling = true;
    this.invoiceImport.reconcile({
      cardId: this.selectedCardId,
      categoryId: this.selectedCategoryId,
      defaultDueDate: this.extract.dueDate || null,
      statementCloseDate: this.extract.closeDate || null,
      invoiceTotal: this.extract.total || null,
      importIdempotencyKey: this.buildImportIdempotencyKey(),
      skipDuplicates: true,
      items: this.extract.items.map((item) => ({
        ...item,
        categoryId: item.categoryId || this.selectedCategoryId || item.suggestedCategoryId || null
      }))
    }).subscribe({
      next: (result) => {
        this.reconciliation = result;
      },
      error: () => {
        this.reconciliation = null;
      },
      complete: () => {
        this.reconciling = false;
      }
    });
  }
}
