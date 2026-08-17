import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface InsightActionItem {
  id: string;
  severity: 'danger' | 'warn' | 'info';
  text: string;
  actionLabel: string;
  route: string;
  queryParams: Record<string, string>;
}

@Component({
  selector: 'app-insight-actions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasContent()) {
      <div class="insight-actions">
        @if (observations().length) {
          <div class="insight-actions__column">
            <p class="insight-actions__title">O que observar este mês</p>
            <ul class="insight-actions__observations">
              @for (item of observations(); track item) {
                <li>{{ item }}</li>
              }
            </ul>
          </div>
        }
        @if (actions().length) {
          <div class="insight-actions__column">
            <p class="insight-actions__title">Ações recomendadas</p>
            <ul class="insight-actions__list">
              @for (action of actions(); track action.id) {
                <li class="insight-actions__item" [attr.data-severity]="action.severity">
                  <span class="insight-actions__marker" aria-hidden="true"></span>
                  <span class="insight-actions__text">{{ action.text }}</span>
                  <a class="insight-actions__cta" [routerLink]="action.route" [queryParams]="action.queryParams">
                    {{ action.actionLabel }}
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .insight-actions {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-6);
    }
    .insight-actions__column {
      display: grid; align-content: start; gap: var(--space-3);
      border: 1px solid var(--border); border-radius: var(--radius-control);
      background: var(--surface-sunken); padding: var(--space-6);
    }
    .insight-actions__title { margin: 0; font-size: var(--fs-meta); font-weight: 600; color: var(--text); }
    .insight-actions__observations {
      margin: 0; padding-left: 1.1rem; display: grid; gap: 6px;
      font-size: var(--fs-caption); color: var(--text-secondary);
    }
    .insight-actions__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .insight-actions__item {
      display: flex; align-items: center; gap: 10px;
      border: 1px solid var(--border); border-radius: var(--radius-control);
      background: var(--surface); padding: 8px 10px;
    }
    .insight-actions__marker { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 8px; background: var(--primary); }
    .insight-actions__item[data-severity='danger'] .insight-actions__marker { background: var(--expense); }
    .insight-actions__item[data-severity='warn'] .insight-actions__marker { background: var(--warning); }
    .insight-actions__text { flex: 1 1 auto; min-width: 0; font-size: var(--fs-caption); color: var(--text-secondary); }
    .insight-actions__cta {
      flex: 0 0 auto; font-size: var(--fs-caption); font-weight: 600;
      color: var(--primary-text); text-decoration: none; white-space: nowrap;
    }
    .insight-actions__cta:hover { text-decoration: underline; }
  `
})
export class InsightActionsComponent {
  observations = input.required<string[]>();
  actions = input.required<InsightActionItem[]>();

  readonly hasContent = computed(() => this.observations().length > 0 || this.actions().length > 0);
}
