import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfileService, UserProfile } from '../profile.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  nome = '';
  email = '';
  documento = '';
  avatarUrl = '';
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

  constructor(private profileService: ProfileService) {}

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
        localStorage.setItem('current_user_name', this.nome);
        localStorage.setItem('lang', this.idioma);
        this.loading = false;
        alert('Perfil atualizado.');
      },
      error: () => {
        this.loading = false;
        alert('Falha ao atualizar perfil.');
      }
    });
  }

  alterarSenha(): void {
    if (!this.novaSenha || this.novaSenha !== this.confirmaSenha) {
      alert('Confirme a nova senha corretamente.');
      return;
    }
    this.profileService.changePassword({ currentPassword: this.senhaAtual, newPassword: this.novaSenha }).subscribe({
      next: () => {
        alert('Senha alterada.');
        this.senhaAtual = this.novaSenha = this.confirmaSenha = '';
      },
      error: () => {
        alert('Falha ao alterar senha.');
      }
    });
  }
}
