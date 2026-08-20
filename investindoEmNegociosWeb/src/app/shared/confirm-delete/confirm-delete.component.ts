import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import {
  buildDeleteConfirmView,
  deleteConfirmCta,
  DeleteKind,
  DeleteNoun,
  DeleteScope
} from './confirm-delete.model';

/**
 * Confirmação de exclusão de lançamento — Despesas e Receitas.
 *
 * Toda exclusão passa por aqui, inclusive a de lançamento simples: ação
 * destrutiva sem confirmação é o que o handoff proíbe, e era o que acontecia
 * com quem apagava uma despesa avulsa.
 *
 * Quando há série ou recorrência, a escolha do escopo vive no próprio diálogo,
 * como rádio: com dois botões destrutivos lado a lado no rodapé, a diferença
 * entre "esta" e "todas" ficava só no texto do botão, sem estado visível antes
 * do clique.
 */
@Component({
  selector: 'app-confirm-delete',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="open()"
      size="xs"
      [showCloseButton]="false"
      (close)="cancel.emit()">
      <div class="cd" modal-body>
        <span class="cd__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7h16" />
            <path d="M9 7V5h6v2" />
            <path d="M7 7l1 12h8l1-12" />
          </svg>
        </span>

        <h2 class="cd__title">{{ view().title }}</h2>

        <p class="cd__text">
          Você está prestes a excluir <strong>{{ itemName() }}</strong>@if (itemValue()) { no valor de
          <strong class="tabular">{{ itemValue() }}</strong>}. {{ view().note }}
        </p>

        @if (view().options.length) {
          <div class="cd__options" role="radiogroup" [attr.aria-label]="view().title">
            @for (option of view().options; track option.key) {
              <button
                type="button"
                role="radio"
                class="cd__option"
                [class.is-on]="scope() === option.key"
                [attr.aria-checked]="scope() === option.key"
                (click)="scope.set(option.key)">
                <span class="cd__radio" aria-hidden="true"><i></i></span>
                <span class="cd__option-copy">
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.note }}</small>
                </span>
              </button>
            }
          </div>
        }
      </div>

      <ng-container modal-footer>
        <button type="button" class="btn-ghost" (click)="cancel.emit()">Cancelar</button>
        <button type="button" class="btn-danger" (click)="confirm.emit(scope())">{{ cta() }}</button>
      </ng-container>
    </app-modal>
  `,
  styles: [`
    .cd__icon {
      display: grid;
      place-items: center;
      inline-size: 44px;
      block-size: 44px;
      border-radius: var(--radius-inner);
      background: var(--expense-tint);
      color: var(--expense-text);
    }

    .cd__icon svg {
      inline-size: 21px;
      block-size: 21px;
    }

    .cd__title {
      margin: var(--space-7) 0 var(--space-2);
      font-family: var(--font-display);
      font-size: var(--fs-section);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-tight);
      color: var(--text);
    }

    .cd__text {
      margin: 0;
      font-size: var(--fs-body);
      line-height: var(--lh-body);
      color: var(--text-secondary);
    }

    .cd__text strong { color: var(--text); }

    .cd__options {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin-block-start: var(--space-8);
    }

    /* Cartão de escolha: o selecionado se anuncia pela borda e pelo fundo, não
       só pelo ponto — é uma decisão destrutiva. */
    .cd__option {
      display: flex;
      align-items: flex-start;
      gap: var(--space-4);
      padding: var(--space-5) var(--space-6);
      border: 1px solid var(--border);
      border-radius: var(--radius-control);
      background: var(--surface);
      font: inherit;
      text-align: start;
      cursor: pointer;
    }

    .cd__option:hover { border-color: var(--border-hover); }

    .cd__option.is-on {
      border-color: var(--expense);
      background: var(--expense-tint-soft);
    }

    .cd__radio {
      display: grid;
      place-items: center;
      flex: none;
      inline-size: 16px;
      block-size: 16px;
      margin-block-start: 1px;
      border: 1.5px solid var(--border-strong);
      border-radius: var(--radius-pill);
    }

    .cd__option.is-on .cd__radio { border-color: var(--expense); }

    .cd__radio i {
      inline-size: 8px;
      block-size: 8px;
      border-radius: var(--radius-pill);
      background: transparent;
    }

    .cd__option.is-on .cd__radio i { background: var(--expense); }

    .cd__option-copy {
      display: grid;
      gap: 1px;
      min-inline-size: 0;
    }

    .cd__option-copy strong {
      font-size: var(--fs-body);
      font-weight: var(--fw-semibold);
      color: var(--text);
    }

    .cd__option-copy small {
      font-size: var(--fs-meta);
      color: var(--text-tertiary);
    }
  `]
})
export class ConfirmDeleteComponent {
  readonly open = input(false);
  readonly kind = input<DeleteKind>('single');
  readonly noun = input<DeleteNoun>('despesa');
  readonly itemName = input('');
  /** Já formatado pela tela — o diálogo não sabe de moeda. */
  readonly itemValue = input('');

  readonly cancel = output<void>();
  readonly confirm = output<DeleteScope>();

  /** Começa sempre no escopo mais conservador. */
  readonly scope = signal<DeleteScope>('single');

  readonly view = computed(() => buildDeleteConfirmView(this.kind(), this.noun()));
  readonly cta = computed(() => deleteConfirmCta(this.kind(), this.scope()));

  constructor() {
    // Reabrir o diálogo não pode herdar a escolha da vez anterior: quem apagou
    // uma série inteira ontem não está pedindo isso de novo hoje.
    effect(() => {
      if (this.open()) this.scope.set('single');
    });
  }
}
