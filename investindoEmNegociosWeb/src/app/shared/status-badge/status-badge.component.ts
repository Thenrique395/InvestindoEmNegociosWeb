import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';


export type StatusBadgeTone = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted';
type StatusBadgeSize = 'sm' | 'md';

/**
 * Glifos do badge. Conjunto fechado, e não um SVG solto por chamador: são seis
 * formas que se repetem em toda listagem de parcela, e deixá-las aqui é o que
 * garante que "paga" tenha o mesmo desenho em Despesas, Receitas e Cartões.
 */
export type StatusBadgeIcon = 'check' | 'alert' | 'clock' | 'forward' | 'half' | 'x';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <span [class]="badgeClass()">
      @if (icon(); as glifo) {
        <svg
          class="h-3 w-3 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false">
          @switch (glifo) {
            @case ('check') {
              <path d="M20 6 9 17l-5-5" />
            }
            @case ('alert') {
              <path d="M12 8v5m0 3h.01M10.2 4.8 3.7 16a2 2 0 0 0 1.73 3h13.14A2 2 0 0 0 20.3 16L13.8 4.8a2 2 0 0 0-3.46 0Z" />
            }
            @case ('clock') {
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            }
            @case ('forward') {
              <path d="m4 6 8 6-8 6V6Zm9 0 8 6-8 6V6Z" />
            }
            @case ('half') {
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
            }
            @case ('x') {
              <circle cx="12" cy="12" r="9" />
              <path d="m15 9-6 6m0-6 6 6" />
            }
          }
        </svg>
      }
      @if (dot()) {
        <span [class]="dotClass()" aria-hidden="true"></span>
      }
      <ng-content></ng-content>
      @if (label()) {
        <span>{{ label() }}</span>
      }
    </span>
    `
})
export class StatusBadgeComponent {
  readonly tone = input<StatusBadgeTone>('default');
  readonly size = input<StatusBadgeSize>('sm');
  readonly label = input<string>('');
  readonly dot = input<boolean>(false);
  /**
   * Glifo antes do rótulo. Herda `currentColor`, então ele já sai na cor do
   * tom — não há mapa de cor próprio para manter em sincronia.
   */
  readonly icon = input<StatusBadgeIcon | null>(null);

  readonly badgeClass = computed(() => {
    const sizeClass = this.size() === 'md'
      ? 'px-3 py-1 text-sm'
      : 'px-2.5 py-1 text-xs';

    return `inline-flex items-center gap-1.5 rounded-full border font-semibold ${sizeClass} ${this.toneClass()}`;
  });

  readonly dotClass = computed(() => `h-1.5 w-1.5 rounded-full ${this.dotToneClass()}`);

  private toneClass(): string {
    switch (this.tone()) {
      case 'success': return 'border-[var(--income-tint)] bg-[var(--income-tint)] text-[var(--income-text)]';
      case 'danger': return 'border-[var(--expense-tint)] bg-[var(--expense-tint)] text-[var(--expense-text)]';
      case 'warning': return 'border-[var(--warning-tint)] bg-[var(--warning-tint)] text-[var(--warning-text)]';
      case 'info': return 'border-[var(--primary-tint)] bg-[var(--primary-tint)] text-[var(--primary-text)]';
      case 'muted': return 'border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--text-tertiary)]';
      default: return 'border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--text-tertiary)]';
    }
  }

  private dotToneClass(): string {
    switch (this.tone()) {
      case 'success': return 'bg-[var(--income)]';
      case 'danger': return 'bg-[var(--expense)]';
      case 'warning': return 'bg-[var(--warning)]';
      case 'info': return 'bg-[var(--primary)]';
      case 'muted': return 'bg-[var(--text-tertiary)]';
      default: return 'bg-[var(--text-tertiary)]';
    }
  }
}
