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
      case 'success': return 'border-emerald-200 bg-emerald-100 text-emerald-700';
      case 'danger': return 'border-rose-200 bg-rose-100 text-rose-700';
      case 'warning': return 'border-amber-200 bg-amber-100 text-amber-700';
      case 'info': return 'border-sky-200 bg-sky-100 text-sky-700';
      case 'muted': return 'border-slate-200 bg-slate-100 text-slate-600';
      default: return 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]';
    }
  }

  private dotToneClass(): string {
    switch (this.tone()) {
      case 'success': return 'bg-emerald-500';
      case 'danger': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      case 'info': return 'bg-sky-500';
      case 'muted': return 'bg-slate-400';
      default: return 'bg-[var(--text-muted)]';
    }
  }
}
