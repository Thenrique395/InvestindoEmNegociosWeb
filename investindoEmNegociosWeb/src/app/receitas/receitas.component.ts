import { Component, OnDestroy, OnInit } from '@angular/core';
import { DecimalPipe, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredIncome } from '../data/api-data.service';
import { ReceitasListaComponent } from './receitas-lista.component';
import { ReceitasFormComponent } from './receitas-form.component';
import { maskDateDDMMYYYY, maskMoneyInput, maskMonthYear } from '../utils/input-mask';

@Component({
  selector: 'app-receitas',
  standalone: true,
  imports: [DecimalPipe, ReceitasListaComponent, ReceitasFormComponent, NgIf],
  templateUrl: './receitas.component.html',
  styleUrls: ['./receitas.component.scss']
})
export class ReceitasComponent implements OnInit, OnDestroy {
  dataAtual = new Date();
  rendasAll: StoredIncome[] = [];
  mostrarForm = false;
  novaRenda: StoredIncome = this.criaRenda();
  valorInput = '';
  recebimentoInput = '';
  fixaInicioInput = '';
  erroData = '';
  editandoId: string | null = null;
  valorSugestao: number | null = null;
  private sub?: Subscription;
  showDeleteModal = false;
  deletePlanId: string | null = null;
  deleteInstallmentId: string | null = null;
  deleteFonte = '';
  deleteIsRecurring = false;

  constructor(private db: ApiDataService) {}

