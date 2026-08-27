import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export type UiFeedbackType = 'success' | 'error' | 'info' | 'warning';

export interface UiFeedbackMessage {
  id: number;
  type: UiFeedbackType;
  text: string;
  /** Ação de desfazer. Presente, o toast mostra o botão e vive mais tempo. */
  undo?: () => void;
}

@Injectable({ providedIn: 'root' })
export class UiFeedbackService {
  private readonly messagesSubject = new BehaviorSubject<UiFeedbackMessage[]>([]);
  readonly messages$ = this.messagesSubject.asObservable();

  /**
   * Compatibilidade temporária com componentes antigos que ainda esperam uma única mensagem.
   * Novos componentes devem preferir `messages$`.
   */
  readonly message$ = this.messages$.pipe(map((messages) => messages.at(-1) ?? null));

  private idCounter = 0;

  show(type: UiFeedbackType, text: string, durationMs = 3500, undo?: () => void): void {
    const normalizedText = text?.trim();
    if (!normalizedText) return;

    const id = ++this.idCounter;
    const message: UiFeedbackMessage = { id, type, text: normalizedText, undo };

    const current = this.messagesSubject.value;
    this.messagesSubject.next([...current, message].slice(-4));

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(text: string, durationMs = 3000): void {
    this.show('success', text, durationMs);
  }

  /**
   * Confirmação com desfazer — COMPONENTES.md §8.
   *
   * "Toda confirmação destrutiva ou irreversível carrega Desfazer. Sem isso o
   * toast só informa, não protege."
   *
   * Vive 4s em vez de 3: é o tempo de ler a mensagem e decidir voltar atrás.
   */
  successWithUndo(text: string, undo: () => void, durationMs = 4000): void {
    this.show('success', text, durationMs, undo);
  }

  /** Executa o desfazer e tira o toast da tela. */
  runUndo(message: UiFeedbackMessage): void {
    message.undo?.();
    this.dismiss(message.id);
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
