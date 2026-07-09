import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';

export interface UpcomingDueItem {
  id: string;
  title: string;
  dueLabel: string;
  amount: number;
  tone: 'danger' | 'warning' | 'info';
  statusLabel: string;
}

@Component({
  selector: 'app-upcoming-due-list',
  standalone: true,
  imports: [CommonModule, RouterModule, AppCurrencyPipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="due-card">
      <div class="due-card__head">
        <div>
          <p class="due-card__title">Próximos vencimentos</p>
          <p class="due-card__subtitle">Despesas em aberto vencidas ou vencendo nos próximos 14 dias.</p>
        </div>
        <a routerLink="/despesas" class="due-card__link">Ver despesas</a>
      </div>
      @if (items().length) {
        <ul class="due-card__list">
          @for (item of items(); track item.id) {
            <li class="due-card__item">
              <div class="due-card__item-main">
                <strong class="due-card__item-title">{{ item.title }}</strong>
                <span class="due-card__item-meta">
                  <app-status-badge [tone]="item.tone" [label]="item.statusLabel" size="sm" />
                  {{ item.dueLabel }}
                </span>
              </div>
              <strong class="due-card__amount">{{ item.amount | appCurrency }}</strong>
            </li>
          }
        </ul>
      } @else {
        <div class="due-card__empty">
          <p class="due-card__empty-title">Nada vencendo por aqui</p>
          <p class="due-card__empty-text">
            Quando uma despesa em aberto estiver perto do vencimento, ela aparece nesta lista para você agir antes do atraso.
          </p>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .due-card {
      display: grid; gap: var(--spacing-1);
      padding: 1.1rem 1.15rem 1.05rem;
      border: 1px solid var(--border); border-radius: var(--radius-xl);
      background: var(--surface); box-shadow: var(--shadow-elevation-sm);
    }
    .due-card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-1); }
    .due-card__title { margin: 0; font-size: var(--font-size-label); font-weight: 600; color: var(--text); }
    .due-card__subtitle { margin: 2px 0 0; font-size: var(--font-size-caption); color: var(--text-muted); }
    .due-card__link { font-size: var(--font-size-caption); font-weight: 600; color: var(--color-primary-text); text-decoration: none; white-space: nowrap; }
    .due-card__link:hover { text-decoration: underline; }
    .due-card__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .due-card__item {
      display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-1);
      border: 1px solid var(--border); border-radius: var(--radius-md);
      background: var(--surface-2); padding: 10px 12px;
    }
    .due-card__item-main { display: grid; gap: 4px; min-width: 0; }
    .due-card__item-title { font-size: var(--text-sm); color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .due-card__item-meta { display: inline-flex; align-items: center; gap: 8px; font-size: var(--text-xs); color: var(--text-muted); }
    .due-card__amount { font-size: var(--text-sm); color: var(--danger-text); white-space: nowrap; }
    .due-card__empty {
      display: grid; gap: 4px; padding: var(--spacing-2); text-align: center;
      border: 1px dashed var(--border-strong); border-radius: var(--radius-md); background: var(--surface-2);
    }
    .due-card__empty-title { margin: 0; font-size: var(--text-sm); font-weight: 600; color: var(--text); }
    .due-card__empty-text { margin: 0; font-size: var(--text-xs); color: var(--text-muted); }
  `
})
export class UpcomingDueListComponent {
  items = input.required<UpcomingDueItem[]>();
}
