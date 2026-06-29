import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { SectionCardComponent } from '../shared/section-card/section-card.component';
import { FilterBarComponent } from '../shared/filter-bar/filter-bar.component';
import { PeriodHeroComponent } from '../shared/period-hero/period-hero.component';
import { PeriodTotalCardComponent } from '../shared/period-total-card/period-total-card.component';
import { PeriodActionCardComponent } from '../shared/period-action-card/period-action-card.component';
import { StatCardComponent } from '../shared/stat-card/stat-card.component';
import { ComparisonPillComponent } from '../shared/comparison-pill/comparison-pill.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { TooltipComponent } from '../shared/tooltip/tooltip.component';
import { ModalComponent } from '../shared/modal/modal.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { ConfirmDialogService } from '../shared/confirm-dialog/confirm-dialog.service';
import { ToastContainerComponent } from '../shared/toast-container/toast-container.component';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { UiFeedbackService } from '../ui-feedback.service';
import { ResponsiveListComponent, ResponsiveListColumn } from '../shared/responsive-list/responsive-list.component';
import { ResponsiveListCellDirective } from '../shared/responsive-list/responsive-list-cell.directive';
import { AccountListComponent } from '../features/accounts/components/account-list/account-list.component';
import { AccountResponse } from '../features/accounts/models/account.models';
import { CartoesListagemComponent } from '../cartoes/cartoes-listagem.component';
import { StoredCard } from '../data/api-data.service';
import { CardBrandLookup } from '../lookups.service';
import { STYLEGUIDE_COMPONENTS, StyleguideEntry } from './styleguide-catalog';

interface DemoListItem {
  id: string;
  nome: string;
  valor: number;
  status: 'success' | 'warning' | 'danger';
}

@Component({
  selector: 'app-styleguide-component-detail',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent,
    SectionCardComponent,
    FilterBarComponent,
    PeriodHeroComponent,
    PeriodTotalCardComponent,
    PeriodActionCardComponent,
    StatCardComponent,
    ComparisonPillComponent,
    StatusBadgeComponent,
    TooltipComponent,
    ModalComponent,
    ConfirmDialogComponent,
    ToastContainerComponent,
    FormFieldComponent,
    UiStateComponent,
    EmptyStateComponent,
    AppCurrencyPipe,
    ResponsiveListComponent,
    ResponsiveListCellDirective,
    AccountListComponent,
    CartoesListagemComponent
  ],
  templateUrl: './styleguide-component-detail.component.html',
  styleUrls: ['./styleguide-content.scss', './styleguide-component-detail.component.scss']
})
export class StyleguideComponentDetailComponent implements OnInit {
  slug = '';
  entry: StyleguideEntry | undefined;

  readonly modalOpen = signal(false);
  readonly formFieldHasError = signal(false);
  readonly periodHeroEvents = signal<string[]>([]);
  confirmResult: string | null = null;

