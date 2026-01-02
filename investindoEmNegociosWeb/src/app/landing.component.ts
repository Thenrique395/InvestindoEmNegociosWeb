import { Component } from '@angular/core';

/**
 * Página pública inicial (conteúdo principal já está no app.component hero).
 * Mantemos componente vazio só para a rota raiz.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  template: `<div class="landing-shell"></div>`
})
export class LandingComponent {}