  ngOnInit(): void {
    this.sub = this.db.incomes$.subscribe((lista) => {
      this.rendasAll = [...lista];
      this.valorSugestao = this.getUltimoValorParaFonte(this.novaRenda.fonte);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get rendas(): StoredIncome[] {
    const key = this.mesKey();
    const filtradas = this.rendasAll.filter((r) => this.mesKeyFromRecebimento(r.recebimento) === key);
    return filtradas.sort((a, b) => this.compareDateDesc(a.recebimento, b.recebimento));
  }

  get resumoTexto(): string {
    if (!this.valorInput) return '';
    const valor = this.valorInput;
    const data = this.recebimentoInput || 'DD/MM/AAAA';
    if (this.novaRenda.fixa) {
      const inicio = this.fixaInicioInput || 'MM/AAAA';
      return `Recebimento de ${valor} todos os meses a partir de ${inicio}.`;
    }
    return `Recebimento de ${valor} em ${data}.`;
  }

  get totalRendas(): number {
    return this.rendas.reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  get mesAtualLabel(): string {
    return this.dataAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }

  abrirModal(): void {
    this.resetarForm();
    this.mostrarForm = true;
  }

  fecharModal(): void {
    this.mostrarForm = false;
    this.resetarForm();
  }

  salvar(): void {
    const valor = this.parseValor(this.valorInput);
    if (!this.novaRenda.fonte || !valor) return;

    if (this.recebimentoInput && !this.isDataValida(this.recebimentoInput)) {
      this.erroData = 'Data inválida. Use o formato DD/MM/AAAA.';
      return;
    }
    this.erroData = '';
    const recebimentoNormalizado = this.recebimentoInput
      ? this.normalizaData(this.recebimentoInput)
      : this.formatDate(this.dataAtual);
    const fixaInicio = this.novaRenda.fixa ? this.normalizaMes(this.fixaInicioInput) : undefined;

    if (this.novaRenda.fixa) {
      if (!fixaInicio) {
        this.erroData = 'Informe o mês de início no formato MM/AAAA para receita fixa.';
        return;
      }
      this.erroData = '';
    }

    if (this.editandoId) {
      this.db.updateIncome(this.editandoId, {
        planId: this.editandoId,
        fonte: this.novaRenda.fonte,
        valor,
        recebimento: recebimentoNormalizado,
        fixa: this.novaRenda.fixa,
        fixaInicio
      });
    } else {
      this.db.addIncome({
        planId: '',
        fonte: this.novaRenda.fonte,
        valor,
        recebimento: recebimentoNormalizado,
        fixa: this.novaRenda.fixa,
        fixaInicio
      });
    }

    this.fecharModal();
  }

  editar(renda: StoredIncome): void {
    this.editandoId = renda.planId ?? null;
    this.novaRenda = { ...renda };
    this.valorInput = renda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.recebimentoInput = renda.recebimento;
    this.valorSugestao = this.getUltimoValorParaFonte(renda.fonte);
    this.fixaInicioInput = renda.fixaInicio || '';
    this.mostrarForm = true;
  }

  remover(payload: { planId?: string; installmentId: string }): void {
    const renda = this.rendasAll.find((r) => r.id === payload.installmentId);
    if (!renda) return;

    this.deletePlanId = payload.planId || null;
    this.deleteInstallmentId = payload.installmentId;
    this.deleteFonte = renda.fonte;
    this.deleteIsRecurring = renda.schedule === 'Recurring';
    this.showDeleteModal = true;
  }

  editarPorId(id: string): void {
    const renda = this.rendasAll.find((r) => r.id === id);
    if (renda) {
      this.editar(renda);
    }
  }

  confirmarExcluirSomenteEsta(): void {
    if (!this.deleteInstallmentId) return;
    this.db.removeIncomeInstallment(this.deleteInstallmentId);
    this.fecharModalExcluir();
  }

  confirmarExcluirRecorrencia(): void {
    if (!this.deletePlanId) return;
    this.db.removeIncome(this.deletePlanId);
    this.fecharModalExcluir();
  }

  fecharModalExcluir(): void {
    this.showDeleteModal = false;
    this.deletePlanId = null;
    this.deleteInstallmentId = null;
    this.deleteFonte = '';
    this.deleteIsRecurring = false;
  }

  onValorChange(raw: string): void {
    this.valorInput = maskMoneyInput(raw);
  }

  onRecebimentoChange(raw: string): void {
    this.recebimentoInput = maskDateDDMMYYYY(raw);
    this.erroData = !this.recebimentoInput || this.isDataValida(this.recebimentoInput)
      ? ''
      : 'Data inválida. Use o formato DD/MM/AAAA.';
  }

  onFonteChange(fonte: string): void {
    this.novaRenda.fonte = fonte;
    this.valorSugestao = this.getUltimoValorParaFonte(fonte);
  }

  onFixaInicioChange(raw: string): void {
    this.fixaInicioInput = maskMonthYear(raw);
  }

  aplicarSugestao(): void {
    if (!this.valorSugestao) return;
    this.valorInput = this.valorSugestao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private resetarForm(): void {
    this.novaRenda = this.criaRenda();
    this.valorInput = '';
    this.recebimentoInput = '';
    this.fixaInicioInput = '';
    this.editandoId = null;
    this.erroData = '';
    this.valorSugestao = null;
  }

  private criaRenda(): StoredIncome {
    return { id: '', planId: '', fonte: '', valor: 0, recebimento: '', fixa: false, fixaInicio: '' };
  }

  private normalizaData(value: string): string {
    return maskDateDDMMYYYY(value);
  }

  private parseValor(value: string | number): number {
    if (typeof value === 'number') return value;
    const raw = value ?? '';
    const hasSeparator = /[,.]/.test(raw);

    if (hasSeparator) {
      const normalized = raw.replace(/\./g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return 0;
    const inteiro = digits.slice(0, -2) || '0';
    const centavos = digits.slice(-2);
    return Number(`${inteiro}.${centavos}`);
  }

  private isDataValida(value: string): boolean {
    const digits = value.replace(/[^\d]/g, '').slice(0, 8);
    if (digits.length !== 8) return false;
    const dia = Number(digits.slice(0, 2));
    const mes = Number(digits.slice(2, 4));
    const ano = Number(digits.slice(4, 8));
    if (mes < 1 || mes > 12) return false;
    if (dia < 1 || dia > 31) return false;
    if (Number.isNaN(ano)) return false;

    const data = new Date(ano, mes - 1, dia);
    if (data.getMonth() + 1 !== mes || data.getDate() !== dia || data.getFullYear() !== ano) return false;

    return true;
  }

  private compareDateDesc(a: string, b: string): number {
    const da = this.parseData(a);
    const db = this.parseData(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db.getTime() - da.getTime();
  }

  private parseData(value: string): Date | null {
    const digits = value.replace(/[^\d]/g, '');
    if (digits.length !== 8) return null;
    const dia = Number(digits.slice(0, 2));
    const mes = Number(digits.slice(2, 4));
    const ano = Number(digits.slice(4, 8));
    const data = new Date(ano, mes - 1, dia);
    if (data.getFullYear() !== ano || data.getMonth() + 1 !== mes || data.getDate() !== dia) return null;
    return data;
  }

  private formatDate(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${date.getFullYear()}`;
  }

  private getUltimoValorParaFonte(fonte: string): number | null {
    if (!fonte) return null;
    const encontrada = this.rendasAll.find((r) => r.fonte.toLowerCase() === fonte.toLowerCase());
    return encontrada ? encontrada.valor : null;
  }

  mesAnterior(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
  }

  proximoMes(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() + 1, 1);
  }

  private mesKey(): string {
    const y = this.dataAtual.getFullYear();
    const m = this.dataAtual.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  private mesKeyFromRecebimento(recebimento: string): string | null {
    const digits = recebimento.replace(/[^\d]/g, '');
    if (digits.length < 8) return null;
    const dia = Number(digits.slice(0, 2));
    const mes = Number(digits.slice(2, 4));
    const ano = Number(digits.slice(4, 8));
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || Number.isNaN(ano)) return null;
    return `${ano}-${String(mes).padStart(2, '0')}`;
  }

  private mesKeyFromMes(mesAno?: string): string | null {
    if (!mesAno) return null;
    const digits = mesAno.replace(/[^\d]/g, '');
    if (digits.length < 6) return null;
    const mes = Number(digits.slice(0, 2));
    const ano = Number(digits.slice(2, 6));
    if (mes < 1 || mes > 12 || Number.isNaN(ano)) return null;
    return `${ano}-${String(mes).padStart(2, '0')}`;
  }

  private mesKeyBetween(target: string, inicio: string, fim: string | null): boolean {
    const t = target;
    if (t < inicio) return false;
    if (fim && t > fim) return false;
    return true;
  }

  private normalizaMes(value: string): string {
    return maskMonthYear(value);
  }
}
