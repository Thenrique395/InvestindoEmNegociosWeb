import { ProgressMode } from '../../shared/progress-bar/progress-thresholds';
import { Goal, GoalKind, GoalProgress, GoalStatus, RecurrenceType } from '../../core/goals.service';
import { StatusBadgeTone } from '../../shared/status-badge/status-badge.component';

/**
 * Modelo puro da Central de Planejamento (Metas).
 *
 * Config-driven por tipo: um único template lê os rótulos/semântica daqui.
 * Progresso vem do backend (endpoint /progress); quando indisponível (backend
 * antigo), há fallback client-side a partir de currentAmount/targetAmount.
 *
 * Semântica: Despesa é CONSUMO de limite (mais não é melhor); Receita e
 * Investimento são CONQUISTA (aproximar-se do alvo é positivo).
 */

export type GoalDisplayState =
  | 'active' | 'attention' | 'exceeded' | 'overdue' | 'achieved'
  | 'paused' | 'completed' | 'archived' | 'canceled' | 'draft' | 'scheduled';

/**
 * A cor da barra NÃO mora mais aqui: os limiares de consumo × conquista são de
 * `shared/progress-bar/progress-thresholds` (ARQUITETURA_ANGULAR.md §9.1, "duas
 * funções, um lugar"). A meta só declara qual das duas semânticas ela tem e se
 * está no ritmo; o primitivo decide o tom.
 */

export interface GoalTypeConfig {
  kind: GoalKind;
  icon: string;
  typeLabel: string;
  /** Rótulo do valor-alvo. */
  primaryLabel: string;
  /** Rótulo do valor realizado. */
  realizedLabel: string;
  /** Rótulo do que falta / disponível. */
  remainingLabel: string;
  /** Rótulo do percentual. */
  percentLabel: string;
  /** true = consumir mais é pior (Despesa). */
  isConsumption: boolean;
}

export const GOAL_TYPE_CONFIG: Record<GoalKind, GoalTypeConfig> = {
  Expense: { kind: 'Expense', icon: '📉', typeLabel: 'Despesas', primaryLabel: 'Limite', realizedLabel: 'Gasto', remainingLabel: 'Disponível', percentLabel: '% utilizado', isConsumption: true },
  Income: { kind: 'Income', icon: '📈', typeLabel: 'Receitas', primaryLabel: 'Objetivo', realizedLabel: 'Recebido', remainingLabel: 'Falta receber', percentLabel: '% alcançado', isConsumption: false },
  Investment: { kind: 'Investment', icon: '🎯', typeLabel: 'Investimentos', primaryLabel: 'Meta de aporte', realizedLabel: 'Aportado', remainingLabel: 'Falta aportar', percentLabel: '% alcançado', isConsumption: false },
  General: { kind: 'General', icon: '🎯', typeLabel: 'Geral', primaryLabel: 'Objetivo', realizedLabel: 'Realizado', remainingLabel: 'Falta', percentLabel: '% alcançado', isConsumption: false }
};

export interface GoalView {
  goal: Goal;
  config: GoalTypeConfig;
  target: number;
  realized: number;
  pending: number;
  percent: number;
  /** Percentual limitado a 100 para a barra. */
  barPercent: number;
  remaining: number;
  monthlyRequired: number | null;
  forecast: number | null;
  daysRemaining: number | null;
  state: GoalDisplayState;
  stateLabel: string;
  stateTone: StatusBadgeTone;
  progressMode: ProgressMode;
  /** Só para conquista: o ritmo alcança o prazo? */
  onTrack: boolean;
  recurrenceLabel: string;
}

export function configFor(kind: GoalKind): GoalTypeConfig {
  return GOAL_TYPE_CONFIG[kind] ?? GOAL_TYPE_CONFIG.General;
}

