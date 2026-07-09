import { AfterViewInit, Directive, ElementRef, inject, OnDestroy } from '@angular/core';

/**
 * Move o elemento hospedeiro para o `document.body` enquanto existir, tirando-o
 * de qualquer contexto de empilhamento/bloco de contenção do app (sidebar,
 * topbar, `.main`/`.content` com isolation/z-index). Assim overlays de modal com
 * `position: fixed` cobrem a viewport inteira e escurecem tudo, inclusive o
 * topbar. Como o Angular controla o ciclo de vida (via `@if`), ao destruir a
 * view removemos o elemento do body — a remoção interna do Angular vira no-op.
 */
@Directive({
  selector: '[appBodyPortal]',
  standalone: true
})
export class BodyPortalDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    if (typeof document !== 'undefined') {
      document.body.appendChild(this.host.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }
}
