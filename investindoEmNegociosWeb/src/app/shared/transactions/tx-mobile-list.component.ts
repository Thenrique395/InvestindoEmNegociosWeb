import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StatusBadgeComponent, StatusBadgeTone } from '../status-badge/status-badge.component';

export interface TxMobileItem {
  readonly id: string;
  readonly titulo: string;
  readonly subtitulo?: string;
  /** Valor já formatado, com o sinal — a lista não sabe de moeda. */
  readonly valor: string;
  readonly tom: 'expense' | 'income';
  readonly statusLabel: string;
  readonly statusTone: StatusBadgeTone;
  readonly data: string;
  readonly meta?: string;
}

/**
 * Lista de lançamentos no mobile: um cartão por item, com a barra colorida do
 * status à esquerda, valor à direita e a linha de contexto embaixo.
 *
 * Padrão de todas as listagens no celular. A tabela do desktop não vira este
 * cartão sozinha porque aqui a hierarquia é outra: nome e valor primeiro, o
 * resto como apoio — e não uma sequência de rótulo/valor.
 */
@Component({
  selector: 'app-tx-mobile-list',
  standalone: true,
  imports: [StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }

      .tx-mlist {
        display: grid;
        gap: var(--space-5);
        margin: 0;
        padding: var(--space-6) var(--space-7) var(--space-10);
        list-style: none;
      }

      .tx-mlist__card {
        position: relative;
        display: grid;
        gap: var(--space-5);
        inline-size: 100%;
        padding: var(--space-6) var(--space-7);
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        background: var(--surface);
        font: inherit;
        text-align: start;
        cursor: pointer;
      }

      /* Barra colorida do status: dá para varrer a lista pela lateral. */
      .tx-mlist__card::before {
        content: '';
        position: absolute;
        inset-block: var(--space-6);
        inset-inline-start: 0;
        inline-size: 3px;
        border-radius: 0 var(--radius-pill) var(--radius-pill) 0;
        background: var(--text-muted);
      }

      .tx-mlist__item[data-tone='danger'] .tx-mlist__card::before { background: var(--expense); }
      .tx-mlist__item[data-tone='success'] .tx-mlist__card::before { background: var(--income); }
      .tx-mlist__item[data-tone='warning'] .tx-mlist__card::before { background: var(--warning); }
      .tx-mlist__item[data-tone='info'] .tx-mlist__card::before { background: var(--primary); }

      .tx-mlist__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-5);
      }

      .tx-mlist__copy {
        display: grid;
        gap: 2px;
        min-inline-size: 0;
      }

      .tx-mlist__title {
        font-size: var(--fs-card-title);
        font-weight: var(--fw-bold);
        color: var(--text);
      }

      .tx-mlist__subtitle {
        font-size: var(--fs-meta);
        color: var(--text-tertiary);
      }

      .tx-mlist__amount {
        flex: none;
        font-size: var(--fs-card-title);
        font-weight: var(--fw-bold);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .tx-mlist__amount[data-tone='expense'] { color: var(--text); }
      .tx-mlist__amount[data-tone='income'] { color: var(--income-text); }

      .tx-mlist__foot {
        display: flex;
        align-items: center;
        gap: var(--space-4);
      }

      .tx-mlist__meta {
        min-inline-size: 0;
        overflow: hidden;
        color: var(--text-tertiary);
        font-size: var(--fs-meta);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tx-mlist__chevron {
        flex: none;
        margin-inline-start: auto;
        inline-size: 16px;
        block-size: 16px;
        fill: none;
        stroke: var(--text-muted);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `
  ],
  template: `
    <ul class="tx-mlist">
      @for (item of items(); track item.id) {
        <li class="tx-mlist__item" [attr.data-tone]="item.statusTone">
          <button type="button" class="tx-mlist__card" (click)="open.emit(item.id)">
            <span class="tx-mlist__head">
              <span class="tx-mlist__copy">
                <strong class="tx-mlist__title">{{ item.titulo }}</strong>
                @if (item.subtitulo) {
                  <span class="tx-mlist__subtitle">{{ item.subtitulo }}</span>
                }
              </span>
              <span class="tx-mlist__amount" [attr.data-tone]="item.tom">{{ item.valor }}</span>
            </span>

            <span class="tx-mlist__foot">
              <app-status-badge size="sm" [tone]="item.statusTone" [label]="item.statusLabel" />
              <span class="tx-mlist__meta">
                {{ item.data }}@if (item.meta) { · {{ item.meta }} }
              </span>
              <svg class="tx-mlist__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </span>
          </button>
        </li>
      }
    </ul>
  `
})
export class TxMobileListComponent {
  readonly items = input<readonly TxMobileItem[]>([]);
  readonly open = output<string>();
}
