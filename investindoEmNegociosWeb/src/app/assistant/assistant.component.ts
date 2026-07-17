import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FinancialAssistantPromptContextResponse, FinancialAssistantService } from '../financial-assistant.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent, TransactionSummaryTone } from '../shared/transactions/transaction-summary-card.component';
import { SectionCardComponent } from '../shared/section-card/section-card.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { assistantRiskTone } from './assistant-context.model';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppCurrencyPipe,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    SectionCardComponent,
    UiStateComponent
  ],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssistantComponent implements OnInit {
  // Estado por signal (A9): context/loading/sending/error e o campo question (resetado
  // no callback assíncrono do chat) vêm de respostas HTTP fora da zona.
  readonly context = signal<FinancialAssistantPromptContextResponse | null>(null);
  readonly question = signal('');
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal('');

  get conversation() {
    return this.assistantService.conversation;
  }

  get riskTone(): TransactionSummaryTone {
    return assistantRiskTone(this.context()?.risk?.score ?? 0);
  }

  constructor(
    private readonly assistantService: FinancialAssistantService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.assistantService.context().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (context) => {
        this.context.set(context);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar contexto do assistente.'));
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  send(): void {
    const question = this.question().trim();
    if (!question) return;
    this.sending.set(true);
    this.error.set('');
    this.assistantService.chat(question).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.assistantService.addMessage(response);
        this.context.set(response.context);
        this.question.set('');
        this.sending.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'Falha ao conversar com o assistente.'));
        this.sending.set(false);
        this.cdr.markForCheck();
      }
    });
  }
}
