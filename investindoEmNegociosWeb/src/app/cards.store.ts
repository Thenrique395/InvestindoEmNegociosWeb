import { computed, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { CardDto, CardPayload, CardStatementCycleDto, CardsService } from './cards.service';
import { ListQuery } from './api-query';

type CardsState = {
  data: CardDto[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

type StatementsState = {
  cardId: string | null;
  data: CardStatementCycleDto[];
  loading: boolean;
  error: string | null;
};

type StatementFilter = {
  year?: number;
  month?: number;
};

const initialCardsState = (): CardsState => ({
  data: [],
  loading: false,
  loaded: false,
  error: null
});

const initialStatementsState = (): StatementsState => ({
  cardId: null,
  data: [],
  loading: false,
  error: null
});

@Injectable({ providedIn: 'root' })
export class CardsStore {
  private readonly cardsState = signal<CardsState>(initialCardsState());
  private readonly statementsState = signal<StatementsState>(initialStatementsState());
  private selectedCardIdState = signal<string | null>(null);
  private currentQuery?: ListQuery;
  private currentStatementFilter: StatementFilter = {};

  readonly cards = computed(() => this.cardsState().data);
  readonly loading = computed(() => this.cardsState().loading);
  readonly loaded = computed(() => this.cardsState().loaded);
  readonly error = computed(() => this.cardsState().error);

  readonly selectedCardId = computed(() => this.selectedCardIdState());
  readonly selectedCard = computed(() => {
    const selectedId = this.selectedCardIdState();
    return this.cardsState().data.find((card) => card.id === selectedId) ?? null;
  });

  readonly statements = computed(() => this.statementsState().data);
  readonly statementsLoading = computed(() => this.statementsState().loading);
  readonly statementsError = computed(() => this.statementsState().error);

  constructor(private readonly cardsService: CardsService) {}

  load(query?: ListQuery, force = false): void {
    const current = this.cardsState();
    const sameQuery = JSON.stringify(query ?? null) === JSON.stringify(this.currentQuery ?? null);
    if (!force && sameQuery && (current.loading || current.loaded)) return;

    this.currentQuery = query;
    this.patchCards({ loading: true, error: null });
    this.cardsService.list(query)
      .pipe(finalize(() => this.patchCards({ loading: false })))
      .subscribe({
        next: (data) => {
          const cards = data || [];
          this.cardsState.set({ data: cards, loading: false, loaded: true, error: null });
          this.syncSelectedCard(cards);
        },
        error: () => this.patchCards({ error: 'Falha ao carregar cartões.' })
      });
  }

  refresh(): void {
    this.cardsState.set(initialCardsState());
    this.load(this.currentQuery, true);
  }

  selectCard(cardId: string | null): void {
    this.selectedCardIdState.set(cardId);
    if (!cardId) {
      this.statementsState.set(initialStatementsState());
    }
  }

  create(payload: CardPayload, onSuccess?: (card: CardDto) => void): void {
    this.patchCards({ error: null });
    this.cardsService.create(payload).subscribe({
      next: (card) => {
        this.refresh();
        onSuccess?.(card);
      },
      error: () => this.patchCards({ error: 'Falha ao salvar cartão.' })
    });
  }

  update(id: string, payload: CardPayload, onSuccess?: (card: CardDto) => void): void {
    this.patchCards({ error: null });
    this.cardsService.update(id, payload).subscribe({
      next: (card) => {
        this.refresh();
        onSuccess?.(card);
      },
      error: () => this.patchCards({ error: 'Falha ao salvar cartão.' })
    });
  }

  delete(id: string, onSuccess?: () => void): void {
    this.patchCards({ error: null });
    this.cardsService.delete(id).subscribe({
      next: () => {
        if (this.selectedCardIdState() === id) {
          this.selectCard(null);
        }
        this.refresh();
        onSuccess?.();
      },
      error: () => this.patchCards({ error: 'Falha ao remover cartão.' })
    });
  }

  loadStatements(cardId = this.selectedCardIdState(), filter: StatementFilter = {}): void {
    if (!cardId) {
      this.statementsState.set(initialStatementsState());
      return;
    }

    this.currentStatementFilter = filter;
    this.statementsState.set({ cardId, data: [], loading: true, error: null });
    this.cardsService.statements(cardId, filter)
      .pipe(finalize(() => this.patchStatements({ loading: false })))
      .subscribe({
        next: (data) => this.statementsState.set({ cardId, data: data || [], loading: false, error: null }),
        error: () => this.patchStatements({ error: 'Falha ao carregar faturas por competência.' })
      });
  }

  refreshStatements(): void {
    this.loadStatements(this.selectedCardIdState(), this.currentStatementFilter);
  }

  private patchCards(patch: Partial<CardsState>): void {
    this.cardsState.update((state) => ({ ...state, ...patch }));
  }

  private patchStatements(patch: Partial<StatementsState>): void {
    this.statementsState.update((state) => ({ ...state, ...patch }));
  }

  private syncSelectedCard(cards: CardDto[]): void {
    const selectedId = this.selectedCardIdState();
    if (selectedId && cards.some((card) => card.id === selectedId)) {
      return;
    }

    const nextSelected = cards[0]?.id ?? null;
    this.selectedCardIdState.set(nextSelected);

    if (!nextSelected) {
      this.statementsState.set(initialStatementsState());
    }
  }
}
