import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Revelação ao rolar — exclusiva do site público.
 *
 * O elemento nasce deslocado e transparente e entra quando cruza a viewport.
 * Sem isto, as seções do protótipo renderizam em branco: a animação não é
 * enfeite, é o que torna o conteúdo visível.
 *
 * Regras (COMPONENTES.md §11):
 *  - `opacity` + `translateY(34px)`, 900ms, cubic-bezier(.16,.8,.3,1)
 *  - o que já está visível na carga entra sem animar
 *  - `prefers-reduced-motion: reduce` desliga tudo
 *
 * No servidor (SSR) o elemento é renderizado já visível, então o HTML entregue
 * ao buscador e ao leitor de tela nunca depende do JavaScript.
 */
@Directive({
  selector: '[appReveal]',
  host: {
    '[class.reveal]': 'true',
    '[class.reveal--on]': 'shown()',
    '[style.transition-delay]': 'delayMs() ? delayMs() + "ms" : null',
  },
})
export class RevealDirective {
  /** Atraso em cascata para itens irmãos. Use 0, 120, 240. */
  readonly delayMs = input(0, { alias: 'appReveal' });

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _shown = signal(!this.isBrowser);
  /** Fora do browser nasce revelado — o SSR não anima. */
  readonly shown = this._shown.asReadonly();

  constructor() {
    if (!this.isBrowser) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduce) {
      this._shown.set(true);
      return;
    }

    const el = this.host.nativeElement as HTMLElement;

    // Já visível na carga: entra sem animar, senão a primeira dobra pisca.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      this._shown.set(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          this._shown.set(true);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    io.observe(el);
    this.destroyRef.onDestroy(() => io.disconnect());
  }
}
