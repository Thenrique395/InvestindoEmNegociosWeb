import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type InvestmentType = 'RF' | 'ACOES' | 'FUNDOS' | 'CRIPTO';
export type MovementType = 'APORTE' | 'RESGATE';

export interface InvestmentMovement {
  id: string;
  type: MovementType;
  quantity: number;
  price: number;
  date: string;
  note?: string;
}

export interface InvestmentPosition {
  id: string;
  type: InvestmentType;
  asset: string;
  quantity: number;
  avgPrice: number;
  openedAt: string;
  account: string;
  category?: string;
  note?: string;
  movements: InvestmentMovement[];
}

@Injectable({ providedIn: 'root' })
export class InvestmentsService {
  private readonly storageKey = 'invest_positions';
  private readonly state$ = new BehaviorSubject<InvestmentPosition[]>(this.load());

  readonly positions$ = this.state$.asObservable();

  addPosition(position: Omit<InvestmentPosition, 'id' | 'movements'>): void {
    const current = this.state$.getValue();
    const novo: InvestmentPosition = {
      ...position,
      id: crypto.randomUUID(),
      movements: []
    };
    const next = [...current, novo];
    this.persist(next);
  }

  addMovement(positionId: string, movement: Omit<InvestmentMovement, 'id'>): void {
    const current = this.state$.getValue();
    const updated = current.map((pos) => {
      if (pos.id !== positionId) return pos;

      if (movement.type === 'RESGATE' && movement.quantity > pos.quantity) {
        throw new Error('Quantidade de resgate maior que posição.');
      }

      let quantity = pos.quantity;
      let avgPrice = pos.avgPrice;

      if (movement.type === 'APORTE') {
        const totalAtual = quantity * avgPrice;
        const totalNovo = movement.quantity * movement.price;
        quantity = quantity + movement.quantity;
        avgPrice = quantity > 0 ? (totalAtual + totalNovo) / quantity : 0;
      } else {
        // RESGATE: apenas reduz a quantidade, mantém preço médio
        quantity = quantity - movement.quantity;
      }

      const mov: InvestmentMovement = { ...movement, id: crypto.randomUUID() };

      return {
        ...pos,
        quantity,
        avgPrice,
        movements: [mov, ...pos.movements]
      };
    });

    this.persist(updated);
  }

  private persist(positions: InvestmentPosition[]): void {
    this.state$.next(positions);
    localStorage.setItem(this.storageKey, JSON.stringify(positions));
  }

  private load(): InvestmentPosition[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as InvestmentPosition[];
    } catch (e) {
      console.error('Falha ao carregar posições de investimento', e);
      return [];
    }
  }
}
