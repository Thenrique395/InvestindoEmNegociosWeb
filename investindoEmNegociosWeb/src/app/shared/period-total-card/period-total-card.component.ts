import { Component, input } from '@angular/core';

@Component({
  selector: 'app-period-total-card',
  standalone: true,
  template: `
    <aside class="app-period-total-card">
      <p class="app-period-total-card__eyebrow">{{ eyebrow() }}</p>
      <strong class="app-period-total-card__value">{{ value() }}</strong>
      <p class="app-period-total-card__text">{{ description() }}</p>
      <ng-content select="[total-card-extra]"></ng-content>
      <div class="app-period-total-card__actions">
        <ng-content select="[total-card-actions]"></ng-content>
      </div>
    </aside>
  `,
  styleUrl: './period-total-card.component.scss'
})
export class PeriodTotalCardComponent {
  readonly eyebrow = input<string>('Total do período');
  readonly value = input.required<string>();
  readonly description = input<string>('');
}
