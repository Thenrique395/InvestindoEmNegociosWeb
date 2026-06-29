import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appResponsiveListCell]',
  standalone: true
})
export class ResponsiveListCellDirective {
  @Input('appResponsiveListCell') column = '';

  constructor(public readonly template: TemplateRef<{ $implicit: unknown }>) {}
}
