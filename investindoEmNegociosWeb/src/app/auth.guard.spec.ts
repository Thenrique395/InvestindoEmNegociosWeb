import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, Observable, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';
import { OnboardingService } from './onboarding.service';

class AuthServiceMock {
  authenticated = true;

  isAuthenticated(): boolean {
    return this.authenticated;
  }
}

class OnboardingServiceMock {
  getStatus = jasmine.createSpy().and.returnValue(of({ step: 0, completed: true }));
}

describe('authGuard', () => {
  let auth: AuthServiceMock;
  let onboarding: OnboardingServiceMock;
  let router: Router;

  async function runGuard(url = '/dashboard'): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url } as any) as boolean | UrlTree | Promise<boolean | UrlTree> | Observable<boolean | UrlTree>
    );

    if (isObservable(result)) {
      return firstValueFrom(result);
    }

    return result instanceof Promise ? result : result;
  }

  beforeEach(() => {
    auth = new AuthServiceMock();
    onboarding = new OnboardingServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: OnboardingService, useValue: onboarding },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    router = TestBed.inject(Router);
  });

  it('deve redirecionar para /login quando não estiver autenticado', async () => {
    auth.authenticated = false;

    const result = await runGuard('/dashboard');

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    expect(onboarding.getStatus).not.toHaveBeenCalled();
  });

  it('deve permitir a rota de onboarding sem consultar status para evitar loop', async () => {
    onboarding.getStatus.and.returnValue(of({ step: 1, completed: false }));

    const result = await runGuard('/onboarding');

    expect(result).toBeTrue();
    expect(onboarding.getStatus).not.toHaveBeenCalled();
  });

  it('deve redirecionar rota interna para /onboarding quando onboarding não estiver concluído', async () => {
    onboarding.getStatus.and.returnValue(of({ step: 1, completed: false }));

    const result = await runGuard('/despesas');

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/onboarding');
  });

  it('deve permitir rota interna quando onboarding estiver concluído', async () => {
    onboarding.getStatus.and.returnValue(of({ step: 4, completed: true }));

    const result = await runGuard('/dashboard');

    expect(result).toBeTrue();
  });

  it('deve redirecionar para /onboarding se não conseguir confirmar o status', async () => {
    onboarding.getStatus.and.returnValue(throwError(() => new Error('status indisponível')));

    const result = await runGuard('/cartoes');

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/onboarding');
  });
});
