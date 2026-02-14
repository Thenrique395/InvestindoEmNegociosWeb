import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { AdminParametersService, CardBrandAdmin, InstitutionAdmin, NotificationSettings, PaymentMethodAdmin } from '../admin-parameters.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admin-parameters',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './admin-parameters.component.html',
  styleUrls: ['./admin-parameters.component.scss']
})
export class AdminParametersComponent implements OnInit {
  cardBrands: CardBrandAdmin[] = [];
  paymentMethods: PaymentMethodAdmin[] = [];
  institutions: InstitutionAdmin[] = [];
  notificationSettings: NotificationSettings = {
    incomeUpcomingEnabled: true,
    incomeDaysBefore: 2,
    expenseUpcomingEnabled: true,
    expenseDaysBefore: 2,
    expenseOverdueEnabled: true,
    cardCloseSoonEnabled: true,
    cardCloseDaysBefore: 2,
    cardCloseDayEnabled: true,
    monthCloseEnabled: true,
    monthSummaryEnabled: true,
    goalBelowExpectedEnabled: true,
    goalCompletedEnabled: true,
    goalInactivityEnabled: true,
    goalInactivityDays: 30
  };
  loading = false;
  error = '';
  errorCardBrands = '';
  errorPaymentMethods = '';
  errorInstitutions = '';
  errorNotifications = '';
  savingKey = '';
  brandFilter = '';
  methodFilter = '';
  institutionFilter = '';
  newBrandName = '';
  newBrandCode = '';
  newMethodName = '';
  newInstitutionName = '';
  newInstitutionType: 'Bank' | 'Broker' = 'Bank';
  createBrandError = '';
  createMethodError = '';
  createInstitutionError = '';
  savingCreateBrand = false;
  savingCreateMethod = false;
  savingCreateInstitution = false;
  savingNotificationSettings = false;
  notificationsUpdatedAt?: Date;
  private lastUpdatedBrands: Record<number, Date> = {};
  private lastUpdatedMethods: Record<number, Date> = {};
  private lastUpdatedInstitutions: Record<number, Date> = {};
  confirmOpen = false;
  confirmTitle = 'Confirmar ação';
  confirmMessage = '';
  confirmLabel = 'Confirmar';
  confirmVariant: 'warning' | 'danger' | 'primary' = 'warning';
  private pendingAction:
    | { kind: 'brand'; item: CardBrandAdmin; nextActive: boolean }
    | { kind: 'method'; item: PaymentMethodAdmin; nextActive: boolean }
    | { kind: 'institution'; item: InstitutionAdmin; nextActive: boolean }
    | null = null;

