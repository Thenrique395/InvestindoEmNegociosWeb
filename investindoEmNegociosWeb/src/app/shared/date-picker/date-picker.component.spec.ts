import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePickerComponent } from './date-picker.component';
import { setLocaleSettings } from '../../utils/locale-settings';

function typeInto(fixture: ComponentFixture<DatePickerComponent>, text: string): void {
  const input: HTMLInputElement = fixture.nativeElement.querySelector('.date-picker__input');
  input.value = text;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

describe('DatePickerComponent', () => {
  let fixture: ComponentFixture<DatePickerComponent>;
  let component: DatePickerComponent;
  let emitted: string[];

  beforeEach(() => {
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
    TestBed.configureTestingModule({ imports: [DatePickerComponent] });
    fixture = TestBed.createComponent(DatePickerComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.valueChange.subscribe((v) => emitted.push(v));
    fixture.detectChanges();
  });

  it('digitar uma data válida emite o valor local e sincroniza a seleção', () => {
    typeInto(fixture, '05/08/2026');
    expect(emitted.at(-1)).toBe('05/08/2026');
    expect(component.display).toBe('05/08/2026');
    const selecionada = component.cells.find((c) => c && c.selected);
    expect(selecionada?.day).toBe(5);
  });

  it('digitar data incompleta emite string vazia (inválida)', () => {
    typeInto(fixture, '05/08');
    expect(emitted.at(-1)).toBe('');
  });

  it('data fora do intervalo (ano 9999) emite vazio — trava o cadastro', () => {
    typeInto(fixture, '05/08/9999');
    expect(emitted.at(-1)).toBe('');
  });

  it('respeita max explícito: data depois do max emite vazio', () => {
    component.max = '2026-12-31';
    fixture.detectChanges();
    typeInto(fixture, '01/01/2027');
    expect(emitted.at(-1)).toBe('');
    typeInto(fixture, '31/12/2026');
    expect(emitted.at(-1)).toBe('31/12/2026');
  });

  it('format="iso" emite yyyy-MM-dd e aceita valor iso de entrada', () => {
    component.format = 'iso';
    component.value = '2026-08-05';
    component.ngOnChanges({ value: { currentValue: '2026-08-05', previousValue: '', firstChange: true, isFirstChange: () => true } });
    fixture.detectChanges();
    expect(component.display).toBe('05/08/2026');
    typeInto(fixture, '10/09/2026');
    expect(emitted.at(-1)).toBe('2026-09-10');
  });

  it('navegar meses atualiza o título e selecionar um dia emite e fecha', () => {
    component.value = '05/08/2026';
    component.ngOnChanges({ value: { currentValue: '05/08/2026', previousValue: '', firstChange: true, isFirstChange: () => true } });
    component.openCalendar();
    fixture.detectChanges();
    const tituloInicial = component.monthTitle;
    component.nextMonth();
    fixture.detectChanges();
    expect(component.monthTitle).not.toBe(tituloInicial);

    const alvo = component.cells.find((c) => c && c.inRange && c.day === 15)!;
    component.selectDay(alvo!);
    expect(emitted.at(-1)).toBe('15/09/2026');
    expect(component.open).toBe(false);
  });

  it('dias fora do intervalo ficam desabilitados no grid', () => {
    component.min = '2026-08-10';
    component.value = '15/08/2026';
    component.ngOnChanges({ value: { currentValue: '15/08/2026', previousValue: '', firstChange: true, isFirstChange: () => true } });
    fixture.detectChanges();
    const dia5 = component.cells.find((c) => c && c.day === 5);
    const dia20 = component.cells.find((c) => c && c.day === 20);
    expect(dia5?.inRange).toBe(false);
    expect(dia20?.inRange).toBe(true);
  });
});
