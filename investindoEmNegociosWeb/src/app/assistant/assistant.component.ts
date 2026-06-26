import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FinancialAssistantPromptContextResponse, FinancialAssistantService } from '../financial-assistant.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { StatCardComponent } from '../shared/stat-card/stat-card.component';
import { PeriodHeroComponent } from '../shared/period-hero/period-hero.component';
import { PeriodActionCardComponent } from '../shared/period-action-card/period-action-card.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, AppCurrencyPipe, StatCardComponent, PeriodHeroComponent, PeriodActionCardComponent],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssistantComponent implements OnInit {
  context: FinancialAssistantPromptContextResponse | null = null;
  question = '';
  loading = false;
  sending = false;
  error = '';

  get conversation() {
    return this.assistantService.conversation;
  }

  constructor(
    private readonly assistantService: FinancialAssistantService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.assistantService.context().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (context) => {
        this.context = context;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = extractApiErrorMessage(err, 'Falha ao carregar contexto do assistente.');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  send(): void {
    if (!this.question.trim()) return;
    this.sending = true;
    this.error = '';
    this.assistantService.chat(this.question).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.assistantService.addMessage(response);
        this.context = response.context;
        this.question = '';
        this.sending = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = extractApiErrorMessage(err, 'Falha ao conversar com o assistente.');
        this.sending = false;
        this.cdr.markForCheck();
      }
    });
  }
}
