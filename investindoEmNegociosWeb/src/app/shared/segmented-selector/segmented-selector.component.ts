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
    /* Segmented — COMPONENTES.md §5.6. O trilho é uma superfície afundada e a
       aba ativa "sobe" com fundo branco e sombra de 1px: é o contraste entre os
       dois que comunica a seleção, não a cor do texto. */
    :host { display: inline-block; }
    .seg {
      display: inline-flex;
      padding: 3px;
      border-radius: var(--radius-control);
      background: var(--surface-inset);
    }
    .seg__item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      border: 0;
      border-radius: var(--radius-xs);
      padding: 7px var(--space-6);
      background: transparent;
      color: var(--text-tertiary);
      font-family: inherit;
      font-size: var(--fs-meta);
      font-weight: var(--fw-semibold);
      cursor: pointer;
      transition: background var(--dur-hover) ease, color var(--dur-hover) ease;
      white-space: nowrap;
    }
    .seg__item:hover:not(:disabled):not(.seg__item--active) {
      color: var(--text-secondary);
    }
    .seg__item--active {
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow-segment);
    }
    .seg__item:disabled { opacity: var(--control-disabled-opacity); cursor: not-allowed; }
    .seg__item:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
    .seg__icon { font-size: 0.95em; line-height: 1; }
    /* Variante compacta: padding e raios menores. */
    :host([data-size='sm']) .seg { border-radius: var(--radius-sm); }
    :host([data-size='sm']) .seg__item {
      padding: var(--space-2) var(--space-5);
      border-radius: 7px;
    }
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
