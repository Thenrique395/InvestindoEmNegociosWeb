import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-period-hero',
  standalone: true,
  template: `
    <div class="app-period-hero">
      <div class="app-period-hero__main">
        <p class="app-period-hero__eyebrow">{{ eyebrow() }}</p>

        <!-- Setas ao lado do título, não abaixo: o alvo da navegação é o
             período, e ficar junto dele encurta o percurso do olhar. -->
        <div class="app-period-hero__heading">
          @if (showNavigation()) {
            <button
              type="button"
              class="app-period-hero__arrow"
              aria-label="Mês anterior"
              (click)="previousMonth.emit()">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
          }
          <h2 class="app-period-hero__title">{{ title() }}</h2>
          @if (showNavigation()) {
            <button
              type="button"
              class="app-period-hero__arrow"
              aria-label="Próximo mês"
              (click)="nextMonth.emit()">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          }
        </div>

        <p class="app-period-hero__text">{{ description() }}</p>

        <div class="app-period-hero__toolbar">
          <ng-content select="[hero-toolbar-start]"></ng-content>
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
      gap: var(--space-5);
      align-content: start;
    }

    .app-period-hero__heading {
      display: flex;
      align-items: center;
      gap: var(--space-5);
    }

    .app-period-hero__arrow {
      flex: none;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text-secondary);
      cursor: pointer;
      transition: background var(--dur-hover) ease, color var(--dur-hover) ease;
    }

    .app-period-hero__arrow svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .app-period-hero__arrow:hover {
      background: var(--surface-inset);
      color: var(--text);
    }

    .app-period-hero__eyebrow {
      margin: 0;
      font-size: var(--fs-caption);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-eyebrow);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .app-period-hero__title {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--fs-page-title);
      line-height: var(--lh-display);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-tighter);
      color: var(--text);
    }

    .app-period-hero__text {
      margin: 0;
      max-inline-size: 62ch;
      font-size: var(--fs-body);
      line-height: var(--lh-body);
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
      background: color-mix(in srgb, var(--surface-sunken) 74%, white);
      padding: 0.7rem 1rem;
      color: var(--text);
      font-size: var(--fs-body);
      font-weight: var(--fw-semibold);
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
