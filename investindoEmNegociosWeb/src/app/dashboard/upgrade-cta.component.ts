import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-upgrade-cta',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="upgrade-cta">
      <div class="upgrade-cta__copy">
        <p class="upgrade-cta__eyebrow">Disponível no plano {{ planLabel() }}</p>
        <p class="upgrade-cta__title">{{ title() }}</p>
        <ul class="upgrade-cta__features">
          @for (feature of features(); track feature) {
            <li>
              <svg viewBox="0 0 24 24" width="14" height="14" role="presentation" focusable="false" aria-hidden="true">
                <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ feature }}
            </li>
          }
        </ul>
      </div>
      <a routerLink="/planos" class="upgrade-cta__button">Conhecer planos</a>
    </div>
  `,
  styles: `
    :host { display: block; }
    .upgrade-cta {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: var(--spacing-2); border: 1px solid var(--color-primary-soft);
      border-radius: var(--radius-lg, 1rem); padding: var(--spacing-2);
      background: linear-gradient(120deg, var(--color-primary-weak), var(--surface));
    }
    .upgrade-cta__copy { display: grid; gap: 6px; min-width: 0; }
    .upgrade-cta__eyebrow {
      margin: 0; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--color-primary-text);
    }
    .upgrade-cta__title { margin: 0; font-size: var(--text-sm); font-weight: 600; color: var(--text); }
    .upgrade-cta__features {
      list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px;
    }
    .upgrade-cta__features li {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: var(--text-xs); color: var(--text-secondary);
    }
    .upgrade-cta__features svg { color: var(--color-primary-text); flex: 0 0 14px; }
    .upgrade-cta__button {
      display: inline-flex; align-items: center; border-radius: 999px;
      background: var(--color-primary); color: var(--color-text-inverse, #fff);
      padding: 8px 18px; font-size: var(--text-xs); font-weight: 600;
      text-decoration: none; white-space: nowrap; transition: opacity 0.15s ease;
    }
    .upgrade-cta__button:hover { opacity: 0.9; }
  `
})
export class UpgradeCtaComponent {
  planLabel = input.required<string>();
  title = input.required<string>();
  features = input.required<string[]>();
}
