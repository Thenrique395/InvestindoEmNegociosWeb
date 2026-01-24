import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { AdminParametersService, CardBrandAdmin, InstitutionAdmin, PaymentMethodAdmin } from '../admin-parameters.service';

@Component({
  selector: 'app-admin-parameters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-parameters.component.html',
  styleUrls: ['./admin-parameters.component.scss']
})
export class AdminParametersComponent implements OnInit {
  cardBrands: CardBrandAdmin[] = [];
  paymentMethods: PaymentMethodAdmin[] = [];
  institutions: InstitutionAdmin[] = [];
  loading = false;
  error = '';
  errorCardBrands = '';
  errorPaymentMethods = '';
  errorInstitutions = '';
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
  private lastUpdatedBrands: Record<number, Date> = {};
  private lastUpdatedMethods: Record<number, Date> = {};
  private lastUpdatedInstitutions: Record<number, Date> = {};

  constructor(private adminParameters: AdminParametersService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.error = '';
    this.errorCardBrands = '';
    this.errorPaymentMethods = '';
    this.errorInstitutions = '';
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
      )
    }).subscribe({
      next: ({ brands, methods, institutions }) => {
        this.cardBrands = brands;
        this.paymentMethods = methods;
        this.institutions = institutions;
        if (this.errorCardBrands && this.errorPaymentMethods && this.errorInstitutions) {
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
    const key = this.brandKey(brand.id);
    if (this.savingKey) return;
    const next = !brand.isActive;
    if (!next && !window.confirm('Desativar esta bandeira pode impactar novos cadastros. Deseja continuar?')) {
      return;
    }
    this.savingKey = key;
    brand.isActive = next;

    this.adminParameters.updateCardBrandStatus(brand.id, next).subscribe({
      next: (updated) => {
        brand.isActive = updated.isActive;
        this.lastUpdatedBrands[brand.id] = new Date();
      },
      error: () => {
        brand.isActive = !next;
        this.errorCardBrands = 'Erro ao atualizar a bandeira.';
        this.savingKey = '';
      },
      complete: () => (this.savingKey = '')
    });
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
      },
      error: (err) => {
        this.createBrandError = this.resolveErrorMessage(err, 'Erro ao cadastrar a bandeira.');
      },
      complete: () => {
        this.savingCreateBrand = false;
      }
    });
  }

  togglePaymentMethod(method: PaymentMethodAdmin): void {
    const key = this.methodKey(method.id);
    if (this.savingKey) return;
    const next = !method.isActive;
    if (!next && !window.confirm('Desativar esta forma de pagamento pode impactar novos cadastros. Deseja continuar?')) {
      return;
    }
    this.savingKey = key;
    method.isActive = next;

    this.adminParameters.updatePaymentMethodStatus(method.id, next).subscribe({
      next: (updated) => {
        method.isActive = updated.isActive;
        this.lastUpdatedMethods[method.id] = new Date();
      },
      error: () => {
        method.isActive = !next;
        this.errorPaymentMethods = 'Erro ao atualizar a forma de pagamento.';
        this.savingKey = '';
      },
      complete: () => (this.savingKey = '')
    });
  }

  toggleInstitution(institution: InstitutionAdmin): void {
    const key = `institution-${institution.id}`;
    if (this.savingKey) return;
    const next = !institution.isActive;
    if (!next && !window.confirm('Desativar esta instituição pode impactar novos cadastros. Deseja continuar?')) {
      return;
    }
    this.savingKey = key;
    institution.isActive = next;

    this.adminParameters.updateInstitutionStatus(institution.id, next).subscribe({
      next: (updated) => {
        institution.isActive = updated.isActive;
        this.lastUpdatedInstitutions[institution.id] = new Date();
      },
      error: () => {
        institution.isActive = !next;
        this.errorInstitutions = 'Erro ao atualizar a instituição.';
        this.savingKey = '';
      },
      complete: () => (this.savingKey = '')
    });
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
      },
      error: (err) => {
        this.createMethodError = this.resolveErrorMessage(err, 'Erro ao cadastrar a forma de pagamento.');
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
      },
      error: (err) => {
        this.createInstitutionError = this.resolveErrorMessage(err, 'Erro ao cadastrar a instituição.');
      },
      complete: () => {
        this.savingCreateInstitution = false;
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

  private resolveErrorMessage(err: any, fallback: string): string {
    const detail = err?.error?.detail || err?.error?.title;
    if (detail) return detail;
    if (err?.status === 0) return 'Falha de conexão com o servidor.';
    if (err?.status) return `${fallback} (HTTP ${err.status}).`;
    return fallback;
  }
}
