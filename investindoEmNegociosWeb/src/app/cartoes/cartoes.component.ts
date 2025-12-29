import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Subscription } from 'rxjs';
import { LocalDbService, StoredCard, StoredExpense } from '../data/local-db.service';
import { CartoesListagemComponent } from './cartoes-listagem.component';

@Component({
  selector: 'app-cartoes',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, CartoesListagemComponent],
  templateUrl: './cartoes.component.html',
  styleUrls: ['./cartoes.component.scss']
})
export class CartoesComponent implements OnInit, OnDestroy {
  bandeira = 'mastercard';
  numero = '';
  nome = '';
  vencimento = '';
  cvv = '';
  mostrarNumero = false;
  mostrarCvv = false;
  cards: StoredCard[] = [];
  expenses: StoredExpense[] = [];
  mostrarModal = false;
  editandoId: string | null = null;
  alerta = '';
  private sub?: Subscription;
  private expensesSub?: Subscription;

  constructor(private db: LocalDbService) {}

  ngOnInit(): void {
    this.sub = this.db.cards$.subscribe((lista) => {
      const user = this.currentUser;
      this.cards = lista.filter((c) => (c.userId ? c.userId === user : true));
    });
    this.expensesSub = this.db.expenses$.subscribe((lista) => {
      this.expenses = lista;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.expensesSub?.unsubscribe();
  }

  get numeroFormatado(): string {
    const digits = this.numero.replace(/\D/g, '');
    return this.formatarNumeroParaDisplay(digits);
  }

  salvar(): void {
    if (!this.numero || !this.nome || !this.vencimento || !this.cvv) return;
    const numeroLimpo = this.numero.replace(/\D/g, '').slice(0, 16);
    const cvvLimpo = this.cvv.replace(/\D/g, '').slice(0, 3);
    const payload = {
      bandeira: this.bandeira,
      numero: numeroLimpo,
      nome: this.nome,
      vencimento: this.vencimento,
      cvv: cvvLimpo,
      userId: this.currentUser
    };

    if (this.editandoId) {
      this.db.updateCard(this.editandoId, payload);
    } else {
      this.db.addCard(payload);
    }

    this.fecharModal();
    this.numero = '';
    this.nome = '';
    this.vencimento = '';
    this.cvv = '';
    this.bandeira = 'mastercard';
    this.editandoId = null;
  }

  abrirModal(): void {
    this.mostrarModal = true;
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.mostrarNumero = false;
    this.mostrarCvv = false;
    this.editandoId = null;
    this.bandeira = 'mastercard';
    this.numero = '';
    this.nome = '';
    this.vencimento = '';
    this.cvv = '';
  }

  remover(id: string): void {
    const possuiDespesa = this.expenses.some((e) => e.cartao === id);
    if (possuiDespesa) {
      this.alerta = 'Não é possível remover este cartão; existem despesas vinculadas a ele.';
      setTimeout(() => (this.alerta = ''), 4000);
      return;
    }
    this.db.removeCard(id);
  }

  onNumeroInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const raw = target?.value ?? '';
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    const formatted = this.formatarNumeroEntrada(digits);
    this.numero = formatted;
    if (target) target.value = formatted;
  }

  onVencimentoInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const raw = target?.value ?? '';
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    const mm = digits.slice(0, 2);
    const yy = digits.slice(2, 4);
    const masked = [mm, yy].filter(Boolean).join('/');
    this.vencimento = masked;
    if (target) target.value = masked;
  }

  onCvvInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const raw = target?.value ?? '';
    const digits = raw.replace(/\D/g, '').slice(0, 3);
    this.cvv = digits;
    if (target) target.value = digits;
  }

  editar(card: StoredCard): void {
    this.editandoId = card.id;
    this.mostrarModal = true;
    this.bandeira = card.bandeira;
    this.numero = this.formatarNumeroEntrada(card.numero.replace(/\D/g, ''));
    this.nome = card.nome;
    this.vencimento = card.vencimento;
    this.cvv = card.cvv.replace(/\D/g, '').slice(0, 3);
  }

  toggleNumero(): void {
    this.mostrarNumero = !this.mostrarNumero;
  }

  toggleCvv(): void {
    this.mostrarCvv = !this.mostrarCvv;
  }

  private formatarNumeroParaDisplay(numero: string): string {
    const num = numero.replace(/\s+/g, '');
    const padded = num.padEnd(16, '•').slice(0, 16);
    return padded.match(/.{1,4}/g)?.join(' ') || '';
  }

  private formatarNumeroEntrada(digits: string): string {
    return digits.match(/.{1,4}/g)?.join(' ') || digits;
  }

  private get currentUser(): string {
    if (typeof localStorage === 'undefined') return 'guest';
    return localStorage.getItem('current_user') || 'guest';
  }
}
