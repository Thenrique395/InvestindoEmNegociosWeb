import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SectionCardComponent } from '../../../../shared/section-card/section-card.component';
import { SelectMenuComponent, SelectMenuOption } from '../../../../shared/select-menu/select-menu.component';
import { CsvExtractResponse, OfxExtractResponse, OfxTransactionPreview } from '../../../../core/accounts.service';
import { CategoryDto } from '../../../../core/categories.service';

type AiConfidenceTone = 'success' | 'warning' | 'muted';
type ImportSource = 'OFX' | 'CSV';

export interface CategoryLearningCandidate {
  description: string;
  amount: number;
  kind: 'Credit' | 'Debit';
  previousCategoryId?: string | null;
  selectedCategoryId?: string | null;
  suggestedCategoryName?: string | null;
  confidence?: number | null;
  source: ImportSource;
}

@Component({
  selector: 'app-account-import',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SectionCardComponent, SelectMenuComponent],
  templateUrl: './account-import.component.html'
})
export class AccountImportComponent {
  readonly ofxFileName = input('');
  readonly extractingOfx = input(false);
  readonly importingOfx = input(false);
  readonly ofxExtract = input<OfxExtractResponse>({ items: [], rawText: '' });
  readonly duplicateCount = input(0);
  readonly categories = input<CategoryDto[]>([]);

  readonly extractingCsv = input(false);
  readonly importingCsv = input(false);
  readonly csvExtract = input<CsvExtractResponse>({ delimiter: ';', detectedColumns: [], items: [], rawText: '' });
  /** Par two-way: `model()` emite `csvSkipDuplicatesChange` sozinho no `.set()`. */
  readonly csvSkipDuplicates = model(true);

  readonly ofxSelected = output<Event>();
  readonly csvSelected = output<Event>();
  readonly clearOfx = output<void>();
  readonly clearCsv = output<void>();
  readonly importOfx = output<void>();
  readonly importCsv = output<void>();
  readonly categoryChanged = output<CategoryLearningCandidate>();

  readonly ofxAiSuggestedCount = computed(
    () => this.ofxExtract().items.filter((item) => !!item.suggestedCategory?.categoryName || !!item.categoryId).length
  );

  readonly csvAiSuggestedCount = computed(
    () => this.csvExtract().items.filter((item) => !!item.suggestedCategory?.categoryName || !!item.categoryId).length
  );

  readonly hasOfxPreview = computed(() => this.ofxExtract().items.length > 0);

  readonly hasCsvPreview = computed(() => this.csvExtract().items.length > 0);

  onCsvSkipDuplicatesChange(value: boolean): void {
    this.csvSkipDuplicates.set(value);
  }

  onCategoryChange(item: OfxTransactionPreview, selectedCategoryId: string | null, source: ImportSource): void {
    const previousCategoryId = item.categoryId ?? item.suggestedCategory?.categoryId ?? null;
    item.categoryId = selectedCategoryId;

    this.categoryChanged.emit({
      description: item.description,
      amount: item.amount,
      kind: item.kind,
      previousCategoryId,
      selectedCategoryId,
      suggestedCategoryName: item.suggestedCategory?.categoryName ?? null,
      confidence: item.suggestedCategory?.score ?? item.suggestedCategory?.confidence ?? null,
      source
    });
  }

  onCategorySelectionChange(item: OfxTransactionPreview, selectedCategoryId: string, source: ImportSource): void {
    this.onCategoryChange(item, selectedCategoryId || null, source);
  }

  categoriesForItem(item: OfxTransactionPreview): CategoryDto[] {
    const appliesTo = item.kind === 'Credit' ? 'Income' : 'Expense';
    return this.categories().filter((category) => category.appliesTo === appliesTo || category.appliesTo === null);
  }

  categoryOptionsForItem(item: OfxTransactionPreview): SelectMenuOption[] {
    return [
      { value: '', label: 'Sem categoria' },
      ...this.categoriesForItem(item).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ];
  }

  selectedCategoryValue(item: OfxTransactionPreview): string {
    return item.categoryId ?? item.suggestedCategory?.categoryId ?? '';
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
