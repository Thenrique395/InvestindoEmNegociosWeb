import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OnboardingService } from '../../../core/onboarding.service';
import { OnboardingReturnBannerComponent } from './onboarding-return-banner.component';

describe('OnboardingReturnBannerComponent', () => {
  let getStatus: jasmine.Spy;

  async function montar(): Promise<ComponentFixture<OnboardingReturnBannerComponent>> {
    getStatus = jasmine.createSpy().and.returnValue(of({ step: 3, completed: false }));
    await TestBed.configureTestingModule({
      imports: [OnboardingReturnBannerComponent],
      providers: [provideRouter([]), { provide: OnboardingService, useValue: { getStatus } }]
    }).compileComponents();
    return TestBed.createComponent(OnboardingReturnBannerComponent);
  }

  it('mostra a volta enquanto o cadastro inicial não terminou', async () => {
    const fixture = await montar();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.onb-return__action') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/onboarding');
  });

  it('some para quem já concluiu', async () => {
    const fixture = await montar();
    getStatus.and.returnValue(of({ step: 4, completed: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.onb-return')).toBeNull();
  });

  it('não vira faixa fantasma quando o status falha', async () => {
    const fixture = await montar();
    getStatus.and.returnValue(throwError(() => new Error('offline')));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.onb-return')).toBeNull();
  });
});
