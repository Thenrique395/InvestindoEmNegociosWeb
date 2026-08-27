import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-period-action-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="app-period-action-card">
      <p class="app-period-action-card__eyebrow">{{ eyebrow() }}</p>
      <strong class="app-period-action-card__title">{{ title() }}</strong>
      <p class="app-period-action-card__text">{{ description() }}</p>
      <ng-content select="[action-card-extra]"></ng-content>
      <div class="app-period-action-card__actions">
        <ng-content select="[action-card-actions]"></ng-content>
      </div>
    </aside>
  `,
  styleUrl: './period-action-card.component.scss'
})
export class PeriodActionCardComponent {
  readonly eyebrow = input<string>('Próxima ação');
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
