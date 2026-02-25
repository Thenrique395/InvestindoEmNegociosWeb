import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoalsService, Goal, GoalStatus, GoalContribution } from '../goals.service';
import { maskDateDDMMYYYY, maskMoneyInput, parseDateDDMMYYYY } from '../utils/input-mask';
import { formatLocaleDateFromIso, formatNumberValue, parseLocalizedNumber } from '../utils/locale-utils';
import { DigitOnlyDirective } from '../utils/digit-only.directive';
import { UiFeedbackService } from '../ui-feedback.service';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

type GoalKind = 'ALL' | 'DESPESA' | 'RECEITA' | 'INVESTIMENTO' | 'GERAL';
type GoalSection = {
  kind: Exclude<GoalKind, 'ALL'>;
  label: string;
  subtitle: string;
  metas: Goal[];
};

@Component({
  selector: 'app-metas',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule, DigitOnlyDirective, EmptyStateComponent],
  templateUrl: './metas.component.html',
  styleUrls: ['./metas.component.scss']
})
export class MetasComponent implements OnInit {
  mostrarModal = false;
  metaTipo: Exclude<GoalKind, 'ALL'> = 'GERAL';
  metaNome = '';
  metaValor = '';
  metaAno = String(new Date().getFullYear());
  metaDescricao = '';
  metaMensal = '';
  metaVencimento = '';
  metas: Goal[] = [];
  anos: number[] = [];
  filtroAno: number | 'ALL' = 'ALL';
  filtroStatus: GoalStatus | 'ALL' = 'ALL';
  filtroTipo: GoalKind = 'ALL';
  metaTipos = [
    { id: 'DESPESA' as const, label: 'Despesas' },
    { id: 'RECEITA' as const, label: 'Receitas' },
    { id: 'INVESTIMENTO' as const, label: 'Investimentos' },
    { id: 'GERAL' as const, label: 'Geral' }
  ];
  statusLista = [
    { id: 'Planned' as GoalStatus, label: 'Planejada' },
    { id: 'InProgress' as GoalStatus, label: 'Em andamento' },
    { id: 'Completed' as GoalStatus, label: 'Concluída' },
    { id: 'Canceled' as GoalStatus, label: 'Cancelada' }
  ];
  loading = false;
  saving = false;
  mostrarAporte = false;
  aporteValor = '';
  aporteData = new Date().toISOString().slice(0, 10);
  aporteNota = '';
  metaSelecionada?: Goal;
  editando = false;
  confirmModal = { show: false, goal: undefined as Goal | undefined, mode: 'cancel' as 'cancel' | 'reactivate' };
  contribResumo: Record<string, { total: number; meses: number }> = {};
  contribDetalhes: Record<string, GoalContribution[]> = {};
  mostrarHistorico = false;
  historicoMeta?: Goal;

  statusLabel(status: GoalStatus): string {
    switch (status) {
      case 'Planned':
        return 'Planejada';
      case 'InProgress':
        return 'Em andamento';
      case 'Completed':
        return 'Concluída';
      case 'Canceled':
        return 'Cancelada';
      default:
        return status;
    }
  }

