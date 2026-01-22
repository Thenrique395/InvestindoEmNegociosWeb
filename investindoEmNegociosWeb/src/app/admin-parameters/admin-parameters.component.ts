import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminParametersService, CardBrandAdmin, PaymentMethodAdmin } from '../admin-parameters.service';

@Component({
  selector: 'app-admin-parameters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-parameters.component.html',
  styleUrls: ['./admin-parameters.component.scss']
})
export class AdminParametersComponent implements OnInit {
  cardBrands: CardBrandAdmin[] = [];
  paymentMethods: PaymentMethodAdmin[] = [];
  loading = false;
  error = '';
  savingKey = '';

  constructor(private adminParameters: AdminParametersService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.error = '';
    this.adminParameters.listCardBrands().subscribe({
      next: (brands) => (this.cardBrands = brands),
      error: () => {
        this.error = 'Não foi possível carregar as bandeiras.';
        this.loading = false;
      },
      complete: () => {
        this.adminParameters.listPaymentMethods().subscribe({
          next: (methods) => (this.paymentMethods = methods),
          error: () => (this.error = 'Não foi possível carregar as formas de pagamento.'),
          complete: () => (this.loading = false)
        });
      }
    });
  }

  toggleCardBrand(brand: CardBrandAdmin): void {
    const key = `brand-${brand.id}`;
    if (this.savingKey) return;
    this.savingKey = key;
    const next = !brand.isActive;
    brand.isActive = next;

    this.adminParameters.updateCardBrandStatus(brand.id, next).subscribe({
      next: (updated) => (brand.isActive = updated.isActive),
      error: () => {
        brand.isActive = !next;
        this.error = 'Erro ao atualizar a bandeira.';
      },
      complete: () => (this.savingKey = '')
    });
  }

  togglePaymentMethod(method: PaymentMethodAdmin): void {
    const key = `method-${method.id}`;
    if (this.savingKey) return;
    this.savingKey = key;
    const next = !method.isActive;
    method.isActive = next;

    this.adminParameters.updatePaymentMethodStatus(method.id, next).subscribe({
      next: (updated) => (method.isActive = updated.isActive),
      error: () => {
        method.isActive = !next;
        this.error = 'Erro ao atualizar a forma de pagamento.';
      },
      complete: () => (this.savingKey = '')
    });
  }
}