  readonly demoAccounts: AccountResponse[] = [
    { id: '1', name: 'Conta Corrente', type: 'Checking', initialBalance: 5000, currentBalance: 4500, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-06-01', currency: 'BRL' },
    { id: '2', name: 'Poupança', type: 'Savings', initialBalance: 10000, currentBalance: 12000, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-06-01', currency: 'BRL' },
    { id: '3', name: 'Nubank', type: 'DigitalWallet', initialBalance: 0, currentBalance: 300, isActive: true, createdAt: '2026-01-01', updatedAt: '2026-06-01', currency: 'BRL' }
  ];

  readonly demoCards: StoredCard[] = [
    { id: '1', bandeira: 'visa', numero: '4242', nome: 'VISA DEMO', banco: 'Nubank', limiteCredito: 5000, diaFechamento: 3, diaVencimento: 10 },
    { id: '2', bandeira: 'mastercard', numero: '5353', nome: 'MASTER DEMO', banco: 'Itaú', limiteCredito: 8000, diaFechamento: 15, diaVencimento: 22 }
  ];

  readonly demoCardBrands: CardBrandLookup[] = [
    { id: 1, code: 'visa', name: 'Visa' },
    { id: 2, code: 'mastercard', name: 'Mastercard' }
  ];

  readonly listColumns: ResponsiveListColumn[] = [
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'valor', label: 'Valor', sortable: true, align: 'end' }
  ];
  listItems: DemoListItem[] = [
    { id: '1', nome: 'Aluguel', valor: 1800, status: 'success' },
    { id: '2', nome: 'Internet', valor: 120, status: 'warning' },
    { id: '3', nome: 'Cartão de crédito', valor: 950, status: 'danger' }
  ];
  listSortBy: string | null = null;
  listSortDir: 1 | -1 = 1;
  listSelectedIds: string[] = [];
  listGetId = (item: DemoListItem): string => item.id;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly destroyRef: DestroyRef,
    private readonly uiFeedback: UiFeedbackService,
    private readonly confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.slug = params.get('slug') || '';
      this.entry = STYLEGUIDE_COMPONENTS.find((item) => item.slug === this.slug);
    });
  }

  triggerToast(type: 'success' | 'error' | 'warning' | 'info'): void {
    this.uiFeedback[type](`Exemplo de toast (${type}).`);
  }

  async openConfirm(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Remover item',
      message: 'Tem certeza que deseja remover este item de exemplo?',
      confirmLabel: 'Remover',
      tone: 'danger'
    });
    this.confirmResult = confirmed ? 'Confirmado' : 'Cancelado';
  }

  onPeriodHeroNav(direction: 'previous' | 'next'): void {
    this.periodHeroEvents.update((events) => [...events, direction === 'previous' ? 'Mês anterior' : 'Próximo mês']);
  }

  onListSort(column: string): void {
    if (this.listSortBy === column) {
      this.listSortDir = this.listSortDir === 1 ? -1 : 1;
    } else {
      this.listSortBy = column;
      this.listSortDir = 1;
    }
    const dir = this.listSortDir;
    this.listItems = [...this.listItems].sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[column];
      const vb = (b as unknown as Record<string, unknown>)[column];
      return va! > vb! ? dir : va! < vb! ? -dir : 0;
    });
  }

  onListSelectionChange(event: { id: string; checked: boolean }): void {
    this.listSelectedIds = event.checked
      ? [...this.listSelectedIds, event.id]
      : this.listSelectedIds.filter((id) => id !== event.id);
  }

  onListSelectAllChange(checked: boolean): void {
    this.listSelectedIds = checked ? this.listItems.map((item) => item.id) : [];
  }

  readonly usageSnippets: Record<string, string> = {
    'responsive-list': `<app-responsive-list
  [columns]="columns"
  [items]="despesas"
  [getId]="getId"
  [sortBy]="sortBy"
  [sortDir]="sortDir"
  [selectable]="true"
  [selectedIds]="selectedIds"
  [selectableIds]="selectableIds"
  (sort)="onSort($event)"
  (selectionChange)="onSelectionChange($event)"
  (selectAllChange)="onSelectAllChange($event)">

  <ng-template appResponsiveListCell="nome" let-item>
    {{ item.nome }}
  </ng-template>

  <ng-template appResponsiveListCell="valor" let-item>
    {{ item.valor | appCurrency }}
  </ng-template>
</app-responsive-list>`,
    'page-header': `<app-page-header
  eyebrow="Financeiro"
  title="Contas"
  description="Gerencie suas contas e saldos">
  <button page-actions class="btn-primary sm">Nova conta</button>
</app-page-header>`,
    'section-card': `<app-section-card
  title="Extrato"
  description="Acompanhe movimentações do período">
  <button card-actions class="btn-primary sm">Filtrar</button>
  Conteúdo da seção
</app-section-card>`,
    'filter-bar': `<app-filter-bar>
  <div filter-left>
    <input placeholder="Buscar..." />
  </div>
  <div filter-right>
    <button class="btn-primary sm">Novo</button>
  </div>
</app-filter-bar>`,
    'period-hero': `<app-period-hero
  eyebrow="Junho 2026"
  title="Receitas do mês"
  description="Acompanhe entradas e saídas do período."
  (previousMonth)="mesAnterior()"
  (nextMonth)="proximoMes()">
  <div hero-aside>
    <app-period-total-card eyebrow="Total do mês" value="R$ 5.200,00" description="Receitas confirmadas" />
  </div>
</app-period-hero>`,
    'period-total-card': `<app-period-total-card
  eyebrow="Total do mês"
  value="R$ 5.200,00"
  description="Receitas confirmadas" />`,
    'period-action-card': `<app-period-action-card
  eyebrow="Próxima ação"
  title="Quitar despesas vencidas"
  description="2 despesas vencidas precisam de atenção." />`,
    'stat-card': `<app-stat-card
  tone="success"
  eyebrow="Saldo disponível"
  value="R$ 12.400,00"
  note="Atualizado agora"
  tooltipText="Saldo real considerando lançamentos confirmados." />`,
    'comparison-pill': `<app-comparison-pill label="vs. mês anterior" trend="up" polarity="higher-is-better">
  +12%
</app-comparison-pill>`,
    'status-badge': `<app-status-badge tone="success" label="Ativa"></app-status-badge>
<app-status-badge tone="danger" label="Despesa"></app-status-badge>
<app-status-badge tone="warning" label="Duplicado"></app-status-badge>`,
    'ui-state': `<app-ui-state type="loading" title="Carregando..."></app-ui-state>
<app-ui-state
  type="error"
  description="Não foi possível carregar os dados."
  retryLabel="Tentar novamente"
  (retry)="recarregar()"></app-ui-state>`,
    'empty-state': `<app-empty-state
  title="Nenhum registro encontrado"
  description="Crie um novo item para começar"
  ctaLabel="Novo item"
  (action)="criar()">
</app-empty-state>`,
    'toast-container': `// Em algum lugar montado uma única vez (hoje NÃO está montado em nenhum template real):
<app-toast-container></app-toast-container>

// Em qualquer serviço/componente:
this.uiFeedback.success('Salvo com sucesso.');
this.uiFeedback.error('Não foi possível concluir.');`,
    'billing-alert-banner': `<!-- Montado uma vez no shell autenticado (app.component.html) -->
<app-billing-alert-banner />`,
    tooltip: `<app-tooltip label="Mais informações" text="Texto de ajuda contextual." />`,
    modal: `<app-modal
  [open]="open"
  title="Novo item"
  subtitle="Preencha os dados"
  (close)="close()">
  <div modal-body>Conteúdo</div>
  <div modal-footer>
    <button class="btn-ghost sm">Cancelar</button>
    <button class="btn-primary sm">Salvar</button>
  </div>
</app-modal>`,
    'confirm-dialog': `const confirmed = await this.confirmDialog.confirm({
  title: 'Remover conta',
  message: 'Deseja remover esta conta?',
  confirmLabel: 'Remover',
  tone: 'danger'
});
if (!confirmed) return;`,
    'form-field': `<app-form-field
  label="Nome"
  [required]="true"
  [error]="form.error('name')"
  [submitted]="form.submitted">
  <input [(ngModel)]="name" />
</app-form-field>`,
    'app-currency-pipe': `{{ 1234.56 | appCurrency }}
{{ 1234.56 | appCurrency:'USD' }}`,
    'account-list': `<app-account-list
  [accounts]="accounts"
  [loading]="loading"
  [canManage]="true"
  (refresh)="recarregar()"
  (create)="novaConta()"
  (edit)="editarConta($event)"
  (remove)="removerConta($event)"
  (selectAccount)="selecionarConta($event)">
</app-account-list>`,
    'cartoes-listagem': `<app-cartoes-listagem
  [cards]="cartoes"
  [brands]="bandeiras"
  (editar)="editarCartao($event)"
  (remover)="removerCartao($event)"
  (emptyAction)="novoCartao()">
</app-cartoes-listagem>`
  };
}
