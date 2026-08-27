import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { STYLEGUIDE_CATEGORY_LABELS, STYLEGUIDE_COMPONENTS, StyleguideCategory } from './styleguide-catalog';

@Component({
  selector: 'app-styleguide-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './styleguide-shell.component.html',
  styleUrl: './styleguide-shell.component.scss'
})
export class StyleguideShellComponent {
  readonly categories: StyleguideCategory[] = ['layout', 'forms', 'feedback', 'overlay', 'data', 'pipe'];
  readonly categoryLabels = STYLEGUIDE_CATEGORY_LABELS;
  readonly components = STYLEGUIDE_COMPONENTS;

  itemsByCategory(category: StyleguideCategory) {
    return this.components.filter((item) => item.category === category);
  }
}
