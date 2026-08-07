import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountRequest, AccountType } from '../../accounts.service';
import { accountTypeLabel } from '../onboarding.helpers';

export interface InitialIncomeSummary {
  source: string;
  amount: number;
  receivedOn: string;
}

export interface InitialExpenseSummary {
  name: string;
  amount: number;
  dueDate: string;
  categoryId?: string | null;
}

/**
 * Passo 4 do onboarding: conta principal + primeiros lançamentos (opcionais).
 * Presentacional — recebe o estado da conta/lançamentos e emite as ações. Os
 * modais de receita/despesa continuam no OnboardingComponent (acionados via
 * openIncome/openExpense). accountForm é compartilhado por referência (ngModel).
 */
@Component({
  selector: 'app-onboarding-account-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: contents; }'],
  template: `
    <div class="onboarding-step-shell">
      <section class="onboarding-panel">
        <div class="onboarding-panel__header">
          <strong>Sua conta principal</strong>
          <span>Crie a conta que será usada como base para acompanhar saldo, receitas e despesas.</span>
        </div>
        @if (!accountReady()) {
          <div class="onboarding-form-grid onboarding-form-grid--three">
            <label class="onboarding-field">
              <span>Nome da conta</span>
              <input type="text" [(ngModel)]="accountForm().name" placeholder="Ex.: Nubank" />
            </label>
            <label class="onboarding-field">
              <span>Tipo</span>
              <select [(ngModel)]="accountForm().type">
                @for (t of accountTypes(); track t) {
                  <option [value]="t">{{ accountTypeLabel(t) }}</option>
                }
              </select>
            </label>
            <label class="onboarding-field">
              <span>Saldo inicial</span>
              <input type="number" step="0.01" [(ngModel)]="accountForm().initialBalance" />
            </label>
          </div>
        }
        @if (accountReady()) {
          <div class="onboarding-status onboarding-status--success">
            <span class="onboarding-status__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8" />
                <path d="M8.7 12.4 11 14.7l4.6-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="onboarding-status__content">Conta principal criada. Agora você já pode registrar os primeiros lançamentos.</span>
          </div>
        }
      </section>
      @if (showContextPanels()) {
        <div class="onboarding-split onboarding-split--narrow">
          <section class="onboarding-panel">
            <div class="onboarding-panel__header">
              <strong>Por que isso importa</strong>
              <span>A conta principal ativa a base operacional do sistema e melhora a leitura do saldo real.</span>
            </div>
            <div class="onboarding-bullet-list">
              <div class="onboarding-bullet">Permite registrar receitas e despesas com impacto real no caixa.</div>
              <div class="onboarding-bullet">Dá contexto para análises futuras sem depender de ajustes manuais.</div>
              <div class="onboarding-bullet">Cria uma base mínima consistente para o dashboard e os relatórios.</div>
            </div>
          </section>
          <section class="onboarding-panel">
            <div class="onboarding-panel__header">
              <strong>Pronto para avançar</strong>
              <span>Depois da conta criada, seguimos para receita e despesa inicial.</span>
            </div>
          </section>
        </div>
      }
      <section class="onboarding-panel">
        <div class="onboarding-panel__header">
          <strong>Primeiros lançamentos (opcional)</strong>
          <span>Adicione uma receita e uma despesa para o dashboard já começar refletindo sua realidade — mas você pode fazer isso depois.</span>
        </div>
        <div class="onboarding-entry-grid">
          <article
            class="onboarding-entry-card"
            [class.onboarding-entry-card--done]="hasInitialIncome()"
            [class.onboarding-entry-card--pending]="!hasInitialIncome()">
            <div class="onboarding-entry-card__header">
              <div class="onboarding-entry-card__header-main">
                <span class="onboarding-entry-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <path d="M5 18h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    <path d="M7.5 15.5 11 12l2.6 2.6L18.5 9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M16 9.5h2.5V12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
                <strong>Receita inicial</strong>
              </div>
              <div class="onboarding-entry-card__header-meta">
                <span class="onboarding-entry-card__status">{{ hasInitialIncome() ? 'Configurada' : 'Opcional' }}</span>
                <span class="onboarding-entry-card__tooltip-anchor">
                  <span class="onboarding-entry-card__tooltip-trigger" tabindex="0" aria-label="Registre uma entrada real do mês, como salário, comissão ou recebimento recorrente.">?</span>
                  <span class="onboarding-entry-card__tooltip">Registre uma entrada real do mês, como salário, comissão ou recebimento recorrente.</span>
                </span>
              </div>
            </div>
            @if (!hasInitialIncome()) {
              <p>Nenhuma receita registrada ainda.</p>
            }
            @if (hasInitialIncome()) {
              <p class="onboarding-entry-card__summary">
                {{ initialIncome().source }} • {{ initialIncome().amount | currency:'BRL':'symbol':'1.2-2':'pt-BR' }} • {{ initialIncome().receivedOn }}
              </p>
            }
            <button class="btn-primary onboarding-btn onboarding-btn--inline" type="button" (click)="openIncome.emit()">
              {{ hasInitialIncome() ? 'Editar receita inicial' : 'Adicionar receita' }}
            </button>
          </article>
          <article
            class="onboarding-entry-card onboarding-entry-card--expense"
            [class.onboarding-entry-card--done]="hasInitialExpense()"
            [class.onboarding-entry-card--pending]="!hasInitialExpense()">
            <div class="onboarding-entry-card__header">
              <div class="onboarding-entry-card__header-main">
                <span class="onboarding-entry-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <path d="M5 18h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    <path d="M7 8.5h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    <path d="M15.5 11 12 14.5 8.5 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
                <strong>Despesa inicial</strong>
              </div>
              <div class="onboarding-entry-card__header-meta">
                <span class="onboarding-entry-card__status">{{ hasInitialExpense() ? 'Registrada' : 'Opcional' }}</span>
                <span class="onboarding-entry-card__tooltip-anchor">
                  <span class="onboarding-entry-card__tooltip-trigger" tabindex="0" aria-label="Registre uma saída que já faz parte da sua rotina, como aluguel, assinatura ou conta fixa.">?</span>
                  <span class="onboarding-entry-card__tooltip">Registre uma saída que já faz parte da sua rotina, como aluguel, assinatura ou conta fixa.</span>
                </span>
              </div>
            </div>
            @if (!hasInitialExpense()) {
              <p>Nenhuma despesa registrada ainda.</p>
            }
            @if (hasInitialExpense()) {
              <p class="onboarding-entry-card__summary">
                {{ initialExpense().name }} • {{ initialExpense().amount | currency:'BRL':'symbol':'1.2-2':'pt-BR' }} • {{ initialExpense().dueDate }}
              </p>
            }
            <button class="btn-primary onboarding-btn onboarding-btn--inline" type="button" (click)="openExpense.emit()">
              {{ hasInitialExpense() ? 'Editar despesa inicial' : 'Adicionar despesa' }}
            </button>
          </article>
          @if (canUseCards()) {
            <article
              class="onboarding-entry-card onboarding-entry-card--optional"
              [class.onboarding-entry-card--done]="hasInitialCard()">
              <div class="onboarding-entry-card__header">
                <div class="onboarding-entry-card__header-main">
                  <span class="onboarding-entry-card__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                      <rect x="4" y="7" width="16" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
                      <path d="M4 10.5h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  </span>
                  <strong>Cartão (opcional)</strong>
                </div>
                <div class="onboarding-entry-card__header-meta">
                  <span class="onboarding-entry-card__status">{{ hasInitialCard() ? 'Configurado' : 'Opcional' }}</span>
                  <span class="onboarding-entry-card__tooltip-anchor">
                    <span class="onboarding-entry-card__tooltip-trigger" tabindex="0" aria-label="Cadastre quando quiser acompanhar compras no crédito.">?</span>
                    <span class="onboarding-entry-card__tooltip">Cadastre quando quiser acompanhar compras no crédito.</span>
                  </span>
                </div>
              </div>
              @if (!hasInitialCard()) {
                <p>Nenhum cartão cadastrado.</p>
              }
              @if (hasInitialCard()) {
                <p>{{ cardsCount() }} cartão(ões) cadastrado(s).</p>
              }
              <small>Você pode concluir sem cartão. Cadastre um depois se quiser lançar compras no crédito.</small>
              <button class="ghost onboarding-btn onboarding-btn--inline" type="button" (click)="openCards.emit()">
                {{ hasInitialCard() ? 'Gerenciar cartões' : 'Cadastrar cartão agora' }}
              </button>
            </article>
          }
        </div>
      </section>
      <div class="onboarding-actions onboarding-actions--footer">
        <div class="onboarding-actions__meta">
          <strong>Último passo</strong>
          <span>Basta ter sua conta principal para concluir. Os primeiros lançamentos são opcionais — adicione agora ou depois.</span>
          @if (showValidationMessage()) {
            <span class="onboarding-actions__validation">{{ validationMessage() }}</span>
          }
        </div>
        <div class="onboarding-actions__group onboarding-actions__group--footer">
          <button class="ghost onboarding-btn onboarding-btn--secondary" type="button" (click)="back.emit()">Voltar</button>
          @if (!accountReady()) {
            <button class="ghost onboarding-btn" type="button" [disabled]="creatingAccount()" (click)="createAccount.emit()">
              {{ creatingAccount() ? 'Criando conta...' : 'Criar conta' }}
            </button>
          }
          <button class="btn-primary onboarding-btn onboarding-btn--primary onboarding-btn--confirm" type="button" [disabled]="savingEntries()" (click)="finish.emit()">
            {{ savingEntries() ? 'Salvando...' : 'Concluir onboarding' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class AccountStepComponent {
  readonly accountReady = input.required<boolean>();
  readonly accountForm = input.required<AccountRequest>();
  readonly accountTypes = input.required<AccountType[]>();
  readonly showContextPanels = input.required<boolean>();
  readonly hasInitialIncome = input.required<boolean>();
  readonly initialIncome = input.required<InitialIncomeSummary>();
  readonly hasInitialExpense = input.required<boolean>();
  readonly initialExpense = input.required<InitialExpenseSummary>();
  readonly canUseCards = input.required<boolean>();
  readonly hasInitialCard = input.required<boolean>();
  readonly cardsCount = input.required<number>();
  readonly showValidationMessage = input.required<boolean>();
  readonly validationMessage = input.required<string>();
  readonly creatingAccount = input.required<boolean>();
  readonly savingEntries = input.required<boolean>();

  readonly back = output<void>();
  readonly createAccount = output<void>();
  readonly finish = output<void>();
  readonly openIncome = output<void>();
  readonly openExpense = output<void>();
  readonly openCards = output<void>();

  accountTypeLabel(type: AccountType): string {
    return accountTypeLabel(type);
  }
}