function daysUntil(dateIso?: string | null): number | null {
  if (!dateIso) return null;
  const end = new Date(dateIso);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  const ms = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
    - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** Estado de acompanhamento derivado quando não há progresso do backend. */
function fallbackState(goal: Goal, percent: number): GoalDisplayState {
  const warning = goal.warningThreshold ?? 80;
  const end = goal.endDate ?? goal.targetDate;
  const past = end ? new Date(end) < new Date() : false;

  if (configFor(goal.kind).isConsumption) {
    if (percent > 100) return 'exceeded';
    if (percent >= warning) return 'attention';
    return 'active';
  }
  if (percent >= 100) return 'achieved';
  if (past) return 'overdue';
  if (percent < warning * 0.6) return 'attention';
  return 'active';
}

const STATE_META: Record<GoalDisplayState, { label: string; tone: StatusBadgeTone }> = {
  active: { label: 'Ativa', tone: 'info' },
  attention: { label: 'Em atenção', tone: 'warning' },
  exceeded: { label: 'Excedida', tone: 'danger' },
  overdue: { label: 'Atrasada', tone: 'danger' },
  achieved: { label: 'Atingida', tone: 'success' },
  paused: { label: 'Pausada', tone: 'muted' },
  completed: { label: 'Concluída', tone: 'success' },
  archived: { label: 'Arquivada', tone: 'muted' },
  canceled: { label: 'Cancelada', tone: 'muted' },
  draft: { label: 'Rascunho', tone: 'muted' },
  scheduled: { label: 'Agendada', tone: 'info' }
};

/** Estados persistidos que têm prioridade sobre o estado calculado. */
function persistedState(status: GoalStatus): GoalDisplayState | null {
  switch (status) {
    case 'Paused': return 'paused';
    case 'Archived': return 'archived';
    case 'Canceled': return 'canceled';
    case 'Completed': return 'completed';
    case 'Draft': return 'draft';
    case 'Scheduled': return 'scheduled';
    default: return null;
  }
}

function monthlyRequired(config: GoalTypeConfig, remaining: number, daysRemaining: number | null): number | null {
  if (config.isConsumption || remaining <= 0 || daysRemaining == null || daysRemaining <= 0) return null;

  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));
  return Math.round((remaining / monthsRemaining) * 100) / 100;
}

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  None: 'Período único',
  Weekly: 'Semanal',
  Monthly: 'Mensal',
  Quarterly: 'Trimestral',
  Semiannual: 'Semestral',
  Annual: 'Anual',
  Custom: 'Personalizada'
};

export function recurrenceLabelFor(recurrence?: RecurrenceType | null): string {
  return recurrence ? RECURRENCE_LABELS[recurrence] ?? 'Período único' : 'Período único';
}

export function canCompleteGoalView(view: GoalView): boolean {
  if (view.config.isConsumption || view.percent < 100) return false;
  return !['completed', 'archived', 'canceled'].includes(view.state);
}

export function buildGoalView(goal: Goal, progress?: GoalProgress | null): GoalView {
  const config = configFor(goal.kind);
  const target = progress?.target ?? goal.targetAmount ?? 0;
  const realized = progress?.realized ?? goal.currentAmount ?? 0;
  const pending = progress?.pending ?? 0;
  const percent = progress?.percent ?? (target > 0 ? Math.round((realized / target) * 10000) / 100 : 0);
  const remaining = progress?.remaining ?? Math.max(target - realized, 0);
  const daysRemaining = progress?.daysRemaining ?? daysUntil(goal.endDate ?? goal.targetDate);
  const forecast = progress?.forecast ?? null;
  const warning = goal.warningThreshold ?? 80;

  const calcState: GoalDisplayState = progress
    ? mapCalculatedState(progress.state)
    : fallbackState(goal, percent);
  const state = persistedState(goal.status) ?? calcState;
  const meta = STATE_META[state];

  return {
    goal,
    config,
    target,
    realized,
    pending,
    percent,
    barPercent: Math.max(0, Math.min(100, percent)),
    remaining,
    monthlyRequired: monthlyRequired(config, remaining, daysRemaining),
    forecast,
    daysRemaining,
    state,
    stateLabel: meta.label,
    stateTone: meta.tone,
    progressMode: config.isConsumption ? 'consumo' : 'conquista',
    onTrack: state !== 'attention' && state !== 'overdue' && state !== 'exceeded',
    recurrenceLabel: recurrenceLabelFor(goal.recurrence)
  };
}

function mapCalculatedState(state: GoalProgress['state']): GoalDisplayState {
  switch (state) {
    case 'Attention': return 'attention';
    case 'Exceeded': return 'exceeded';
    case 'Overdue': return 'overdue';
    case 'Achieved': return 'achieved';
    default: return 'active';
  }
}

export interface GoalsSummary {
  total: number;
  active: number;
  achieved: number;
  attention: number;
  avgProgress: number;
}

export function buildGoalsSummary(views: GoalView[]): GoalsSummary {
  const relevant = views.filter((v) => v.state !== 'archived' && v.state !== 'canceled');
  const active = relevant.filter((v) => ['active', 'attention', 'exceeded', 'overdue', 'scheduled'].includes(v.state)).length;
  const achieved = views.filter((v) => v.state === 'achieved' || v.state === 'completed').length;
  const attention = views.filter((v) => v.state === 'attention' || v.state === 'exceeded' || v.state === 'overdue').length;
  const avg = relevant.length
    ? Math.round(relevant.reduce((s, v) => s + Math.min(v.percent, 100), 0) / relevant.length)
    : 0;
  return { total: views.length, active, achieved, attention, avgProgress: avg };
}

export type GoalTab = 'all' | GoalKind | 'completed' | 'archived';

export function filterGoals(views: GoalView[], tab: GoalTab): GoalView[] {
  switch (tab) {
    case 'all':
      return views.filter((v) => v.state !== 'archived');
    case 'completed':
      return views.filter((v) => v.state === 'achieved' || v.state === 'completed');
    case 'archived':
      return views.filter((v) => v.state === 'archived');
    default:
      return views.filter((v) => v.goal.kind === tab && v.state !== 'archived');
  }
}
