import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../profile.service';
import { OnboardingService } from '../onboarding.service';
import { FocusArea } from './onboarding.types';
import { UiFeedbackService } from '../ui-feedback.service';
import { AccountRequest, AccountType, AccountsService } from '../accounts.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent implements OnInit {
  form: FormGroup;
  loading = false;
  creatingAccount = false;
  step = 0;
  focus: FocusArea | null = null;
  focusOptions: { id: FocusArea; title: string; description: string }[] = [
    {
      id: 'receitas',
      title: 'Organizar receitas',
      description: 'Cadastre suas fontes e recorrencias.'
    },
    {
      id: 'despesas',
      title: 'Controlar despesas',
      description: 'Entenda para onde vai o dinheiro.'
    },
    {
      id: 'metas',
      title: 'Definir metas',
      description: 'Planeje objetivos com clareza.'
    }
  ];
  accountReady = false;
  accountForm: AccountRequest = {
    name: '',
    type: 'Checking',
    initialBalance: 0,
    isActive: true
  };
  accountTypes: AccountType[] = ['Checking', 'Savings', 'DigitalWallet', 'Cash', 'Other'];

  constructor(
    private fb: FormBuilder,
    private profile: ProfileService,
    private router: Router,
    private onboarding: OnboardingService,
    private uiFeedback: UiFeedbackService,
    private accountsService: AccountsService
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      document: ['', [Validators.required, this.cpfValidator()]],
      phone: ['', [Validators.required, this.phoneValidator()]],
      birthDate: [''],
      city: ['', [Validators.required]],
      state: ['', [Validators.required, Validators.minLength(2)]],
      country: ['', [Validators.required]]
    });

    this.profile.getProfile().subscribe({
      next: (data) => {
        if (data) {
          this.form.patchValue({
            fullName: data.fullName,
            document: this.maskCpf(data.document),
            phone: this.maskPhone(data.phone),
            birthDate: data.birthDate ? data.birthDate.substring(0, 10) : '',
            city: data.city ?? '',
            state: data.state ?? '',
            country: data.country ?? ''
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

  ngOnInit(): void {
    this.onboarding.getStatus().subscribe({
      next: (status) => {
        if (status.completed) {
          this.router.navigateByUrl('/dashboard');
          return;
        }
        this.step = Math.min(Math.max(status.step || 0, 0), 2);
      },
      error: () => {
        /* ignore */
      }
    });

    this.accountsService.list().subscribe({
      next: (accounts) => {
        const active = (accounts || []).filter((a) => a.isActive);
        this.accountReady = active.length > 0;
        if (this.accountReady) {
          this.accountsService.resolveDefaultAccountId(active);
        }
      },
      error: () => {
        this.accountReady = false;
      }
    });
  }

  submit(): void {
    if (this.loading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.uiFeedback.warning('Revise os campos.');
      return;
    }

    this.loading = true;
    const payload = this.normalizePayload();
    this.profile.upsert(payload).subscribe({
      next: () => {
        this.loading = false;
        this.uiFeedback.success('Dados salvos! Vamos para o proximo passo.');
        this.nextStep();
      },
      error: (err) => {
        if (err?.status === 401) {
          this.uiFeedback.error('Sessão expirada. Faça login novamente.');
          this.router.navigateByUrl('/login');
        } else {
          this.uiFeedback.error(err instanceof Error ? err.message : 'Erro ao salvar dados.');
        }
        this.loading = false;
      }
    });
  }

  nextStep(): void {
    if (this.step >= 2) {
      this.finishOnboarding();
      return;
    }
    this.step += 1;
    this.persistStep(false);
  }

  prevStep(): void {
    if (this.step <= 0) return;
    this.step -= 1;
    this.persistStep(false);
  }

  selectFocus(id: FocusArea): void {
    this.focus = id;
  }

  continueFromFocus(): void {
    this.nextStep();
  }

  finishOnboarding(): void {
    if (!this.accountReady) {
      this.uiFeedback.warning('Crie uma conta para concluir o cadastro.');
      this.step = 2;
      return;
    }
    this.persistStep(true);
    this.router.navigateByUrl('/dashboard');
  }

  skipOnboarding(): void {
    this.uiFeedback.warning('Para concluir, crie ao menos uma conta.');
    this.step = 2;
  }

  createAccount(): void {
    if (this.creatingAccount) return;
    if (!this.accountForm.name?.trim()) {
      this.uiFeedback.warning('Informe o nome da conta.');
      return;
    }

    this.creatingAccount = true;
    this.accountsService.create({
      name: this.accountForm.name.trim(),
      type: this.accountForm.type,
      initialBalance: Number(this.accountForm.initialBalance || 0),
      isActive: true
    }).subscribe({
      next: (account) => {
        this.creatingAccount = false;
        this.accountReady = true;
        this.accountsService.setDefaultAccountId(account.id);
        this.uiFeedback.success('Conta criada com sucesso.');
      },
      error: (err) => {
        this.creatingAccount = false;
        this.uiFeedback.error(err?.error?.detail || 'Falha ao criar conta.');
      }
    });
  }

  accountTypeLabel(type: AccountType): string {
    switch (type) {
      case 'Checking': return 'Conta corrente';
      case 'Savings': return 'Poupança';
      case 'DigitalWallet': return 'Carteira digital';
      case 'Cash': return 'Dinheiro';
      default: return 'Outro';
    }
  }

  hasError(control: 'fullName' | 'document' | 'phone' | 'city' | 'state' | 'country', type: string): boolean {
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
      birthDate: birthDateIso,
      avatarUrl: '',
      city: (raw.city as string).trim(),
      state: (raw.state as string).trim().toUpperCase(),
      country: (raw.country as string).trim(),
      language: 'pt-BR'
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

  private persistStep(completed: boolean): void {
    this.onboarding.updateStatus({ step: this.step, completed }).subscribe({
      error: () => {
        /* ignore */
      }
    });
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
  trackByIndex(index: number): number {
    return index;
  }

}
