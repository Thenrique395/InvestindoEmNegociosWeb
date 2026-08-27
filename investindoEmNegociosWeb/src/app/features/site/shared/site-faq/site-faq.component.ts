import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

export interface SiteFaqItem {
  question: string;
  answer: string;
}

/**
 * Accordion de dúvidas.
 *
 * Um item aberto por vez, como no protótipo — o primeiro abre por padrão para
 * a seção não parecer uma lista de títulos mortos.
 *
 * Usa `<button>` com `aria-expanded` em vez de `<details>`: o protótipo anima
 * a abertura, e `<details>` não permite transicionar a altura de forma
 * confiável entre navegadores.
 */
@Component({
  selector: 'app-site-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-faq.component.html',
  styleUrl: './site-faq.component.scss',
})
export class SiteFaqComponent {
  readonly items = input.required<readonly SiteFaqItem[]>();

  private readonly _openIndex = signal(0);
  readonly openIndex = this._openIndex.asReadonly();

  toggle(index: number): void {
    this._openIndex.update((current) => (current === index ? -1 : index));
  }
}
