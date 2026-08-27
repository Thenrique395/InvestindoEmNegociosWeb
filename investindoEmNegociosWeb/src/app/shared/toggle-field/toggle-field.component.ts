import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-toggle-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './toggle-field.component.html',
  styleUrl: './toggle-field.component.scss'
})
export class ToggleFieldComponent {
  readonly label = input('');
  readonly description = input('');
  readonly compact = input(false);
  /**
   * Componente **controlado**: o pai é dono do valor. Por isso `input()` + `output()`
   * e não `model()` — `model()` guardaria estado local e o toggle poderia divergir
   * do pai caso ele decidisse não aplicar a mudança.
   */
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly checkedChange = output<boolean>();

  onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
