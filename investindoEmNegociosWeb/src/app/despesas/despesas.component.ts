import { Component, OnDestroy, OnInit } from '@angular/core';
import { TitleCasePipe, NgIf, DecimalPipe, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ApiDataService, StoredExpense, StoredCard } from '../data/api-data.service';
import { DespesasListaComponent } from './despesas-lista.component';
import { DespesasFormComponent } from './despesas-form.component';
import { InstallmentsService } from '../installments.service';
import { InstallmentStatus } from '../types/money-types';
import { CategoriesService, CategoryDto } from '../categories.service';
import { maskDateDDMMYYYY, maskMoneyInput } from '../utils/input-mask';
import { expenseStatusLabel } from '../utils/status';
import { UiFeedbackService } from '../ui-feedback.service';
import { InvoiceImportComponent } from '../invoice-import/invoice-import.component';
import {
  formatLocaleDate,
  formatMonthLabelFromKey,
  formatMonthYearLabel,
  formatNumberValue,
  getActiveLocale,
  monthKeyFromLocaleDate,
  parseLocaleDate,
  parseLocalizedNumber
} from '../utils/locale-utils';

@Component({
  selector: 'app-despesas',
  standalone: true,
  imports: [
    TitleCasePipe,
    NgIf,
    NgFor,
    NgClass,
    DecimalPipe,
    FormsModule,
    DespesasListaComponent,
    DespesasFormComponent,
    InvoiceImportComponent
  ],
  templateUrl: './despesas.component.html',
  styleUrls: ['./despesas.component.scss']
})
export class DespesasComponent implements OnInit, OnDestroy {
  dataAtual = new Date();
  categorias: CategoryDto[] = [];
  private categoriaMap = new Map<string, string>();
  private expensesCache: StoredExpense[] = [];
  cartoes: StoredCard[] = [];
  despesasPorMes: Record<string, StoredExpense[]> = {};
  sortBy: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | 'status' | null = null;
  sortDir: 1 | -1 = 1;
  mostrarForm = false;
  saving = false;
  valorInput = '';
  vencimentoInput = '';
  erroData = '';
  erroCategoria = '';
  formaPagamento: 'avista' | 'cartao' = 'avista';
  parcelar = false;
  parcelasCount = 1;
  fixa = false;
  fixaMeses: number | null = null;
  cartaoSelecionadoId: string | null = null;
  editando: { id: string; planId?: string; isParcela: boolean; isRecorrente: boolean } | null = null;
  confirmEdicao: { isRecorrente: boolean } | null = null;
  confirmRemocao: { id: string; serieId?: string; totalParcelas?: number; isRecurring?: boolean } | null = null;
  private sub?: Subscription;
  private categoriasSub?: Subscription;
  private alertaTimeout?: ReturnType<typeof setTimeout>;
  selectedIds = new Set<string>();
  filtroStatus: ('ALL' | InstallmentStatus) = 'ALL';
  filtroCategoria: string = 'ALL';
  filtroNome: string = '';
  loadingPagar = false;
  loadingAntecipar = false;
  historicoAberto = false;
  historicoTitulo = '';
  historicoItens: StoredExpense[] = [];
  mostrarImportFatura = false;

  novaDespesa: StoredExpense = this.criaDespesa();

  constructor(
    private db: ApiDataService,
    private installments: InstallmentsService,
    private categoriesService: CategoriesService,
    private uiFeedback: UiFeedbackService
  ) {}