  constructor(
    private adminParameters: AdminParametersService,
    private uiFeedback: UiFeedbackService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.error = '';
    this.errorCardBrands = '';
    this.errorPaymentMethods = '';
    this.errorInstitutions = '';
    this.errorNotifications = '';
    forkJoin({
      brands: this.adminParameters.listCardBrands().pipe(
        catchError(() => {
          this.errorCardBrands = 'Não foi possível carregar as bandeiras.';
          return of([] as CardBrandAdmin[]);
        })
      ),
      methods: this.adminParameters.listPaymentMethods().pipe(
        catchError(() => {
          this.errorPaymentMethods = 'Não foi possível carregar as formas de pagamento.';
          return of([] as PaymentMethodAdmin[]);
        })
      ),
      institutions: this.adminParameters.listInstitutions().pipe(
        catchError(() => {
          this.errorInstitutions = 'Não foi possível carregar as instituições.';
          return of([] as InstitutionAdmin[]);
        })
      ),
      notifications: this.adminParameters.getNotificationSettings().pipe(
        catchError(() => {
          this.errorNotifications = 'Não foi possível carregar as notificações.';
          return of(null);
        })
      )
    }).subscribe({
      next: ({ brands, methods, institutions, notifications }) => {
        this.cardBrands = brands;
        this.paymentMethods = methods;
        this.institutions = institutions;
        if (notifications) {
          this.notificationSettings = notifications;
        }
        if (this.errorCardBrands && this.errorPaymentMethods && this.errorInstitutions && this.errorNotifications) {
          this.error = 'Não foi possível carregar os parâmetros.';
        }
      },
      error: () => {
        this.error = 'Não foi possível carregar os parâmetros.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  toggleCardBrand(brand: CardBrandAdmin): void {
    if (this.savingKey) return;
    const next = !brand.isActive;
    if (!next) {
      this.openConfirm({
        title: 'Desativar bandeira',
        message: 'Desativar esta bandeira pode impactar novos cadastros. Deseja continuar?',
        confirmLabel: 'Desativar',
        variant: 'warning'
      }, { kind: 'brand', item: brand, nextActive: next });
      return;
    }
    this.applyToggleCardBrand(brand, next);
  }

  createCardBrand(): void {
    if (this.savingCreateBrand) return;
    const name = this.newBrandName.trim();
    const code = this.newBrandCode.trim();
    if (!name || !code) {
      this.createBrandError = 'Informe nome e código da bandeira.';
      return;
    }

    this.savingCreateBrand = true;
    this.createBrandError = '';
    this.adminParameters.createCardBrand(name, code).subscribe({
      next: (created) => {
        this.cardBrands = [...this.cardBrands, created].sort((a, b) => a.id - b.id);
        this.lastUpdatedBrands[created.id] = new Date();
        this.newBrandName = '';
        this.newBrandCode = '';
        this.createBrandError = '';
        this.uiFeedback.success('Bandeira cadastrada com sucesso.');
      },
      error: (err) => {
        this.createBrandError = this.resolveErrorMessage(err, 'Erro ao cadastrar a bandeira.');
        this.uiFeedback.error(this.createBrandError);
      },
      complete: () => {
        this.savingCreateBrand = false;
      }
    });
  }

  togglePaymentMethod(method: PaymentMethodAdmin): void {
    if (this.savingKey) return;
    const next = !method.isActive;
    if (!next) {
      this.openConfirm({
        title: 'Desativar forma de pagamento',
        message: 'Desativar esta forma de pagamento pode impactar novos cadastros. Deseja continuar?',
        confirmLabel: 'Desativar',
        variant: 'warning'
      }, { kind: 'method', item: method, nextActive: next });
      return;
    }
    this.applyTogglePaymentMethod(method, next);
  }

  toggleInstitution(institution: InstitutionAdmin): void {
    if (this.savingKey) return;
    const next = !institution.isActive;
    if (!next) {
      this.openConfirm({
        title: 'Desativar instituição',
        message: 'Desativar esta instituição pode impactar novos cadastros. Deseja continuar?',
        confirmLabel: 'Desativar',
        variant: 'warning'
      }, { kind: 'institution', item: institution, nextActive: next });
      return;
    }
    this.applyToggleInstitution(institution, next);
  }

  createPaymentMethod(): void {
    if (this.savingCreateMethod) return;
    const name = this.newMethodName.trim();
    if (!name) {
      this.createMethodError = 'Informe o nome da forma de pagamento.';
      return;
    }

    this.savingCreateMethod = true;
    this.createMethodError = '';
    this.adminParameters.createPaymentMethod(name).subscribe({
      next: (created) => {
        this.paymentMethods = [...this.paymentMethods, created].sort((a, b) => a.id - b.id);
        this.lastUpdatedMethods[created.id] = new Date();
        this.newMethodName = '';
        this.createMethodError = '';
        this.uiFeedback.success('Forma de pagamento cadastrada com sucesso.');
      },
      error: (err) => {
        this.createMethodError = this.resolveErrorMessage(err, 'Erro ao cadastrar a forma de pagamento.');
        this.uiFeedback.error(this.createMethodError);
      },
      complete: () => {
        this.savingCreateMethod = false;
      }
    });
  }

  createInstitution(): void {
    if (this.savingCreateInstitution) return;
    const name = this.newInstitutionName.trim();
    if (!name) {
      this.createInstitutionError = 'Informe o nome da instituição.';
      return;
    }

    this.savingCreateInstitution = true;
    this.createInstitutionError = '';
    this.adminParameters.createInstitution(name, this.newInstitutionType).subscribe({
      next: (created) => {
        this.institutions = [...this.institutions, created].sort((a, b) => a.name.localeCompare(b.name));
        this.lastUpdatedInstitutions[created.id] = new Date();
        this.newInstitutionName = '';
        this.uiFeedback.success('Instituição cadastrada com sucesso.');
      },
      error: (err) => {
        this.createInstitutionError = this.resolveErrorMessage(err, 'Erro ao cadastrar a instituição.');
        this.uiFeedback.error(this.createInstitutionError);
      },
      complete: () => {
        this.savingCreateInstitution = false;
      }
    });
  }

  salvarNotificacoes(): void {
    if (this.savingNotificationSettings) return;
    this.savingNotificationSettings = true;
    this.errorNotifications = '';
    this.adminParameters.updateNotificationSettings(this.notificationSettings).subscribe({
      next: (updated) => {
        this.notificationSettings = updated;
        this.notificationsUpdatedAt = new Date();
        this.uiFeedback.success('Notificações globais atualizadas com sucesso.');
      },
      error: (err) => {
        this.errorNotifications = this.resolveErrorMessage(err, 'Erro ao salvar notificações.');
        this.uiFeedback.error(this.errorNotifications);
      },
      complete: () => {
        this.savingNotificationSettings = false;
      }
    });
  }

  get filteredCardBrands(): CardBrandAdmin[] {
    return this.filterList(this.cardBrands, this.brandFilter, (brand) => `${brand.name} ${brand.code}`);
  }

  get filteredPaymentMethods(): PaymentMethodAdmin[] {
    return this.filterList(this.paymentMethods, this.methodFilter, (method) => method.name);
  }

  get filteredInstitutions(): InstitutionAdmin[] {
    return this.filterList(this.institutions, this.institutionFilter, (inst) => `${inst.name} ${inst.type}`);
  }

  isSavingBrand(brand: CardBrandAdmin): boolean {
    return this.savingKey === this.brandKey(brand.id);
  }

  isSavingMethod(method: PaymentMethodAdmin): boolean {
    return this.savingKey === this.methodKey(method.id);
  }

  isSavingInstitution(inst: InstitutionAdmin): boolean {
    return this.savingKey === `institution-${inst.id}`;
  }

  brandUpdatedLabel(brand: CardBrandAdmin): string {
    return this.formatUpdatedLabel(this.lastUpdatedBrands[brand.id]);
  }

  methodUpdatedLabel(method: PaymentMethodAdmin): string {
    return this.formatUpdatedLabel(this.lastUpdatedMethods[method.id]);
  }

  institutionUpdatedLabel(inst: InstitutionAdmin): string {
    return this.formatUpdatedLabel(this.lastUpdatedInstitutions[inst.id]);
  }

  notificationUpdatedLabel(): string {
    return this.formatUpdatedLabel(this.notificationsUpdatedAt);
  }

  private brandKey(id: number): string {
    return `brand-${id}`;
  }

  private methodKey(id: number): string {
    return `method-${id}`;
  }

  private filterList<T>(items: T[], needle: string, labeler: (item: T) => string): T[] {
    const normalized = needle.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => labeler(item).toLowerCase().includes(normalized));
  }

  private formatUpdatedLabel(updatedAt?: Date): string {
    if (!updatedAt) return '';
    const diff = Date.now() - updatedAt.getTime();
    if (diff < 60_000) return 'Atualizado agora';
    const time = updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `Atualizado às ${time}`;
  }

  confirmAction(): void {
    if (!this.pendingAction) {
      this.confirmOpen = false;
      return;
    }
    const { kind, item, nextActive } = this.pendingAction;
    this.confirmOpen = false;
    this.pendingAction = null;
    if (kind === 'brand') this.applyToggleCardBrand(item, nextActive);
    if (kind === 'method') this.applyTogglePaymentMethod(item, nextActive);
    if (kind === 'institution') this.applyToggleInstitution(item, nextActive);
  }

  cancelConfirm(): void {
    this.confirmOpen = false;
    this.pendingAction = null;
  }

  private openConfirm(
    data: { title: string; message: string; confirmLabel?: string; variant?: 'warning' | 'danger' | 'primary' },
    pending:
      | { kind: 'brand'; item: CardBrandAdmin; nextActive: boolean }
      | { kind: 'method'; item: PaymentMethodAdmin; nextActive: boolean }
      | { kind: 'institution'; item: InstitutionAdmin; nextActive: boolean }
  ): void {
    this.confirmTitle = data.title;
    this.confirmMessage = data.message;
    this.confirmLabel = data.confirmLabel || 'Confirmar';
    this.confirmVariant = data.variant || 'warning';
    this.pendingAction = pending;
    this.confirmOpen = true;
  }

  private applyToggleCardBrand(brand: CardBrandAdmin, next: boolean): void {
    const key = this.brandKey(brand.id);
    this.savingKey = key;
    brand.isActive = next;

    this.adminParameters.updateCardBrandStatus(brand.id, next).subscribe({
      next: (updated) => {
        brand.isActive = updated.isActive;
        this.lastUpdatedBrands[brand.id] = new Date();
        this.uiFeedback.success(`Bandeira ${updated.isActive ? 'ativada' : 'desativada'} com sucesso.`);
      },
      error: () => {
        brand.isActive = !next;
        this.errorCardBrands = 'Erro ao atualizar a bandeira.';
        this.uiFeedback.error('Erro ao atualizar a bandeira.');
        this.savingKey = '';
      },
      complete: () => (this.savingKey = '')
    });
  }

  private applyTogglePaymentMethod(method: PaymentMethodAdmin, next: boolean): void {
    const key = this.methodKey(method.id);
    this.savingKey = key;
    method.isActive = next;

    this.adminParameters.updatePaymentMethodStatus(method.id, next).subscribe({
      next: (updated) => {
        method.isActive = updated.isActive;
        this.lastUpdatedMethods[method.id] = new Date();
        this.uiFeedback.success(`Forma de pagamento ${updated.isActive ? 'ativada' : 'desativada'} com sucesso.`);
      },
      error: () => {
        method.isActive = !next;
        this.errorPaymentMethods = 'Erro ao atualizar a forma de pagamento.';
        this.uiFeedback.error('Erro ao atualizar a forma de pagamento.');
        this.savingKey = '';
      },
      complete: () => (this.savingKey = '')
    });
  }

  private applyToggleInstitution(institution: InstitutionAdmin, next: boolean): void {
    const key = `institution-${institution.id}`;
    this.savingKey = key;
    institution.isActive = next;

    this.adminParameters.updateInstitutionStatus(institution.id, next).subscribe({
      next: (updated) => {
        institution.isActive = updated.isActive;
        this.lastUpdatedInstitutions[institution.id] = new Date();
        this.uiFeedback.success(`Instituição ${updated.isActive ? 'ativada' : 'desativada'} com sucesso.`);
      },
      error: () => {
        institution.isActive = !next;
        this.errorInstitutions = 'Erro ao atualizar a instituição.';
        this.uiFeedback.error('Erro ao atualizar a instituição.');
        this.savingKey = '';
      },
      complete: () => (this.savingKey = '')
    });
  }

  private resolveErrorMessage(err: any, fallback: string): string {
    const detail = err?.error?.detail || err?.error?.title;
    if (detail) return detail;
    if (err?.status === 0) return 'Falha de conexão com o servidor.';
    if (err?.status) return `${fallback} (HTTP ${err.status}).`;
    return fallback;
  }
}
