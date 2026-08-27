import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { STYLEGUIDE_CATEGORY_LABELS, STYLEGUIDE_COMPONENTS } from './styleguide-catalog';

@Component({
  selector: 'app-styleguide-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './styleguide-overview.component.html',
  styleUrl: './styleguide-content.scss'
})
export class StyleguideOverviewComponent {
  readonly categoryLabels = STYLEGUIDE_CATEGORY_LABELS;
  readonly components = STYLEGUIDE_COMPONENTS;
}
