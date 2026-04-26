import { Component, computed, input } from '@angular/core';
import { NgIf } from '@angular/common';

type StatusBadgeTone = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted';
type StatusBadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgIf],
  template: `
    <span [class]="badgeClass()">
      <span *ngIf="dot()" [class]="dotClass()" aria-hidden="true"></span>
      <ng-content></ng-content>
      <span *ngIf="label()">{{ label() }}</span>
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
      case 'success': return 'border-[var(--color-success-soft)] bg-[var(--color-success-weak)] text-[var(--color-success)]';
      case 'danger': return 'border-[var(--color-danger-soft)] bg-[var(--color-danger-weak)] text-[var(--color-danger)]';
      case 'warning': return 'border-[var(--color-warning-soft)] bg-[var(--color-warning-weak)] text-[var(--color-warning)]';
      case 'info': return 'border-[var(--color-info-soft)] bg-[var(--color-info-weak)] text-[var(--color-info)]';
      case 'muted': return 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]';
      default: return 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]';
    }
  }

  private dotToneClass(): string {
    switch (this.tone()) {
      case 'success': return 'bg-[var(--color-success)]';
      case 'danger': return 'bg-[var(--color-danger)]';
      case 'warning': return 'bg-[var(--color-warning)]';
      case 'info': return 'bg-[var(--color-info)]';
      case 'muted': return 'bg-[var(--color-text-muted)]';
      default: return 'bg-[var(--color-text-muted)]';
    }
  }
}
