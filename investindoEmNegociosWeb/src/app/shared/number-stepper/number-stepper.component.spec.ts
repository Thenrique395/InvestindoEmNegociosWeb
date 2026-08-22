import { TestBed } from '@angular/core/testing';
import { Component, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NumberStepperComponent } from './number-stepper.component';

@Component({
  standalone: true,
  imports: [FormsModule, NumberStepperComponent],
  template: `
    <app-number-stepper [min]="1" [max]="31" [(ngModel)]="dia" name="dia" ariaLabel="Dia" />
  `
})
class HostComponent {
  dia = 8;
  readonly stepper = viewChild.required(NumberStepperComponent);
}

function digitar(input: HTMLInputElement, texto: string): void {
  input.value = texto;
  input.dispatchEvent(new Event('input'));
}

describe('NumberStepperComponent', () => {
  it('descarta o que não é dígito no próprio campo — trava regressão do "1asd"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    digitar(input, '1asd');
    fixture.detectChanges();

    expect(input.value).toBe('1');

    digitar(input, '10abc');
    fixture.detectChanges();

    expect(input.value).toBe('10');
  });

  it('aplica o valor digitado ao sair do campo, preso ao intervalo', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    digitar(input, '99');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.stepper().value()).toBe(31);
  });

  it('campo esvaziado volta ao mínimo', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    digitar(input, 'abc');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.stepper().value()).toBe(1);
  });
});
