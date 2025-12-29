import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

export interface StoredExpense {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  vencimento: string; // DD/MM/AAAA
  userId?: string;
  cartao?: string;
  parcelaNumero?: number;
  parcelasTotal?: number;
  serieId?: string;
}

export interface StoredCard {
  id: string;
  bandeira: string;
  numero: string;
  nome: string;
  userId: string;
}

export interface StoredIncome {
  id: string;
  fonte: string;
  valor: number;
  recebimento: string; // DD/MM/AAAA
  fixa?: boolean;
  fixaInicio?: string; // MM/AAAA
  fixaFim?: string; // MM/AAAA
  userId?: string;
}

type PersistedDb = {
  expenses: StoredExpense[];
  cards: StoredCard[];
  incomes: StoredIncome[];
};

const STORAGE_KEY = 'investindo-db';
const EMPTY_DB: PersistedDb = { expenses: [], cards: [], incomes: [] };

@Injectable({ providedIn: 'root' })
export class LocalDbService {
  private static memoryDb: PersistedDb | null = null;
  private static readonly guestUser = 'guest';
  private readonly dbSubject = new BehaviorSubject<PersistedDb>(EMPTY_DB);
  private readonly db$ = this.dbSubject.asObservable();

  readonly expenses$ = this.db$.pipe(
    map((state) => state.expenses.filter((expense) => this.isCurrentUser(expense.userId))),
    distinctUntilChanged()
  );
  readonly cards$ = this.db$.pipe(
    map((state) => state.cards.filter((card) => this.isCurrentUser(card.userId))),
    distinctUntilChanged()
  );
  readonly incomes$ = this.db$.pipe(
    map((state) => state.incomes.filter((income) => this.isCurrentUser(income.userId))),
    distinctUntilChanged()
  );

  constructor() {
    void this.restore();
  }

  addExpense(expense: Omit<StoredExpense, 'id'>): void {
    this.updateDb((db) => ({
      ...db,
      expenses: [...db.expenses, { ...expense, id: this.uid(), userId: this.currentUser }]
    }));
  }

  updateExpense(id: string, data: Partial<StoredExpense>): void {
    this.updateDb((db) => ({
      ...db,
      expenses: db.expenses.map((expense) =>
        expense.id === id && this.isCurrentUser(expense.userId) ? { ...expense, ...data } : expense
      )
    }));
  }

  removeExpense(id: string): void {
    this.updateDb((db) => ({
      ...db,
      expenses: db.expenses.filter((expense) => !(expense.id === id && this.isCurrentUser(expense.userId)))
    }));
  }

  removeExpenseSeries(serieId: string): void {
    this.updateDb((db) => ({
      ...db,
      expenses: db.expenses.filter(
        (expense) => !(expense.serieId === serieId && this.isCurrentUser(expense.userId))
      )
    }));
  }

  addCard(card: Omit<StoredCard, 'id'>): void {
    this.updateDb((db) => ({
      ...db,
      cards: [...db.cards, { ...card, id: this.uid(), userId: this.currentUser }]
    }));
  }

  updateCard(id: string, data: Partial<StoredCard>): void {
    this.updateDb((db) => ({
      ...db,
      cards: db.cards.map((card) => (card.id === id && this.isCurrentUser(card.userId) ? { ...card, ...data } : card))
    }));
  }

  removeCard(id: string): void {
    this.updateDb((db) => ({
      ...db,
      cards: db.cards.filter((card) => !(card.id === id && this.isCurrentUser(card.userId)))
    }));
  }

  addIncome(income: Omit<StoredIncome, 'id'>): void {
    this.updateDb((db) => ({
      ...db,
      incomes: [...db.incomes, { ...income, id: this.uid(), userId: this.currentUser }]
    }));
  }

  updateIncome(id: string, data: Partial<StoredIncome>): void {
    this.updateDb((db) => ({
      ...db,
      incomes: db.incomes.map((income) =>
        income.id === id && this.isCurrentUser(income.userId) ? { ...income, ...data } : income
      )
    }));
  }

  removeIncome(id: string): void {
    this.updateDb((db) => ({
      ...db,
      incomes: db.incomes.filter((income) => !(income.id === id && this.isCurrentUser(income.userId)))
    }));
  }

  private updateDb(mutator: (db: PersistedDb) => PersistedDb): void {
    const updatedDb = mutator(this.dbSubject.value);
    this.dbSubject.next(updatedDb);
    LocalDbService.memoryDb = updatedDb;
    void this.persist(updatedDb);
  }

  private async persist(db: PersistedDb): Promise<void> {
    this.writeToLocalStorage(db);
    await this.saveIndexed(db);
  }

  private async restore(): Promise<void> {
    const fromIndexed = await this.readIndexed();
    const fromStorage = fromIndexed ?? this.readFromLocalStorage() ?? LocalDbService.memoryDb;
    const db = this.normalizeOwners(fromStorage || EMPTY_DB);
    this.dbSubject.next(db);
    LocalDbService.memoryDb = db;
  }

  private uid(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private get storage(): Storage | null {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  }

  private get currentUser(): string {
    return this.storage?.getItem('current_user') || LocalDbService.guestUser;
  }

  private isCurrentUser(ownerId?: string): boolean {
    return (ownerId || LocalDbService.guestUser) === this.currentUser;
  }

  private normalizeOwners(db: PersistedDb): PersistedDb {
    const owner = this.currentUser;
    const withOwner = <T extends { userId?: string }>(collection: T[]) =>
      collection.map((item) => ({ ...item, userId: item.userId ?? owner }));

    return {
      expenses: withOwner(db.expenses),
      cards: withOwner(db.cards),
      incomes: withOwner(db.incomes)
    };
  }

  private readFromLocalStorage(): PersistedDb | null {
    const raw = this.storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PersistedDb;
    } catch {
      return null;
    }
  }

  private writeToLocalStorage(db: PersistedDb): void {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  // Persistência em IndexedDB
  private openDb(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open('investindo-db', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  private async saveIndexed(data: PersistedDb): Promise<void> {
    const db = await this.openDb();
    if (!db) return;
    const tx = db.transaction('data', 'readwrite');
    tx.objectStore('data').put(data, 'singleton');
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  private async readIndexed(): Promise<PersistedDb | null> {
    const db = await this.openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction('data', 'readonly');
      const req = tx.objectStore('data').get('singleton');
      req.onsuccess = () => resolve((req.result as PersistedDb) || null);
      req.onerror = () => resolve(null);
    });
  }
}
