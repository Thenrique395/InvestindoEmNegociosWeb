import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SpacesService, SpaceResponse } from '../spaces.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { SectionCardComponent } from '../shared/section-card/section-card.component';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  selector: 'app-espacos',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, SectionCardComponent, FormFieldComponent, ConfirmDialogComponent, StatusBadgeComponent, UiStateComponent, EmptyStateComponent],
  templateUrl: './espacos.component.html',
  styleUrl: './espacos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EspacosComponent implements OnInit {
  private readonly _spaces = signal<SpaceResponse[]>([]);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _spaceToDelete = signal<SpaceResponse | null>(null);

  private readonly _editingId = signal<string | null>(null);
  private readonly _enteringId = signal<string | null>(null);
  private readonly _deletingId = signal<string | null>(null);

  private readonly _passwordPromptId = signal<string | null>(null);
  private readonly _passwordPromptNome = signal('');
  private readonly _passwordPromptError = signal('');

  readonly spaces = this._spaces.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly spaceToDelete = this._spaceToDelete.asReadonly();
  readonly editingId = this._editingId.asReadonly();
  readonly enteringId = this._enteringId.asReadonly();
  readonly deletingId = this._deletingId.asReadonly();
  readonly passwordPromptId = this._passwordPromptId.asReadonly();
  readonly passwordPromptError = this._passwordPromptError.asReadonly();

  readonly passwordPromptLabel = computed(() => `Senha do espaço "${this._passwordPromptNome()}"`);

  /**
   * Campos de `[(ngModel)]`: três formulários independentes de um ou dois campos,
   * dentro do que ARQUITETURA_ANGULAR.md §4 permite. Ficam como signals para que
   * o `OnPush` enxergue a digitação.
   */
  readonly novoNome = signal('');
  readonly novaSenha = signal('');
  readonly editNome = signal('');
  readonly editSenha = signal('');
  readonly passwordPromptValue = signal('');

  constructor(
    private spacesService: SpacesService,
    private uiFeedback: UiFeedbackService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this._loading.set(true);
    this.spacesService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this._spaces.set(data);
        this._loading.set(false);
      },
      error: (err) => {
        this._loading.set(false);
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao carregar espaços.'));
      }
    });
  }

  criar(): void {
    const nome = this.novoNome().trim();
    if (!nome) {
      this.uiFeedback.warning('Informe o nome do espaço.');
      return;
    }

    this._saving.set(true);
    this.spacesService.create({ name: nome, password: this.novaSenha() || null }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this._saving.set(false);
        this.novoNome.set('');
        this.novaSenha.set('');
        this.uiFeedback.success('Espaço criado.');
        this.carregar();
      },
      error: (err) => {
        this._saving.set(false);
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao criar espaço.'));
      }
    });
  }

  iniciarEdicao(space: SpaceResponse): void {
    this._editingId.set(space.id);
    this.editNome.set(space.name);
    this.editSenha.set('');
  }

  cancelarEdicao(): void {
    this._editingId.set(null);
    this.editNome.set('');
    this.editSenha.set('');
  }

  salvarEdicao(space: SpaceResponse): void {
    const nome = this.editNome().trim();
    if (!nome) {
      this.uiFeedback.warning('Informe o nome do espaço.');
      return;
    }

    this._saving.set(true);
    this.spacesService.update(space.id, { name: nome, password: this.editSenha() || null }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this._saving.set(false);
        this.cancelarEdicao();
        this.uiFeedback.success('Espaço atualizado.');
        this.carregar();
      },
      error: (err) => {
        this._saving.set(false);
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao atualizar espaço.'));
      }
    });
  }

  excluir(space: SpaceResponse): void {
    this._spaceToDelete.set(space);
  }

  cancelarExclusao(): void {
    this._spaceToDelete.set(null);
  }

  confirmarExclusao(): void {
    const space = this._spaceToDelete();
    if (!space) return;
    this._spaceToDelete.set(null);

    this._deletingId.set(space.id);
    this.spacesService.delete(space.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this._deletingId.set(null);
        this.uiFeedback.success('Espaço excluído.');
        this.carregar();
      },
      error: (err) => {
        this._deletingId.set(null);
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao excluir espaço.'));
      }
    });
  }

  entrar(space: SpaceResponse): void {
    if (space.hasPassword) {
      this._passwordPromptId.set(space.id);
      this._passwordPromptNome.set(space.name);
      this.passwordPromptValue.set('');
      this._passwordPromptError.set('');
      return;
    }

    this.confirmarEntrada(space.id, null);
  }

  confirmarSenhaPrompt(): void {
    const id = this._passwordPromptId();
    if (!id) return;
    this.confirmarEntrada(id, this.passwordPromptValue());
  }

  cancelarSenhaPrompt(): void {
    this._passwordPromptId.set(null);
    this._passwordPromptNome.set('');
    this.passwordPromptValue.set('');
    this._passwordPromptError.set('');
  }

  private confirmarEntrada(id: string, password: string | null): void {
    this._enteringId.set(id);
    this.spacesService.enter(id, { password }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this._enteringId.set(null);
        this._passwordPromptId.set(null);
        window.location.href = '/dashboard';
      },
      error: (err) => {
        this._enteringId.set(null);
        if (this._passwordPromptId()) {
          this._passwordPromptError.set(extractApiErrorMessage(err, 'Senha inválida.'));
        } else {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao entrar no espaço.'));
        }
      }
    });
  }
}
