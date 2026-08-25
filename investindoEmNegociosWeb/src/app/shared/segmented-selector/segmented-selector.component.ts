import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentOption {
  value: string;
  label: string;
  /** Glyph/emoji opcional exibido antes do rótulo. */
  icon?: string;
  /**
   * Cor-guia opcional, mostrada como um ponto antes do rótulo. Serve para o
   * segmented que filtra por categoria absorver a legenda: o mesmo controle diz
   * o que filtra e qual cor aquilo tem no gráfico/calendário, em vez de a tela
   * repetir a legenda numa segunda faixa. Espera um token — `var(--income)` —
   * e não um hex, para o mapa de cores continuar sendo o design system.
   */
  dot?: string;
  /** Texto de `title` — explicação longa que não cabe no rótulo. */
  title?: string;
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
  host: { '[attr.data-stretch]': "stretch() ? '' : null" },
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
          [attr.title]="option.title || null"
          (click)="select(option)">
          @if (option.dot) {
            <i class="seg__dot" aria-hidden="true" [style.background]="option.dot"></i>
          }
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
    .seg__dot {
      width: 7px;
      height: 7px;
      flex: none;
      border-radius: var(--radius-pill);
      background: var(--text-muted);
      /* Cor cheia mesmo no segmento inativo: o ponto é a legenda do calendário,
         e uma legenda que desbota deixa de casar com o ponto do dia. Quem
         carrega o estado de seleção é o fundo do segmento e a cor do rótulo. */
    }
    /* Variante compacta: padding e raios menores. */
    :host([data-size='sm']) .seg { border-radius: var(--radius-sm); }
    :host([data-size='sm']) .seg__item {
      padding: var(--space-2) var(--space-5);
      border-radius: 7px;
    }
    @media (max-width: 640px) {
      .seg { width: 100%; overflow-x: auto; }
    }

    /* Variante stretch: o controle ocupa a largura do campo e os segmentos
       dividem o espaço em partes iguais. Usada quando o segmented é um campo de
       formulário, e não um seletor de visão no cabeçalho. Nasceu como override
       ::ng-deep em Cenários; a variação é do controle, não da tela. */
    :host([data-stretch]) { display: block; width: 100%; }
    :host([data-stretch]) .seg { display: flex; width: 100%; }
    :host([data-stretch]) .seg__item {
      flex: 1 1 0;
      justify-content: center;
      min-width: 0;
      padding-inline: var(--space-4);
    }
    :host([data-stretch]) .seg__label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Estreito: em vez de rolar na horizontal, quebra em duas colunas — o
       rótulo continua legível e o controle não vira uma régua deslizante. */
    @media (max-width: 640px) {
      :host([data-stretch]) .seg {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        overflow: visible;
      }
    }
  `
})
export class SegmentedSelectorComponent {
  readonly options = input.required<SegmentOption[]>();
  readonly value = input.required<string>();
  readonly ariaLabel = input<string>('Selecionar visualização');
  /** Ocupa a largura do campo, com os segmentos divididos por igual. */
  readonly stretch = input(false);
  readonly valueChange = output<string>();

  visibleOptions(): SegmentOption[] {
    return this.options().filter((option) => !option.hidden);
  }

  select(option: SegmentOption): void {
    if (option.disabled || option.value === this.value()) return;
    this.valueChange.emit(option.value);
  }
}
