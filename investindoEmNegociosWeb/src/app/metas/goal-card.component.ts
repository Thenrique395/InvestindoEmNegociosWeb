import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { canCompleteGoalView, GoalView } from './goal-view.model';

/**
 * Card único e configurável por tipo (Despesa/Receita/Investimento). Os rótulos
 * e a semântica da barra vêm do GoalView — não há três componentes separados.
 * Despesa mostra consumo (mais = pior); Receita/Investimento mostram conquista.
 */
@Component({
  selector: 'app-goal-card',
  standalone: true,
  imports: [DecimalPipe, AppCurrencyPipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="gc" [attr.data-kind]="view().goal.kind">
      <header class="gc__head">
        <span class="gc__icon" aria-hidden="true">{{ view().config.icon }}</span>
        <div class="gc__title">
          <h3>{{ view().goal.title }}</h3>
          <div class="gc__badges">
            <app-status-badge tone="muted" size="sm" [label]="view().config.typeLabel" />
            <app-status-badge [tone]="view().stateTone" size="sm" [label]="view().stateLabel" [dot]="true" />
            <app-status-badge tone="muted" size="sm" [label]="view().recurrenceLabel" />
          </div>
        </div>
        <div class="gc__menu">
          <button type="button" class="gc__menu-btn" [attr.aria-label]="'Ações da meta ' + view().goal.title" (click)="toggleMenu()">⋯</button>
          @if (menuOpen) {
            <button type="button" class="gc__menu-backdrop" aria-label="Fechar menu" (click)="closeMenu()"></button>
            <div class="gc__menu-list" role="menu">
              <button type="button" role="menuitem" (click)="run(details)">Ver detalhes</button>
              <button type="button" role="menuitem" (click)="run(edit)">Editar</button>
              @if (view().goal.kind === 'Investment') {
                <button type="button" role="menuitem" (click)="run(contribute)">Registrar aporte</button>
              }
              @if (view().state === 'paused') {
                <button type="button" role="menuitem" (click)="run(resume)">Reativar</button>
              } @else {
                <button type="button" role="menuitem" (click)="run(pause)">Pausar</button>
              }
              @if (canComplete()) {
                <button type="button" role="menuitem" (click)="run(complete)">Concluir</button>
              }
              <button type="button" role="menuitem" (click)="run(archive)">Arquivar</button>
              <button type="button" role="menuitem" class="gc__danger" (click)="run(remove)">Excluir</button>
            </div>
          }
        </div>
      </header>

      <div class="gc__values">
        <div>
          <span class="gc__label">{{ view().config.primaryLabel }}</span>
          <strong class="gc__value">{{ view().target | appCurrency }}</strong>
        </div>
        <div>
          <span class="gc__label">{{ view().config.realizedLabel }}</span>
          <strong class="gc__value">{{ view().realized | appCurrency }}</strong>
        </div>
        <div>
          <span class="gc__label">{{ view().config.remainingLabel }}</span>
          <strong class="gc__value">{{ view().remaining | appCurrency }}</strong>
        </div>
      </div>

      <div class="gc__progress">
        <div class="gc__bar" role="progressbar" [attr.data-tone]="view().progressTone"
          [attr.aria-valuenow]="view().percent" aria-valuemin="0" aria-valuemax="100"
          [attr.aria-label]="view().config.percentLabel + ': ' + (view().percent | number:'1.0-0') + '%'">
          <span class="gc__bar-fill" [style.width.%]="view().barPercent"></span>
        </div>
        <div class="gc__progress-meta">
          <span>{{ view().percent | number:'1.0-0' }}% · {{ view().config.percentLabel }}</span>
          @if (view().daysRemaining != null) {
            <span>{{ view().daysRemaining }} dia(s) restantes</span>
          }
        </div>
      </div>

      @if (view().pending > 0) {
        <p class="gc__hint">Previsto (não contabilizado): {{ view().pending | appCurrency }}</p>
      }
      @if (view().monthlyRequired != null) {
        <p class="gc__hint">Precisa de {{ view().monthlyRequired | appCurrency }} por mês para chegar no prazo.</p>
      }
      @if (forecastHint()) {
        <p class="gc__hint">{{ forecastHint() }}</p>
      }

      <footer class="gc__foot">
        <button type="button" class="gc__action" (click)="details.emit(view().goal)">Ver detalhes</button>
      </footer>
    </article>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .gc {
      display: grid; gap: 0.85rem; height: 100%;
      padding: 1.15rem 1.2rem; border: 1px solid var(--border);
      border-radius: var(--radius-panel); background: var(--surface); box-shadow: var(--shadow-card-hover);
    }
    .gc__head { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: start; gap: 0.7rem; }
    .gc__icon { font-size: 1.4rem; line-height: 1; }
    .gc__title { min-width: 0; display: grid; gap: 5px; }
    .gc__title h3 { margin: 0; font-size: var(--fs-subhead, 0.95rem); font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gc__badges { display: flex; flex-wrap: wrap; gap: 6px; }

    .gc__menu { position: relative; }
    .gc__menu-btn { border: 0; background: transparent; color: var(--text-tertiary); font-size: 1.25rem; line-height: 1; padding: 2px 6px; cursor: pointer; border-radius: 8px; }
    .gc__menu-btn:hover { background: var(--surface-sunken); color: var(--text); }
    .gc__menu-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .gc__menu-backdrop { position: fixed; inset: 0; z-index: 20; border: 0; background: transparent; }
    .gc__menu-list { position: absolute; top: 100%; right: 0; z-index: 21; display: grid; min-width: 190px; padding: 6px; gap: 2px;
      border: 1px solid var(--border); border-radius: var(--radius-inner, 12px); background: var(--surface); box-shadow: var(--shadow-dropdown, 0 12px 32px rgba(0,0,0,.16)); }
    .gc__menu-list button { display: block; width: 100%; text-align: left; border: 0; background: transparent; color: var(--text); font-size: var(--fs-meta, 0.85rem); padding: 8px 10px; border-radius: var(--radius-control, 8px); cursor: pointer; }
    .gc__menu-list button:hover { background: var(--surface-sunken); }
    .gc__menu-list .gc__danger { color: var(--expense-text); }

    .gc__values { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 0.6rem; }
    .gc__label { display: block; font-size: var(--fs-caption, 0.68rem); text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); }
    .gc__value { font-size: var(--fs-meta, 0.95rem); color: var(--text); }

    .gc__progress { display: grid; gap: 5px; }
    .gc__bar { height: 8px; border-radius: 6px; background: var(--surface-inset); overflow: hidden; }
    .gc__bar-fill { display: block; height: 100%; border-radius: 6px; background: var(--text-tertiary); transition: width 0.3s ease; }
    .gc__bar[data-tone='ok'] .gc__bar-fill { background: var(--income); }
    .gc__bar[data-tone='warning'] .gc__bar-fill { background: var(--warning); }
    .gc__bar[data-tone='critical'] .gc__bar-fill { background: var(--expense); }
    .gc__bar[data-tone='success'] .gc__bar-fill { background: var(--income); }
    .gc__bar[data-tone='neutral'] .gc__bar-fill { background: var(--primary); }
    .gc__progress-meta { display: flex; justify-content: space-between; gap: 8px; font-size: var(--fs-caption, 0.72rem); color: var(--text-tertiary); }

    .gc__hint { margin: 0; font-size: var(--fs-caption, 0.72rem); color: var(--text-tertiary); }

    .gc__foot { display: flex; }
    .gc__action { width: 100%; border: 1px solid var(--border); border-radius: var(--radius-control, 10px); padding: 8px 12px; background: var(--surface-sunken); color: var(--text); font-size: var(--fs-meta, 0.82rem); font-weight: 600; cursor: pointer; }
    .gc__action:hover { background: var(--surface-inset); border-color: var(--border-strong, var(--primary)); }
    .gc__action:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  `
})
export class GoalCardComponent {
  readonly view = input.required<GoalView>();

  readonly details = output<GoalView['goal']>();
  readonly edit = output<GoalView['goal']>();
  readonly pause = output<GoalView['goal']>();
  readonly resume = output<GoalView['goal']>();
  readonly complete = output<GoalView['goal']>();
  readonly archive = output<GoalView['goal']>();
  readonly remove = output<GoalView['goal']>();
  readonly contribute = output<GoalView['goal']>();

  menuOpen = false;

  readonly canComplete = computed(() => canCompleteGoalView(this.view()));

  readonly forecastHint = computed(() => {
    const v = this.view();
    if (v.forecast == null) return '';
    if (v.config.isConsumption && v.forecast > v.target) {
      return 'No ritmo atual, o limite pode ser ultrapassado antes do fim do período.';
    }
    if (!v.config.isConsumption && v.forecast >= v.target && v.percent < 100) {
      return 'Mantendo o ritmo atual, a meta pode ser alcançada dentro do período.';
    }
    return '';
  });

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void { this.menuOpen = false; }

  run(emitter: { emit: (g: GoalView['goal']) => void }): void {
    this.menuOpen = false;
    emitter.emit(this.view().goal);
  }
}
