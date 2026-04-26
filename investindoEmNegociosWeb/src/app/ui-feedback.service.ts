import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UiFeedbackType = 'success' | 'error' | 'info' | 'warning';

export interface UiFeedbackMessage {
  id: number;
  type: UiFeedbackType;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class UiFeedbackService {
  private readonly messagesSubject = new BehaviorSubject<UiFeedbackMessage[]>([]);
  readonly messages$ = this.messagesSubject.asObservable();

  private idCounter = 0;

  show(type: UiFeedbackType, text: string, durationMs = 3500): void {
    const id = ++this.idCounter;
    const message: UiFeedbackMessage = { id, type, text };

    const current = this.messagesSubject.value;
    this.messagesSubject.next([...current, message]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
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

  dismiss(id: number): void {
    const current = this.messagesSubject.value;
    this.messagesSubject.next(current.filter((m) => m.id !== id));
  }

  clear(): void {
    this.messagesSubject.next([]);
  }
}
