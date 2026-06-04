import { TestBed } from '@angular/core/testing';
import { OnboardingDraftService } from './onboarding-draft.service';

describe('OnboardingDraftService', () => {
  let service: OnboardingDraftService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [OnboardingDraftService]
    });
    service = TestBed.inject(OnboardingDraftService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('salva e restaura rascunho valido', () => {
    service.save({
      focus: 'vida-financeira',
      intelligenceMode: 'C',
      carryOverDay: 15
    });

    expect(service.read()).toEqual({
      focus: 'vida-financeira',
      intelligenceMode: 'C',
      carryOverDay: 15
    });
  });

  it('normaliza valores invalidos do rascunho', () => {
    localStorage.setItem('onboarding_draft', JSON.stringify({
      focus: 'invalido',
      intelligenceMode: 'X',
      carryOverDay: 99
    }));

    expect(service.read()).toEqual({
      focus: null,
      intelligenceMode: null,
      carryOverDay: 1
    });
  });

  it('remove rascunho corrompido', () => {
    localStorage.setItem('onboarding_draft', '{');

    expect(service.read()).toBeNull();
    expect(localStorage.getItem('onboarding_draft')).toBeNull();
  });

  it('limpa rascunho salvo', () => {
    service.save({
      focus: 'reserva-emergencia',
      intelligenceMode: 'B',
      carryOverDay: 3
    });

    service.clear();

    expect(service.read()).toBeNull();
  });
});
