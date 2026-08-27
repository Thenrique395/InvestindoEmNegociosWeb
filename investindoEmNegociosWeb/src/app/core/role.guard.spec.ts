import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, UrlTree } from '@angular/router';
import { APP_FEATURE_KEYS } from './features';
import { AuthService } from './auth.service';
import { roleGuard } from './role.guard';

class AuthServiceMock {
  private role: 'Basic' | 'Intermediate' | 'Advanced' | 'Admin' | null = null;

  setRole(role: 'Basic' | 'Intermediate' | 'Advanced' | 'Admin' | null): void {
    this.role = role;
  }

  getRole(): 'Basic' | 'Intermediate' | 'Advanced' | 'Admin' | null {
    return this.role;
  }
}

describe('roleGuard', () => {
  let auth: AuthServiceMock;
  let router: Router;

  function runGuard(data: Record<string, unknown> = {}): true | UrlTree {
    return TestBed.runInInjectionContext(() =>
      roleGuard({ data } as any, {} as any) as true | UrlTree
    );
  }

  beforeEach(() => {
    auth = new AuthServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    router = TestBed.inject(Router);
  });

  it('deve redirecionar para /login quando não houver role', () => {
    auth.setRole(null);

    const result = runGuard();

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('deve redirecionar para /dashboard quando minRole não for atendida', () => {
    auth.setRole('Basic');

    const result = runGuard({ minRole: 'Intermediate' });

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('deve redirecionar para /dashboard quando feature não for permitida', () => {
    auth.setRole('Basic');

    const result = runGuard({ feature: APP_FEATURE_KEYS.investmentsAccess });

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('deve permitir acesso quando role e feature estiverem corretas', () => {
    auth.setRole('Advanced');

    const result = runGuard({
      minRole: 'Intermediate',
      feature: APP_FEATURE_KEYS.investmentsAccess
    });

    expect(result).toBeTrue();
  });

  it('deve permitir no server-side render sem validar role', () => {
    TestBed.resetTestingModule();
    auth = new AuthServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: PLATFORM_ID, useValue: 'server' }
      ]
    });

    const result = runGuard({ minRole: 'Admin' });

    expect(result).toBeTrue();
  });
});
