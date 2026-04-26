import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ConfirmDialogTone = 'default' | 'danger' | 'warning';

export type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
};

type ConfirmDialogState = ConfirmDialogOptions & {
  isOpen: boolean;
  resolve?: (confirmed: boolean) => void;
};

const initialState: ConfirmDialogState = {
  isOpen: false,
  title: '',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  tone: 'default'
};

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly stateSubject = new BehaviorSubject<ConfirmDialogState>(initialState);
  readonly state$ = this.stateSubject.asObservable();

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.stateSubject.next({
        ...initialState,
        ...options,
        confirmLabel: options.confirmLabel || initialState.confirmLabel,
        cancelLabel: options.cancelLabel || initialState.cancelLabel,
        tone: options.tone || initialState.tone,
        isOpen: true,
        resolve
      });
    });
  }

  accept(): void {
    const state = this.stateSubject.value;
    state.resolve?.(true);
    this.close();
  }

  cancel(): void {
    const state = this.stateSubject.value;
    state.resolve?.(false);
    this.close();
  }

  private close(): void {
    this.stateSubject.next(initialState);
  }
}
