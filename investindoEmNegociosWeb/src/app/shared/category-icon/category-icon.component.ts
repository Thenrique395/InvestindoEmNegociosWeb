import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Chip visual de categoria: ícone (emoji) sobre um fundo derivado da cor da
 * categoria. Reutilizável em Categorias, Dashboard e Relatórios. A cor é apenas
 * identidade visual — o significado vem sempre acompanhado de texto.
 */
@Component({
  selector: 'app-category-icon',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="cat-icon" [class.cat-icon--sm]="size() === 'sm'" [style.--cat-color]="color()" aria-hidden="true">
      <span class="cat-icon__glyph">{{ icon() }}</span>
    </span>
  `,
  styles: `
    :host { display: inline-flex; }
    .cat-icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--cat-color, var(--primary)) 16%, var(--surface));
      border: 1px solid color-mix(in srgb, var(--cat-color, var(--primary)) 32%, transparent);
    }
    .cat-icon--sm { width: 32px; height: 32px; border-radius: 10px; }
    .cat-icon__glyph { font-size: 1.1rem; line-height: 1; }
    .cat-icon--sm .cat-icon__glyph { font-size: 0.95rem; }
  `
})
export class CategoryIconComponent {
  readonly icon = input.required<string>();
  readonly color = input<string>('var(--primary)');
  readonly size = input<'sm' | 'md'>('md');
}
