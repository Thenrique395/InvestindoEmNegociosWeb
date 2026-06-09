import { Component, HostListener, input, signal } from '@angular/core';

let nextTooltipId = 0;

@Component({
  selector: 'app-tooltip',
  standalone: true,
  template: `
    <button
      type="button"
      class="tooltip"
      [class.tooltip--sm]="size() === 'sm'"
      [class.tooltip--open]="open()"
      [attr.aria-label]="label()"
      [attr.aria-describedby]="panelId"
      [attr.aria-expanded]="open()"
      (click)="toggle($event)">
      <span aria-hidden="true">?</span>
      <span class="tooltip__panel" role="tooltip" [id]="panelId">{{ text() }}</span>
      <span class="tooltip__arrow" aria-hidden="true"></span>
    </button>
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
      background: color-mix(in srgb, var(--surface-2) 82%, transparent);
      color: var(--primary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      font-weight: 700;
      line-height: 1;
      cursor: help;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }
    .tooltip--sm { inline-size: 1.625rem; block-size: 1.625rem; font-size: 0.84rem; }
    .tooltip:hover, .tooltip:focus-visible, .tooltip--open {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--primary) 30%, transparent);
      background: var(--surface);
    }
    .tooltip__panel, .tooltip__arrow {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 140ms ease, visibility 140ms ease;
    }
    .tooltip__panel {
      position: absolute;
      inset-block-end: calc(100% + 0.875rem);
      inset-inline-end: 0;
      inline-size: min(17.5rem, 75vw);
      padding: 0.85rem 0.95rem;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-strong);
      background: var(--surface);
      color: var(--text);
      font-size: 0.86rem;
      font-weight: 500;
      line-height: 1.45;
      text-align: left;
      box-shadow: var(--shadow-md);
      z-index: 50;
    }
    .tooltip__arrow {
      position: absolute;
      inset-block-end: calc(100% + 0.45rem);
      inset-inline-end: 0.75rem;
      inline-size: 0.75rem;
      block-size: 0.75rem;
      rotate: 45deg;
      border-right: 1px solid var(--border-strong);
      border-bottom: 1px solid var(--border-strong);
      background: var(--surface);
      z-index: 49;
    }
    .tooltip:hover .tooltip__panel, .tooltip:hover .tooltip__arrow,
    .tooltip:focus-visible .tooltip__panel, .tooltip:focus-visible .tooltip__arrow,
    .tooltip--open .tooltip__panel, .tooltip--open .tooltip__arrow {
      opacity: 1;
      visibility: visible;
    }
  `
})
export class TooltipComponent {
  readonly label = input.required<string>();
  readonly text = input.required<string>();
  readonly size = input<'sm' | 'md'>('md');
  readonly open = signal(false);
  readonly panelId = `app-tooltip-${++nextTooltipId}`;

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update((value) => !value);
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  close(): void {
    this.open.set(false);
  }
}
