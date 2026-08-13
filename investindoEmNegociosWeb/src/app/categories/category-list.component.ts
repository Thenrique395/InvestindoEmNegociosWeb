import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { CategoryIconComponent } from '../shared/category-icon/category-icon.component';
import { CategoryView } from './categories-overview.model';

/**
 * Lista responsiva de categorias — tabela no desktop, cards no mobile.
 * Ações dependem do papel: o dono exclui as personalizadas; o administrador
 * edita e ativa/desativa as categorias de sistema (padrão).
 */
@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [StatusBadgeComponent, CategoryIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cl">
      <table class="cl__table">
        <thead>
          <tr>
            <th scope="col">Categoria</th>
            <th scope="col">Tipo</th>
            <th scope="col">Status</th>
            <th scope="col" class="cl__right">Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (view of views(); track view.category.id) {
            <tr>
              <td>
                <div class="cl__cat">
                  <app-category-icon [icon]="view.icon" [color]="view.color" size="sm" />
                  <div class="cl__cat-main">
                    <span class="cl__name">{{ view.category.name }}</span>
                    <app-status-badge [tone]="view.origin === 'default' ? 'info' : 'muted'" size="sm"
                      [label]="view.origin === 'default' ? 'Sistema' : 'Minha categoria'" />
                  </div>
                </div>
              </td>
              <td><app-status-badge [tone]="typeTone(view)" size="sm" [label]="typeLabel(view)" /></td>
              <td>
                <app-status-badge [tone]="view.isActive ? 'success' : 'muted'" size="sm" [label]="view.isActive ? 'Ativa' : 'Inativa'" [dot]="true" />
              </td>
              <td class="cl__right">
                <div class="cl__actions">
                  @if (isAdmin() && view.origin === 'default') {
                    <button type="button" class="cl__action" (click)="edit.emit(view)" [attr.aria-label]="'Editar categoria de sistema ' + view.category.name">Editar</button>
                    <button type="button" class="cl__action" (click)="toggleStatus.emit(view)" [attr.aria-label]="(view.isActive ? 'Desativar' : 'Ativar') + ' categoria ' + view.category.name">{{ view.isActive ? 'Desativar' : 'Ativar' }}</button>
                  } @else if (view.origin === 'custom') {
                    <button type="button" class="cl__action" (click)="toggleStatus.emit(view)" [attr.aria-label]="(view.isActive ? 'Desativar' : 'Ativar') + ' categoria ' + view.category.name">{{ view.isActive ? 'Desativar' : 'Ativar' }}</button>
                    <button type="button" class="cl__action cl__action--danger" (click)="remove.emit(view)" [attr.aria-label]="'Excluir categoria ' + view.category.name">Excluir</button>
                  } @else {
                    <span class="cl__readonly">—</span>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <ul class="cl__cards">
        @for (view of views(); track view.category.id) {
          <li class="cl__card">
            <div class="cl__card-head">
              <app-category-icon [icon]="view.icon" [color]="view.color" size="sm" />
              <div class="cl__cat-main">
                <span class="cl__name">{{ view.category.name }}</span>
                <div class="cl__badges">
                  <app-status-badge [tone]="typeTone(view)" size="sm" [label]="typeLabel(view)" />
                  <app-status-badge [tone]="view.origin === 'default' ? 'info' : 'muted'" size="sm" [label]="view.origin === 'default' ? 'Sistema' : 'Minha categoria'" />
                  <app-status-badge [tone]="view.isActive ? 'success' : 'muted'" size="sm" [label]="view.isActive ? 'Ativa' : 'Inativa'" [dot]="true" />
                </div>
              </div>
            </div>
            @if ((isAdmin() && view.origin === 'default') || view.origin === 'custom') {
              <div class="cl__actions">
                @if (isAdmin() && view.origin === 'default') {
                  <button type="button" class="cl__action" (click)="edit.emit(view)">Editar</button>
                  <button type="button" class="cl__action" (click)="toggleStatus.emit(view)">{{ view.isActive ? 'Desativar' : 'Ativar' }}</button>
                } @else {
                  <button type="button" class="cl__action" (click)="toggleStatus.emit(view)">{{ view.isActive ? 'Desativar' : 'Ativar' }}</button>
                  <button type="button" class="cl__action cl__action--danger" (click)="remove.emit(view)">Excluir</button>
                }
              </div>
            }
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host { display: block; }
    .cl__table { width: 100%; border-collapse: collapse; font-size: var(--fs-meta, 0.85rem); }
    .cl__table thead th {
      text-align: left; padding: 0.55rem 0.75rem; font-size: var(--fs-caption, 0.7rem);
      text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); border-bottom: 1px solid var(--border);
    }
    .cl__table tbody td { padding: 0.7rem 0.75rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .cl__right { text-align: right; }
    .cl__cat { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
    .cl__cat-main { display: grid; gap: 3px; min-width: 0; }
    .cl__name { font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cl__readonly { color: var(--text-tertiary); }
    .cl__actions { display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
    .cl__action {
      border: 1px solid var(--border); border-radius: var(--radius-control, 10px); padding: 6px 10px;
      background: var(--surface); color: var(--text); font-size: var(--fs-caption, 0.75rem); font-weight: 600; cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .cl__action:hover { background: var(--surface-sunken); border-color: var(--border-strong, var(--primary)); }
    .cl__action:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .cl__action--danger { color: var(--expense-text); }
    .cl__action--danger:hover { border-color: var(--expense-tint); background: var(--expense-tint); }

    .cl__cards { display: none; list-style: none; margin: 0; padding: 0; }
    .cl__card {
      display: grid; gap: 0.6rem; padding: 0.9rem; border: 1px solid var(--border);
      border-radius: var(--radius-inner, 14px); background: var(--surface); margin-bottom: 10px;
    }
    .cl__card-head { display: flex; align-items: flex-start; gap: 0.7rem; }
    .cl__badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .cl__card .cl__actions { justify-content: flex-start; }

    @media (max-width: 760px) {
      .cl__table { display: none; }
      .cl__cards { display: block; }
    }
  `
})
export class CategoryListComponent {
  readonly views = input.required<CategoryView[]>();
  readonly isAdmin = input<boolean>(false);

  readonly edit = output<CategoryView>();
  readonly toggleStatus = output<CategoryView>();
  readonly remove = output<CategoryView>();

  typeLabel(view: CategoryView): string {
    if (view.category.appliesTo === 'Income') return 'Receita';
    if (view.category.appliesTo === 'Expense') return 'Despesa';
    return 'Ambos';
  }

  typeTone(view: CategoryView): 'success' | 'danger' | 'muted' {
    if (view.category.appliesTo === 'Income') return 'success';
    if (view.category.appliesTo === 'Expense') return 'danger';
    return 'muted';
  }
}
