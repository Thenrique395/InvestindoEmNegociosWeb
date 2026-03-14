import { Injectable } from '@angular/core';

export interface CheckoutIntent {
  plan: string;
  cycle: 'Monthly' | 'Yearly';
}

@Injectable({ providedIn: 'root' })
export class CheckoutIntentService {
  private readonly storageKey = 'checkout_intent';

  save(intent: CheckoutIntent): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(this.storageKey, JSON.stringify(intent));
  }

  read(): CheckoutIntent | null {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as CheckoutIntent;
      if (!parsed?.plan) return null;
      return {
        plan: parsed.plan,
        cycle: parsed.cycle === 'Yearly' ? 'Yearly' : 'Monthly'
      };
    } catch {
      return null;
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(this.storageKey);
  }
}
