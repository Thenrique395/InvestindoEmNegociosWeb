import { Directive, HostListener } from '@angular/core';
import { allowOnlyDigitsKeydown } from './input-mask';

@Directive({
  selector: '[digitOnly]',
  standalone: true
})
export class DigitOnlyDirective {
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    allowOnlyDigitsKeydown(event);
  }
}
