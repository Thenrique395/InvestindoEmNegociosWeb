import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UiFeedbackType = 'success' | 'error' | 'info' | 'warning';

export interface UiFeedbackMessage {
  type: UiFeedbackType;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class UiFeedbackService {
  private readonly messageSubject = new BehaviorSubject<UiFeedbackMessage | null>(null);
  readonly message$ = this.messageSubject.asObservable();
  private dismissTimer?: ReturnType<typeof setTimeout>;

  show(type: UiFeedbackType, text: string, durationMs = 3500): void {
    this.messageSubject.next({ type, text });
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
    if (durationMs > 0) {
      this.dismissTimer = setTimeout(() => this.clear(), durationMs);
    }
  }

  success(text: string, durationMs = 3000): void {
    this.show('success', text, durationMs);
  }

  error(text: string, durationMs = 4500): void {
    this.show('error', text, durationMs);
  }

  info(text: string, durationMs = 3000): void {
    this.show('info', text, durationMs);
  }

  warning(text: string, durationMs = 3500): void {
    this.show('warning', text, durationMs);
  }

  clear(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = undefined;
    }
    this.messageSubject.next(null);
  }
}
