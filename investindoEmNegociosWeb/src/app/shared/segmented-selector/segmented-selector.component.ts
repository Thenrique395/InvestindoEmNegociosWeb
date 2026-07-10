import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentOption {
  value: string;
  label: string;
  /** Glyph/emoji opcional exibido antes do rótulo. */
  icon?: string;
  /** Oculta o segmento (ex.: bloqueado por plano). */
  hidden?: boolean;
  disabled?: boolean;
}

/**
 * Controle "segmented" genérico e acessível (radiogroup).
 * Reutilizável em qualquer tela que precise alternar entre modos/visões.
 */
@Component({
  selector: 'app-segmented-selector',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seg" role="radiogroup" [attr.aria-label]="ariaLabel()">
      @for (option of visibleOptions(); track option.value) {
        <button
          type="button"
          class="seg__item"
          role="radio"
          [attr.aria-checked]="option.value === value()"
          [class.seg__item--active]="option.value === value()"
          [disabled]="option.disabled"
          (click)="select(option)">
          @if (option.icon) {
            <span class="seg__icon" aria-hidden="true">{{ option.icon }}</span>
          }
          <span class="seg__label">{{ option.label }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: inline-block; }
    .seg {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      background: var(--surface-2);
    }
    .seg__item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 0;
      border-radius: var(--radius-lg, 12px);
      padding: 8px 14px;
      background: transparent;
      color: var(--text-muted);
      font-size: var(--font-size-body-sm, 0.85rem);
      font-weight: var(--font-weight-medium, 500);
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
      white-space: nowrap;
    }
    .seg__item:hover:not(:disabled):not(.seg__item--active) {
      color: var(--text);
      background: var(--surface-3);
    }
    .seg__item--active {
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow-elevation-sm);
    }
    .seg__item:disabled { opacity: 0.5; cursor: not-allowed; }
    .seg__item:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
    .seg__icon { font-size: 0.95em; line-height: 1; }
    @media (max-width: 640px) {
      .seg { width: 100%; overflow-x: auto; }
    }
  `
})
export class SegmentedSelectorComponent {
  readonly options = input.required<SegmentOption[]>();
  readonly value = input.required<string>();
  readonly ariaLabel = input<string>('Selecionar visualização');
  readonly valueChange = output<string>();

  visibleOptions(): SegmentOption[] {
    return this.options().filter((option) => !option.hidden);
  }

  select(option: SegmentOption): void {
    if (option.disabled || option.value === this.value()) return;
    this.valueChange.emit(option.value);
  }
}
