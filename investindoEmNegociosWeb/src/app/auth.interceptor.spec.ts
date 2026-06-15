import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { UiFeedbackService } from './ui-feedback.service';

class AuthServiceMock {
  getAccessToken = jasmine.createSpy().and.returnValue('token-123');
  getRefreshToken = jasmine.createSpy().and.returnValue(null);
  refresh = jasmine.createSpy().and.callFake(() => of(buildAuthResponse()));
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

function buildAuthResponse(): AuthResponse {
  return {
    userId: 'u1',
    name: 'Teste',
    email: 'teste@local',
    role: 'Basic',
    token: 'token-novo',
    refreshToken: 'refresh-novo',
    expiresAt: new Date(Date.now() + 3600_000).toISOString()
  };
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthServiceMock;
  let router: RouterMock;

  beforeEach(() => {
    auth = new AuthServiceMock();
    router = new RouterMock();

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
  });

  it('deve anexar Authorization para requests protegidas', () => {
    http.get('/api/v1/accounts').subscribe();
    const req = httpMock.expectOne('/api/v1/accounts');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush({});
  });

  it('não deve anexar Authorization em rota de login', () => {
    http.post('/api/v1/auth/login', { email: 'x', senha: 'y' }).subscribe();
    const req = httpMock.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('deve tentar refresh e repetir request após 401', () => {
    auth.getRefreshToken.and.returnValue('refresh-123');
    auth.refresh.and.returnValue(of(buildAuthResponse()));

    http.get('/api/v1/profile').subscribe();

    const first = httpMock.expectOne('/api/v1/profile');
    first.flush({ detail: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.refresh).toHaveBeenCalledWith('refresh-123');

    const retry = httpMock.expectOne('/api/v1/profile');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer token-novo');
    retry.flush({ ok: true });
  });

  it('deve limpar sessão e redirecionar quando 401 sem refresh token', () => {
    const errors: HttpErrorResponse[] = [];
    auth.getRefreshToken.and.returnValue(null);

    http.get('/api/v1/profile').subscribe({
      error: (err) => errors.push(err)
    });

    const req = httpMock.expectOne('/api/v1/profile');
    req.flush({ detail: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.clearSession).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(errors.length).toBe(1);
  });

  it('deve limpar sessão e redirecionar quando refresh falha', () => {
    const errors: unknown[] = [];
    auth.getRefreshToken.and.returnValue('refresh-123');
    auth.refresh.and.returnValue(throwError(() => new Error('refresh-failed')));

    http.get('/api/v1/profile').subscribe({
      error: (err) => errors.push(err)
    });

    const req = httpMock.expectOne('/api/v1/profile');
    req.flush({ detail: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.clearSession).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(errors.length).toBe(1);
  });
});
