import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type UsageBarTone = 'ok' | 'warning' | 'critical';

/**
 * Barra de uso genérica (limite de cartão, orçamento, dívida...). O tom pode ser
 * passado explicitamente ou derivado do percentual pelos limiares padrão
 * (≤50% ok · 51–80% atenção · >80% crítico).
 */
@Component({
  selector: 'app-usage-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="usage-bar"
      [attr.data-tone]="resolvedTone()"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="clamped()"
      [attr.aria-label]="ariaLabel()">
      <div class="usage-bar__fill" [style.width.%]="clamped()"></div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .usage-bar {
      --usage-tone: var(--income);
      height: 7px;
      overflow: hidden;
      border-radius: var(--radius-pill);
      background: var(--surface-inset);
    }

    .usage-bar[data-tone='warning'] { --usage-tone: var(--warning); }
    .usage-bar[data-tone='critical'] { --usage-tone: var(--expense); }

    .usage-bar__fill {
      height: 100%;
      border-radius: var(--radius-pill);
      background: var(--usage-tone);
      transition: width 320ms ease;
    }

    @media (prefers-reduced-motion: reduce) {
      .usage-bar__fill { transition: none; }
    }
  `]
})
export class UsageBarComponent {
  readonly percent = input.required<number>();
  readonly tone = input<UsageBarTone | null>(null);
  readonly label = input<string>('');

  readonly clamped = computed(() => Math.max(0, Math.min(100, Math.round(this.percent()))));
  readonly resolvedTone = computed<UsageBarTone>(() => {
    const explicit = this.tone();
    if (explicit) return explicit;
    const p = this.percent();
    if (p > 80) return 'critical';
    if (p > 50) return 'warning';
    return 'ok';
  });
  readonly ariaLabel = computed(() => this.label() || `${this.clamped()}% utilizado`);
}
