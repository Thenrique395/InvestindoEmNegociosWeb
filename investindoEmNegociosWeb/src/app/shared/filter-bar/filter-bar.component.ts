import { Component, input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div class="flex flex-wrap items-center gap-2">
        <ng-content select="[filter-left]"></ng-content>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <ng-content select="[filter-right]"></ng-content>
      </div>
    </div>
  `
})
export class FilterBarComponent {
  readonly sticky = input<boolean>(false);
}
