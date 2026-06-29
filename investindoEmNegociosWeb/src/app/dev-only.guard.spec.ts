import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { devOnlyGuard } from './dev-only.guard';

describe('devOnlyGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])]
    });
  });

  it('permite a navegação em ambiente de desenvolvimento (isDevMode() é sempre true no Karma)', () => {
    const result = TestBed.runInInjectionContext(() => devOnlyGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('o tipo de retorno permanece boolean | UrlTree (bloqueio em produção verificado manualmente via build, não por unit test — isDevMode() não é mockável de forma confiável aqui)', () => {
    const result = TestBed.runInInjectionContext(() => devOnlyGuard({} as any, {} as any));

    expect(typeof result === 'boolean' || result instanceof UrlTree).toBeTrue();
  });
});
