import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SitePlanCardsComponent } from './site-plan-cards.component';
import { MARKETING_PLANS, type MarketingPlan } from '../../../marketing-plans';

describe('SitePlanCardsComponent', () => {
  let fixture: ComponentFixture<SitePlanCardsComponent>;
  let component: SitePlanCardsComponent;

  const essencial = MARKETING_PLANS.find((p) => p.code === 'basic') as MarketingPlan;
  const controle = MARKETING_PLANS.find((p) => p.code === 'intermediate') as MarketingPlan;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SitePlanCardsComponent] }).compileComponents();
    fixture = TestBed.createComponent(SitePlanCardsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('plans', MARKETING_PLANS);
    fixture.detectChanges();
  });

  describe('priceOf', () => {
    it('no ciclo mensal usa o preço mensal', () => {
      fixture.componentRef.setInput('cycle', 'Monthly');
      expect(component.priceOf(controle)).toBe(29.9);
    });

    it('no ciclo anual mostra o equivalente mensal', () => {
      fixture.componentRef.setInput('cycle', 'Yearly');
      expect(component.priceOf(controle)).toBeCloseTo(299 / 12, 5);
    });

    it('mantém zero no plano gratuito, sem dividir', () => {
      fixture.componentRef.setInput('cycle', 'Yearly');
      expect(component.priceOf(essencial)).toBe(0);
    });
  });

  describe('noteOf', () => {
    it('no plano gratuito avisa que não pede cartão', () => {
      expect(component.noteOf(essencial)).toBe('Sem cartão de crédito');
    });

    it('no ciclo mensal oferece o anual', () => {
      fixture.componentRef.setInput('cycle', 'Monthly');
      expect(component.noteOf(controle)).toContain('no plano anual');
    });

    it('no ciclo anual informa a cobrança anual', () => {
      fixture.componentRef.setInput('cycle', 'Yearly');
      expect(component.noteOf(controle)).toContain('por ano');
    });
  });

  it('renderiza um card por plano', () => {
    const cards = fixture.nativeElement.querySelectorAll('.plan');
    expect(cards.length).toBe(MARKETING_PLANS.length);
  });

  it('destaca apenas o plano recomendado', () => {
    const featured = fixture.nativeElement.querySelectorAll('.plan--featured');
    expect(featured.length).toBe(1);
  });
});
