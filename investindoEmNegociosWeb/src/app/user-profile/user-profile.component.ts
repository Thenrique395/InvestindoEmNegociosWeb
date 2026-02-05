import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ProfileService, UserProfile } from '../profile.service';
import { UiFeedbackService } from '../ui-feedback.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  nome = '';
  email = '';
  documento = '';
  avatarUrl = '';
  avatarError = '';
  avatarUploading = false;
  idioma = 'pt-BR';
  telefone = '';
  dataNascimento = '';
  cidade = '';
  estado = '';
  pais = '';

  senhaAtual = '';
  novaSenha = '';
  confirmaSenha = '';

  loading = false;

  constructor(private profileService: ProfileService, private uiFeedback: UiFeedbackService) {}

  ngOnInit(): void {
    this.profileService.getProfile().subscribe((p) => {
      if (!p) return;
      this.nome = p.fullName;
      this.documento = p.document;
      this.telefone = p.phone;
      this.dataNascimento = p.birthDate || '';
      this.avatarUrl = p.avatarUrl || '';
      this.cidade = p.city || '';
      this.estado = p.state || '';
      this.pais = p.country || '';
      this.idioma = p.language || 'pt-BR';
      this.email = ''; // email viria de outro endpoint; placeholder
    });
  }

  onAvatarFileChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.avatarError = 'Selecione uma imagem válida.';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.avatarError = 'Imagem muito grande. Use até 2MB.';
      return;
    }
    this.avatarUploading = true;
    this.avatarError = '';
    this.profileService.uploadAvatar(file).subscribe({
      next: (profile) => {
        this.avatarUrl = profile.avatarUrl || '';
        this.avatarUploading = false;
      },
      error: (err) => {
        this.avatarUploading = false;
        this.avatarError = err?.message || 'Falha ao enviar a imagem.';
      }
    });
  }

  limparAvatar(): void {
    this.avatarUrl = '';
    this.avatarError = '';
  }

  salvarPerfil(): void {
    const payload: Partial<UserProfile> = {
      fullName: this.nome,
      document: this.documento,
      phone: this.telefone,
      birthDate: this.dataNascimento || null,
      avatarUrl: this.avatarUrl,
      city: this.cidade,
      state: this.estado,
      country: this.pais,
      language: this.idioma
    };
    this.loading = true;
    this.profileService.upsert(payload).subscribe({
      next: () => {
        this.loading = false;
        this.uiFeedback.success('Perfil atualizado.');
      },
      error: () => {
        this.loading = false;
        this.uiFeedback.error('Falha ao atualizar perfil.');
      }
    });
  }

  alterarSenha(): void {
    if (!this.novaSenha || this.novaSenha !== this.confirmaSenha) {
      this.uiFeedback.error('Confirme a nova senha corretamente.');
      return;
    }
    this.profileService.changePassword({ currentPassword: this.senhaAtual, newPassword: this.novaSenha }).subscribe({
      next: () => {
        this.uiFeedback.success('Senha alterada.');
        this.senhaAtual = this.novaSenha = this.confirmaSenha = '';
      },
      error: () => {
        this.uiFeedback.error('Falha ao alterar senha.');
      }
    });
  }
}
