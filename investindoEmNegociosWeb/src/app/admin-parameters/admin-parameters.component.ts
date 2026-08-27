import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { AdminParametersService, CardBrandAdmin, InstitutionAdmin, NotificationSettings, PaymentMethodAdmin, RobotSettings, ScalabilityRuntime } from '../admin-parameters.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { resolveApiErrorMessage } from '../utils/api-error.mapper';

@Component({
  selector: 'app-admin-parameters',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent, PageHeaderComponent, StatusBadgeComponent, UiStateComponent],
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
  robotSettings: RobotSettings = {
    enabled: true,
    dailyRunTimeUtc: '08:00'
  };
  scalabilityRuntime: ScalabilityRuntime | null = null;
  loading = false;
  savingKey = '';
  brandFilter = '';
  methodFilter = '';
  institutionFilter = '';
  newBrandName = '';
  newBrandCode = '';
  newMethodName = '';
  newInstitutionName = '';
  newInstitutionType: 'Bank' | 'Broker' = 'Bank';
  savingCreateBrand = false;
  savingCreateMethod = false;
  savingCreateInstitution = false;
  savingNotificationSettings = false;
  savingRobotSettings = false;
  sendingTestEmail = false;
  notificationsUpdatedAt?: Date;
  robotsUpdatedAt?: Date;
  testEmailTo = '';
  testEmailSentAt?: Date;
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
    private uiFeedback: UiFeedbackService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      brands: this.adminParameters.listCardBrands().pipe(
        catchError(() => {
          this.uiFeedback.error('Não foi possível carregar as bandeiras.');
          return of([] as CardBrandAdmin[]);
        })
      ),
      methods: this.adminParameters.listPaymentMethods().pipe(
        catchError(() => {
          this.uiFeedback.error('Não foi possível carregar as formas de pagamento.');
          return of([] as PaymentMethodAdmin[]);
        })
      ),
      institutions: this.adminParameters.listInstitutions().pipe(
        catchError(() => {
          this.uiFeedback.error('Não foi possível carregar as instituições.');
          return of([] as InstitutionAdmin[]);
        })
      ),
      notifications: this.adminParameters.getNotificationSettings().pipe(
        catchError(() => {
          this.uiFeedback.error('Não foi possível carregar as notificações.');
          return of(null);
        })
      ),
      robots: this.adminParameters.getRobotSettings().pipe(
        catchError(() => {
          this.uiFeedback.error('Não foi possível carregar as configurações de robôs.');
          return of(null);
        })
      ),
      scalability: this.adminParameters.getScalabilityRuntime().pipe(
        catchError(() => {
          this.uiFeedback.warning('Não foi possível carregar o status de escalabilidade.');
          return of(null);
        })
      )
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ brands, methods, institutions, notifications, robots, scalability }) => {
        this.cardBrands = brands;
        this.paymentMethods = methods;
        this.institutions = institutions;
        if (notifications) {
          this.notificationSettings = notifications;
        }
        if (robots) {
          this.robotSettings = robots;
        }
        this.scalabilityRuntime = scalability;
      },
      error: () => {
        this.uiFeedback.error('Não foi possível carregar os parâmetros.');
        this.loading = false;
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
      this.uiFeedback.warning('Informe nome e código da bandeira.');
      return;
    }

    this.savingCreateBrand = true;
    this.adminParameters.createCardBrand(name, code).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (created) => {
        this.cardBrands = [...this.cardBrands, created].sort((a, b) => a.id - b.id);
        this.lastUpdatedBrands[created.id] = new Date();
        this.newBrandName = '';
        this.newBrandCode = '';
        this.uiFeedback.success('Bandeira cadastrada com sucesso.');
      },
      error: (err) => {
        this.uiFeedback.error(resolveApiErrorMessage(err,'Erro ao cadastrar a bandeira.'));
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
      this.uiFeedback.warning('Informe o nome da forma de pagamento.');
      return;
    }

    this.savingCreateMethod = true;
    this.adminParameters.createPaymentMethod(name).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (created) => {
        this.paymentMethods = [...this.paymentMethods, created].sort((a, b) => a.id - b.id);
        this.lastUpdatedMethods[created.id] = new Date();
        this.newMethodName = '';
        this.uiFeedback.success('Forma de pagamento cadastrada com sucesso.');
      },
      error: (err) => {
        this.uiFeedback.error(resolveApiErrorMessage(err,'Erro ao cadastrar a forma de pagamento.'));
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
      this.uiFeedback.warning('Informe o nome da instituição.');
      return;
    }

    this.savingCreateInstitution = true;
    this.adminParameters.createInstitution(name, this.newInstitutionType).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (created) => {
        this.institutions = [...this.institutions, created].sort((a, b) => a.name.localeCompare(b.name));
        this.lastUpdatedInstitutions[created.id] = new Date();
        this.newInstitutionName = '';
        this.uiFeedback.success('Instituição cadastrada com sucesso.');
      },
      error: (err) => {
        this.uiFeedback.error(resolveApiErrorMessage(err,'Erro ao cadastrar a instituição.'));
      },
      complete: () => {
        this.savingCreateInstitution = false;
      }
    });
  }

  salvarNotificacoes(): void {
    if (this.savingNotificationSettings) return;
    this.savingNotificationSettings = true;
    this.adminParameters.updateNotificationSettings(this.notificationSettings).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.notificationSettings = updated;
        this.notificationsUpdatedAt = new Date();
        this.uiFeedback.success('Notificações globais atualizadas com sucesso.');
      },
      error: (err) => {
        this.uiFeedback.error(resolveApiErrorMessage(err,'Erro ao salvar notificações.'));
      },
      complete: () => {
        this.savingNotificationSettings = false;
      }
    });
  }

  salvarRobotSettings(): void {
    if (this.savingRobotSettings) return;
    if (!/^\d{2}:\d{2}$/.test(this.robotSettings.dailyRunTimeUtc)) {
      this.uiFeedback.warning('Informe o horário no formato HH:mm (UTC).');
      return;
    }

    this.savingRobotSettings = true;
    this.adminParameters.updateRobotSettings(this.robotSettings).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.robotSettings = updated;
        this.robotsUpdatedAt = new Date();
        this.uiFeedback.success('Agendamento dos robôs atualizado com sucesso.');
      },
      error: (err) => {
        this.uiFeedback.error(resolveApiErrorMessage(err,'Erro ao salvar agendamento dos robôs.'));
      },
      complete: () => {
        this.savingRobotSettings = false;
      }
    });
  }

  enviarEmailTeste(): void {
    if (this.sendingTestEmail) return;
    const to = this.testEmailTo.trim();
    if (!to) {
      this.uiFeedback.warning('Informe um e-mail de destino para o teste.');
      return;
    }

    this.sendingTestEmail = true;
    this.adminParameters.sendTestEmail(to).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.testEmailTo = result.to;
        this.testEmailSentAt = new Date(result.sentAtUtc);
        this.uiFeedback.success(`E-mail de teste enviado para ${result.to}.`);
      },
      error: (err) => {
        this.uiFeedback.error(resolveApiErrorMessage(err,'Erro ao enviar e-mail de teste.'));
      },
      complete: () => {
        this.sendingTestEmail = false;
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

  robotUpdatedLabel(): string {
    return this.formatUpdatedLabel(this.robotsUpdatedAt);
  }

  testEmailUpdatedLabel(): string {
    return this.formatUpdatedLabel(this.testEmailSentAt);
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

    this.adminParameters.updateCardBrandStatus(brand.id, next).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        brand.isActive = updated.isActive;
        this.lastUpdatedBrands[brand.id] = new Date();
        this.uiFeedback.success(`Bandeira ${updated.isActive ? 'ativada' : 'desativada'} com sucesso.`);
      },
      error: () => {
        brand.isActive = !next;
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

    this.adminParameters.updatePaymentMethodStatus(method.id, next).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        method.isActive = updated.isActive;
        this.lastUpdatedMethods[method.id] = new Date();
        this.uiFeedback.success(`Forma de pagamento ${updated.isActive ? 'ativada' : 'desativada'} com sucesso.`);
      },
      error: () => {
        method.isActive = !next;
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

    this.adminParameters.updateInstitutionStatus(institution.id, next).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        institution.isActive = updated.isActive;
        this.lastUpdatedInstitutions[institution.id] = new Date();
        this.uiFeedback.success(`Instituição ${updated.isActive ? 'ativada' : 'desativada'} com sucesso.`);
      },
      error: () => {
        institution.isActive = !next;
        this.uiFeedback.error('Erro ao atualizar a instituição.');
        this.savingKey = '';
      },
      complete: () => (this.savingKey = '')
    });
  }

  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

}
