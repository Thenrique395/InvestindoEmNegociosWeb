import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Meta, Title } from '@angular/platform-browser';
import { SiteHeaderComponent } from '../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../shared/site-footer/site-footer.component';
import { VENDAS_FOOTER_COLUMNS } from '../vendas/vendas.content';
import { LEGAL_DOCUMENTS, type LegalDocument } from './legal.content';

/**
 * Página de documento legal — serve Termos de uso e Política de privacidade.
 *
 * Um componente só: as duas páginas têm a mesma anatomia (título, data,
 * sumário e seções numeradas) e diferem apenas no conteúdo. O documento vem
 * do `slug` da rota, via `withComponentInputBinding`.
 *
 * O cabeçalho aqui não tem nav de âncoras — não há seções para onde rolar.
 */
@Component({
  selector: 'app-legal-page',
  imports: [SiteHeaderComponent, SiteFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.scss',
})
export class LegalPageComponent {
  readonly footerColumns = VENDAS_FOOTER_COLUMNS;

  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  /**
   * Vem de `data: { slug }` na rota, e não de `input()`: o app não habilita
   * `withComponentInputBinding()`, e ligá-lo agora afetaria todos os
   * componentes de rota do projeto.
   */
  private readonly slug = toSignal(
    inject(ActivatedRoute).data.pipe(map((data) => data['slug'] as string)),
    { initialValue: 'termos' },
  );

  readonly document = computed<LegalDocument>(() => {
    const doc = LEGAL_DOCUMENTS[this.slug()];
    if (!doc) throw new Error(`Documento legal desconhecido: ${this.slug()}`);
    return doc;
  });

  /**
   * Âncora a partir do título da seção. Títulos têm número, espaço e acento —
   * nada disso serve como `id`, e um `href="#1. Quem somos"` não navega.
   */
  anchorId(sectionTitle: string): string {
    return sectionTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  constructor() {
    // Título e meta são efeito externo, não estado derivado — daí `effect`.
    effect(() => {
      const doc = this.document();
      this.title.setTitle(`${doc.title} — Investindo em Negócios`);
      this.meta.updateTag({ name: 'description', content: doc.summary });
    });
  }
}
