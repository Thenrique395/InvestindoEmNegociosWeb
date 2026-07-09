import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FinancialPrivacyService } from '../../financial-privacy.service';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { formatCurrencyValue } from '../../utils/locale-utils';
import { buildConicGradient } from '../../utils/home-insight.utils';
import {
  buildCategoryComparison,
  buildCategoryInsight,
  categoryCountLabel,
  CategorySlice,
  CategoryVariant
} from './category-breakdown.model';

@Component({
  selector: 'app-category-breakdown-card',
  standalone: true,
  imports: [DecimalPipe, RouterLink, TooltipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-breakdown-card.component.html',
  styleUrl: './category-breakdown-card.component.scss'
})
export class CategoryBreakdownCardComponent {
  private readonly financialPrivacy = inject(FinancialPrivacyService);

  readonly variant = input.required<CategoryVariant>();
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly total = input.required<number>();
  readonly slices = input.required<CategorySlice[]>();
  /** Libera insight textual e comparação (planos Inteligente/Completo). */
  readonly showInsights = input(false);
  readonly emptyText = input.required<string>();
  readonly emptyCtaLabel = input.required<string>();
  readonly emptyCtaLink = input.required<string>();
  readonly detailsRoute = input.required<string>();
  readonly detailsLabel = input.required<string>();

  readonly hasData = computed(() => this.slices().length > 0);
  readonly categoryCount = computed(() => this.slices().length);
  readonly countLabel = computed(() => categoryCountLabel(this.categoryCount()));
  readonly chartBackground = computed(() => buildConicGradient(this.slices()));
  readonly totalLabel = computed(() => this.format(this.total()));
  readonly chartAriaLabel = computed(() => `Distribuição de ${this.title().toLowerCase()}: ${this.slices().map((s) => `${s.label} ${Math.round(s.percent)}%`).join(', ')}`);

  readonly insight = computed(() => buildCategoryInsight(this.variant(), this.slices(), this.showInsights()));
  readonly comparison = computed(() => buildCategoryComparison(this.variant(), this.slices(), this.showInsights()));

  formatValue(value: number): string {
    return this.format(value);
  }

  private format(value: number): string {
    return this.financialPrivacy.hidden() ? '••••••' : formatCurrencyValue(value);
  }
}
