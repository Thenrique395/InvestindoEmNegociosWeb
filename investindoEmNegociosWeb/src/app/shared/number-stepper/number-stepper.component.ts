import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Stepper numérico — COMPONENTES.md §5.4.
 *
 * **O campo do meio é digitável.** Os botões são atalho, não a única entrada:
 * um stepper que só incrementa obriga 30 cliques para chegar ao dia 31
 * (ARQUITETURA_ANGULAR.md §7).
 *
 * O valor digitado é sanitizado e preso ao intervalo — mas só ao sair do campo,
 * não a cada tecla: prender durante a digitação impede apagar para redigitar.
 */
@Component({
  selector: 'app-number-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './number-stepper.component.html',
  styleUrl: './number-stepper.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NumberStepperComponent),
      multi: true,
    },
  ],
})
export class NumberStepperComponent implements ControlValueAccessor {
  readonly min = input(0);
  readonly max = input(Number.MAX_SAFE_INTEGER);
  readonly step = input(1);
  readonly ariaLabel = input<string | null>(null);
  readonly suffix = input<string | null>(null);

  readonly valueChange = output<number>();

  private readonly _value = signal(0);
  private readonly _draft = signal<string | null>(null);
  private readonly _disabled = signal(false);

  readonly value = this._value.asReadonly();
  readonly isDisabled = this._disabled.asReadonly();

  /** Enquanto o usuário digita, mostra o rascunho; fora disso, o valor real. */
  readonly display = computed(() => this._draft() ?? String(this._value()));

  readonly canDecrease = computed(() => !this._disabled() && this._value() > this.min());
  readonly canIncrease = computed(() => !this._disabled() && this._value() < this.max());

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | null): void {
    this._value.set(this.clamp(Number(value ?? 0)));
    this._draft.set(null);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  decrease(): void {
    if (!this.canDecrease()) return;
    this.commit(this._value() - this.step());
  }

  increase(): void {
    if (!this.canIncrease()) return;
    this.commit(this._value() + this.step());
  }

  /** Durante a digitação apenas guarda o texto — sem prender ao intervalo. */
  onInput(raw: string): void {
    this._draft.set(raw.replace(/[^\d-]/g, ''));
  }

  /** Ao sair do campo, sanitiza e aplica. Campo vazio volta ao mínimo. */
  onBlur(): void {
    const draft = this._draft();
    this._draft.set(null);
    this.onTouched();

    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    this.commit(Number.isNaN(parsed) ? this.min() : parsed);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.increase();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.decrease();
    } else if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
    }
  }

  private commit(next: number): void {
    const clamped = this.clamp(next);
    if (clamped === this._value()) return;
    this._value.set(clamped);
    this.onChange(clamped);
    this.valueChange.emit(clamped);
  }

  private clamp(value: number): number {
    if (Number.isNaN(value)) return this.min();
    return Math.min(this.max(), Math.max(this.min(), value));
  }
}
