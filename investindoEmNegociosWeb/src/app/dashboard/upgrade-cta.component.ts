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
              <svg viewBox="0 0 24 24" width="13" height="13" role="presentation" focusable="false" aria-hidden="true">
                <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
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

    /* Faixa de upsell — medidas do protótipo do dashboard. Fica logo abaixo
       da faixa de indicadores: é ali que a pessoa acabou de ver o número que
       o plano de cima destrava. */
    .upgrade-cta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-9);
      padding: var(--space-8) var(--space-11);
      border: 1px solid var(--primary-ring);
      border-radius: var(--radius-card);
      background: linear-gradient(120deg, var(--primary-tint-soft), var(--surface));
    }

    .upgrade-cta__copy { min-width: 0; }

    .upgrade-cta__eyebrow {
      margin: 0;
      color: var(--primary-text);
      font-size: var(--fs-caption);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-column);
      line-height: var(--lh-tight);
      text-transform: uppercase;
    }

    .upgrade-cta__title {
      margin: var(--space-2) 0 var(--space-3);
      color: var(--text);
      font-size: var(--fs-subhead);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-tight);
    }

    .upgrade-cta__features {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-7);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .upgrade-cta__features li {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--text-secondary);
      font-size: var(--fs-meta);
      line-height: var(--lh-tight);
    }

    .upgrade-cta__features svg { flex: none; color: var(--primary-text); }

    .upgrade-cta__button {
      display: inline-flex;
      flex: none;
      align-items: center;
      height: var(--h-button-sm);
      padding: 0 var(--space-9);
      border-radius: var(--radius-pill);
      background: var(--primary);
      color: var(--on-primary);
      font-size: var(--fs-meta);
      font-weight: var(--fw-semibold);
      text-decoration: none;
      white-space: nowrap;
      transition: var(--control-transition);
    }

    .upgrade-cta__button:hover { background: var(--primary-hover); }

    .upgrade-cta__button:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 3px;
    }
  `
})
export class UpgradeCtaComponent {
  planLabel = input.required<string>();
  title = input.required<string>();
  features = input.required<string[]>();
}
