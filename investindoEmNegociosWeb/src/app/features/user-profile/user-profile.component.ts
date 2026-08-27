import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ProfileService, UserProfile } from '../../core/profile.service';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { SectionCardComponent } from '../../shared/section-card/section-card.component';
import { DatePickerComponent } from '../../shared/date-picker/date-picker.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, SectionCardComponent, DatePickerComponent],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  nome = '';
  email = '';
  documento = '';
  avatarUrl = '';
  avatarUploading = false;
  idioma = 'pt-BR';
  telefone = '';
  dataNascimento = '';
  cidade = '';
  estado = '';
  pais = '';
  carryOverDay = 1;
  readonly carryOverDayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
  intelligenceMode: 'A' | 'B' | 'C' = 'B';

  senhaAtual = '';
  novaSenha = '';
  confirmaSenha = '';

  loading = false;

  constructor(private profileService: ProfileService, private uiFeedback: UiFeedbackService, private readonly destroyRef: DestroyRef) {}

  ngOnInit(): void {
    this.profileService.getProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      if (!p) return;
      this.nome = p.fullName;
      this.documento = p.document;
      this.telefone = p.phone;
      this.dataNascimento = p.birthDate || '';
      this.avatarUrl = p.avatarUrl || '';
      this.cidade = p.city || '';
      this.estado = p.state || '';
      this.pais = p.country || '';
      this.carryOverDay = Number.isInteger(p.carryOverDay) && (p.carryOverDay ?? 0) >= 1 && (p.carryOverDay ?? 0) <= 31
        ? (p.carryOverDay as number)
        : 1;
      this.intelligenceMode =
        p.intelligenceMode === 'C' || p.intelligenceMode === 'A' ? p.intelligenceMode : 'B';
      this.idioma = p.language || 'pt-BR';
      this.email = p.email || '';
    });
  }

  onAvatarFileChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.uiFeedback.warning('Selecione uma imagem válida.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.uiFeedback.warning('Imagem muito grande. Use até 2MB.');
      return;
    }
    this.avatarUploading = true;
    this.profileService.uploadAvatar(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (profile) => {
        this.avatarUrl = profile.avatarUrl || '';
        this.avatarUploading = false;
      },
      error: (err) => {
        this.avatarUploading = false;
        this.uiFeedback.error(err?.message || 'Falha ao enviar a imagem.');
      }
    });
  }

  limparAvatar(): void {
    this.avatarUrl = '';
  }

  salvarPerfil(): void {
    const payload: Partial<UserProfile> = {
      fullName: this.nome,
      phone: this.telefone,
      birthDate: this.dataNascimento || null,
      avatarUrl: this.avatarUrl,
      city: this.cidade,
      state: this.estado,
      country: this.pais,
      carryOverDay: this.carryOverDay,
      intelligenceMode: this.intelligenceMode,
      language: this.idioma
    };
    this.loading = true;
    this.profileService.upsert(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    this.profileService.changePassword({ currentPassword: this.senhaAtual, newPassword: this.novaSenha }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
