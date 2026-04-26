import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SectionCardComponent } from '../../../../shared/section-card/section-card.component';
import { CsvExtractResponse, OfxExtractResponse, OfxTransactionPreview } from '../../../accounts/data-access/accounts.service';

type AiConfidenceTone = 'success' | 'warning' | 'muted';

@Component({
  selector: 'app-account-import',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionCardComponent],
  templateUrl: './account-import.component.html'
})
export class AccountImportComponent {
  @Input() ofxFileName = '';
  @Input() extractingOfx = false;
  @Input() importingOfx = false;
  @Input() ofxExtract: OfxExtractResponse = { items: [], rawText: '' };
  @Input() duplicateCount = 0;

  @Input() extractingCsv = false;
  @Input() importingCsv = false;
  @Input() csvExtract: CsvExtractResponse = { delimiter: ';', detectedColumns: [], items: [], rawText: '' };
  @Input() csvSkipDuplicates = true;

  @Output() ofxSelected = new EventEmitter<Event>();
  @Output() csvSelected = new EventEmitter<Event>();
  @Output() clearOfx = new EventEmitter<void>();
  @Output() clearCsv = new EventEmitter<void>();
  @Output() csvSkipDuplicatesChange = new EventEmitter<boolean>();

  get ofxAiSuggestedCount(): number {
    return this.ofxExtract.items.filter((item) => !!item.suggestedCategory?.categoryName || !!item.categoryId).length;
  }

  get csvAiSuggestedCount(): number {
    return this.csvExtract.items.filter((item) => !!item.suggestedCategory?.categoryName || !!item.categoryId).length;
  }

  get hasOfxPreview(): boolean {
    return this.ofxExtract.items.length > 0;
  }

  get hasCsvPreview(): boolean {
    return this.csvExtract.items.length > 0;
  }

  onCsvSkipDuplicatesChange(value: boolean): void {
    this.csvSkipDuplicates = value;
    this.csvSkipDuplicatesChange.emit(value);
  }

  categorySuggestionLabel(item: OfxTransactionPreview): string {
    return item.suggestedCategory?.categoryName || (item.categoryId ? 'Categoria sugerida aplicada' : 'Sem sugestão');
  }

  confidenceLabel(item: OfxTransactionPreview): string {
    const score = item.suggestedCategory?.score ?? item.suggestedCategory?.confidence;
    const normalized = score == null ? null : score <= 1 ? Math.round(score * 100) : Math.round(score);

    if (normalized == null) return 'Sem confiança';
    if (normalized >= 90) return `Alta (${normalized}/100)`;
    if (normalized >= 70) return `Média (${normalized}/100)`;
    return `Baixa (${normalized}/100)`;
  }

  confidenceTone(item: OfxTransactionPreview): AiConfidenceTone {
    const score = item.suggestedCategory?.score ?? item.suggestedCategory?.confidence;
    const normalized = score == null ? null : score <= 1 ? Math.round(score * 100) : Math.round(score);

    if (normalized == null) return 'muted';
    if (normalized >= 90) return 'success';
    if (normalized >= 70) return 'warning';
    return 'muted';
  }

  recurrenceSuggestionLabel(item: OfxTransactionPreview): string {
    const recurrence = item.suggestedRecurrence;
    if (!recurrence?.isRecurringCandidate) return '-';
    return recurrence.frequency === 'Monthly' ? 'Recorrente mensal' : `Recorrente ${recurrence.frequency || ''}`.trim();
  }

  signedAmount(item: OfxTransactionPreview): string {
    const sign = item.kind === 'Credit' ? '+' : '-';
    return `${sign}R$ ${Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  trackPreviewItem(index: number, item: OfxTransactionPreview): string {
    return `${item.externalId || item.description}-${item.postedAt}-${index}`;
  }
}
