import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService, AuthSessionResponse } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { UiFeedbackService } from './ui-feedback.service';
import { API_BASE_URL } from './api.config';

class AuthServiceMock {
  isAuthenticated = jasmine.createSpy().and.returnValue(true);
  refresh = jasmine.createSpy().and.callFake(() => of(buildAuthSessionResponse()));
  clearSession = jasmine.createSpy();
}

class RouterMock {
  url = '/dashboard';
  navigateByUrl = jasmine.createSpy().and.resolveTo(true);
}

class UiFeedbackServiceMock {
  warning = jasmine.createSpy();
  error = jasmine.createSpy();
  success = jasmine.createSpy();
  info = jasmine.createSpy();
}

function buildAuthSessionResponse(): AuthSessionResponse {
  return {
    userId: 'u1',
    name: 'Teste',
    email: 'teste@local',
    role: 'Basic',
    expiresAt: new Date(Date.now() + 3600_000).toISOString()
  };
}

function setCsrfCookie(value: string | null): void {
  if (value) {
    document.cookie = `XSRF-TOKEN=${value}; path=/`;
  } else {
    document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthServiceMock;
  let router: RouterMock;

  beforeEach(() => {
    auth = new AuthServiceMock();
    router = new RouterMock();
    setCsrfCookie('csrf-abc');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: UiFeedbackService, useClass: UiFeedbackServiceMock }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    setCsrfCookie(null);
  });

  it('deve enviar credenciais e anexar X-XSRF-TOKEN em requests mutáveis para a API', () => {
    http.post(`${API_BASE_URL}/profile`, {}).subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/profile`);
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-abc');
    req.flush({});
  });

  it('não deve anexar X-XSRF-TOKEN em requests GET', () => {
    http.get(`${API_BASE_URL}/profile`).subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/profile`);
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBeFalse();
    req.flush({});
  });

  it('deve tentar refresh e repetir request após 401 quando há sessão local', () => {
    auth.isAuthenticated.and.returnValue(true);
    auth.refresh.and.returnValue(of(buildAuthSessionResponse()));

    http.get(`${API_BASE_URL}/profile`).subscribe();

    const first = httpMock.expectOne(`${API_BASE_URL}/profile`);
    first.flush({ detail: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.refresh).toHaveBeenCalled();

    const retry = httpMock.expectOne(`${API_BASE_URL}/profile`);
    expect(retry.request.withCredentials).toBeTrue();
    retry.flush({ ok: true });
  });

  it('deve limpar sessão e redirecionar quando 401 sem sessão local', () => {
    const errors: HttpErrorResponse[] = [];
    auth.isAuthenticated.and.returnValue(false);

    http.get(`${API_BASE_URL}/profile`).subscribe({
      error: (err) => errors.push(err)
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/profile`);
    req.flush({ detail: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.clearSession).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(errors.length).toBe(1);
  });

  it('deve limpar sessão e redirecionar quando refresh falha', () => {
    const errors: unknown[] = [];
    auth.isAuthenticated.and.returnValue(true);
    auth.refresh.and.returnValue(throwError(() => new Error('refresh-failed')));

    http.get(`${API_BASE_URL}/profile`).subscribe({
      error: (err) => errors.push(err)
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/profile`);
    req.flush({ detail: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.clearSession).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(errors.length).toBe(1);
  });
});