  ngOnInit(): void {
    this.sub = this.db.expenses$.subscribe((lista) => {
      this.expensesCache = lista;
      this.rebuildDespesas();
    });

    this.categoriasSub = this.categoriesService.list('Expense').subscribe({
      next: (data) => {
        const filtradas = (data || []).filter((item) => {
          const applies = (item.appliesTo || '').toString().toLowerCase();
          return applies === 'expense' || applies === 'despesa' || applies === 'despesas';
        });
        this.categorias = filtradas;
        this.categoriaMap = new Map(filtradas.map((c) => [c.id, c.name]));
        const resolvedId = this.resolveCategoriaId(this.novaDespesa);
        if (resolvedId) {
          const resolvedName = this.categoriaMap.get(resolvedId) || this.novaDespesa.categoria;
          this.novaDespesa = { ...this.novaDespesa, categoryId: resolvedId, categoria: resolvedName };
        }
        this.rebuildDespesas();
      },
      error: () => {
        this.categorias = [];
        this.categoriaMap = new Map();
        this.rebuildDespesas();
      }
    });

    this.db.cards$.subscribe((cards) => {
      this.cartoes = cards;
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
    this.categoriasSub?.unsubscribe();
  }

  get mesAtualLabel(): string {
    return formatMonthYearLabel(this.dataAtual);
  }

  get mesAtual(): string {
    return this.mesAtualLabel;
  }

  get previousComparison(): {
    month: string;
    delta: number;
    deltaAbs: number;
    percent: number;
    trend: 'up' | 'down' | 'flat';
    isNew: boolean;
  } | null {
    const prevKey = this.previousMonthKey();
    const prevTotal = this.totalMesByKey(prevKey);
    const currentTotal = this.totalMes();
    if (prevTotal === 0 && currentTotal === 0) return null;
    const delta = currentTotal - prevTotal;
    const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const isNew = prevTotal === 0 && currentTotal > 0;
    const percent = prevTotal === 0 ? (currentTotal ? 100 : 0) : (delta / prevTotal) * 100;
    return {
      month: this.formatMonthLabel(prevKey),
      delta,
      deltaAbs: Math.abs(delta),
      percent,
      trend,
      isNew
    };
  }

  get despesas(): StoredExpense[] {
    return this.despesasPorMes[this.mesKey()] || [];
  }

  get totalPendentes(): number {
    return this.somaPorStatus(['OPEN', 'PARTIALLY_PAID']);
  }

  get totalAntecipadas(): number {
    return this.somaPorStatus(['ANTICIPATED']);
  }

  get totalPagas(): number {
    return this.somaPorStatus(['PAID']);
  }

  get selecionados(): string[] {
    return Array.from(this.selectedIds);
  }

  get selecionadosPagaveis(): StoredExpense[] {
    return this.despesas.filter((d) => this.selectedIds.has(d.id) && d.status !== 'PAID' && d.status !== 'CANCELED');
  }

  get selecionadosAntecipaveis(): StoredExpense[] {
    // Regra: pode antecipar apenas se o vencimento for em mês futuro em relação à data de hoje
    const hoje = new Date();
    const mesHoje = hoje.getMonth();
    const anoHoje = hoje.getFullYear();
    return this.despesas.filter((d) => {
      if (!this.selectedIds.has(d.id)) return false;
      if (d.status === 'PAID' || d.status === 'CANCELED' || d.status === 'ANTICIPATED') return false;
      const data = this.parseData(d.vencimento || '');
      if (!data) return false;
      // Vencimento precisa ser depois do mês atual (hoje) para ser elegível
      return data.getFullYear() > anoHoje || (data.getFullYear() === anoHoje && data.getMonth() > mesHoje);
    });
  }

  get valorParcelaLabel(): string {
    const valor = this.parseValor(this.valorInput);
    if (this.fixa) return this.valorInput;
    if (!valor || !this.parcelar || this.parcelasCount < 2) return this.valorInput;
    const parcela = valor / (this.parcelasCount || 1);
    return formatNumberValue(parcela);
  }

  get despesasFiltradas(): StoredExpense[] {
    const base = this.despesas.filter((d) => {
      const statusOk = this.filtroStatus === 'ALL' ? true : (d.status || 'OPEN') === this.filtroStatus;
      const categoriaOk = this.filtroCategoria === 'ALL' ? true : d.categoryId === this.filtroCategoria;
      const nomeOk = this.filtroNome
        ? (d.nome || '').toLowerCase().includes(this.filtroNome.toLowerCase())
        : true;
      return statusOk && categoriaOk && nomeOk;
    });
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
        case 'status':
          return this.collate(this.statusLabel(a.status), this.statusLabel(b.status));
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

  toggleSelecionar(id: string, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  toggleSelecionarTodos(checked: boolean): void {
    if (checked) {
      const ids = (this.despesasPorMes[this.mesKey()] || []).map((d) => d.id).filter(Boolean) as string[];
      this.selectedIds = new Set(ids);
    } else {
      this.selectedIds.clear();
    }
  }

  abrirHistorico(id: string): void {
    const todas = Object.values(this.despesasPorMes).flat();
    const alvo = todas.find((d) => d.id === id);
    if (!alvo) return;
    const chave = alvo.serieId || alvo.planId || alvo.id;
    const relacionados = todas
      .filter((d) => (d.serieId || d.planId || d.id) === chave)
      .sort((a, b) => {
        if (a.parcelaNumero && b.parcelaNumero) return a.parcelaNumero - b.parcelaNumero;
        return this.compareDate(a.vencimento, b.vencimento);
      });
    this.historicoTitulo = `${alvo.nome}${alvo.parcelasTotal ? ` · ${alvo.parcelaNumero}/${alvo.parcelasTotal}` : ''}`;
    this.historicoItens = relacionados;
    this.historicoAberto = true;
  }

  get historicoPagas(): StoredExpense[] {
    return this.historicoItens.filter((h) => h.status === 'PAID' || h.status === 'PARTIALLY_PAID');
  }

  get historicoPendentes(): StoredExpense[] {
    return this.historicoItens.filter((h) => h.status !== 'PAID' && h.status !== 'PARTIALLY_PAID');
  }

  fecharHistorico(): void {
    this.historicoAberto = false;
    this.historicoItens = [];
    this.historicoTitulo = '';
  }

  pagarDespesaPorId(id: string): void {
    const lista = this.despesasPorMes[this.mesKey()] || [];
    const item = lista.find((d) => d.id === id);
    if (!item) return;
    const payload = {
      paidAmount: item.valor,
      paidAt: new Date().toISOString(),
      methodId: null,
      note: null
    };
    this.loadingPagar = true;
    this.installments
      .pay(id, payload)
      .pipe(finalize(() => (this.loadingPagar = false)))
      .subscribe({
      next: () => {
        this.atualizarStatusLocal([id], 'PAID');
        this.db.refresh();
        this.setAlerta('Despesa marcada como paga.', 3000, 'success');
      },
      error: () => {
        this.setAlerta('Falha ao marcar como paga.', 3000, 'error');
      }
    });
  }

  pagarSelecionadas(): void {
    const pagaveis = this.selecionadosPagaveis;
    if (!pagaveis.length) {
      this.setAlerta('Nenhuma despesa selecionada para pagar.', 2000);
      return;
    }

    const pedidos = pagaveis.map((item) =>
      this.installments.pay(item.id, {
        paidAmount: item.valor,
        paidAt: new Date().toISOString(),
        methodId: null,
        note: null
      })
    );

    this.loadingPagar = true;
    forkJoin(pedidos)
      .pipe(finalize(() => (this.loadingPagar = false)))
      .subscribe({
      next: () => {
        this.atualizarStatusLocal(pagaveis.map((p) => p.id), 'PAID');
        this.selectedIds.clear();
        this.db.refresh();
        this.setAlerta('Pagamentos registrados com sucesso.', 3000, 'success');
      },
      error: () => {
        this.setAlerta('Falha ao marcar pagamentos.', 3000, 'error');
      }
    });
  }

  excluirSelecionadas(): void {
    const ids = Array.from(this.selectedIds);
    if (!ids.length) return;
    ids.forEach((id) => this.db.removeExpense(id));
    this.selectedIds.clear();
  }

  anteciparSelecionadas(): void {
    const selecionadas = this.selecionados;
    if (!selecionadas.length) {
      this.setAlerta('Selecione ao menos uma despesa para antecipar.', 2000);
      return;
    }

    const doMesAtual = (this.despesas || []).filter((d) => this.selectedIds.has(d.id) && this.isMesAtual(d.vencimento));
    if (doMesAtual.length) {
      this.setAlerta('Não é possível antecipar despesas do mês atual.', 2500);
      return;
    }

    const antecipaveis = this.selecionadosAntecipaveis;
    if (!antecipaveis.length) {
      this.setAlerta('Nenhuma despesa selecionada pode ser antecipada.', 2000);
      return;
    }

    const novaDataIso = this.hojeIso();
    const pedidos = antecipaveis.map((item) =>
      this.installments.anticipate(item.id, { dueDate: novaDataIso })
    );

    this.loadingAntecipar = true;
    forkJoin(pedidos)
      .pipe(finalize(() => (this.loadingAntecipar = false)))
      .subscribe({
      next: () => {
        this.moverParaMesAtual(antecipaveis.map((a) => a.id), novaDataIso, 'ANTICIPATED');
        this.selectedIds.clear();
        this.db.refresh();
        this.setAlerta('Antecipação registrada.', 2500, 'success');
      },
      error: () => {
        this.setAlerta('Falha ao antecipar despesas.', 3000, 'error');
      }
    });
  }

  private atualizarStatusLocal(ids: string[], status: StoredExpense['status']): void {
    const key = this.mesKey();
    const lista = this.despesasPorMes[key] || [];
    const atualizada = lista.map((d) => (ids.includes(d.id) ? { ...d, status } : d));
    this.despesasPorMes = { ...this.despesasPorMes, [key]: atualizada };
  }

  private moverParaMesAtual(ids: string[], novaDataIso: string, status: StoredExpense['status']): void {
    const targetDate = new Date(novaDataIso);
    const targetKey = this.mesKeyFromDate(targetDate);
    const novaData = this.formatDate(targetDate);

    const novoMapa: Record<string, StoredExpense[]> = {};
    Object.entries(this.despesasPorMes).forEach(([key, lista]) => {
      const filtrada = lista.filter((d) => !ids.includes(d.id));
      novoMapa[key] = filtrada;
    });

    const atuais = novoMapa[targetKey] || [];
    const itensAtualizados = ids
      .map((id) => {
        const encontrado = Object.values(this.despesasPorMes).flat().find((d) => d.id === id);
        if (!encontrado) return null;
        return {
          ...encontrado,
          vencimento: novaData,
          status
        };
      })
      .filter(Boolean) as StoredExpense[];

    novoMapa[targetKey] = [...atuais, ...itensAtualizados];
    this.despesasPorMes = novoMapa;
  }

  private hojeIso(): string {
    const hoje = new Date();
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    return d.toISOString().slice(0, 10);
  }

  adicionar(): void {
    if (this.saving) return;
    const valor = this.parseValor(this.valorInput);
    if (!this.novaDespesa.nome || !valor) return;

    if (!this.novaDespesa.categoryId) {
      this.erroCategoria = 'Selecione uma categoria.';
      return;
    }
    this.erroCategoria = '';

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

    if (this.editando) {
      if (this.editando.isParcela || this.editando.isRecorrente) {
        this.confirmEdicao = { isRecorrente: this.editando.isRecorrente };
        return;
      }
      this.aplicarEdicao('all', valor, vencimentoNormalizado);
      return;
    }

    const parcelas = this.parcelar && this.parcelasCount > 1 ? this.parcelasCount : 1;
    const valorParcela = parcelas > 1 ? valor / parcelas : valor;
    const fixaMeses = this.fixa ? this.fixaMeses || null : null;

    this.saving = true;
    let ok = false;
    try {
      // Cria um único plano no backend; o back gera as parcelas conforme installmentsCount.
      this.db.addExpense({
        nome: this.novaDespesa.nome,
        categoria: this.resolveCategoriaNome(this.novaDespesa),
        categoryId: this.novaDespesa.categoryId ?? null,
        valor: Number(valorParcela.toFixed(2)),
        vencimento: this.formatDate(dataBase),
        cartao: this.formaPagamento === 'cartao' ? this.cartaoSelecionadoId ?? undefined : undefined,
        parcelaNumero: parcelas > 1 ? 1 : undefined,
        parcelasTotal: parcelas > 1 ? parcelas : undefined,
        serieId: parcelas > 1 ? serieId : undefined,
        fixa: this.fixa,
        fixaMeses
      });

      ok = true;
    } finally {
      this.saving = false;
      if (ok) {
        this.setAlerta('Despesa salva com sucesso.', 2500, 'success');
        this.fecharModal();
      }
    }
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

  onFormaPagamentoChange(value: 'avista' | 'cartao'): void {
    this.formaPagamento = value;

    if (value === 'cartao') {
      this.fixa = false;
      this.fixaMeses = null;
      this.parcelar = this.parcelasCount > 1 ? true : this.parcelar;
      if (!this.cartaoSelecionadoId && this.cartoes.length) {
        this.cartaoSelecionadoId = this.cartoes[0].id;
      }
      return;
    }

    this.parcelar = false;
    this.parcelasCount = 1;
    this.cartaoSelecionadoId = null;
  }

  onValorChange(raw: string): void {
    this.valorInput = maskMoneyInput(raw);
  }

  onVencimentoChange(raw: string): void {
    this.vencimentoInput = maskDateDDMMYYYY(raw);
    this.erroData = !this.vencimentoInput || this.isDataValida(this.vencimentoInput)
      ? ''
      : 'Data inválida. Use o formato DD/MM/AAAA.';
  }

  onFixaToggle(value: boolean): void {
    this.fixa = value;
    if (!value) {
      this.fixaMeses = null;
    }
  }

  onFixaMesesChange(value: number | null): void {
    if (value === null || value === undefined || Number.isNaN(value)) {
      this.fixaMeses = null;
      return;
    }
    this.fixaMeses = value;
  }

  abrirModal(): void {
    if (this.saving) return;
    this.resetarFormulario();
    this.mostrarForm = true;
  }

  abrirImportFatura(): void {
    this.mostrarImportFatura = true;
  }

  fecharImportFatura(): void {
    this.mostrarImportFatura = false;
  }

  fecharModal(): void {
    if (this.saving) return;
    this.mostrarForm = false;
    this.erroData = '';
    this.erroCategoria = '';
    this.editando = null;
    this.confirmEdicao = null;
    this.fixa = false;
    this.fixaMeses = null;
    this.resetarFormulario();
  }

  editarDespesa(mesKey: string, index: number): void {
    const item = this.despesasPorMes[mesKey]?.[index];
    if (!item) return;
    const categoriaId = this.resolveCategoriaId(item);
    const categoriaNome = this.resolveCategoriaNome({ categoryId: categoriaId, categoria: item.categoria });
    this.editando = {
      id: item.id!,
      planId: item.planId,
      isParcela: !!item.parcelasTotal,
      isRecorrente: !!item.fixa
    };
    this.novaDespesa = {
      nome: item.nome,
      categoria: categoriaNome,
      categoryId: categoriaId,
      valor: item.valor,
      vencimento: item.vencimento,
      id: item.id!,
      cartao: item.cartao,
      parcelaNumero: item.parcelaNumero,
      parcelasTotal: item.parcelasTotal,
      serieId: item.serieId
    };
    this.valorInput = formatNumberValue(item.valor);
    this.vencimentoInput = item.vencimento;
    this.formaPagamento = item.cartao ? 'cartao' : 'avista';
    this.cartaoSelecionadoId = item.cartao || this.cartoes[0]?.id || null;
    this.parcelar = !!item.parcelasTotal;
    this.parcelasCount = item.parcelasTotal || 1;
    this.fixa = !!item.fixa;
    this.fixaMeses = item.fixaMeses ?? null;
    this.parcelar = !this.fixa && this.parcelasCount > 1;
    this.mostrarForm = true;
  }

  confirmarEdicao(escopo: 'single' | 'all'): void {
    if (!this.editando) return;
    const valor = this.parseValor(this.valorInput);
    const vencimentoNormalizado = this.normalizaData(this.vencimentoInput);
    this.confirmEdicao = null;
    this.aplicarEdicao(escopo, valor, vencimentoNormalizado);
  }

  cancelarEdicao(): void {
    this.confirmEdicao = null;
  }

  removerDespesa(mesKey: string, index: number): void {
    const lista = this.despesasPorMes[mesKey] || [];
    const item = lista[index];
    if (!item) return;
    this.db.removeExpense(item.id!);
  }

  openRemocao(d: StoredExpense, mesKey: string, index: number): void {
    if (d.cartao) {
      this.uiFeedback.error(
        'Não é possível excluir uma despesa associada a um cartão. Altere a forma de pagamento ou exclua o cartão primeiro.'
      );
      return;
    }
    if ((d.parcelasTotal && d.serieId) || d.fixa) {
      this.confirmRemocao = {
        id: d.id!,
        serieId: d.planId || d.serieId,
        totalParcelas: d.parcelasTotal,
        isRecurring: !!d.fixa
      };
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
    return `Marca ${b}`;
  }

  formatarCartaoLabel(card: StoredCard): string {
    const final = this.finaisCartao(card.numero);
    return `Cartão ${final}`;
  }

  private finaisCartao(numero: string): string {
    const digits = (numero || '').replace(/\D/g, '');
    return digits ? `•••• ${digits.slice(-4)}` : '';
  }

  private mesKeyFromDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private previousMonthKey(): string {
    const prev = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
    return this.mesKeyFromDate(prev);
  }

  private totalMesByKey(key: string): number {
    const lista = this.despesasPorMes[key] || [];
    return lista.reduce((sum, d) => sum + d.valor, 0);
  }

  private formatMonthLabel(value: string): string {
    return formatMonthLabelFromKey(value, 'long');
  }

  private mesKeyFromVencimento(vencimento: string): string | null {
    return monthKeyFromLocaleDate(vencimento);
  }

  private parseData(value: string): Date | null {
    return parseLocaleDate(value);
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
    return formatLocaleDate(date);
  }

  private resetarFormulario(): void {
    this.novaDespesa = this.criaDespesa();
    this.valorInput = '';
    this.vencimentoInput = '';
    this.parcelar = false;
    this.parcelasCount = 1;
    this.formaPagamento = 'avista';
    this.editando = null;
    this.cartaoSelecionadoId = this.cartoes[0]?.id || null;
  }

  ordenarPor(campo: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | 'status'): void {
    if (this.sortBy === campo) {
      this.sortDir = this.sortDir === 1 ? -1 : 1;
    } else {
      this.sortBy = campo;
      this.sortDir = 1;
    }
  }

  private normalizaData(value: string): string {
    return maskDateDDMMYYYY(value);
  }

  statusLabel(status?: InstallmentStatus): string {
    return expenseStatusLabel(status);
  }

  public parseValor(value: string | number): number {
    return parseLocalizedNumber(value);
  }

  private somaPorStatus(statuses: string[]): number {
    return this.despesas
      .filter((d) => statuses.includes(d.status || 'OPEN'))
      .reduce((sum, d) => sum + (d.valor || 0), 0);
  }

  private setAlerta(msg: string, duracao = 3000, tipo: 'info' | 'success' | 'error' = 'info'): void {
    if (this.alertaTimeout) {
      clearTimeout(this.alertaTimeout);
    }
    if (tipo === 'success') this.uiFeedback.success(msg, duracao);
    if (tipo === 'error') this.uiFeedback.error(msg, duracao);
    if (tipo === 'info') this.uiFeedback.info(msg, duracao);
    this.alertaTimeout = setTimeout(() => {
      /* noop */
    }, duracao);
  }

  private isMesAtual(vencimento?: string): boolean {
    const data = this.parseData(vencimento || '');
    if (!data) return false;
    const hoje = new Date();
    return data.getFullYear() === hoje.getFullYear() && data.getMonth() === hoje.getMonth();
  }

  private collate(a: string | undefined, b: string | undefined): number {
    return (a || '').localeCompare(b || '', getActiveLocale(), { sensitivity: 'base' });
  }

  private compareDate(a: string | undefined, b: string | undefined): number {
    const da = this.parseData(a || '');
    const db = this.parseData(b || '');
    if (!da && !db) return 0;
    if (!da) return -1;
    if (!db) return 1;
    return da.getTime() - db.getTime();
  }

  private isDataValida(value: string): boolean {
    return !!parseLocaleDate(value);
  }

  private criaDespesa(): StoredExpense {
    return {
      id: '',
      nome: '',
      categoria: '',
      categoryId: null,
      valor: 0,
      vencimento: ''
    };
  }

  private resolveCategoriaNome(expense: Pick<StoredExpense, 'categoryId' | 'categoria'>): string {
    const byId = expense.categoryId ? this.categoriaMap.get(expense.categoryId) : null;
    if (byId) return byId;
    return expense.categoria || 'Outros';
  }

  private resolveCategoriaId(expense: Pick<StoredExpense, 'categoryId' | 'categoria'>): string | null {
    if (expense.categoryId) return expense.categoryId;
    const nome = (expense.categoria || '').trim().toLowerCase();
    if (!nome) return null;
    const match = this.categorias.find((c) => c.name.trim().toLowerCase() === nome);
    return match?.id ?? null;
  }

  private aplicarEdicao(
    escopo: 'single' | 'all',
    valor: number,
    vencimentoNormalizado: string
  ): void {
    if (!this.editando) return;
    if (escopo === 'all' && !this.editando.planId) {
      this.setAlerta('Não foi possível editar esta despesa. Recarregue a página e tente novamente.', 3000, 'error');
      return;
    }
    const payload = {
      planId: this.editando.planId,
      nome: this.novaDespesa.nome,
      categoria: this.resolveCategoriaNome(this.novaDespesa),
      categoryId: this.novaDespesa.categoryId ?? null,
      valor,
      vencimento: vencimentoNormalizado,
      cartao: this.formaPagamento === 'cartao' ? this.cartaoSelecionadoId ?? undefined : undefined
    };

    this.saving = true;
    let ok = false;
    try {
      if (escopo === 'single') {
        this.db.updateExpenseInstallment(this.editando.id, payload);
      } else {
        this.db.updateExpense(this.editando.id, payload);
      }
      ok = true;
    } finally {
      this.saving = false;
      if (ok) {
        this.setAlerta('Despesa atualizada com sucesso.', 2500, 'success');
        this.fecharModal();
      }
    }
  }

  private rebuildDespesas(): void {
    const lista = this.expensesCache.map((item) => ({
      ...item,
      categoria: this.resolveCategoriaNome(item)
    }));

    this.despesasPorMes = lista.reduce((acc, item) => {
      const isAntecipada = item.status === 'ANTICIPATED';
      const key = isAntecipada
        ? this.mesKeyFromDate(new Date()) || this.mesKey()
        : this.mesKeyFromVencimento(item.vencimento) || this.mesKey();
      acc[key] = acc[key] ? [...acc[key], item] : [item];
      return acc;
    }, {} as Record<string, StoredExpense[]>);
  }
  trackByIndex(index: number): number {
    return index;
  }

}