  statusClass(status?: GoalStatus): string {
    if (!status) return 'neutral';
    switch (status) {
      case 'Completed':
        return 'ok';
      case 'InProgress':
        return 'warn';
      case 'Canceled':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  constructor(
    private goalsService: GoalsService,
    private uiFeedback: UiFeedbackService
  ) {}

  ngOnInit(): void {
    this.prepararAnos();
    this.carregarMetas();
  }

  get totalMetasAtivas(): number {
    return this.metas.filter((meta) => meta.status !== 'Canceled').length;
  }

  get metasPorSecao(): GoalSection[] {
    const grouped = new Map<Exclude<GoalKind, 'ALL'>, Goal[]>();
    const order: Exclude<GoalKind, 'ALL'>[] = ['DESPESA', 'RECEITA', 'INVESTIMENTO', 'GERAL'];
    order.forEach((kind) => grouped.set(kind, []));

    this.metas
      .slice()
      .sort((a, b) => this.compareMetas(a, b))
      .forEach((meta) => grouped.get(this.extrairTipoMeta(meta.description))?.push(meta));

    const sectionMeta: Record<Exclude<GoalKind, 'ALL'>, { label: string; subtitle: string }> = {
      DESPESA: { label: 'Metas de despesas', subtitle: 'Controle de gastos e teto por período.' },
      RECEITA: { label: 'Metas de receitas', subtitle: 'Aumento de entradas e previsibilidade mensal.' },
      INVESTIMENTO: { label: 'Metas de investimentos', subtitle: 'Acúmulo patrimonial e aportes recorrentes.' },
      GERAL: { label: 'Metas gerais', subtitle: 'Objetivos financeiros complementares.' }
    };

    return order
      .map((kind) => ({
        kind,
        label: sectionMeta[kind].label,
        subtitle: sectionMeta[kind].subtitle,
        metas: grouped.get(kind) ?? []
      }))
      .filter((section) => section.metas.length > 0);
  }

  prepararAnos(): void {
    const atual = new Date().getFullYear();
    this.anos = [];
    for (let ano = atual - 2; ano <= atual + 3; ano++) {
      this.anos.push(ano);
    }
  }

  aplicarFiltros(): void {
    this.carregarMetas();
  }

  abrirModal(): void {
    this.editando = false;
    this.resetarForm();
    this.mostrarModal = true;
  }

  abrirModalEditar(meta: Goal): void {
    this.editando = true;
    this.metaSelecionada = meta;
    this.metaTipo = this.extrairTipoMeta(meta.description);
    this.metaNome = meta.title;
    this.metaValor = formatNumberValue(meta.targetAmount);
    this.metaAno = String(meta.year);
    this.metaDescricao = this.limparDescricaoMeta(meta.description) || '';
    this.metaMensal = meta.expectedMonthly
      ? formatNumberValue(meta.expectedMonthly)
      : '';
    this.metaVencimento = meta.targetDate ? this.formatarDataBR(meta.targetDate) : '';
    this.mostrarModal = true;
  }

  fecharModal(): void {
    if (this.saving) return;
    this.mostrarModal = false;
    this.resetarForm();
  }

  salvar(): void {
    const valor = this.parseValor(this.metaValor);
    const ano = Number(String(this.metaAno || '').replace(/\D/g, ''));
    if (!this.metaNome.trim() || !valor || valor <= 0) {
      this.uiFeedback.warning('Informe nome e valor maior que zero.');
      return;
    }
    if (!ano) {
      this.uiFeedback.warning('Informe um ano válido.');
      return;
    }

    const payload = {
      title: this.metaNome.trim(),
      targetAmount: valor,
      currentAmount: this.metaSelecionada?.currentAmount ?? 0,
      year: ano,
      description: this.montarDescricaoMeta(this.metaDescricao, this.metaTipo),
      status: (this.metaSelecionada?.status as GoalStatus) ?? ('Planned' as GoalStatus),
      expectedMonthly: this.parseValor(this.metaMensal),
      targetDate: this.toTargetDate()
    };

    this.saving = true;
    const save$ = this.editando && this.metaSelecionada
      ? this.goalsService.update(this.metaSelecionada.id, payload)
      : this.goalsService.create({ ...payload, currentAmount: 0 });

    save$.subscribe({
      next: () => {
        this.saving = false;
        this.fecharModal();
        this.aplicarFiltros();
        this.uiFeedback.success('Meta salva com sucesso.');
      },
      error: (err) => {
        this.saving = false;
        this.uiFeedback.error(err?.error?.message ?? 'Falha ao salvar meta.');
      }
    });
  }

  formatarValor(): void {
    this.metaValor = maskMoneyInput(this.metaValor);
    this.atualizarAportePrevisto();
  }

  formatarMensal(): void {
    this.metaMensal = maskMoneyInput(this.metaMensal);
  }

  formatarAno(): void {
    const digits = String(this.metaAno || '').replace(/\D/g, '').slice(0, 4);
    this.metaAno = digits;
  }

  formatarVencimento(): void {
    this.metaVencimento = maskDateDDMMYYYY(this.metaVencimento);
    this.atualizarAportePrevisto();
  }

  formatarAporte(): void {
    this.aporteValor = maskMoneyInput(this.aporteValor);
  }

  private carregarContribuicoes(goalId: string): void {
    this.goalsService.listContributions(goalId).subscribe({
      next: (items) => {
        const meses = new Set(items.map((i) => i.date.slice(0, 7)));
        this.contribResumo[goalId] = { total: items.length, meses: meses.size };
        this.contribDetalhes[goalId] = items;
      }
    });
  }

  abrirModalAporte(meta: Goal): void {
    this.metaSelecionada = meta;
    this.carregarContribuicoes(meta.id);
    this.aporteValor = '';
    this.aporteData = new Date().toISOString().slice(0, 10);
    this.aporteNota = '';
    this.mostrarAporte = true;
  }

  fecharAporte(): void {
    if (this.saving) return;
    this.mostrarAporte = false;
    this.metaSelecionada = undefined;
  }

  salvarAporte(): void {
    if (!this.metaSelecionada) return;
    const valor = this.parseValor(this.aporteValor);
    if (!valor || valor <= 0) {
      this.uiFeedback.warning('Informe um valor de aporte válido.');
      return;
    }
    const restante = this.metaSelecionada.targetAmount - this.metaSelecionada.currentAmount;
    if (valor > restante) {
      this.uiFeedback.warning('Valor do aporte excede o restante da meta.');
      return;
    }
    this.saving = true;
    this.goalsService
      .addContribution(this.metaSelecionada.id, {
        amount: valor,
        date: this.aporteData,
        note: this.aporteNota?.trim() || null
      })
      .subscribe({
        next: () => {
          this.saving = false;
          const meta = this.metaSelecionada!;
          const novoValor = meta.currentAmount + valor;
          const novoStatus = novoValor >= meta.targetAmount ? ('Completed' as GoalStatus) : ('InProgress' as GoalStatus);
          this.metas = this.metas.map((m) =>
            m.id === meta.id ? { ...m, currentAmount: Math.min(novoValor, m.targetAmount), status: novoStatus } : m
          );
          this.fecharAporte();
          this.aplicarFiltros();
          this.uiFeedback.success('Aporte registrado com sucesso.');
        },
        error: () => {
          this.saving = false;
          this.uiFeedback.error('Falha ao registrar aporte.');
        }
      });
  }

  progresso(meta: Goal): number {
    if (!meta.targetAmount) return 0;
    return Math.min(100, Math.round((meta.currentAmount / meta.targetAmount) * 100));
  }

  cancelarMeta(meta: Goal): void {
    this.confirmModal = { show: true, goal: meta, mode: 'cancel' };
  }

  reativarMeta(meta: Goal): void {
    this.confirmModal = { show: true, goal: meta, mode: 'reactivate' };
  }

  confirmarAcao(): void {
    if (!this.confirmModal.goal) {
      this.confirmModal.show = false;
      return;
    }
    const goal = this.confirmModal.goal;
    const status =
      this.confirmModal.mode === 'cancel'
        ? ('Canceled' as GoalStatus)
        : goal.currentAmount > 0
        ? ('InProgress' as GoalStatus)
        : ('Planned' as GoalStatus);

    this.saving = true;
    const payload = {
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      year: goal.year,
      description: goal.description ?? null,
      status,
      expectedMonthly: goal.expectedMonthly,
      targetDate: goal.targetDate ?? null
    };
    this.goalsService.update(goal.id, payload).subscribe({
      next: (updated) => {
        this.metas = this.metas.map((m) => (m.id === updated.id ? updated : m));
        this.saving = false;
        const modo = this.confirmModal.mode;
        this.confirmModal = { show: false, goal: undefined, mode: 'cancel' };
        this.uiFeedback.success(modo === 'cancel' ? 'Meta cancelada.' : 'Meta reativada.');
      },
      error: () => {
        this.saving = false;
        this.uiFeedback.error('Falha ao atualizar o status da meta.');
      }
    });
  }

  fecharConfirm(): void {
    if (this.saving) return;
    this.confirmModal = { show: false, goal: undefined, mode: 'cancel' };
  }

  isCanceled(meta: Goal): boolean {
    return meta.status === 'Canceled';
  }

  aporteTooltip(goalId: string): string {
    const lista = this.contribDetalhes[goalId];
    if (!lista?.length) return 'Nenhum aporte registrado';
    const linhas = lista.slice(0, 4).map((c) => {
      const data = new Date(c.date);
      const dataStr = isNaN(data.getTime()) ? c.date : data.toLocaleDateString('pt-BR');
      const valor = formatNumberValue(c.amount);
      return `${dataStr}: R$ ${valor}${c.note ? ' - ' + c.note : ''}`;
    });
    const restante = lista.length > 4 ? `+${lista.length - 4} aporte(s)...` : '';
    return [...linhas, restante].filter(Boolean).join('\n');
  }

  abrirHistorico(meta: Goal): void {
    this.historicoMeta = meta;
    this.mostrarHistorico = true;
    this.carregarContribuicoes(meta.id);
  }

  fecharHistorico(): void {
    if (this.saving) return;
    this.mostrarHistorico = false;
    this.historicoMeta = undefined;
  }

  private carregarMetas(): void {
    this.loading = true;
    const ano = this.filtroAno === 'ALL' ? undefined : this.filtroAno;
    const status = this.filtroStatus === 'ALL' ? undefined : this.filtroStatus;
    this.goalsService.list(ano, status).subscribe({
      next: (lista) => {
        this.metas = lista
          .filter((meta) => this.filtroTipo === 'ALL' || this.extrairTipoMeta(meta.description) === this.filtroTipo);
        this.loading = false;
        this.metas.forEach((m) => this.carregarContribuicoes(m.id));
      },
      error: () => {
        this.loading = false;
        this.uiFeedback.error('Não foi possível carregar as metas.');
      }
    });
  }

  private parseValor(raw: string): number {
    return parseLocalizedNumber(raw);
  }

  private toTargetDate(): string | null {
    if (!this.metaVencimento) return null;
    const parsed = parseDateDDMMYYYY(this.metaVencimento);
    if (!parsed) return null;
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatarDataBR(dateValue: string): string {
    return formatLocaleDateFromIso(dateValue);
  }

  private atualizarAportePrevisto(): void {
    const parsed = parseDateDDMMYYYY(this.metaVencimento);
    const total = this.parseValor(this.metaValor);
    if (!parsed || !total) return;
    const current = this.metaSelecionada?.currentAmount ?? 0;
    const restante = Math.max(total - current, 0);
    const months = this.monthsUntil(parsed);
    if (months <= 0) return;
    const mensal = restante / months;
    this.metaMensal = formatNumberValue(mensal);
    this.metaAno = String(parsed.getFullYear());
  }

  private monthsUntil(target: Date): number {
    const now = new Date();
    const currentIndex = now.getFullYear() * 12 + now.getMonth();
    const targetIndex = target.getFullYear() * 12 + target.getMonth();
    const months = targetIndex - currentIndex + 1;
    return months > 0 ? months : 0;
  }

  private resetarForm(): void {
    this.metaTipo = 'GERAL';
    this.metaNome = '';
    this.metaValor = '';
    this.metaMensal = '';
    this.metaVencimento = '';
    this.metaAno = String(new Date().getFullYear());
    this.metaDescricao = '';
    this.metaSelecionada = undefined;
    this.editando = false;
  }

  tipoMetaLabel(meta: Goal): string {
    const tipo = this.extrairTipoMeta(meta.description);
    switch (tipo) {
      case 'DESPESA':
        return 'Controle de Despesas';
      case 'RECEITA':
        return 'Meta de Receitas';
      case 'INVESTIMENTO':
        return 'Meta de Investimentos';
      default:
        return 'Meta Geral';
    }
  }

  descricaoMeta(meta: Goal): string | null {
    return this.limparDescricaoMeta(meta.description);
  }

  private montarDescricaoMeta(descricao: string, tipo: Exclude<GoalKind, 'ALL'>): string | null {
    const clean = (descricao || '').trim();
    const tag = `[TIPO:${tipo}]`;
    return clean ? `${tag} ${clean}` : tag;
  }

  private extrairTipoMeta(description?: string | null): Exclude<GoalKind, 'ALL'> {
    const normalized = (description || '').toUpperCase();
    if (normalized.includes('[TIPO:DESPESA]')) return 'DESPESA';
    if (normalized.includes('[TIPO:RECEITA]')) return 'RECEITA';
    if (normalized.includes('[TIPO:INVESTIMENTO]')) return 'INVESTIMENTO';
    return 'GERAL';
  }

  private limparDescricaoMeta(description?: string | null): string | null {
    if (!description) return description ?? null;
    return description.replace(/\[TIPO:[A-Z]+\]\s*/i, '').trim() || null;
  }

  private compareMetas(a: Goal, b: Goal): number {
    const typeOrder: Record<Exclude<GoalKind, 'ALL'>, number> = {
      DESPESA: 0,
      RECEITA: 1,
      INVESTIMENTO: 2,
      GERAL: 3
    };
    const aType = this.extrairTipoMeta(a.description);
    const bType = this.extrairTipoMeta(b.description);
    const byType = typeOrder[aType] - typeOrder[bType];
    if (byType !== 0) return byType;

    const byProgress = this.progresso(b) - this.progresso(a);
    if (byProgress !== 0) return byProgress;

    return a.title.localeCompare(b.title, 'pt-BR');
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByGoal(_: number, meta: Goal): string {
    return meta.id;
  }

  trackBySection(_: number, section: GoalSection): string {
    return section.kind;
  }

}
