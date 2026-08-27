import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppCurrencyPipe } from '../../shared/app-currency.pipe';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../../shared/transactions/transaction-summary-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

type CalculatorType =
  | 'jurosCompostos'
  | 'jurosSimples'
  | 'renda'
  | 'milhao'
  | 'aposentadoria'
  | 'alugarOuFinanciar'
  | 'poupancaSelic'
  | 'vistaPrazo'
  | 'reservaEmergencia'
  | 'comparadorRendaFixa'
  | 'rescisao'
  | 'irIsencao'
  | 'salarioRealidade'
  | 'seguroDesemprego'
  | 'horasExtras'
  | 'fgts'
  | 'inss'
  | 'feriasProporcionais'
  | 'decimoTerceiro'
  | 'custoClt'
  | 'ferias';

interface SerieAnual {
  ano: number;
  aporteAno: number;
  jurosAno: number;
  totalInvestido: number;
  totalJuros: number;
  totalAcumulado: number;
}

interface SeriePonto {
  mes: number;
  valor: number;
}

interface CalcItem {
  id: CalculatorType;
  title: string;
  subtitle: string;
  category: 'financeiras' | 'trabalhistas';
  implemented: boolean;
  icon: string;
}

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink, AppCurrencyPipe, PageHeaderComponent, TransactionSummaryCardComponent, StatusBadgeComponent],
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalculatorComponent {
  selected: CalculatorType | null = null;

  calculators: CalcItem[] = [
    { id: 'aposentadoria', title: 'Aposentadoria', subtitle: 'Planeje quanto poupar até aposentar', category: 'financeiras', implemented: true, icon: 'home' },
    { id: 'alugarOuFinanciar', title: 'Alugar x Financiar', subtitle: 'Compare o custo efetivo do imóvel', category: 'financeiras', implemented: true, icon: 'attach_money' },
    { id: 'poupancaSelic', title: 'Poupança x Selic', subtitle: 'Compare rentabilidade', category: 'financeiras', implemented: true, icon: 'trending_up' },
    { id: 'vistaPrazo', title: 'À vista ou a prazo', subtitle: 'Custo efetivo de pagamentos', category: 'financeiras', implemented: true, icon: 'payments' },
    { id: 'reservaEmergencia', title: 'Reserva de emergência', subtitle: 'Calcule o valor ideal e prazo', category: 'financeiras', implemented: true, icon: 'shield' },
    { id: 'comparadorRendaFixa', title: 'Comparador de Renda Fixa', subtitle: 'CDI x prefixado x IPCA', category: 'financeiras', implemented: true, icon: 'leaderboard' },
    { id: 'jurosSimples', title: 'Juros Simples', subtitle: 'Rendimento linear para curto prazo', category: 'financeiras', implemented: true, icon: 'percent' },
    { id: 'jurosCompostos', title: 'Juros Compostos', subtitle: 'Poder dos juros ao longo do tempo', category: 'financeiras', implemented: true, icon: 'calculate' },
    { id: 'renda', title: 'Calculadora de Receitas', subtitle: 'Receita mensal sobre patrimônio', category: 'financeiras', implemented: true, icon: 'savings' },
    { id: 'milhao', title: 'Primeiro Milhão', subtitle: 'Quando chego a R$ 1 mi?', category: 'financeiras', implemented: true, icon: 'military_tech' },
    { id: 'rescisao', title: 'Rescisão Trabalhista', subtitle: 'Verbas rescisórias', category: 'trabalhistas', implemented: true, icon: 'gavel' },
    { id: 'irIsencao', title: 'Isenção de IR', subtitle: 'Verifique elegibilidade', category: 'trabalhistas', implemented: true, icon: 'policy' },
    { id: 'salarioRealidade', title: 'Salário x realidade', subtitle: 'Comparativo regional', category: 'trabalhistas', implemented: true, icon: 'public' },
    { id: 'seguroDesemprego', title: 'Seguro-desemprego', subtitle: 'Cálculo de parcelas', category: 'trabalhistas', implemented: true, icon: 'fact_check' },
    { id: 'horasExtras', title: 'Horas extras', subtitle: 'Adicional e reflexos', category: 'trabalhistas', implemented: true, icon: 'schedule' },
    { id: 'fgts', title: 'FGTS', subtitle: 'Depósitos e saque', category: 'trabalhistas', implemented: true, icon: 'account_balance' },
    { id: 'inss', title: 'INSS', subtitle: 'Faixas e descontos', category: 'trabalhistas', implemented: true, icon: 'balance' },
    { id: 'feriasProporcionais', title: 'Férias proporcionais', subtitle: 'Dias devidos', category: 'trabalhistas', implemented: true, icon: 'beach_access' },
    { id: 'decimoTerceiro', title: 'Décimo terceiro', subtitle: 'Proporcional e integral', category: 'trabalhistas', implemented: true, icon: 'card_giftcard' },
    { id: 'custoClt', title: 'Custo CLT x PJ', subtitle: 'Comparativo empregador', category: 'trabalhistas', implemented: true, icon: 'work' },
    { id: 'ferias', title: 'Férias', subtitle: 'Ganho e descontos', category: 'trabalhistas', implemented: true, icon: 'luggage' }
  ];

  // Juros compostos
  aporteInicial = 10000;
  aporteMensal = 500;
  taxa = 0.8;
  meses = 120;
  jurosResultado = 0;
  jurosSeries: SeriePonto[] = [];
  jurosAnual: SerieAnual[] = [];

  // Juros simples
  capitalSimples = 10000;
  taxaSimples = 0.8;
  mesesSimples = 12;
  jurosSimplesResultado = 0;

  // Renda mensal
  patrimonio = 100000;
  rentabilidadeMensal = 0.7;
  rendaResultado = 0;
  rendaMeses = Array.from({ length: 12 }, (_, i) => i + 1);

  // Primeiro milhão
  aporteMilhao = 1000;
  taxaMilhao = 0.8;
  mesesMilhao = 0;
  milhaoSeries: SeriePonto[] = [];

  // Reserva de emergência
  despesaMensal = 3000;
  mesesCobertura = 6;
  aporteMensalReserva = 500;
  rendimentoReserva = 0.6; // % ao mês
  valorObjetivoReserva = 0;
  mesesParaAtingir = 0;

  // Aposentadoria
  idadeAtual = 30;
  idadeAposentadoria = 60;
  patrimonioAtual = 50000;
  aporteMensalAposentadoria = 800;
  taxaAposentadoria = 0.7; // % ao mês
  patrimonioAposentadoria = 0;

  // Alugar x Financiar
  valorImovel = 500000;
  entradaImovel = 100000;
  taxaFinanciamento = 0.9; // % ao mês
  prazoFinanciamento = 360;
  aluguelMensal = 2500;
  reajusteAnualAluguel = 6; // % ao ano
  custoFinanciamentoTotal = 0;
  custoAluguelTotal = 0;
  pontoEquilibrioMeses = 0;

  // Poupança x Selic
  aporteInicialPoupanca = 10000;
  aporteMensalPoupanca = 300;
  taxaPoupanca = 0.6; // % ao mês
  taxaSelic = 0.9; // % ao mês
  mesesPoupanca = 24;
  resultadoPoupanca = 0;
  resultadoSelic = 0;

  // À vista ou a prazo
  precoVista = 4000;
  parcelas = 12;
  valorParcela = 380;
  totalPrazo = 0;
  taxaEfetivaPrazo = 0;

  // Comparador de renda fixa
  valorAplicado = 20000;
  mesesRendaFixa = 24;
  taxaCdi = 0.9; // % ao mês
  taxaPrefixado = 0.95; // % ao mês
  taxaIpca = 0.4; // % ao mês
  taxaIpcaSpread = 0.5; // % ao mês
  resultadoCdi = 0;
  resultadoPrefixado = 0;
  resultadoIpca = 0;

  // INSS
  salarioInss = 3000;
  inssResultado = 0;
  liquidoInss = 0;

  // FGTS
  salarioFgts = 3000;
  mesesFgts = 12;
  depositoMensalFgts = 0;
  totalFgts = 0;
  multaFgtsResultado = 0;

  // Férias
  salarioFerias = 3000;
  diasVendidosFerias = 0;
  valorFeriasGozadas = 0;
  valorAbonoFerias = 0;
  totalFerias = 0;

  // Férias proporcionais
  salarioFeriasProporcionais = 3000;
  mesesFeriasProporcionais = 6;
  valorFeriasProporcionais = 0;

  // Décimo terceiro
  salarioDecimoTerceiro = 3000;
  mesesDecimoTerceiro = 12;
  brutoDecimoTerceiro = 0;
  inssDecimoTerceiro = 0;
  liquidoDecimoTerceiro = 0;

  // Custo CLT x PJ
  salarioClt = 5000;
  aliquotaSimplesPj = 6;
  encargosCltResultado = 0;
  custoTotalCltResultado = 0;
  liquidoPjResultado = 0;

  // Rescisão trabalhista
  salarioRescisao = 3000;
  mesesNoAnoRescisao = 6;
  anosCompletosRescisao = 2;
  temFeriasVencidasRescisao = false;
  saldoFgtsRescisao = 0;
  tipoRescisao: 'sem_justa_causa' | 'pedido_demissao' | 'acordo' = 'sem_justa_causa';
  feriasVencidasRescisaoResultado = 0;
  feriasProporcionaisRescisaoResultado = 0;
  decimoProporcionalRescisaoResultado = 0;
  avisoPrevioDiasResultado = 0;
  avisoPrevioValorResultado = 0;
  multaFgtsRescisaoResultado = 0;
  totalBrutoRescisaoResultado = 0;

  // Isenção de IR
  salarioIrIsencao = 3000;
  dependentesIrIsencao = 0;
  baseCalculoIr = 0;
  isentoIr = true;
  irrfResultado = 0;

  // Salário x realidade
  salarioRealidadeBruto = 3000;
  despesasMensaisRealidade = 2000;
  salarioLiquidoRealidade = 0;
  saldoAposDespesasRealidade = 0;
  salariosMinimosRealidade = 0;
  percentualComprometidoRealidade = 0;

  // Seguro-desemprego
  mediaSalarialSeguroDesemprego = 2000;
  mesesTrabalhadosSeguroDesemprego = 18;
  solicitacoesAnterioresSeguroDesemprego: '0' | '1' | '2' = '0';
  parcelasSeguroDesemprego = 0;
  valorParcelaSeguroDesemprego = 0;
  totalSeguroDesemprego = 0;

  // Horas extras
  salarioHorasExtras = 3000;
  jornadaMensalHorasExtras = 220;
  quantidadeHorasExtras = 10;
  adicionalHorasExtras = 50;
  diasUteisHorasExtras = 25;
  diasDescansoHorasExtras = 5;
  valorHoraNormalResultado = 0;
  valorHoraExtraResultado = 0;
  totalHorasExtrasResultado = 0;
  reflexoDsrResultado = 0;
  totalComReflexoResultado = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef
  ) {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id') as CalculatorType | null;
      if (id && this.calculators.find((c) => c.id === id)) {
        this.selected = id;
      } else {
        this.selected = null;
      }
      this.cdr.markForCheck();
    });
  }

  calcularReserva(): void {
    this.valorObjetivoReserva = this.despesaMensal * this.mesesCobertura;
    const alvo = this.valorObjetivoReserva;
    const aporte = Math.max(0, this.aporteMensalReserva);
    const r = Math.max(0, this.rendimentoReserva / 100);
    if (aporte === 0) {
      this.mesesParaAtingir = 0;
      return;
    }
    if (r === 0) {
      this.mesesParaAtingir = Math.ceil(alvo / aporte);
      return;
    }
    const n = Math.log((alvo * r) / aporte + 1) / Math.log(1 + r);
    this.mesesParaAtingir = Math.max(1, Math.ceil(n));
  }

  calcularAposentadoria(): void {
    const meses = Math.max(0, (this.idadeAposentadoria - this.idadeAtual) * 12);
    const i = Math.max(0, this.taxaAposentadoria / 100);
    if (meses === 0) {
      this.patrimonioAposentadoria = this.patrimonioAtual;
      return;
    }
    const fv =
      i === 0
        ? this.patrimonioAtual + this.aporteMensalAposentadoria * meses
        : this.patrimonioAtual * Math.pow(1 + i, meses) +
          this.aporteMensalAposentadoria * ((Math.pow(1 + i, meses) - 1) / i);
    this.patrimonioAposentadoria = fv;
  }

  calcularAlugarOuFinanciar(): void {
    const principal = Math.max(0, this.valorImovel - this.entradaImovel);
    const i = Math.max(0, this.taxaFinanciamento / 100);
    const n = Math.max(1, this.prazoFinanciamento);
    const pmt = i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
    this.custoFinanciamentoTotal = this.entradaImovel + pmt * n;

    const reajuste = Math.max(0, this.reajusteAnualAluguel / 100);
    let totalAluguel = 0;
    let aluguelAtual = Math.max(0, this.aluguelMensal);
    for (let mes = 1; mes <= n; mes++) {
      totalAluguel += aluguelAtual;
      if (mes % 12 === 0) {
        aluguelAtual *= 1 + reajuste;
      }
    }
    this.custoAluguelTotal = totalAluguel;

    let acumulado = 0;
    aluguelAtual = Math.max(0, this.aluguelMensal);
    this.pontoEquilibrioMeses = 0;
    for (let mes = 1; mes <= n; mes++) {
      acumulado += aluguelAtual;
      if (this.pontoEquilibrioMeses === 0 && acumulado >= this.custoFinanciamentoTotal) {
        this.pontoEquilibrioMeses = mes;
      }
      if (mes % 12 === 0) {
        aluguelAtual *= 1 + reajuste;
      }
    }
  }

  calcularPoupancaSelic(): void {
    const n = Math.max(1, this.mesesPoupanca);
    this.resultadoPoupanca = this.calculaSerie(this.aporteInicialPoupanca, this.aporteMensalPoupanca, this.taxaPoupanca, n);
    this.resultadoSelic = this.calculaSerie(this.aporteInicialPoupanca, this.aporteMensalPoupanca, this.taxaSelic, n);
  }

  calcularVistaPrazo(): void {
    const n = Math.max(1, this.parcelas);
    this.totalPrazo = Math.max(0, this.valorParcela) * n;
    const delta = this.totalPrazo - Math.max(0, this.precoVista);
    this.taxaEfetivaPrazo = this.precoVista > 0 ? (delta / this.precoVista) / n * 100 : 0;
  }

  calcularComparadorRendaFixa(): void {
    const n = Math.max(1, this.mesesRendaFixa);
    this.resultadoCdi = this.calculaSerie(this.valorAplicado, 0, this.taxaCdi, n);
    this.resultadoPrefixado = this.calculaSerie(this.valorAplicado, 0, this.taxaPrefixado, n);
    const taxaIpcaTotal = this.taxaIpca + this.taxaIpcaSpread;
    this.resultadoIpca = this.calculaSerie(this.valorAplicado, 0, taxaIpcaTotal, n);
  }

  goTo(id: CalculatorType): void {
    this.router.navigate(['/calculadora', id]);
  }

  backToCatalog(): void {
    this.router.navigate(['/calculadora']);
  }

  iconFor(id: CalculatorType): string {
    const icons: Record<CalculatorType, string> = {
      jurosCompostos: '📈',
      jurosSimples: '📉',
      renda: '💵',
      milhao: '🏆',
      aposentadoria: '🏡',
      alugarOuFinanciar: '🏠',
      poupancaSelic: '💰',
      vistaPrazo: '🧾',
      reservaEmergencia: '🛟',
      comparadorRendaFixa: '📊',
      rescisao: '⚖️',
      irIsencao: '🧾',
      salarioRealidade: '🌎',
      seguroDesemprego: '🧰',
      horasExtras: '⏱️',
      fgts: '🏦',
      inss: '🧾',
      feriasProporcionais: '🏝️',
      decimoTerceiro: '🎁',
      custoClt: '👔',
      ferias: '🧳'
    };
    return icons[id] || '🧮';
  }

  calcularJuros(): void {
    const i = this.taxa / 100;
    const fv =
      i === 0
        ? this.aporteInicial + this.aporteMensal * this.meses
        : this.aporteInicial * Math.pow(1 + i, this.meses) +
          this.aporteMensal * ((Math.pow(1 + i, this.meses) - 1) / i);
    this.jurosResultado = fv;
    this.jurosSeries = this.geraSerieJuros();
    this.jurosAnual = this.geraSerieAnual();
  }

  calcularJurosSimples(): void {
    const i = this.taxaSimples / 100;
    this.jurosSimplesResultado = this.capitalSimples * i * this.mesesSimples;
  }

  calcularRenda(): void {
    const i = this.rentabilidadeMensal / 100;
    this.rendaResultado = this.patrimonio * i;
  }

  calcularMilhao(): void {
    const i = this.taxaMilhao / 100;
    const PMT = this.aporteMilhao;
    const FV = 1_000_000;
    const n = i === 0 ? FV / Math.max(PMT, 1) : Math.log((FV * i) / PMT + 1) / Math.log(1 + i);
    this.mesesMilhao = Math.ceil(n);
    this.milhaoSeries = this.geraSerieMilhao();
  }

  calcularInssCalculadora(): void {
    this.inssResultado = this.calcularInss(Math.max(0, this.salarioInss));
    this.liquidoInss = Math.max(0, this.salarioInss) - this.inssResultado;
  }

  calcularFgts(): void {
    const salario = Math.max(0, this.salarioFgts);
    const meses = Math.max(1, this.mesesFgts);
    this.depositoMensalFgts = salario * 0.08;
    this.totalFgts = this.depositoMensalFgts * meses;
    this.multaFgtsResultado = this.totalFgts * 0.4;
  }

  calcularFerias(): void {
    const salario = Math.max(0, this.salarioFerias);
    const diasVendidos = Math.min(10, Math.max(0, this.diasVendidosFerias));
    const diasGozados = 30 - diasVendidos;
    this.valorFeriasGozadas = (salario / 30) * diasGozados * (4 / 3);
    this.valorAbonoFerias = (salario / 30) * diasVendidos * (4 / 3);
    this.totalFerias = this.valorFeriasGozadas + this.valorAbonoFerias;
  }

  calcularFeriasProporcionais(): void {
    const salario = Math.max(0, this.salarioFeriasProporcionais);
    const meses = Math.min(12, Math.max(0, this.mesesFeriasProporcionais));
    this.valorFeriasProporcionais = (salario / 12) * meses * (4 / 3);
  }

  calcularDecimoTerceiro(): void {
    const salario = Math.max(0, this.salarioDecimoTerceiro);
    const meses = Math.min(12, Math.max(0, this.mesesDecimoTerceiro));
    this.brutoDecimoTerceiro = meses === 12 ? salario : (salario / 12) * meses;
    this.inssDecimoTerceiro = this.calcularInss(this.brutoDecimoTerceiro);
    this.liquidoDecimoTerceiro = this.brutoDecimoTerceiro - this.inssDecimoTerceiro;
  }

  calcularCustoClt(): void {
    const salario = Math.max(0, this.salarioClt);
    const aliquotaPj = Math.max(0, this.aliquotaSimplesPj) / 100;
    const fgts = 0.08;
    const inssPatronal = 0.2;
    const decimoProvisao = 1 / 12;
    const feriasProvisao = (1 / 12) * (4 / 3);
    this.encargosCltResultado = salario * (fgts + inssPatronal + decimoProvisao + feriasProvisao);
    this.custoTotalCltResultado = salario + this.encargosCltResultado;
    this.liquidoPjResultado = this.custoTotalCltResultado * (1 - aliquotaPj);
  }

  calcularRescisao(): void {
    const salario = Math.max(0, this.salarioRescisao);
    const meses = Math.min(12, Math.max(0, this.mesesNoAnoRescisao));
    const anos = Math.max(0, this.anosCompletosRescisao);
    const saldoFgts = Math.max(0, this.saldoFgtsRescisao);
    const tipo = this.tipoRescisao;

    this.feriasVencidasRescisaoResultado = this.temFeriasVencidasRescisao ? salario * (4 / 3) : 0;
    this.feriasProporcionaisRescisaoResultado = (salario / 12) * meses * (4 / 3);
    this.decimoProporcionalRescisaoResultado = (salario / 12) * meses;

    this.avisoPrevioDiasResultado = 30 + Math.min(60, anos * 3);
    const avisoIntegral = (salario / 30) * this.avisoPrevioDiasResultado;
    const fatorAviso = tipo === 'sem_justa_causa' ? 1 : tipo === 'acordo' ? 0.5 : 0;
    this.avisoPrevioValorResultado = avisoIntegral * fatorAviso;

    const fatorMulta = tipo === 'sem_justa_causa' ? 0.4 : tipo === 'acordo' ? 0.2 : 0;
    this.multaFgtsRescisaoResultado = saldoFgts * fatorMulta;

    this.totalBrutoRescisaoResultado =
      this.feriasVencidasRescisaoResultado +
      this.feriasProporcionaisRescisaoResultado +
      this.decimoProporcionalRescisaoResultado +
      this.avisoPrevioValorResultado +
      this.multaFgtsRescisaoResultado;
  }

  calcularIsencaoIr(): void {
    const salario = Math.max(0, this.salarioIrIsencao);
    const dependentes = Math.max(0, this.dependentesIrIsencao);
    const inss = this.calcularInss(salario);
    this.baseCalculoIr = Math.max(0, salario - inss - dependentes * 189.59);

    // Tabela IRRF mensal 2024 (método "parcela a deduzir", oficial)
    const faixas = [
      { limite: 2259.2, aliquota: 0, deduzir: 0 },
      { limite: 2826.65, aliquota: 0.075, deduzir: 169.44 },
      { limite: 3751.05, aliquota: 0.15, deduzir: 381.44 },
      { limite: 4664.68, aliquota: 0.225, deduzir: 662.77 },
      { limite: Infinity, aliquota: 0.275, deduzir: 896.0 }
    ];
    const faixa = faixas.find((f) => this.baseCalculoIr <= f.limite) ?? faixas[faixas.length - 1];
    this.isentoIr = faixa.aliquota === 0;
    this.irrfResultado = this.isentoIr ? 0 : this.baseCalculoIr * faixa.aliquota - faixa.deduzir;
  }

  calcularSalarioRealidade(): void {
    const salario = Math.max(0, this.salarioRealidadeBruto);
    const despesas = Math.max(0, this.despesasMensaisRealidade);
    this.salarioLiquidoRealidade = salario - this.calcularInss(salario);
    this.saldoAposDespesasRealidade = this.salarioLiquidoRealidade - despesas;
    this.salariosMinimosRealidade = salario / 1412;
    this.percentualComprometidoRealidade =
      this.salarioLiquidoRealidade > 0 ? (despesas / this.salarioLiquidoRealidade) * 100 : 0;
  }

  calcularSeguroDesemprego(): void {
    const media = Math.max(0, this.mediaSalarialSeguroDesemprego);
    const meses = Math.max(0, this.mesesTrabalhadosSeguroDesemprego);
    const solicitacoes = this.solicitacoesAnterioresSeguroDesemprego;

    const tabelas: Record<'0' | '1' | '2', { min: number; parcelas: number }[]> = {
      '0': [
        { min: 24, parcelas: 5 },
        { min: 12, parcelas: 4 }
      ],
      '1': [
        { min: 24, parcelas: 5 },
        { min: 12, parcelas: 4 },
        { min: 9, parcelas: 3 }
      ],
      '2': [
        { min: 24, parcelas: 5 },
        { min: 12, parcelas: 4 },
        { min: 6, parcelas: 3 }
      ]
    };
    const faixa = tabelas[solicitacoes].find((f) => meses >= f.min);
    this.parcelasSeguroDesemprego = faixa?.parcelas ?? 0;

    const salarioMinimo = 1412.0;
    let valorParcela: number;
    if (media <= 2041.38) {
      valorParcela = media * 0.8;
    } else if (media <= 3402.18) {
      valorParcela = 1633.11 + (media - 2041.38) * 0.5;
    } else {
      valorParcela = 2313.74;
    }
    this.valorParcelaSeguroDesemprego = Math.max(salarioMinimo, valorParcela);
    this.totalSeguroDesemprego =
      this.parcelasSeguroDesemprego > 0 ? this.valorParcelaSeguroDesemprego * this.parcelasSeguroDesemprego : 0;
  }

  calcularHorasExtras(): void {
    const salario = Math.max(0, this.salarioHorasExtras);
    const jornada = Math.max(1, this.jornadaMensalHorasExtras);
    const horas = Math.max(0, this.quantidadeHorasExtras);
    const adicional = Math.max(0, this.adicionalHorasExtras) / 100;
    const diasUteis = Math.max(1, this.diasUteisHorasExtras);
    const diasDescanso = Math.max(0, this.diasDescansoHorasExtras);

    this.valorHoraNormalResultado = salario / jornada;
    this.valorHoraExtraResultado = this.valorHoraNormalResultado * (1 + adicional);
    this.totalHorasExtrasResultado = this.valorHoraExtraResultado * horas;
    this.reflexoDsrResultado = (this.totalHorasExtrasResultado / diasUteis) * diasDescanso;
    this.totalComReflexoResultado = this.totalHorasExtrasResultado + this.reflexoDsrResultado;
  }

  private calcularInss(baseValor: number): number {
    // Tabela INSS 2024 (progressiva por faixa, não alíquota única sobre o total) — revisar
    // anualmente, os limites de faixa mudam todo ano.
    const faixas = [
      { limite: 1412.0, aliquota: 0.075 },
      { limite: 2666.68, aliquota: 0.09 },
      { limite: 4000.03, aliquota: 0.12 },
      { limite: 7786.02, aliquota: 0.14 }
    ];
    let contribuicao = 0;
    let limiteAnterior = 0;
    for (const faixa of faixas) {
      const baseFaixa = Math.max(0, Math.min(baseValor, faixa.limite) - limiteAnterior);
      contribuicao += baseFaixa * faixa.aliquota;
      limiteAnterior = faixa.limite;
      if (baseValor <= faixa.limite) break;
    }
    if (baseValor > 7786.02) contribuicao = 908.86; // teto de contribuição 2024
    return contribuicao;
  }

  private calculaSerie(aporteInicial: number, aporteMensal: number, taxaMensalPercent: number, meses: number): number {
    const i = Math.max(0, taxaMensalPercent / 100);
    if (i === 0) {
      return aporteInicial + aporteMensal * meses;
    }
    return aporteInicial * Math.pow(1 + i, meses) + aporteMensal * ((Math.pow(1 + i, meses) - 1) / i);
  }

  private geraSerieJuros(): SeriePonto[] {
    const pontos = [0, 0.25, 0.5, 0.75, 1];
    const i = this.taxa / 100;
    return pontos.map((p) => {
      const m = Math.max(1, Math.round(this.meses * p));
      const valor =
        i === 0
          ? this.aporteInicial + this.aporteMensal * m
          : this.aporteInicial * Math.pow(1 + i, m) +
            this.aporteMensal * ((Math.pow(1 + i, m) - 1) / i);
      return { mes: m, valor };
    });
  }

  private geraSerieMilhao(): SeriePonto[] {
    const i = this.taxaMilhao / 100;
    const PMT = this.aporteMilhao;
    const pontos = [12, 36, 60, 120, this.mesesMilhao];
    return pontos
      .filter((m, idx, arr) => m > 0 && arr.indexOf(m) === idx)
      .map((mes) => {
        const valor = i === 0 ? PMT * mes : PMT * ((Math.pow(1 + i, mes) - 1) / i);
        return { mes, valor };
      })
      .sort((a, b) => a.mes - b.mes);
  }

  private geraSerieAnual(): SerieAnual[] {
    const i = this.taxa / 100;
    const anos = Math.ceil(this.meses / 12);
    const resultado: SerieAnual[] = [];
    let totalInvestido = 0;
    let totalJuros = 0;
    for (let ano = 1; ano <= anos; ano++) {
      const mesesCorrentes = Math.min(ano * 12, this.meses);
      const mesesAnterior = (ano - 1) * 12;

      const vfAnterior =
        i === 0
          ? this.aporteInicial + this.aporteMensal * mesesAnterior
          : this.aporteInicial * Math.pow(1 + i, mesesAnterior) +
            this.aporteMensal * ((Math.pow(1 + i, mesesAnterior) - 1) / i);

      const vfAtual =
        i === 0
          ? this.aporteInicial + this.aporteMensal * mesesCorrentes
          : this.aporteInicial * Math.pow(1 + i, mesesCorrentes) +
            this.aporteMensal * ((Math.pow(1 + i, mesesCorrentes) - 1) / i);

      const aporteAno = this.aporteMensal * (mesesCorrentes - mesesAnterior);
      const jurosAno = vfAtual - vfAnterior - aporteAno;

      totalInvestido += aporteAno;
      totalJuros += jurosAno;

      resultado.push({
        ano,
        aporteAno,
        jurosAno,
        totalInvestido,
        totalJuros,
        totalAcumulado: vfAtual
      });
    }
    return resultado;
  }

  get jurosMax(): number {
    return this.jurosSeries.reduce((max, p) => Math.max(max, p.valor), 1);
  }

  get milhaoMax(): number {
    return this.milhaoSeries.reduce((max, p) => Math.max(max, p.valor), 1);
  }

  get financeiras(): CalcItem[] {
    return this.calculators.filter((c) => c.category === 'financeiras');
  }

  get trabalhistas(): CalcItem[] {
    return this.calculators.filter((c) => c.category === 'trabalhistas');
  }

  get implementedCount(): number {
    return this.calculators.filter((c) => c.implemented).length;
  }

  get pendingCount(): number {
    return this.calculators.length - this.implementedCount;
  }

  get selecionado(): CalcItem | undefined {
    return this.selected ? this.calculators.find((c) => c.id === this.selected) : undefined;
  }

  get isImplementado(): boolean {
    return !!this.selecionado?.implemented;
  }
  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

}
