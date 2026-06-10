import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-period-hero',
  standalone: true,
  template: `
    <div class="app-period-hero">
      <div class="app-period-hero__main">
        <p class="app-period-hero__eyebrow">{{ eyebrow() }}</p>
        <h2 class="app-period-hero__title">{{ title() }}</h2>
        <p class="app-period-hero__text">{{ description() }}</p>

        <div class="app-period-hero__toolbar">
          <ng-content select="[hero-toolbar-start]"></ng-content>

          @if (showNavigation()) {
            <div class="app-period-hero__nav">
              <button type="button" class="app-period-hero__nav-btn" (click)="previousMonth.emit()">
                <span aria-hidden="true">←</span>
                <span>Mês anterior</span>
              </button>
              <button type="button" class="app-period-hero__nav-btn" (click)="nextMonth.emit()">
                <span>Próximo mês</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          }

          <ng-content select="[hero-toolbar-end]"></ng-content>
        </div>
      </div>

      <ng-content select="[hero-aside]"></ng-content>
    </div>
  `,
  styles: [`
    :host { display: contents; }

    .app-period-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
      gap: 1.6rem;
      align-items: start;
    }

    .app-period-hero__main {
      display: grid;
      gap: 1rem;
    }

    .app-period-hero__eyebrow {
      margin: 0;
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-bold);
      letter-spacing: var(--letter-spacing-eyebrow);
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .app-period-hero__title {
      margin: 0;
      font-size: var(--font-size-display);
      line-height: var(--line-height-display);
      font-weight: var(--font-weight-semibold);
      letter-spacing: var(--letter-spacing-display);
      color: var(--text);
    }

    .app-period-hero__text {
      margin: 0;
      max-inline-size: 62ch;
      font-size: var(--font-size-body);
      line-height: var(--line-height-body);
      color: var(--text-secondary);
    }

    .app-period-hero__toolbar {
      display: grid;
      justify-items: start;
      gap: 0.8rem;
    }

    .app-period-hero__nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      justify-content: flex-start;
    }

    .app-period-hero__nav-btn {
      min-height: 46px;
      border-radius: var(--radius-pill);
      border: 1px solid color-mix(in srgb, var(--text) 10%, transparent);
      background: color-mix(in srgb, var(--surface-2) 74%, white);
      padding: 0.7rem 1rem;
      color: var(--text);
      font-size: var(--font-size-body-sm);
      font-weight: var(--font-weight-semibold);
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      transition:
        transform 160ms ease,
        border-color 160ms ease,
        background 160ms ease;
    }

    .app-period-hero__nav-btn:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--primary) 26%, transparent);
      background: color-mix(in srgb, var(--surface) 88%, white);
    }

    @media (max-width: 960px) {
      .app-period-hero {
        grid-template-columns: 1fr;
      }

      .app-period-hero ::ng-deep .app-period-total-card {
        order: -1;
      }
    }
  `]
})
export class PeriodHeroComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly showNavigation = input<boolean>(true);

  readonly previousMonth = output<void>();
  readonly nextMonth = output<void>();
}
