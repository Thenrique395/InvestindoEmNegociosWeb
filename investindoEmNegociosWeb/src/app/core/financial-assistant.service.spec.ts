import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api.config';
import { AuthService } from './auth.service';
import { FinancialAssistantService } from './financial-assistant.service';

describe('FinancialAssistantService', () => {
  let service: FinancialAssistantService;
  let httpMock: HttpTestingController;
  const baseUrl = `${API_BASE_URL}/financial-assistant`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(FinancialAssistantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('limpa a conversa no logout mesmo quando a API falha', () => {
    service.addMessage({ question: 'Privada', answer: 'Resposta' } as any);
    TestBed.inject(AuthService).clearSession();
    expect(service.conversation).toEqual([]);
    httpMock.expectOne(`${API_BASE_URL}/auth/logout`).flush({}, { status: 500, statusText: 'Erro' });
    expect(service.conversation).toEqual([]);
  });

  it('limpa a conversa ao receber sessão de outro usuário', () => {
    const auth = TestBed.inject(AuthService);
    auth.applySession({ userId: 'a', email: 'a@example.test', name: 'A', role: 'Basic', expiresAt: '' });
    service.addMessage({ question: 'Privada', answer: 'Resposta' } as any);
    auth.applySession({ userId: 'b', email: 'b@example.test', name: 'B', role: 'Basic', expiresAt: '' });
    expect(service.conversation).toEqual([]);
    auth.clearSession();
    httpMock.expectOne(`${API_BASE_URL}/auth/logout`).flush(null);
  });

  it('busca o contexto na rota com hífen (financial-assistant)', () => {
    service.context().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/context`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('envia a pergunta do chat na rota com hífen', () => {
    service.chat('Como está meu risco?').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/chat`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ question: 'Como está meu risco?', referenceDate: undefined });
    req.flush({});
  });

  it('busca a saúde financeira (IA) na rota com hífen', () => {
    let result: unknown;
    service.health('2026-06-29').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${baseUrl}/health?referenceDate=2026-06-29`);
    expect(req.request.method).toBe('GET');
    req.flush({ overallStatus: 'ok', overallSummary: 'tudo bem', areas: [], generatedByAi: true, referenceDate: '2026-06-29' });

    expect((result as { overallStatus: string }).overallStatus).toBe('ok');
  });
});
