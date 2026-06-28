import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SpacesService, SpaceResponse } from '../spaces.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { extractApiErrorMessage } from '../utils/api-error.utils';

@Component({
  selector: 'app-espacos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './espacos.component.html',
  styleUrl: './espacos.component.scss'
})
export class EspacosComponent implements OnInit {
  spaces: SpaceResponse[] = [];
  loading = false;
  saving = false;

  novoNome = '';
  novaSenha = '';

  editingId: string | null = null;
  editNome = '';
  editSenha = '';

  enteringId: string | null = null;
  passwordPromptId: string | null = null;
  passwordPromptNome = '';
  passwordPromptValue = '';
  passwordPromptError = '';

  deletingId: string | null = null;

  constructor(
    private spacesService: SpacesService,
    private uiFeedback: UiFeedbackService
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.spacesService.list().subscribe({
      next: (data) => {
        this.spaces = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao carregar espaços.'));
      }
    });
  }

  criar(): void {
    const nome = this.novoNome.trim();
    if (!nome) {
      this.uiFeedback.warning('Informe o nome do espaço.');
      return;
    }

    this.saving = true;
    this.spacesService.create({ name: nome, password: this.novaSenha || null }).subscribe({
      next: () => {
        this.saving = false;
        this.novoNome = '';
        this.novaSenha = '';
        this.uiFeedback.success('Espaço criado.');
        this.carregar();
      },
      error: (err) => {
        this.saving = false;
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao criar espaço.'));
      }
    });
  }

  iniciarEdicao(space: SpaceResponse): void {
    this.editingId = space.id;
    this.editNome = space.name;
    this.editSenha = '';
  }

  cancelarEdicao(): void {
    this.editingId = null;
    this.editNome = '';
    this.editSenha = '';
  }

  salvarEdicao(space: SpaceResponse): void {
    const nome = this.editNome.trim();
    if (!nome) {
      this.uiFeedback.warning('Informe o nome do espaço.');
      return;
    }

    this.saving = true;
    this.spacesService.update(space.id, { name: nome, password: this.editSenha || null }).subscribe({
      next: () => {
        this.saving = false;
        this.cancelarEdicao();
        this.uiFeedback.success('Espaço atualizado.');
        this.carregar();
      },
      error: (err) => {
        this.saving = false;
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao atualizar espaço.'));
      }
    });
  }

  excluir(space: SpaceResponse): void {
    if (!confirm(`Excluir o espaço "${space.name}"? Os dados desse espaço deixarão de aparecer, mas não serão apagados.`)) {
      return;
    }

    this.deletingId = space.id;
    this.spacesService.delete(space.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.uiFeedback.success('Espaço excluído.');
        this.carregar();
      },
      error: (err) => {
        this.deletingId = null;
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao excluir espaço.'));
      }
    });
  }

  entrar(space: SpaceResponse): void {
    if (space.hasPassword) {
      this.passwordPromptId = space.id;
      this.passwordPromptNome = space.name;
      this.passwordPromptValue = '';
      this.passwordPromptError = '';
      return;
    }

    this.confirmarEntrada(space.id, null);
  }

  confirmarSenhaPrompt(): void {
    if (!this.passwordPromptId) return;
    this.confirmarEntrada(this.passwordPromptId, this.passwordPromptValue);
  }

  cancelarSenhaPrompt(): void {
    this.passwordPromptId = null;
    this.passwordPromptNome = '';
    this.passwordPromptValue = '';
    this.passwordPromptError = '';
  }

  private confirmarEntrada(id: string, password: string | null): void {
    this.enteringId = id;
    this.spacesService.enter(id, { password }).subscribe({
      next: () => {
        this.enteringId = null;
        this.passwordPromptId = null;
        window.location.href = '/dashboard';
      },
      error: (err) => {
        this.enteringId = null;
        if (this.passwordPromptId) {
          this.passwordPromptError = extractApiErrorMessage(err, 'Senha inválida.');
        } else {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao entrar no espaço.'));
        }
      }
    });
  }
}
