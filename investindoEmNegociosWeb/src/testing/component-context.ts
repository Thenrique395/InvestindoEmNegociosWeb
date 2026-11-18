import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';

/** Contexto Angular para testes de lógica que fornecem os serviços pelo construtor. */
export function inComponentContext<T>(factory: () => T): T {
  const injector = Injector.create({
    parent: TestBed.inject(Injector),
    providers: [{ provide: ChangeDetectorRef, useValue: { markForCheck: jasmine.createSpy('markForCheck') } }]
  });
  return runInInjectionContext(injector, factory);
}
