import { Component, OnDestroy, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { LocalDbService, StoredIncome } from '../data/local-db.service';
import { RendasListaComponent } from './rendas-lista.component';
import { RendasFormComponent } from './rendas-form.component';

@Component({
  selector: 'app-rendas',
  standalone: true,
  imports: [DecimalPipe, RendasListaComponent, RendasFormComponent],
  templateUrl: './rendas.component.html',
  styleUrls: ['./rendas.component.scss']
})
export class RendasComponent implements OnInit, OnDestroy {
  dataAtual = new Date();
  rendasAll: StoredIncome[] = [];
  mostrarForm = false;
  novaRenda: StoredIncome = this.criaRenda();
  valorInput = '';
  recebimentoInput = '';
  fixaInicioInput = '';
  fixaFimInput = '';
  erroData = '';
  editandoId: string | null = null;
  valorSugestao: number | null = null;
  private sub?: Subscription;

  constructor(private db: LocalDbService) {}

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
    const filtradas = this.rendasAll.filter((r) => {
      if (r.fixa) {
        const inicio = this.mesKeyFromMes(r.fixaInicio) || key;
        const fim = this.mesKeyFromMes(r.fixaFim);
        return this.mesKeyBetween(key, inicio, fim);
      }
      return this.mesKeyFromRecebimento(r.recebimento) === key;
    });
    return filtradas.sort((a, b) => this.compareDateDesc(a.recebimento, b.recebimento));
  }

  get resumoTexto(): string {
    if (!this.valorInput) return '';
    const valor = this.valorInput;
    const data = this.recebimentoInput || 'DD/MM/AAAA';
    if (this.novaRenda.fixa) {
      const inicio = this.fixaInicioInput || 'MM/AAAA';
      const fim = this.fixaFimInput ? ` até ${this.fixaFimInput}` : ' (sem fim definido)';
      return `Recebimento de ${valor} todos os meses a partir de ${inicio}${fim}.`;
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
    const fixaFim = this.novaRenda.fixa ? this.normalizaMes(this.fixaFimInput) : undefined;

    if (this.novaRenda.fixa) {
      if (!fixaInicio) {
        this.erroData = 'Informe o mês de início no formato MM/AAAA para renda fixa.';
        return;
      }
      this.erroData = '';
    }

    if (this.editandoId) {
      this.db.updateIncome(this.editandoId, {
        fonte: this.novaRenda.fonte,
        valor,
        recebimento: recebimentoNormalizado,
        fixa: this.novaRenda.fixa,
        fixaInicio,
        fixaFim
      });
    } else {
      this.db.addIncome({
        fonte: this.novaRenda.fonte,
        valor,
        recebimento: recebimentoNormalizado,
        fixa: this.novaRenda.fixa,
        fixaInicio,
        fixaFim
      });
    }

    this.fecharModal();
  }

  editar(renda: StoredIncome): void {
    this.editandoId = renda.id;
    this.novaRenda = { ...renda };
    this.valorInput = renda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.recebimentoInput = renda.recebimento;
    this.valorSugestao = this.getUltimoValorParaFonte(renda.fonte);
    this.fixaInicioInput = renda.fixaInicio || '';
    this.fixaFimInput = renda.fixaFim || '';
    this.mostrarForm = true;
  }

  remover(id: string): void {
    this.db.removeIncome(id);
  }

  editarPorId(id: string): void {
    const renda = this.rendasAll.find((r) => r.id === id);
    if (renda) {
      this.editar(renda);
    }
  }

  onValorChange(raw: string): void {
    const digits = (raw || '').replace(/\D/g, '');
    if (!digits) {
      this.valorInput = '';
      return;
    }
    const num = Number(digits) / 100;
    this.valorInput = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onRecebimentoChange(raw: string): void {
    this.recebimentoInput = this.normalizaData(raw);
    this.erroData = !this.recebimentoInput || this.isDataValida(this.recebimentoInput)
      ? ''
      : 'Data inválida. Use o formato DD/MM/AAAA.';
  }

  onFonteChange(fonte: string): void {
    this.novaRenda.fonte = fonte;
    this.valorSugestao = this.getUltimoValorParaFonte(fonte);
  }

  onFixaInicioChange(raw: string): void {
    this.fixaInicioInput = this.normalizaMes(raw);
  }

  onFixaFimChange(raw: string): void {
    this.fixaFimInput = this.normalizaMes(raw);
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
    this.fixaFimInput = '';
    this.editandoId = null;
  }

  private criaRenda(): StoredIncome {
    return { id: '', fonte: '', valor: 0, recebimento: '', fixa: false, fixaInicio: '', fixaFim: '' };
  }

  private normalizaData(value: string): string {
    const digits = value.replace(/[^\d]/g, '').slice(0, 8);
    const dia = digits.slice(0, 2);
    const mes = digits.slice(2, 4);
    const ano = digits.slice(4, 8);
    if (mes && (Number(mes) < 1 || Number(mes) > 12)) {
      return [dia].filter(Boolean).join('/');
    }
    return [dia, mes, ano].filter(Boolean).join('/');
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
    const digits = value.replace(/[^\d]/g, '').slice(0, 6);
    const mm = digits.slice(0, 2);
    const yyyy = digits.slice(2, 6);
    if (mm && (Number(mm) < 1 || Number(mm) > 12)) {
      return mm.slice(0, 1);
    }
    return [mm, yyyy].filter(Boolean).join('/');
  }
}
