import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoansService, LoanContractRequest, LoanContractResponse, LoanSimulationResponse } from '../loans.service';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loans.component.html',
  styleUrl: './loans.component.scss'
})
export class LoansComponent implements OnInit {
  contracts: LoanContractResponse[] = [];
  simulation: LoanSimulationResponse | null = null;
  loading = false;
  saving = false;
  error = '';
  success = '';

  form: LoanContractRequest = {
    title: 'Empréstimo pessoal',
    principalAmount: 10000,
    annualInterestRate: 18,
    termMonths: 24,
    amortizationType: 'Price',
    startDate: new Date().toISOString().slice(0, 10),
    paymentDay: 10
  };

  constructor(private readonly loansService: LoansService) {}

  ngOnInit(): void {
    this.load();
  }

  get totalOpenBalance(): number {
    return this.contracts.reduce((total, contract) => total + Number(contract.openBalance || 0), 0);
  }

  get totalMonthlyPayment(): number {
    return this.contracts.reduce((total, contract) => total + Number(contract.monthlyPayment || 0), 0);
  }

  get totalOpenInstallments(): number {
    return this.contracts.reduce((total, contract) => total + Number(contract.openInstallments || 0), 0);
  }

  load(): void {
    this.loading = true;
    this.loansService.list().subscribe({
      next: (items) => {
        this.contracts = items;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao carregar empréstimos.';
        this.loading = false;
      }
    });
  }

  simulate(): void {
    this.error = '';
    this.success = '';
    this.loansService.simulate(this.form).subscribe({
      next: (result) => (this.simulation = result),
      error: (err) => (this.error = err?.error?.detail || 'Falha ao simular empréstimo.')
    });
  }

  create(): void {
    this.error = '';
    this.success = '';
    this.saving = true;
    this.loansService.create(this.form).subscribe({
      next: (contract) => {
        this.contracts = [contract, ...this.contracts];
        this.simulation = null;
        this.success = 'Empréstimo criado com cronograma calculado.';
        this.saving = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao criar empréstimo.';
        this.saving = false;
      }
    });
  }
}
