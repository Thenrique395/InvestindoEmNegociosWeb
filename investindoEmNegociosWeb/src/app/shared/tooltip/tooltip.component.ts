import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  input,
  signal
} from '@angular/core';
import { BodyPortalDirective } from '../body-portal.directive';

let nextTooltipId = 0;

/**
 * Explicação de um indicador — COMPONENTES.md §3.1.
 *
 * O painel vai para o `document.body` por portal, e não fica dentro do botão:
 * a faixa de KPIs precisa de `overflow: hidden` para arredondar os cantos, e
 * qualquer painel ancorado dentro dela era recortado antes de aparecer na tela.
 * Por isso a posição é calculada em coordenadas de viewport (`position: fixed`)
 * a partir do retângulo do botão, no mesmo padrão do `app-date-picker`.
 */
@Component({
  selector: 'app-tooltip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BodyPortalDirective],
  template: `
    <button
      #anchor
      type="button"
      class="tooltip"
      [class.tooltip--sm]="size() === 'sm'"
      [class.tooltip--open]="open()"
      [attr.aria-label]="label()"
      [attr.aria-describedby]="open() ? panelId : null"
      [attr.aria-expanded]="open()"
      (click)="onClick($event)"
      (mouseenter)="show()"
      (mouseleave)="close()"
      (focus)="show()"
      (blur)="close()">
      <span aria-hidden="true">?</span>
    </button>

    @if (open()) {
      <div
        appBodyPortal
        class="tooltip__panel"
        [class.tooltip__panel--below]="below()"
        role="tooltip"
        [id]="panelId"
        [style.top.px]="top()"
        [style.left.px]="left()"
        [style.width.px]="width()"
        [style.--tip-arrow-x.px]="arrowX()">
        {{ text() }}
      </div>
    }
  `,
  styles: `
    :host { display: inline-flex; }
    .tooltip {
      position: relative;
      inline-size: 2rem;
      block-size: 2rem;
      flex: 0 0 auto;
      border-radius: var(--radius-pill);
      border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
      background: color-mix(in srgb, var(--surface-sunken) 82%, transparent);
      color: var(--primary-text);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      font-weight: var(--fw-bold);
      line-height: var(--lh-display);
      cursor: help;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }
    .tooltip--sm { inline-size: 1.625rem; block-size: 1.625rem; font-size: var(--fs-meta); }
    .tooltip:hover, .tooltip:focus-visible, .tooltip--open {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--primary) 30%, transparent);
      background: var(--surface);
    }

    /* Portado para o body: posição em coordenadas de viewport e acima do
       date-picker (10001), porque a dica é sempre a camada mais transitória. */
    .tooltip__panel {
      position: fixed;
      z-index: 10002;
      padding: 0.85rem 0.95rem;
      border-radius: var(--radius-inner);
      border: 1px solid var(--border-strong);
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-body);
      font-size: var(--fs-meta);
      font-weight: var(--fw-medium);
      line-height: var(--lh-body);
      text-align: left;
      box-shadow: var(--shadow-dropdown);
      pointer-events: none;
    }

    /* A seta segue o centro do botão (--tip-arrow-x), não a borda do painel:
       com o painel preso à margem da janela, um canto fixo apontaria para o
       lugar errado. */
    .tooltip__panel::after {
      content: '';
      position: absolute;
      inset-block-start: 100%;
      inset-inline-start: var(--tip-arrow-x, 50%);
      inline-size: 0.7rem;
      block-size: 0.7rem;
      margin-block-start: -0.36rem;
      margin-inline-start: -0.35rem;
      rotate: 45deg;
      border-right: 1px solid var(--border-strong);
      border-bottom: 1px solid var(--border-strong);
      background: var(--surface);
    }

    .tooltip__panel--below::after {
      inset-block-start: 0;
      margin-block-start: -0.36rem;
      border-right: none;
      border-bottom: none;
      border-left: 1px solid var(--border-strong);
      border-top: 1px solid var(--border-strong);
    }
  `
})
export class TooltipComponent {
  readonly label = input.required<string>();
  readonly text = input.required<string>();
  readonly size = input<'sm' | 'md'>('md');

  readonly open = signal(false);
  readonly panelId = `app-tooltip-${++nextTooltipId}`;

  readonly top = signal(0);
  readonly left = signal(0);
  readonly width = signal(280);
  readonly arrowX = signal(0);
  /** O painel abriu para baixo? Muda o lado em que a seta encosta. */
  readonly below = signal(false);

  @ViewChild('anchor') private anchor?: ElementRef<HTMLButtonElement>;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    // Fase de captura: `window:scroll` não enxerga rolagem de contêiner interno
    // (corpo de modal, scroller de tabela), e ali o painel ficaria parado
    // enquanto o botão sobe.
    const onScroll = () => this.onViewportChange();
    window.addEventListener('scroll', onScroll, true);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('scroll', onScroll, true));
  }

  /** Cabe uma frase de cálculo sem virar parede, e entra numa tela de 320px. */
  private static readonly PanelWidth = 280;
  private static readonly Gap = 10;
  private static readonly Margin = 8;

  show(): void {
    this.reposition();
    this.open.set(true);
    // Só depois de renderizado dá para medir a altura real: o texto de cada
    // indicador tem tamanho diferente, e chutar altura erra o lado da virada.
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.reposition());
    }
  }

  /**
   * Clique sempre abre, nunca alterna: no mouse o painel já apareceu no hover,
   * e alternar fecharia justo o texto que a pessoa clicou para ler. Fecha por
   * clique fora, Escape ou ao tirar o cursor.
   */
  onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.show();
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  close(): void {
    this.open.set(false);
  }

  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.open()) {
      this.reposition();
    }
  }

  private reposition(): void {
    const el = this.anchor?.nativeElement;
    if (!el || typeof window === 'undefined') {
      return;
    }

    const { PanelWidth, Gap, Margin } = TooltipComponent;
    const rect = el.getBoundingClientRect();
    const width = Math.min(PanelWidth, window.innerWidth - Margin * 2);
    const panel = typeof document !== 'undefined' ? document.getElementById(this.panelId) : null;
    // Antes do primeiro quadro não há painel para medir; a estimativa serve só
    // para escolher o lado, e o rAF de `show()` corrige com a altura real.
    const height = panel?.offsetHeight ?? 96;

    const acimaTopo = rect.top - height - Gap;
    const abaixoTopo = rect.bottom + Gap;
    const abre = acimaTopo < Margin && abaixoTopo + height <= window.innerHeight - Margin;

    this.below.set(abre);
    this.top.set(abre ? abaixoTopo : Math.max(Margin, acimaTopo));

    const esquerda = Math.min(
      Math.max(Margin, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - Margin
    );
    this.left.set(esquerda);
    this.width.set(width);
    this.arrowX.set(rect.left + rect.width / 2 - esquerda);
  }
}
