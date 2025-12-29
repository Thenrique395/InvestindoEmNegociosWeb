import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface StoredExpense {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  vencimento: string; // DD/MM/AAAA
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
  vencimento: string;
  cvv: string;
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
}

type PersistedDb = {
  expenses: StoredExpense[];
  cards: StoredCard[];
  incomes: StoredIncome[];
};

const STORAGE_KEY = 'investindo-db';

@Injectable({ providedIn: 'root' })
export class LocalDbService {
  private static memoryDb: PersistedDb | null = null;
  private db: PersistedDb = { expenses: [], cards: [], incomes: [] };
  private expensesSubject = new BehaviorSubject<StoredExpense[]>([]);
  private cardsSubject = new BehaviorSubject<StoredCard[]>([]);
  private incomesSubject = new BehaviorSubject<StoredIncome[]>([]);
  expenses$ = this.expensesSubject.asObservable();
  cards$ = this.cardsSubject.asObservable();
  incomes$ = this.incomesSubject.asObservable();

  constructor() {
    // carrega assincronamente; emite dados assim que recuperar
    this.load();
  }

  addExpense(expense: Omit<StoredExpense, 'id'>): void {
    const record = { ...expense, id: this.uid() };
    this.db.expenses = [...this.db.expenses, record];
    this.persist();
  }

  updateExpense(id: string, data: Partial<StoredExpense>): void {
    this.db.expenses = this.db.expenses.map((e) => (e.id === id ? { ...e, ...data } : e));
    this.persist();
  }

  removeExpense(id: string): void {
    this.db.expenses = this.db.expenses.filter((e) => e.id !== id);
    this.persist();
  }

  removeExpenseSeries(serieId: string): void {
    this.db.expenses = this.db.expenses.filter((e) => e.serieId !== serieId);
    this.persist();
  }

  addCard(card: Omit<StoredCard, 'id'>): void {
    const record = { ...card, id: this.uid() };
    this.db.cards = [...this.db.cards, record];
    this.persist();
  }

  updateCard(id: string, data: Partial<StoredCard>): void {
    this.db.cards = this.db.cards.map((c) => (c.id === id ? { ...c, ...data } : c));
    this.persist();
  }

  removeCard(id: string): void {
    this.db.cards = this.db.cards.filter((c) => c.id !== id);
    this.persist();
  }

  addIncome(income: Omit<StoredIncome, 'id'>): void {
    const record = { ...income, id: this.uid() };
    this.db.incomes = [...this.db.incomes, record];
    this.persist();
  }

  updateIncome(id: string, data: Partial<StoredIncome>): void {
    this.db.incomes = this.db.incomes.map((i) => (i.id === id ? { ...i, ...data } : i));
    this.persist();
  }

  removeIncome(id: string): void {
    this.db.incomes = this.db.incomes.filter((i) => i.id !== id);
    this.persist();
  }

  private async persist(): Promise<void> {
    LocalDbService.memoryDb = this.db;
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.db));
    await this.saveIndexed(this.db);
    this.emit();
  }

  private async load(): Promise<void> {
    // prioridade: IndexedDB -> localStorage -> memória
    const fromIndexed = await this.readIndexed();
    if (fromIndexed) {
      this.db = fromIndexed;
    } else {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (raw) {
        try {
          this.db = JSON.parse(raw) as PersistedDb;
        } catch {
          this.db = { expenses: [], cards: [], incomes: [] };
        }
      } else if (LocalDbService.memoryDb) {
        this.db = LocalDbService.memoryDb;
      }
    }
    this.emit();
  }

  private emit(): void {
    this.expensesSubject.next([...this.db.expenses]);
    this.cardsSubject.next([...this.db.cards]);
    this.incomesSubject.next([...this.db.incomes]);
  }

  private uid(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private get storage(): Storage | null {
    return typeof localStorage !== 'undefined' ? localStorage : null;
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
