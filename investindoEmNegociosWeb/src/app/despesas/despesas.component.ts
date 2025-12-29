import { Component, OnDestroy, OnInit } from '@angular/core';
import { TitleCasePipe, NgIf, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { LocalDbService, StoredExpense, StoredCard } from '../data/local-db.service';
import { DespesasListaComponent } from './despesas-lista.component';
import { DespesasFormComponent } from './despesas-form.component';

@Component({
  selector: 'app-despesas',
  standalone: true,
  imports: [TitleCasePipe, NgIf, DecimalPipe, DespesasListaComponent, DespesasFormComponent],
  templateUrl: './despesas.component.html',
  styleUrls: ['./despesas.component.scss']
})
export class DespesasComponent implements OnInit, OnDestroy {
  dataAtual = new Date();
  categorias = ['Moradia', 'Transporte', 'Alimentação', 'Lazer', 'Saúde', 'Educação', 'Outros'];
  cartoes: StoredCard[] = [];
  despesasPorMes: Record<string, StoredExpense[]> = {};
  sortBy: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | null = null;
  sortDir: 1 | -1 = 1;
  mostrarForm = false;
  alerta = '';
  valorInput = '';
  vencimentoInput = '';
  erroData = '';
  formaPagamento: 'avista' | 'cartao' = 'avista';
  parcelar = false;
  parcelasCount = 1;
  cartaoSelecionadoId: string | null = null;
  editando: { id: string; isParcela: boolean } | null = null;
  confirmRemocao: { id: string; serieId?: string; totalParcelas?: number } | null = null;
  private sub?: Subscription;

  novaDespesa: StoredExpense = this.criaDespesa();

  constructor(private db: LocalDbService) {}

  ngOnInit(): void {
    this.sub = this.db.expenses$.subscribe((lista) => {
      this.despesasPorMes = lista.reduce((acc, item) => {
        const key = this.mesKeyFromVencimento(item.vencimento) || this.mesKey();
        acc[key] = acc[key] ? [...acc[key], item] : [item];
        return acc;
      }, {} as Record<string, StoredExpense[]>);
    });

    this.db.cards$.subscribe((cards) => {
      const user = this.currentUser;
      this.cartoes = cards.filter((c) => (c.userId ? c.userId === user : true));
      if (this.cartoes.length && !this.cartaoSelecionadoId) {
        this.cartaoSelecionadoId = this.cartoes[0].id;
      }
      if (!this.cartoes.length) {
        this.cartaoSelecionadoId = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get mesAtualLabel(): string {
    return this.dataAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }

  get mesAtual(): string {
    return this.mesAtualLabel;
  }

  get despesas(): StoredExpense[] {
    return this.despesasPorMes[this.mesKey()] || [];
  }

  get valorParcelaLabel(): string {
    const valor = this.parseValor(this.valorInput);
    if (!valor || !this.parcelar || this.parcelasCount < 2) return this.valorInput;
    const parcela = valor / (this.parcelasCount || 1);
    return parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get despesasOrdenadas(): StoredExpense[] {
    const base = [...this.despesas];
    if (!this.sortBy) return base;
    const compare = (a: StoredExpense, b: StoredExpense) => {
      switch (this.sortBy) {
        case 'nome':
          return this.collate(a.nome, b.nome);
        case 'categoria':
          return this.collate(a.categoria, b.categoria);
        case 'pagamento':
          return this.collate(this.pagamentoLabel(a), this.pagamentoLabel(b));
        case 'vencimento':
          return this.compareDate(a.vencimento, b.vencimento);
        case 'valor':
          return (a.valor || 0) - (b.valor || 0);
        default:
          return 0;
      }
    };
    return base.sort((a, b) => compare(a, b) * this.sortDir);
  }

  get cartaoSelecionadoLabel(): string {
    const card = this.cartoes.find((c) => c.id === this.cartaoSelecionadoId);
    if (!card) return 'Nenhum cartão selecionado';
    return this.formatarCartaoLabel(card);
  }

  cardLabel(id?: string): string {
    if (!id) return '';
    const card = this.cartoes.find((c) => c.id === id);
    if (card) return this.formatarCartaoLabel(card);
    return id;
  }

  pagamentoLabel(d: StoredExpense): string {
    if (!d.cartao) return 'À vista';
    return this.cardLabel(d.cartao);
  }

  editarDespesaPorId(id: string): void {
    const lista = this.despesasPorMes[this.mesKey()] || [];
    const index = lista.findIndex((d) => d.id === id);
    if (index >= 0) {
      this.editarDespesa(this.mesKey(), index);
    }
  }

  openRemocaoPorId(id: string): void {
    const lista = this.despesasPorMes[this.mesKey()] || [];
    const item = lista.find((d) => d.id === id);
    if (!item) return;
    const index = lista.indexOf(item);
    this.openRemocao(item, this.mesKey(), index);
  }

  adicionar(): void {
    const valor = this.parseValor(this.valorInput);
    if (!this.novaDespesa.nome || !valor) return;

    if (!this.isDataValida(this.vencimentoInput)) {
      this.erroData = 'Data inválida. Use o formato DD/MM/AAAA.';
      return;
    }
    this.erroData = '';

    const vencimentoNormalizado = this.normalizaData(this.vencimentoInput);
    const dataBase = this.parseData(vencimentoNormalizado);
    if (!dataBase) {
      this.erroData = 'Data inválida. Use o formato DD/MM/AAAA.';
      return;
    }

    const serieId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

    // EDITAR item existente (sem regenerar série)
    if (this.editando) {
      const { id } = this.editando;
      this.db.updateExpense(id, {
        nome: this.novaDespesa.nome,
        categoria: this.novaDespesa.categoria,
        valor,
        vencimento: vencimentoNormalizado,
        cartao: this.formaPagamento === 'cartao' ? this.cartaoSelecionadoId ?? undefined : undefined
      });
      this.resetarForm();
      return;
    }

    const gerarParcela = (indice: number, total: number, data: Date, valorParcela: number): Omit<StoredExpense, 'id'> => ({
      nome: this.novaDespesa.nome,
      categoria: this.novaDespesa.categoria,
      valor: Number(valorParcela.toFixed(2)),
      vencimento: this.formatDate(data),
      cartao: this.formaPagamento === 'cartao' ? this.cartaoSelecionadoId ?? undefined : undefined,
      parcelaNumero: total > 1 ? indice + 1 : undefined,
      parcelasTotal: total > 1 ? total : undefined,
      serieId: total > 1 ? serieId : undefined
    });

    if (this.formaPagamento === 'cartao' && this.parcelar && this.parcelasCount > 1) {
      const valorParcela = valor / this.parcelasCount;
      for (let i = 0; i < this.parcelasCount; i++) {
        const dataParcela = this.addMonthsClamped(dataBase, i);
        this.db.addExpense(gerarParcela(i, this.parcelasCount, dataParcela, valorParcela));
      }
    } else {
      this.db.addExpense(gerarParcela(0, 1, dataBase, valor));
    }

    this.resetarForm();
  }

  totalMes(): number {
    return this.despesas.reduce((sum, d) => sum + d.valor, 0);
  }

  proximoMes(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() + 1, 1);
  }

  mesAnterior(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
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

  onVencimentoChange(raw: string): void {
    this.vencimentoInput = this.normalizaData(raw);
    this.erroData = !this.vencimentoInput || this.isDataValida(this.vencimentoInput)
      ? ''
      : 'Data inválida. Use o formato DD/MM/AAAA.';
  }

  abrirModal(): void {
    this.mostrarForm = true;
  }

  fecharModal(): void {
    this.mostrarForm = false;
    this.erroData = '';
    this.editando = null;
    this.resetarForm();
  }

  editarDespesa(mesKey: string, index: number): void {
    const item = this.despesasPorMes[mesKey]?.[index];
    if (!item) return;
    this.editando = { id: item.id!, isParcela: !!item.parcelasTotal };
    this.novaDespesa = {
      nome: item.nome,
      categoria: item.categoria,
      valor: item.valor,
      vencimento: item.vencimento,
      id: item.id!,
      cartao: item.cartao,
      parcelaNumero: item.parcelaNumero,
      parcelasTotal: item.parcelasTotal,
      serieId: item.serieId
    };
    this.valorInput = this.formataMoeda(item.valor);
    this.vencimentoInput = item.vencimento;
    this.formaPagamento = item.cartao ? 'cartao' : 'avista';
    this.cartaoSelecionadoId = item.cartao || this.cartoes[0]?.id || null;
    this.parcelar = !!item.parcelasTotal;
    this.parcelasCount = item.parcelasTotal || 1;
    this.mostrarForm = true;
  }

  removerDespesa(mesKey: string, index: number): void {
    const lista = this.despesasPorMes[mesKey] || [];
    const item = lista[index];
    if (!item) return;
    this.db.removeExpense(item.id!);
  }

  openRemocao(d: StoredExpense, mesKey: string, index: number): void {
    if (d.cartao) {
      this.alerta = 'Não é possível excluir uma despesa associada a um cartão. Altere a forma de pagamento ou exclua o cartão primeiro.';
      setTimeout(() => (this.alerta = ''), 4000);
      return;
    }
    if (d.parcelasTotal && d.serieId) {
      this.confirmRemocao = { id: d.id!, serieId: d.serieId, totalParcelas: d.parcelasTotal };
      return;
    }
    this.removerDespesa(mesKey, index);
  }

  confirmarRemocao(removerSerie: boolean): void {
    if (!this.confirmRemocao) return;
    const { id, serieId } = this.confirmRemocao;

    if (removerSerie && serieId) {
      this.db.removeExpenseSeries(serieId);
    } else {
      this.db.removeExpense(id);
    }

    this.confirmRemocao = null;
  }

  cancelarRemocao(): void {
    this.confirmRemocao = null;
  }

  public mesKey(): string {
    const y = this.dataAtual.getFullYear();
    const m = this.dataAtual.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  tituloBandeira(b: string): string {
    const map: Record<string, string> = { mastercard: 'Mastercard', visa: 'Visa', elo: 'Elo' };
    return map[b?.toLowerCase()] || b || 'Cartão';
  }

  formatarCartaoLabel(card: StoredCard): string {
    const titulo = this.tituloBandeira(card.bandeira);
    const final = this.finaisCartao(card.numero);
    return `Cartão - ${titulo} ${final}`;
  }

  private finaisCartao(numero: string): string {
    const digits = (numero || '').replace(/\D/g, '');
    return digits ? `•••• ${digits.slice(-4)}` : '';
  }

  private mesKeyFromDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private mesKeyFromVencimento(vencimento: string): string | null {
    const digits = vencimento.replace(/[^\d]/g, '');
    if (digits.length < 8) return null;

    const dia = Number(digits.slice(0, 2));
    const mes = Number(digits.slice(2, 4));
    const anoInput = digits.slice(4, 8);
    const anoNum = Number(anoInput);

    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    if (Number.isNaN(anoNum) || anoInput.length !== 4) return null;

    return `${anoNum}-${String(mes).padStart(2, '0')}`;
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

  private addMonthsClamped(date: Date, months: number): Date {
    const targetYear = date.getFullYear();
    const targetMonth = date.getMonth() + months;
    const baseDay = date.getDate();
    const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const day = Math.min(baseDay, lastDayOfTargetMonth);
    return new Date(targetYear, targetMonth, day);
  }

  private formatDate(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${date.getFullYear()}`;
  }

  private resetarForm(): void {
    this.novaDespesa = this.criaDespesa();
    this.valorInput = '';
    this.vencimentoInput = '';
    this.mostrarForm = false;
    this.parcelar = false;
    this.parcelasCount = 1;
    this.formaPagamento = 'avista';
    this.editando = null;
    this.cartaoSelecionadoId = this.cartoes[0]?.id || null;
  }

  ordenarPor(campo: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor'): void {
    if (this.sortBy === campo) {
      this.sortDir = this.sortDir === 1 ? -1 : 1;
    } else {
      this.sortBy = campo;
      this.sortDir = 1;
    }
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

  public parseValor(value: string | number): number {
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

  private formataMoeda(value: string | number): string {
    const num = this.parseValor(value);
    return num ? num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
  }

  private collate(a: string | undefined, b: string | undefined): number {
    return (a || '').localeCompare(b || '', 'pt-BR', { sensitivity: 'base' });
  }

  private compareDate(a: string | undefined, b: string | undefined): number {
    const da = this.parseData(a || '');
    const db = this.parseData(b || '');
    if (!da && !db) return 0;
    if (!da) return -1;
    if (!db) return 1;
    return da.getTime() - db.getTime();
  }

  private get currentUser(): string {
    if (typeof localStorage === 'undefined') return 'guest';
    return localStorage.getItem('current_user') || 'guest';
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

  private criaDespesa(): StoredExpense {
    return {
      id: '',
      nome: '',
      categoria: this.categorias[0],
      valor: 0,
      vencimento: ''
    };
  }
}
