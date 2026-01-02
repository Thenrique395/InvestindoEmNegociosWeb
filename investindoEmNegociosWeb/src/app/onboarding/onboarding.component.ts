import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent {
  form: FormGroup;
  loading = false;
  feedback = '';
  error = '';

  constructor(private fb: FormBuilder, private profile: ProfileService, private router: Router) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      document: ['', [Validators.required, this.cpfValidator()]],
      phone: ['', [Validators.required, this.phoneValidator()]],
      birthDate: ['']
    });

    this.profile.getProfile().subscribe({
      next: (data) => {
        if (data) {
          this.form.patchValue({
            fullName: data.fullName,
            document: this.maskCpf(data.document),
            phone: this.maskPhone(data.phone),
            birthDate: data.birthDate ? data.birthDate.substring(0, 10) : ''
          });
        }
      },
      error: (err) => {
        if (err.status === 401) {
          this.router.navigateByUrl('/login');
        }
      }
    });
  }

  submit(): void {
    if (this.loading) return;
    this.feedback = '';
    this.error = '';

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      this.error = 'Você precisa estar autenticado. Faça login novamente.';
      this.router.navigateByUrl('/login');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revise os campos.';
      return;
    }

    this.loading = true;
    const payload = this.normalizePayload();
    this.profile.upsert(payload).subscribe({
      next: () => {
        this.feedback = 'Dados salvos! Você já pode usar o app.';
        this.loading = false;
        setTimeout(() => this.router.navigateByUrl('/login'), 1200);
      },
      error: (err) => {
        if (err?.status === 401) {
          this.error = 'Sessão expirada. Faça login novamente.';
          this.router.navigateByUrl('/login');
        } else {
          this.error = err instanceof Error ? err.message : 'Erro ao salvar dados.';
        }
        this.loading = false;
      }
    });
  }

  hasError(control: 'fullName' | 'document' | 'phone', type: string): boolean {
    const c = this.form.get(control);
    return !!c && c.touched && c.hasError(type);
  }

  onCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = (input.value || '').replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');

    this.form.get('document')?.setValue(masked, { emitEvent: false });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = (input.value || '').replace(/\D/g, '').slice(0, 13);
    let masked = digits;
    if (digits.length >= 1) masked = `+${digits}`;
    if (digits.length > 2) masked = `+${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length > 4) masked = `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;

    this.form.get('phone')?.setValue(masked, { emitEvent: false });
  }

  private normalizePayload() {
    const raw = this.form.value;
    const docDigits = (raw.document as string).replace(/\D/g, '').slice(0, 11);
    const phoneDigits = (raw.phone as string).replace(/\D/g, '').slice(0, 13);
    const formattedPhone =
      phoneDigits.length === 13
        ? `+${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 4)} ${phoneDigits.slice(4)}`
        : raw.phone;
    const birthDateIso = raw.birthDate ? `${raw.birthDate}T00:00:00Z` : undefined;

    return {
      fullName: (raw.fullName as string).trim(),
      document: docDigits,
      phone: formattedPhone,
      birthDate: birthDateIso
    };
  }

  private cpfValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const digits = (control.value || '').toString().replace(/\D/g, '');
      return digits.length === 11 ? null : { cpf: true };
    };
  }

  private phoneValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const digits = (control.value || '').toString().replace(/\D/g, '');
      return digits.length === 13 ? null : { phone: true };
    };
  }

  private maskCpf(value: string): string {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }

  private maskPhone(value: string): string {
    const digits = (value || '').replace(/\D/g, '').slice(0, 13);
    if (!digits) return '';
    if (digits.length <= 2) return `+${digits}`;
    if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  }
}
