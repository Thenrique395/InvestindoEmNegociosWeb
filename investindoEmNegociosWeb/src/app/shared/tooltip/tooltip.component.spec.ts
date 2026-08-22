import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TooltipComponent } from './tooltip.component';

describe('TooltipComponent', () => {
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TooltipComponent);
    fixture.componentRef.setInput('label', 'Mais informações');
    fixture.componentRef.setInput('text', 'Detalhes do indicador.');
    fixture.detectChanges();
  });

  it('opens on click and closes on outside click', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');

    document.body.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicar de novo mantém aberto: alternar fecharia o texto que a pessoa foi ler', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.click();
    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('põe o painel no body, fora do overflow da faixa de indicadores', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    const panel = document.body.querySelector(':scope > .tooltip__panel');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain('Detalhes do indicador.');

    document.body.click();
    fixture.detectChanges();
    expect(document.body.querySelector(':scope > .tooltip__panel')).toBeNull();
  });
});
