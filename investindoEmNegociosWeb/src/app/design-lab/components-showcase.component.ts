import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { SectionCardComponent } from '../shared/section-card/section-card.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { FilterBarComponent } from '../shared/filter-bar/filter-bar.component';
import { ModalComponent } from '../shared/modal/modal.component';

@Component({
  selector: 'app-components-showcase',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, SectionCardComponent, StatusBadgeComponent, FilterBarComponent, ModalComponent],
  template: `
    <div class="p-6 space-y-6">

      <app-page-header title="Design System" description="Visualização dos componentes reutilizáveis">
        <button page-actions class="btn-primary">Ação</button>
      </app-page-header>

      <app-section-card title="StatusBadge">
        <div class="flex gap-2">
          <app-status-badge tone="success" label="Sucesso"></app-status-badge>
          <app-status-badge tone="danger" label="Erro"></app-status-badge>
          <app-status-badge tone="warning" label="Aviso"></app-status-badge>
          <app-status-badge tone="info" label="Info"></app-status-badge>
        </div>
      </app-section-card>

      <app-section-card title="FilterBar">
        <app-filter-bar>
          <div filter-left>
            <input placeholder="Buscar..." />
          </div>
          <div filter-right>
            <button class="btn-primary">Novo</button>
          </div>
        </app-filter-bar>
      </app-section-card>

      <app-section-card title="Modal (exemplo)">
        <button class="btn-primary" (click)="open = true">Abrir modal</button>

        <app-modal [open]="open" title="Exemplo" (close)="open = false">
          <div modal-body>
            Conteúdo do modal
          </div>
          <div modal-footer>
            <button class="btn-ghost" (click)="open = false">Cancelar</button>
            <button class="btn-primary">Confirmar</button>
          </div>
        </app-modal>
      </app-section-card>

    </div>
  `
})
export class ComponentsShowcaseComponent {
  open = false;
}
