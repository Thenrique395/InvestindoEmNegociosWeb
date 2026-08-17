import { Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

export type ComparisonPillTrend = 'up' | 'down' | 'flat';
export type ComparisonPillPolarity = 'higher-is-better' | 'lower-is-better';

@Component({
  selector: 'app-comparison-pill',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="app-comparison-pill">
      <span class="app-comparison-pill__label">{{ label() }}</span>
      <ng-content select="app-tooltip"></ng-content>
      <span class="app-comparison-pill__delta" [ngClass]="deltaClass()">
        <ng-content></ng-content>
      </span>
    </span>
  `,
  styles: [`
    :host { display: contents; }

    .app-comparison-pill {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border);
      background: color-mix(in srgb, var(--surface-sunken) 72%, white);
      padding: 0.5rem 0.8rem;
      font-size: var(--fs-meta);
      font-weight: var(--fw-semibold);
      color: var(--text-secondary);
    }

    .app-comparison-pill__label {
      color: var(--text-tertiary);
    }

    .app-comparison-pill__delta--up {
      color: var(--income-text);
    }

    .app-comparison-pill__delta--down {
      color: var(--expense-text);
    }

    .app-comparison-pill__delta--flat {
      color: var(--text-tertiary);
    }
  `]
})
export class ComparisonPillComponent {
  readonly label = input.required<string>();
  readonly trend = input<ComparisonPillTrend>('flat');
  readonly polarity = input<ComparisonPillPolarity>('higher-is-better');

  readonly deltaClass = computed(() => {
    const trend = this.trend();
    if (trend === 'flat') {
      return 'app-comparison-pill__delta--flat';
    }
    const isGood = this.polarity() === 'higher-is-better' ? trend === 'up' : trend === 'down';
    return isGood ? 'app-comparison-pill__delta--up' : 'app-comparison-pill__delta--down';
  });
}
