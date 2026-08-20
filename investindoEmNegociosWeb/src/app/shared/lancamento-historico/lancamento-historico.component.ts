import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { BodyPortalDirective } from '../body-portal.directive';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';
import { StatusBadgeComponent, StatusBadgeTone } from '../status-badge/status-badge.component';
import {
  describeHistoryEvent,
  HistoryEvent,
  HistoryInstallment,
  installmentProgress,
  installmentTone
} from './lancamento-historico.model';

/**
 * Gaveta de histórico de um lançamento — Despesas e Receitas.
 *
 * Duas seções, e a primeira só existe quando há série: PARCELAS mostra o
 * andamento (quantas de quantas), EVENTOS conta o que aconteceu com o
 * lançamento. Em recorrente a lista de parcelas não aparece: são ocorrências
 * mensais sem fim, não uma série com começo e término.
 */
@Component({
  selector: 'app-lancamento-historico',
  standalone: true,
  imports: [BodyPortalDirective, ProgressBarComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div appBodyPortal class="lh" role="dialog" aria-modal="true" [attr.aria-label]="'Histórico de ' + titulo()">
        <div class="lh__backdrop" (click)="close.emit()"></div>

        <aside class="lh__panel">
          <header class="lh__head">
            <div class="lh__heading">
              <p class="lh__eyebrow">Histórico</p>
              <h2 class="lh__title">{{ titulo() }}</h2>
            </div>
            <button type="button" class="lh__close" aria-label="Fechar histórico" (click)="close.emit()">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
              </svg>
            </button>
          </header>

          <div class="lh__body">
            @if (carregando()) {
              <p class="lh__estado">Carregando histórico...</p>
            } @else if (erro()) {
              <p class="lh__estado lh__estado--erro">{{ erro() }}</p>
            } @else {
              <!-- Sem lista de parcelas (avulso e recorrente), as ações do
                   lançamento pago vêm para o topo: elas existiam na gaveta antiga
                   e sumiriam do produto se ficassem só dentro da lista. -->
              @if (!mostraParcelas() && acaoDoLancamento(); as alvo) {
                <div class="lh__acoes-topo">
                  @if (permiteEstorno()) {
                    <button type="button" class="lh__acao" [disabled]="alvo.estornando" (click)="reverse.emit(alvo.id)">
                      {{ alvo.estornando ? 'Estornando...' : 'Estornar pagamento' }}
                    </button>
                  }
                  @if (permiteComprovante()) {
                    <button type="button" class="lh__acao" [disabled]="alvo.anexando" (click)="attachReceipt.emit(alvo.id)">
                      {{ alvo.anexando ? 'Enviando...' : 'Comprovante' }}
                    </button>
                  }
                </div>
              }

              @if (mostraParcelas()) {
                <section class="lh__section">
                  <div class="lh__section-head">
                    <p class="lh__section-title">Parcelas</p>
                    <span class="lh__section-meta">{{ progresso().label }}</span>
                  </div>

                  <!-- Verde fixo: aqui a barra mede andamento da série, não
                       consumo nem ritmo de meta — não há limiar que a recolora. -->
                  <app-progress-bar
                    [value]="progresso().pagas"
                    [max]="progresso().total"
                    tone="income"
                    [ariaLabel]="progresso().label" />

                  <ul class="lh__parcelas">
                    @for (parcela of parcelas(); track parcela.id) {
                      <li class="lh__parcela" [class.is-current]="parcela.id === parcelaAtualId()">
                        <span class="lh__marcador" [attr.data-tone]="tomDaParcela(parcela.status)" aria-hidden="true">
                          @if (tomDaParcela(parcela.status) === 'success') {
                            <svg viewBox="0 0 24 24"><path d="m5 13 4 4 10-10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
                          }
                        </span>

                        <span class="lh__parcela-copy">
                          <strong>Parcela {{ parcela.numero }}/{{ parcela.total }}</strong>
                          <small>{{ parcela.vencimento }}</small>
                        </span>

                        <span class="lh__parcela-valor">
                          <strong>{{ parcela.valorLabel }}</strong>
                          <app-status-badge size="sm" [tone]="badgeDaParcela(parcela.status)" [label]="parcela.statusLabel" />
                        </span>

                        @if (parcela.podeAgir && (permiteEstorno() || permiteComprovante())) {
                          <span class="lh__parcela-acoes">
                            @if (permiteEstorno()) {
                              <button type="button" class="lh__acao" [disabled]="parcela.estornando" (click)="reverse.emit(parcela.id)">
                                {{ parcela.estornando ? 'Estornando...' : 'Estornar' }}
                              </button>
                            }
                            @if (permiteComprovante()) {
                              <button type="button" class="lh__acao" [disabled]="parcela.anexando" (click)="attachReceipt.emit(parcela.id)">
                                {{ parcela.anexando ? 'Enviando...' : 'Comprovante' }}
                              </button>
                            }
                          </span>
                        }
                      </li>
                    }
                  </ul>
                </section>
              }

              <section class="lh__section">
                <p class="lh__section-title">Eventos</p>

                @if (eventos().length) {
                  <ol class="lh__eventos">
                    @for (evento of eventos(); track $index) {
                      <li class="lh__evento">
                        <span class="lh__ponto" [attr.data-tone]="evento.tone" aria-hidden="true"></span>
                        <span class="lh__evento-copy">
                          <strong>{{ evento.label }}</strong>
                          <small>{{ evento.detail }}</small>
                        </span>
                      </li>
                    }
                  </ol>
                } @else {
                  <p class="lh__estado">Nenhum evento registrado ainda.</p>
                }
              </section>
            }
          </div>

          <footer class="lh__foot">
            <button type="button" class="btn-ghost lh__fechar" (click)="close.emit()">Fechar</button>
          </footer>
        </aside>
      </div>
    }
  `,
  styles: [`
    .lh {
      position: fixed;
      inset: 0;
      z-index: 1500;
      display: flex;
      justify-content: flex-end;
    }

    .lh__backdrop {
      position: absolute;
      inset: 0;
      background: var(--overlay, rgba(0, 20, 28, 0.45));
      backdrop-filter: blur(2px);
    }

    /* Três faixas, como o modal: só o corpo rola. */
    .lh__panel {
      position: relative;
      display: flex;
      flex-direction: column;
      inline-size: min(430px, 100%);
      block-size: 100%;
      background: var(--surface);
      box-shadow: var(--shadow-modal);
    }

    .lh__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-6);
      flex: none;
      padding: var(--space-9) var(--space-10) var(--space-7);
      border-block-end: 1px solid var(--border-inner);
    }

    .lh__eyebrow {
      margin: 0 0 var(--space-2);
      font-size: var(--fs-micro);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-eyebrow);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .lh__title {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--fs-section);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-tight);
      color: var(--text);
    }

    .lh__close {
      display: grid;
      place-items: center;
      flex: none;
      inline-size: var(--h-button-xs);
      block-size: var(--h-button-xs);
      border: none;
      border-radius: var(--radius-sm);
      background: var(--surface-inset);
      color: var(--text-secondary);
      cursor: pointer;

      svg { inline-size: 17px; block-size: 17px; }

      &:hover { color: var(--text); }
    }

    .lh__body {
      flex: 1;
      min-block-size: 0;
      overflow-y: auto;
      padding: var(--space-8) var(--space-10) var(--space-10);
      display: grid;
      gap: var(--space-9);
      align-content: start;
    }

    .lh__section { display: grid; gap: var(--space-5); }

    .lh__section-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-5);
    }

    .lh__section-title {
      margin: 0;
      font-size: var(--fs-micro);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-eyebrow);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .lh__section-meta {
      font-size: var(--fs-meta);
      font-weight: var(--fw-semibold);
      color: var(--text-secondary);
    }

    .lh__parcelas,
    .lh__eventos {
      display: grid;
      gap: var(--space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .lh__parcela {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-5);
      padding: var(--space-4) var(--space-6);
      border: 1px solid var(--border);
      border-radius: var(--radius-control);
      background: var(--surface);
    }

    /* A parcela do lançamento aberto se distingue: é o motivo de a gaveta existir. */
    .lh__parcela.is-current {
      border-color: var(--border-strong);
      background: var(--surface-sunken);
    }

    .lh__marcador {
      display: grid;
      place-items: center;
      inline-size: 26px;
      block-size: 26px;
      border-radius: var(--radius-pill);
      background: var(--border);
      color: var(--on-primary);

      svg { inline-size: 14px; block-size: 14px; }
    }

    .lh__marcador[data-tone='success'] { background: var(--income); }
    .lh__marcador[data-tone='warning'] { background: var(--warning); }
    .lh__marcador[data-tone='danger'] { background: var(--expense); }

    .lh__parcela-copy {
      display: grid;
      gap: 1px;
      min-inline-size: 0;

      strong { font-size: var(--fs-body); font-weight: var(--fw-semibold); color: var(--text); }
      small { font-size: var(--fs-meta); color: var(--text-tertiary); }
    }

    .lh__parcela-valor {
      display: grid;
      gap: var(--space-2);
      justify-items: end;

      strong {
        font-size: var(--fs-body);
        font-weight: var(--fw-bold);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        color: var(--text);
      }
    }

    /* Linha fina, sem moldura: as ações existem, mas não competem com a leitura
       da série — o protótipo nem as mostra. */
    .lh__parcela-acoes {
      grid-column: 2 / -1;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-5);
      margin-block-start: calc(-1 * var(--space-3));
    }

    .lh__acao {
      border: none;
      background: none;
      padding: 0;
      color: var(--primary-text);
      font: inherit;
      font-size: var(--fs-caption);
      font-weight: var(--fw-semibold);
      cursor: pointer;

      &:hover:not(:disabled) { text-decoration: underline; }
      &:disabled { color: var(--text-muted); cursor: not-allowed; }
    }

    /* Linha do tempo: o fio liga os pontos e para no último. */
    .lh__evento {
      position: relative;
      display: flex;
      gap: var(--space-5);
      padding-block-end: var(--space-6);
    }

    .lh__evento:last-child { padding-block-end: 0; }

    .lh__evento::before {
      content: '';
      position: absolute;
      inset-block: 14px 0;
      inset-inline-start: 4px;
      inline-size: 1px;
      background: var(--border);
    }

    .lh__evento:last-child::before { display: none; }

    .lh__ponto {
      position: relative;
      flex: none;
      inline-size: 9px;
      block-size: 9px;
      margin-block-start: 5px;
      border-radius: var(--radius-pill);
      background: var(--text-muted);
    }

    .lh__ponto[data-tone='info'] { background: var(--primary); }
    .lh__ponto[data-tone='warning'] { background: var(--warning); }
    .lh__ponto[data-tone='success'] { background: var(--income); }
    .lh__ponto[data-tone='danger'] { background: var(--expense); }

    .lh__evento-copy {
      display: grid;
      gap: 2px;
      min-inline-size: 0;

      strong { font-size: var(--fs-body); font-weight: var(--fw-semibold); color: var(--text); }
      small { font-size: var(--fs-meta); color: var(--text-tertiary); }
    }

    .lh__acoes-topo {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-6);
      padding: var(--space-5) var(--space-6);
      border: 1px solid var(--border);
      border-radius: var(--radius-control);
      background: var(--surface-sunken);
    }

    .lh__estado {
      margin: 0;
      font-size: var(--fs-body);
      color: var(--text-tertiary);
    }

    .lh__estado--erro { color: var(--expense-text); }

    .lh__foot {
      flex: none;
      padding: var(--space-6) var(--space-10);
      border-block-start: 1px solid var(--border-inner);
      background: var(--surface-subtle);
    }

    .lh__fechar { inline-size: 100%; }

    @media (max-width: 720px) {
      .lh__panel { inline-size: 100%; }
      .lh__head { padding: var(--space-8) var(--space-7) var(--space-6); }
      .lh__body { padding: var(--space-7); }
      .lh__foot { padding: var(--space-6) var(--space-7); }
    }
  `]
})
export class LancamentoHistoricoComponent {
  readonly open = input(false);
  readonly titulo = input('');
  readonly carregando = input(false);
  readonly erro = input('');
  /** `Installments` do plano, já formatadas pela tela. */
  readonly parcelas = input<readonly HistoricoParcelaView[]>([]);
  readonly eventosBrutos = input<readonly HistoryEvent[]>([]);
  /** Em recorrente a lista de parcelas não aparece — só a linha do tempo. */
  readonly mostraParcelas = input(false);
  /** Parcela que originou a abertura, destacada na lista. */
  readonly parcelaAtualId = input<string | null>(null);
  /* Nem toda tela oferece as duas ações: Receitas não tem fluxo de estorno. */
  readonly permiteEstorno = input(true);
  readonly permiteComprovante = input(true);

  readonly close = output<void>();
  readonly reverse = output<string>();
  readonly attachReceipt = output<string>();

  readonly progresso = computed(() =>
    installmentProgress(
      this.parcelas().map((p) => ({
        id: p.id,
        numero: p.numero,
        total: p.total,
        vencimento: p.vencimento,
        valor: 0,
        status: p.status
      }) as HistoryInstallment)
    )
  );

  readonly eventos = computed(() => this.eventosBrutos().map((evento) => describeHistoryEvent(evento)));

  /**
   * Parcela sobre a qual as ações do topo agem: a que abriu a gaveta, e só
   * quando está paga. Em avulso e recorrente existe uma ocorrência por vez.
   */
  readonly acaoDoLancamento = computed(() => {
    const atual = this.parcelaAtualId();
    const alvo = this.parcelas().find((p) => p.id === atual) ?? this.parcelas()[0];
    return alvo?.podeAgir ? alvo : null;
  });

  tomDaParcela(status: string): string {
    return installmentTone(status);
  }

  badgeDaParcela(status: string): StatusBadgeTone {
    const tom = installmentTone(status);
    return tom === 'success' ? 'success' : tom === 'warning' ? 'warning' : 'muted';
  }
}

/** Parcela pronta para a gaveta: a tela formata valor, data e rótulo de status. */
export interface HistoricoParcelaView {
  readonly id: string;
  readonly numero: number;
  readonly total: number;
  readonly vencimento: string;
  readonly valorLabel: string;
  readonly status: string;
  readonly statusLabel: string;
  /** Estorno e comprovante só nas parcelas pagas. */
  readonly podeAgir: boolean;
  readonly estornando: boolean;
  readonly anexando: boolean;
}
