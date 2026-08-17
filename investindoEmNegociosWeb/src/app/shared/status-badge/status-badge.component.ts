import { Component, computed, input } from '@angular/core';


export type StatusBadgeTone = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted';
type StatusBadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [],
  template: `
    <span [class]="badgeClass()">
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
