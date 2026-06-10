import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinancialAssistantChatResponse, FinancialAssistantPromptContextResponse, FinancialAssistantService } from '../financial-assistant.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, AppCurrencyPipe],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.scss'
})
export class AssistantComponent implements OnInit {
  context: FinancialAssistantPromptContextResponse | null = null;
  conversation: FinancialAssistantChatResponse[] = [];
  question = '';
  loading = false;
  sending = false;
  error = '';

  constructor(private readonly assistantService: FinancialAssistantService) {}

  ngOnInit(): void {
    this.loading = true;
    this.assistantService.context().subscribe({
      next: (context) => {
        this.context = context;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao carregar contexto do assistente.';
        this.loading = false;
      }
    });
  }

  send(): void {
    if (!this.question.trim()) return;
    this.sending = true;
    this.error = '';
    this.assistantService.chat(this.question).subscribe({
      next: (response) => {
        this.conversation = [...this.conversation, response];
        this.context = response.context;
        this.question = '';
        this.sending = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao conversar com o assistente.';
        this.sending = false;
      }
    });
  }
}
