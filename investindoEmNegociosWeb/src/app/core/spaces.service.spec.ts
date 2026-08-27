import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api.config';
import { SpaceResponse, SpacesService } from './spaces.service';

describe('SpacesService', () => {
  let service: SpacesService;
  let httpMock: HttpTestingController;
  const baseUrl = `${API_BASE_URL}/spaces`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SpacesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function buildSpace(overrides: Partial<SpaceResponse> = {}): SpaceResponse {
    return {
      id: 's1',
      name: 'Espaço Principal',
      isDefault: true,
      hasPassword: false,
      createdAt: '2026-06-01T00:00:00Z',
      ...overrides
    };
  }

  it('lista os espaços do usuário', () => {
    let result: SpaceResponse[] | undefined;
    service.list().subscribe((r) => (result = r));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([buildSpace()]);

    expect(result?.length).toBe(1);
    expect(result?.[0].name).toBe('Espaço Principal');
  });

  it('cria um espaço novo com nome e senha opcional', () => {
    let result: SpaceResponse | undefined;
    service.create({ name: 'Negócio', password: 'segredo' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Negócio', password: 'segredo' });
    req.flush(buildSpace({ id: 's2', name: 'Negócio', isDefault: false, hasPassword: true }));

    expect(result?.id).toBe('s2');
    expect(result?.hasPassword).toBeTrue();
  });

  it('atualiza nome e senha de um espaço existente', () => {
    service.update('s2', { name: 'Negócio Renomeado', password: null }).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/s2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Negócio Renomeado', password: null });
    req.flush(buildSpace({ id: 's2', name: 'Negócio Renomeado' }));
  });

  it('exclui um espaço pelo id', () => {
    service.delete('s2').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/s2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('entra em um espaço informando a senha quando protegido', () => {
    service.enter('s2', { password: 'segredo' }).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/s2/enter`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ password: 'segredo' });
    req.flush({ userId: 'u1', name: 'Teste', email: 'teste@local', role: 'Basic', expiresAt: '2026-06-28T00:00:00Z' });
  });
});
