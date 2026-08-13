import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  affectedCount,
  type InstallmentContext,
  type InstallmentScope,
} from './installment-scope';

/**
 * Pergunta o alcance antes de agir sobre um lançamento parcelado.
 *
 * Componente de apresentação: recebe o contexto e devolve a escolha. Quem
 * decide se deve abrir é a tela, via `shouldAskScope()`.
 */
@Component({
  selector: 'app-installment-scope-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './installment-scope-modal.component.html',
  styleUrl: './installment-scope-modal.component.scss',
})
export class InstallmentScopeModalComponent {
  readonly open = input(false);
  readonly context = input.required<InstallmentContext>();
  readonly actionLabel = input('Aplicar');
  readonly title = input('Este lançamento é parcelado');

  readonly confirmed = output<InstallmentScope>();
  readonly cancelled = output<void>();

  private readonly _scope = signal<InstallmentScope>('single');
  readonly scope = this._scope.asReadonly();

  readonly forwardCount = computed(() => affectedCount(this.context(), 'forward'));

  choose(scope: InstallmentScope): void {
    this._scope.set(scope);
  }

  confirm(): void {
    this.confirmed.emit(this._scope());
  }
}
