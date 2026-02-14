import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold" [ngClass]="badgeClass">
      <span class="inline-flex h-2 w-2 rounded-full bg-current/70"></span>
      {{ labelToShow }}
    </span>
  `
})
export class StatusBadgeComponent {
  @Input() status?: string;
  @Input() label?: string;
  @Input() variant?: StatusVariant;

  get labelToShow(): string {
    return this.label || this.status || '';
  }

  get badgeClass(): string {
    const variant = this.variant || this.resolveVariant(this.labelToShow, this.status);
    switch (variant) {
      case 'success':
        return 'border-emerald-200 bg-emerald-100 text-emerald-700';
      case 'warning':
        return 'border-amber-200 bg-amber-100 text-amber-700';
      case 'danger':
        return 'border-rose-200 bg-rose-100 text-rose-700';
      case 'info':
        return 'border-sky-200 bg-sky-100 text-sky-700';
      default:
        return 'border-slate-200 bg-slate-100 text-slate-600';
    }
  }

  private resolveVariant(label?: string, status?: string): StatusVariant {
    const raw = `${label || ''} ${status || ''}`.toLowerCase();
    if (raw.includes('pago') || raw.includes('recebido') || raw.includes('paid')) return 'success';
    if (raw.includes('cancel') || raw.includes('canceled')) return 'danger';
    if (raw.includes('antec') || raw.includes('anticipated')) return 'info';
    if (raw.includes('parcial') || raw.includes('partially')) return 'warning';
    if (raw.includes('pend') || raw.includes('open')) return 'warning';
    return 'neutral';
  }
}
