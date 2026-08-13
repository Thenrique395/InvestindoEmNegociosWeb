import { Directive, input } from '@angular/core';

export type SiteCtaVariant = 'primary' | 'outline' | 'quiet';
export type SiteCtaSize = 'lg' | 'sm';

/**
 * Botão do site público. Aplicado em `<a>` ou `<button>`:
 *
 * ```html
 * <a appSiteCta href="#planos">Quero fazer parte</a>
 * <a appSiteCta variant="outline" href="#como">Ver como funciona</a>
 * ```
 *
 * É diretiva, e não componente, porque um CTA que navega precisa ser um `<a>`
 * de verdade — abrir em nova aba, aparecer como destino no leitor de tela.
 * Um componente wrapper obrigaria a duplicar `<ng-content>` por elemento.
 *
 * Deliberadamente separado do botão do app: aqui a ação é VERDE, pílula, em
 * caixa alta com `letter-spacing` largo; no app é azul, retangular, sem caixa
 * alta. Unificar quebraria uma das duas escalas.
 *
 * Estilos em `styles/site.scss` — diretiva não carrega CSS próprio.
 */
@Directive({
  selector: '[appSiteCta]',
  host: {
    class: 'site-cta',
    '[class.site-cta--primary]': 'variant() === "primary"',
    '[class.site-cta--outline]': 'variant() === "outline"',
    '[class.site-cta--quiet]': 'variant() === "quiet"',
    '[class.site-cta--lg]': 'size() === "lg"',
    '[class.site-cta--sm]': 'size() === "sm"',
  },
})
export class SiteCtaDirective {
  readonly variant = input<SiteCtaVariant>('primary');
  readonly size = input<SiteCtaSize>('lg');
}
