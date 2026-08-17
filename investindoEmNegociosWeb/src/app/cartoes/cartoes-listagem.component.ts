import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, DecimalPipe } from '@angular/common';
import { StoredCard } from '../data/api-data.service';
import { CardBrandLookup } from '../lookups.service';
import { ProgressBarComponent } from '../shared/progress-bar/progress-bar.component';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { StatusBadgeComponent, StatusBadgeTone } from '../shared/status-badge/status-badge.component';
import { CardMetrics, CardStatus } from './card-metrics.model';

@Component({
  selector: 'app-cartoes-listagem',
  standalone: true,
  imports: [NgClass, DecimalPipe, AppCurrencyPipe, StatusBadgeComponent, ProgressBarComponent],
  templateUrl: './cartoes-listagem.component.html',
  styleUrls: ['./cartoes-listagem.component.scss']
})
export class CartoesListagemComponent {
  @Input() metrics: CardMetrics[] = [];
  @Input() brands: CardBrandLookup[] = [];
  @Input() emptyTitle = 'Sem cartões cadastrados';
  @Input() emptyDescription = 'Adicione seu primeiro cartão para acompanhar limites e vencimentos.';
  @Input() emptyCtaLabel = 'Adicionar cartão';
  @Output() remover = new EventEmitter<string>();
  @Output() editar = new EventEmitter<StoredCard>();
  @Output() emptyAction = new EventEmitter<void>();

  private brandLookup(value: string): CardBrandLookup | undefined {
    const normalized = (value || '').toString();
    const target = normalized.toLowerCase();
    return this.brands.find(
      (b) =>
        String(b.id) === normalized ||
        (b.code || '').toLowerCase() === target ||
        (b.name || '').toLowerCase() === target
    );
  }

  brandCode(card: StoredCard): string {
    const raw = this.brandLookup(card.bandeira)?.code || card.bandeira;
    return (raw || '').toString().toLowerCase();
  }

  brandName(card: StoredCard): string {
    return this.brandLookup(card.bandeira)?.name || card.bandeira || 'Sem bandeira';
  }

  cardToneClass(card: StoredCard): string {
    const code = this.brandCode(card);

    switch (code) {
      case 'visa':
        return 'cards-list__card--visa';
      case 'mastercard':
        return 'cards-list__card--mastercard';
      case 'elo':
        return 'cards-list__card--elo';
      case 'amex':
      case 'american-express':
        return 'cards-list__card--amex';
      default:
        return 'cards-list__card--default';
    }
  }

  numeroProtegido(numero: string): string {
    const digits = (numero || '').replace(/\D/g, '');
    if (!digits) return '•••• •••• •••• ••••';

    const first = digits.slice(0, 4).padEnd(4, '•');
    const last = digits.slice(-4).padStart(4, '•');
    return `${first} •••• •••• ${last}`;
  }

  isMastercard(code: string): boolean {
    return (code || '').toLowerCase() === 'mastercard';
  }

  statusLabel(status: CardStatus): string {
    switch (status) {
      case 'overdue':
        return 'Fatura atrasada';
      case 'due-soon':
        return 'Vence em breve';
      case 'on-track':
        return 'Em dia';
      default:
        return 'Sem fatura';
    }
  }

  statusTone(status: CardStatus): StatusBadgeTone {
    switch (status) {
      case 'overdue':
        return 'danger';
      case 'due-soon':
        return 'warning';
      case 'on-track':
        return 'success';
      default:
        return 'muted';
    }
  }

  dueLabel(m: CardMetrics): string {
    if (m.daysUntilDue === null) return 'Sem fatura em aberto';
    if (m.overdueCount > 0) return 'Fatura vencida';
    if (m.daysUntilDue === 0) return 'Vence hoje';
    if (m.daysUntilDue === 1) return 'Vence amanhã';
    return `Vence em ${m.daysUntilDue} dias`;
  }

  onEditar(card: StoredCard): void {
    this.editar.emit(card);
  }

  onRemover(id: string): void {
    this.remover.emit(id);
  }

  trackByCard(_index: number, m: CardMetrics): string {
    return m.card.id;
  }
}
