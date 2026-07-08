import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-global-search',
  standalone: true,
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'handleShortcut($event)'
  }
})
export class GlobalSearchComponent {
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  readonly shortcutLabel = isMacPlatform() ? '⌘K' : 'Ctrl K';

  handleShortcut(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchInput().nativeElement.focus();
    }
  }

  blurSearch(): void {
    this.searchInput().nativeElement.blur();
  }
}

function isMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
}
