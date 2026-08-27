import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { InvoiceImportService, InvoiceReconciliationResponse } from '../invoice-import.service';
import { FormsModule } from '@angular/forms';
import { StoredCard } from '../data/api-data.service';
import { CategoryDto } from '../categories.service';
import { extractApiErrorMessage } from '../utils/api-error.utils';

type InvoiceItem = {
  date?: string;
  description: string;
  amount?: string;
  isInstallment?: boolean;
  installmentCurrent?: number;
  installmentTotal?: number;
  baseDescription?: string;
  categoryId?: string | null;
  suggestedCategoryId?: string | null;
  suggestedCategoryName?: string | null;
  suggestedCategoryConfidence?: number | null;
  suggestedCategoryScore?: number | null;
  suggestedCategoryConfidenceBand?: string | null;
  suggestedCategoryReasonCode?: string | null;
  suggestedRecurrence?: {
    isRecurringCandidate?: boolean;
    frequency?: string | null;
    score?: number | null;
    confidenceBand?: string | null;
    reasonCode?: string | null;
    evidenceLabel?: string | null;
  } | null;
};

type InvoiceExtract = {
  total?: string;
  dueDate?: string;
  closeDate?: string;
  cardName?: string;
  bankName?: string;
  totalDebitsBrazil?: string;
  currentBalance?: string;
  items: InvoiceItem[];
};

@Component({
  selector: 'app-invoice-import',
  standalone: true,
  imports: [FormsModule],
  providers: [InvoiceImportService],
  template: `
    @if (open) {
      <div class="invoice-import-modal">
        <div class="invoice-import-modal__backdrop" (click)="close.emit()"></div>
        <div class="invoice-import-modal__dialog">
          <header class="invoice-import-modal__header">
            <div class="invoice-import-modal__header-copy">
              <p class="invoice-import-modal__eyebrow">Fatura do cartao</p>
              <h2 class="invoice-import-modal__title">Importar fatura em PDF</h2>
              <p class="invoice-import-modal__subtitle">
                Envie a fatura para extrair lancamentos, validar os dados e salvar com o cartao correto.
              </p>
            </div>
            <button type="button" class="invoice-import-modal__close" (click)="close.emit()" aria-label="Fechar modal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M6 6 18 18"></path>
                <path d="M18 6 6 18"></path>
              </svg>
            </button>
          </header>
          <div class="invoice-import-modal__layout">
            <section class="invoice-import-modal__main">
              <section class="invoice-import-modal__section">
                <div class="invoice-import-modal__section-head">
                  <div>
                    <h3 class="invoice-import-modal__section-title">Arquivo da fatura</h3>
                    <p class="invoice-import-modal__section-text">
                      Selecione um PDF para extrair total, datas, itens e sugerir categorias.
                    </p>
                  </div>
                  <input #pdfInput type="file" accept="application/pdf" class="invoice-import-modal__file-input" (change)="onFileSelected($event)" />
                  <div class="invoice-import-modal__actions-inline">
                    <button
                      type="button"
                      class="invoice-import-modal__button invoice-import-modal__button--primary invoice-import-modal__button--upload"
                      (click)="pdfInput.click()">
                      Escolher arquivo
                    </button>
                    <button type="button" class="invoice-import-modal__button invoice-import-modal__button--ghost" (click)="clear()" [disabled]="loading">
                      Limpar
                    </button>
                  </div>
                </div>
                <div class="invoice-import-dropzone" [class.invoice-import-dropzone--error]="!!error">
                  <p class="invoice-import-dropzone__title">{{ fileName || 'Nenhum arquivo selecionado' }}</p>
                  @if (loading) {
                    <p class="invoice-import-dropzone__text">Enviando e processando o PDF...</p>
                  }
                  @if (error) {
                    <p class="invoice-import-dropzone__error">{{ error }}</p>
                  }
                  @if (!loading && !error) {
                    <p class="invoice-import-dropzone__text">Formatos suportados: PDF · Limite de 15MB</p>
                  }
                </div>
              </section>
              <section class="invoice-import-modal__section">
                <div class="invoice-import-modal__section-head">
                  <div>
                    <h3 class="invoice-import-modal__section-title">Destino e leitura inicial</h3>
                    <p class="invoice-import-modal__section-text">
                      Defina o cartao de destino e revise as informacoes extraidas antes de salvar.
                    </p>
                  </div>
                </div>
                <div class="invoice-import-grid invoice-import-grid--selectors">
                  <label class="invoice-field">
                    <span class="invoice-field__label">Cartao destino</span>
                    <select class="invoice-field__control" [(ngModel)]="selectedCardId" (ngModelChange)="onCardChanged()">
                      <option [ngValue]="null">Selecione</option>
                      @for (card of cards; track trackByCardId($index, card)) {
                        <option [ngValue]="card.id">
                          {{ card.nome }} · {{ card.numero }}
                        </option>
                      }
                    </select>
                  </label>
                  <label class="invoice-field">
                    <span class="invoice-field__label">Categoria padrao</span>
                    <select class="invoice-field__control" [(ngModel)]="selectedCategoryId">
                      <option [ngValue]="null">Sem categoria</option>
                      @for (category of categories; track trackByCategoryId($index, category)) {
                        <option [ngValue]="category.id">
                          {{ category.name }}
                        </option>
                      }
                    </select>
                  </label>
                </div>
                <div class="invoice-import-grid invoice-import-grid--summary">
                  <div class="invoice-summary-card">
                    <p class="invoice-summary-card__label">Total</p>
                    <p class="invoice-summary-card__value">{{ extract.total || 'Nao identificado' }}</p>
                  </div>
                  <div class="invoice-summary-card">
                    <p class="invoice-summary-card__label">Vencimento</p>
                    <p class="invoice-summary-card__value">{{ extract.dueDate || 'Nao identificado' }}</p>
                  </div>
                  <div class="invoice-summary-card">
                    <p class="invoice-summary-card__label">Fechamento</p>
                    <p class="invoice-summary-card__value">{{ extract.closeDate || 'Nao identificado' }}</p>
                  </div>
                  <div class="invoice-summary-card">
                    <p class="invoice-summary-card__label">Cartao / Banco</p>
                    <p class="invoice-summary-card__value invoice-summary-card__value--small">
                      {{ extract.cardName || 'Cartao' }} · {{ extract.bankName || 'Banco' }}
                    </p>
                  </div>
                </div>
              </section>
              <section class="invoice-import-modal__section">
                <div class="invoice-import-modal__section-head">
                  <div>
                    <h3 class="invoice-import-modal__section-title">Itens encontrados</h3>
                    <p class="invoice-import-modal__section-text">
                      Revise a data, parcela, categoria e recorrencia antes de importar.
                    </p>
                  </div>
                  <span class="invoice-import-modal__meta">{{ extract.items.length }} item(s)</span>
                </div>
                <div class="invoice-table-card">
                  <div class="invoice-table-card__scroll">
                    <table class="invoice-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Descricao</th>
                          <th>Parcela</th>
                          <th>Categoria</th>
                          <th>Recorrencia</th>
                          <th class="invoice-table__numeric">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        @if (!extract.items.length) {
                          <tr>
                            <td colspan="6" class="invoice-table__empty">Nenhum item identificado.</td>
                          </tr>
                        }
                        @for (item of extract.items; track trackByIndex($index, item)) {
                          <tr>
                            <td>{{ item.date || '-' }}</td>
                            <td>{{ item.baseDescription || item.description }}</td>
                            <td>
                              @if (item.isInstallment && item.installmentCurrent && item.installmentTotal) {
                                <span>
                                  {{ item.installmentCurrent }}/{{ item.installmentTotal }}
                                </span>
                              } @else {
                                -
                              }
                            </td>
                            <td>
                              <select class="invoice-field__control invoice-field__control--table" [(ngModel)]="item.categoryId">
                                <option [ngValue]="null">Sem categoria</option>
                                @for (category of categories; track trackByCategoryId($index, category)) {
                                  <option [ngValue]="category.id">
                                    {{ category.name }}
                                  </option>
                                }
                              </select>
                              @if (item.suggestedCategoryName) {
                                <small class="invoice-table__hint">
                                  Sugestao: {{ item.suggestedCategoryName }} · {{ confidenceLabel(item.suggestedCategoryScore, item.suggestedCategoryConfidenceBand, item.suggestedCategoryConfidence) }}
                                </small>
                              }
                            </td>
                            <td>
                              @if (item.suggestedRecurrence?.isRecurringCandidate) {
                                <span>
                                  {{ recurrenceLabel(item.suggestedRecurrence?.frequency) }}
                                  <small class="invoice-table__hint">
                                    {{ recurrenceScoreLabel(item.suggestedRecurrence?.score, item.suggestedRecurrence?.confidenceBand) }}
                                  </small>
                                </span>
                              } @else {
                                -
                              }
                            </td>
                            <td class="invoice-table__numeric">{{ item.amount || '-' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  <p class="invoice-table-card__footnote">
                    Dica: se algum valor nao for encontrado, voce pode ajustar manualmente antes de salvar.
                  </p>
                </div>
              </section>
              @if (extract.items.length) {
                <section class="invoice-import-modal__section">
                  <div class="invoice-import-modal__section-head">
                    <div>
                      <h3 class="invoice-import-modal__section-title">Conciliação da fatura</h3>
                      <p class="invoice-import-modal__section-text">
                        Compare os itens novos com ciclos existentes do cartao antes de consolidar a importacao.
                      </p>
                    </div>
                    @if (reconciling) {
                      <span class="invoice-import-modal__meta">Recalculando...</span>
                    }
                  </div>
                  @if (reconciliation && !reconciling) {
                    <p class="invoice-import-modal__context-line">
                      {{ reconciliation.newItems }} novo(s), {{ reconciliation.duplicateItems }} duplicado(s), {{ reconciliation.cycles.length }} ciclo(s) afetado(s).
                    </p>
                  }
                  @if (reconciliation?.cycles?.length) {
                    <div class="invoice-table-card">
                      <div class="invoice-table-card__scroll">
                        <table class="invoice-table">
                          <thead>
                            <tr>
                              <th>Fatura</th>
                              <th>Fech.</th>
                              <th>Venc.</th>
                              <th class="invoice-table__numeric">Atual</th>
                              <th class="invoice-table__numeric">Novos</th>
                              <th class="invoice-table__numeric">Duplicados</th>
                              <th class="invoice-table__numeric">Projetado</th>
                              <th class="invoice-table__numeric">Diferenca</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (cycle of reconciliation?.cycles || []; track trackByStatementReference($index, cycle)) {
                              <tr>
                                <td>{{ cycle.statementReference }}</td>
                                <td>{{ cycle.statementCloseDate }}</td>
                                <td>{{ cycle.statementDueDate }}</td>
                                <td class="invoice-table__numeric">{{ formatMoney(cycle.currentTotalAmount) }}</td>
                                <td class="invoice-table__numeric">{{ formatMoney(cycle.importedNewAmount) }}</td>
                                <td class="invoice-table__numeric">{{ formatMoney(cycle.duplicateAmount) }}</td>
                                <td class="invoice-table__numeric">{{ formatMoney(cycle.projectedTotalAmount) }}</td>
                                <td class="invoice-table__numeric">{{ cycle.differenceAmount == null ? '-' : formatMoney(cycle.differenceAmount) }}</td>
                                <td>
                                  @if (cycle.readyToClose) {
                                    <span>Pronto para fechamento automatico</span>
                                  } @else {
                                    {{ cycle.duplicateItemsCount ? 'Revisar duplicados' : 'Conciliação parcial' }}
                                  }
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  } @else {
                    <div class="invoice-import-note">
                      {{ reconciling ? 'Calculando conciliação...' : 'Selecione um cartao e mantenha itens válidos para ver o fechamento por ciclo.' }}
                    </div>
                  }
                </section>
              }
            </section>
            <aside class="invoice-import-modal__sidebar">
              <section class="invoice-import-modal__sidecard">
                <h3 class="invoice-import-modal__section-title">Texto extraido</h3>
                <p class="invoice-import-modal__section-text">Use este painel para conferir se os dados batem com a fatura original.</p>
                <div class="invoice-import-modal__rawtext">
                  <pre>{{ rawText || 'Nenhum texto extraido.' }}</pre>
                </div>
              </section>
            </aside>
          </div>
          <footer class="invoice-import-modal__footer">
            <div class="invoice-import-modal__footer-copy">
              <p class="invoice-import-modal__footer-title">Revisao final</p>
              <p class="invoice-import-modal__footer-text">Confirme o cartao, ajuste categorias se necessario e salve a fatura para registrar os itens.</p>
            </div>
            <div class="invoice-import-modal__footer-actions">
              <button type="button" class="invoice-import-modal__button invoice-import-modal__button--ghost" (click)="close.emit()">Fechar</button>
              <button type="button" class="invoice-import-modal__button invoice-import-modal__button--primary" (click)="salvarImportacao()" [disabled]="!canImport || importing">
                {{ importing ? 'Importando...' : 'Salvar fatura' }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    }
    `,
  styles: [`
    .invoice-import-modal {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .invoice-import-modal__backdrop {
      position: absolute;
      inset: 0;
      background: rgb(15 23 42 / 0.6);
      backdrop-filter: blur(8px);
    }

    .invoice-import-modal__dialog {
      position: relative;
      width: min(1120px, 100%);
      max-height: min(92vh, 1100px);
      overflow: auto;
      font-family: var(--font-body, "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
      border-radius: var(--radius-panel);
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: var(--shadow-modal);
    }

    .invoice-import-modal__header {
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      padding: 2rem 2rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .invoice-import-modal__header-copy {
      display: grid;
      gap: 0.6rem;
    }

    .invoice-import-modal__eyebrow {
      margin: 0;
      font-size: var(--fs-meta);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-eyebrow);
      text-transform: uppercase;
      color: var(--text-soft);
    }

    .invoice-import-modal__title {
      margin: 0;
      font-size: clamp(2rem, 2.5vw, 2.7rem);
      line-height: var(--lh-display);
      letter-spacing: var(--ls-tight);
      font-weight: var(--fw-bold);
      color: var(--text);
    }

    .invoice-import-modal__subtitle {
      max-width: 58ch;
      margin: 0;
      font-size: var(--fs-subhead);
      line-height: var(--lh-body);
      color: var(--text-tertiary);
    }

    .invoice-import-modal__close {
      width: 54px;
      height: 54px;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-soft);
      transition: transform .18s ease, border-color .18s ease, color .18s ease, background-color .18s ease;
    }

    .invoice-import-modal__close:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--brand) 20%, var(--border));
      color: var(--brand);
      background: color-mix(in srgb, var(--brand) 5%, white);
    }

    .invoice-import-modal__close svg {
      width: 20px;
      height: 20px;
    }

    .invoice-import-modal__layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 1.5rem;
      padding: 1.5rem 2rem 0;
    }

    .invoice-import-modal__main {
      display: grid;
      gap: 1rem;
    }

    .invoice-import-modal__sidebar {
      display: block;
    }

    .invoice-import-modal__section,
    .invoice-import-modal__sidecard {
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      background: linear-gradient(180deg, color-mix(in srgb, var(--brand) 3%, white), var(--surface));
      padding: 1.25rem;
    }

    .invoice-import-modal__section-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    .invoice-import-modal__section-head > :first-child {
      flex: 1 1 320px;
    }

    .invoice-import-modal__section-title {
      margin: 0;
      font-size: var(--fs-card-title);
      font-weight: var(--fw-bold);
      color: var(--text);
    }

    .invoice-import-modal__section-text {
      margin: 0.35rem 0 0;
      font-size: var(--fs-body);
      line-height: var(--lh-body);
      color: var(--text-tertiary);
    }

    .invoice-import-modal__actions-inline {
      display: flex;
      flex: 0 0 auto;
      flex-wrap: nowrap;
      gap: 0.75rem;
      align-items: center;
      justify-content: flex-end;
    }

    .invoice-import-modal__button {
      border: 1px solid transparent;
      min-height: 48px;
      padding: 0 1.15rem;
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-family: inherit;
      font-size: var(--fs-body);
      font-weight: var(--fw-bold);
      line-height: var(--lh-display);
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background-color .18s ease;
    }

    .invoice-import-modal__button:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .invoice-import-modal__button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .invoice-import-modal__button--primary {
      color: #fff;
      background: linear-gradient(135deg, var(--primary), var(--primary-text));
      box-shadow: 0 18px 30px rgb(37 99 235 / 0.22);
    }

    .invoice-import-modal__button--ghost {
      border: 1px solid color-mix(in srgb, var(--brand) 12%, var(--border));
      background: color-mix(in srgb, var(--brand) 4%, white);
      color: var(--text);
    }

    .invoice-import-modal__button--upload {
      min-width: 188px;
    }

    .invoice-import-modal__file-input {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .invoice-import-dropzone {
      border: 1px dashed color-mix(in srgb, var(--brand) 16%, var(--border));
      border-radius: var(--radius-panel);
      background: var(--surface);
      padding: 2rem 1.25rem;
      text-align: center;
    }

    .invoice-import-dropzone--error {
      border-color: color-mix(in srgb, var(--expense) 35%, var(--border));
      background: color-mix(in srgb, var(--expense) 5%, white);
    }

    .invoice-import-dropzone__title {
      margin: 0;
      font-size: var(--fs-subhead);
      font-weight: var(--fw-bold);
      color: var(--text);
    }

    .invoice-import-dropzone__text,
    .invoice-import-dropzone__error {
      margin: 0.45rem 0 0;
      font-size: var(--fs-body);
      color: var(--text-tertiary);
    }

    .invoice-import-dropzone__error {
      color: var(--expense-text);
    }

    .invoice-import-grid {
      display: grid;
      gap: 1rem;
    }

    .invoice-import-grid--selectors,
    .invoice-import-grid--summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .invoice-field,
    .invoice-summary-card {
      display: grid;
      gap: 0.55rem;
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      background: var(--surface);
    }

    .invoice-field__label,
    .invoice-summary-card__label {
      margin: 0;
      font-size: var(--fs-meta);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-eyebrow);
      text-transform: uppercase;
      color: var(--text-soft);
    }

    .invoice-field__control {
      min-height: 56px;
      width: 100%;
      border-radius: var(--radius-inner);
      padding: 0 1rem;
      font-size: var(--fs-subhead);
      font-weight: var(--fw-semibold);
    }

    .invoice-field__control--table {
      min-height: 38px;
      border-radius: var(--radius-control);
      font-size: var(--fs-meta);
      padding: 0 0.75rem;
      background: var(--surface);
    }

    .invoice-summary-card__value {
      margin: 0;
      font-size: var(--fs-modal-title);
      line-height: var(--lh-display);
      font-weight: var(--fw-bold);
      color: var(--text);
    }

    .invoice-summary-card__value--small {
      font-size: var(--fs-subhead);
      line-height: var(--lh-body);
    }

    .invoice-table-card {
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      background: var(--surface);
      overflow: hidden;
    }

    .invoice-table-card__scroll {
      max-height: 320px;
      overflow: auto;
    }

    .invoice-table-card__footnote {
      margin: 0;
      padding: 0.9rem 1rem 1rem;
      font-size: var(--fs-meta);
      color: var(--text-tertiary);
      border-top: 1px solid var(--border);
    }

    .invoice-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      text-align: left;
    }

    .invoice-table thead {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--surface-sunken);
    }

    .invoice-table th {
      padding: 0.9rem 1rem;
      font-size: var(--fs-meta);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-column);
      text-transform: uppercase;
      color: var(--text-soft);
      white-space: nowrap;
    }

    .invoice-table td {
      padding: 0.95rem 1rem;
      font-size: var(--fs-body);
      line-height: var(--lh-body);
      color: var(--text);
      vertical-align: top;
      border-top: 1px solid var(--border);
    }

    .invoice-table__numeric {
      text-align: right;
      white-space: nowrap;
    }

    .invoice-table__hint {
      display: block;
      margin-top: 0.35rem;
      font-size: var(--fs-caption);
      color: var(--text-tertiary);
    }

    .invoice-table__empty {
      color: var(--text-tertiary);
      text-align: center;
      padding: 1.25rem 1rem;
    }

    .invoice-import-modal__meta,
    .invoice-import-modal__context-line,
    .invoice-import-note {
      font-size: var(--fs-meta);
      line-height: var(--lh-body);
      color: var(--text-tertiary);
    }

    .invoice-import-modal__rawtext {
      margin-top: 1rem;
      max-height: 540px;
      overflow: auto;
      border-radius: var(--radius-panel);
      border: 1px solid var(--border);
      background: var(--surface-sunken);
      padding: 1rem;
    }

    .invoice-import-modal__rawtext pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: var(--fs-meta);
      line-height: var(--lh-body);
      color: var(--text);
    }

    .invoice-import-modal__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.5rem 2rem 2rem;
      border-top: 1px solid var(--border);
      margin-top: 1.5rem;
    }

    .invoice-import-modal__footer-copy {
      display: grid;
      gap: 0.35rem;
    }

    .invoice-import-modal__footer-title {
      margin: 0;
      font-size: var(--fs-subhead);
      font-weight: var(--fw-bold);
      color: var(--text);
    }

    .invoice-import-modal__footer-text {
      margin: 0;
      font-size: var(--fs-body);
      line-height: var(--lh-body);
      color: var(--text-tertiary);
      max-width: 52ch;
    }

    .invoice-import-modal__footer-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
    }




  `]
})
export class InvoiceImportComponent implements OnChanges {
  @Input() open = false;
  @Input() cards: StoredCard[] = [];
  @Input() categories: CategoryDto[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<{ created: number; skipped: number; failed: number }>();

  loading = false;
  importing = false;
  reconciling = false;
  error = '';
  fileName = '';
  selectedCardId: string | null = null;
  selectedCategoryId: string | null = null;
  rawText = '';
  extract: InvoiceExtract = { items: [] };
  reconciliation: InvoiceReconciliationResponse | null = null;

  constructor(private readonly invoiceImport: InvoiceImportService, private readonly destroyRef: DestroyRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cards'] && !this.selectedCardId && this.cards.length) {
      this.selectedCardId = this.cards[0].id;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const maxSize = 15 * 1024 * 1024;
    const isPdfType = file.type === 'application/pdf';
    const isPdfName = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfType && !isPdfName) {
      this.error = 'Formato nao suportado. Use um PDF.';
      input.value = '';
      return;
    }
    if (file.size > maxSize) {
      this.error = 'Arquivo muito grande. Limite de 15MB.';
      input.value = '';
      return;
    }
    this.fileName = file.name;
    this.error = '';
    this.loading = true;
    this.rawText = '';
    this.extract = { items: [] };

    this.invoiceImport.extract(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const displayTotal = this.resolveDisplayTotal(response.total, response.totalDebitsBrazil);
        this.extract = {
          total: displayTotal,
          dueDate: response.dueDate,
          closeDate: response.closeDate,
          cardName: response.cardName,
          bankName: response.bankName,
          totalDebitsBrazil: response.totalDebitsBrazil,
          currentBalance: response.currentBalance,
          items: (response.items || []).map((item) => ({
            ...item,
            categoryId: item.suggestedCategoryId ?? null
          }))
        };
        this.rawText = response.rawText || '';
        this.refreshReconciliation();
      },
      error: (err) => {
        this.error = extractApiErrorMessage(err, 'Nao foi possivel ler o PDF.');
      },
      complete: () => {
        this.loading = false;
        input.value = '';
      }
    });
  }

  clear(): void {
    this.fileName = '';
    this.rawText = '';
    this.error = '';
    this.importing = false;
    this.extract = { items: [] };
    this.reconciling = false;
    this.reconciliation = null;
  }

  get canImport(): boolean {
    return !!this.fileName && this.extract.items.length > 0 && !!this.selectedCardId;
  }

  salvarImportacao(): void {
    if (!this.canImport || this.importing) return;
    this.error = '';
    this.importing = true;
    this.invoiceImport
      .import({
        cardId: this.selectedCardId,
        categoryId: this.selectedCategoryId,
        defaultDueDate: this.extract.dueDate || null,
        statementCloseDate: this.extract.closeDate || null,
        invoiceTotal: this.extract.total || null,
        importIdempotencyKey: this.buildImportIdempotencyKey(),
        skipDuplicates: true,
        items: this.extract.items.map((item) => ({
          ...item,
          categoryId: item.categoryId || this.selectedCategoryId || item.suggestedCategoryId || null
        }))
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.imported.emit(result);
          this.clear();
          this.close.emit();
        },
        error: (err) => {
          this.error = extractApiErrorMessage(err, 'Falha ao salvar a fatura.');
        },
        complete: () => {
          this.importing = false;
        }
      });
  }

  private buildImportIdempotencyKey(): string {
    const normalizedItems = this.extract.items
      .map((item) => `${(item.baseDescription || item.description || '').trim().toUpperCase()}|${item.amount || ''}|${item.date || ''}`)
      .sort();
    return [
      this.selectedCardId || 'NO_CARD',
      this.selectedCategoryId || 'NO_CATEGORY',
      this.extract.dueDate || 'NO_DUE_DATE',
      ...normalizedItems
    ].join('::');
  }

  private resolveDisplayTotal(total?: string, totalDebitsBrazil?: string): string | undefined {
    if (!this.isZeroMoney(total)) return total;
    if (!this.isZeroMoney(totalDebitsBrazil)) return totalDebitsBrazil;
    return total;
  }

  private isZeroMoney(value?: string): boolean {
    if (!value) return true;
    const numeric = value
      .replace(/[^\d,-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = Number.parseFloat(numeric);
    return Number.isFinite(parsed) ? parsed === 0 : true;
  }

  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

  confidenceLabel(score?: number | null, band?: string | null, value?: number | null): string {
    const resolvedScore = score ?? (value == null ? null : Math.round(value * 100));
    const resolvedBand = band || (resolvedScore == null
      ? null
      : resolvedScore >= 95
        ? 'high'
        : resolvedScore >= 85
          ? 'medium'
          : 'low');
    if (resolvedScore == null) return '';
    if (resolvedBand === 'high') return `Alta (${resolvedScore}/100)`;
    if (resolvedBand === 'medium') return `Boa (${resolvedScore}/100)`;
    return `Inicial (${resolvedScore}/100)`;
  }

  recurrenceLabel(frequency?: string | null): string {
    if (!frequency) return 'Recorrente';
    if (frequency === 'Monthly') return 'Recorrente mensal';
    return `Recorrente ${frequency.toLowerCase()}`;
  }

  recurrenceScoreLabel(score?: number | null, band?: string | null): string {
    if (score == null) return '';
    if (band === 'high') return `Alta (${score}/100)`;
    if (band === 'medium') return `Boa (${score}/100)`;
    return `Inicial (${score}/100)`;
  }

  trackByCardId(_index: number, card: StoredCard): string {
    return card.id;
  }

  trackByCategoryId(_index: number, category: CategoryDto): string {
    return category.id;
  }

  trackByStatementReference(_index: number, cycle: { statementReference: string }): string {
    return cycle.statementReference;
  }

  onCardChanged(): void {
    this.refreshReconciliation();
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  private refreshReconciliation(): void {
    if (!this.selectedCardId || !this.extract.items.length) {
      this.reconciliation = null;
      this.reconciling = false;
      return;
    }

    this.reconciling = true;
    this.invoiceImport.reconcile({
      cardId: this.selectedCardId,
      categoryId: this.selectedCategoryId,
      defaultDueDate: this.extract.dueDate || null,
      statementCloseDate: this.extract.closeDate || null,
      invoiceTotal: this.extract.total || null,
      importIdempotencyKey: this.buildImportIdempotencyKey(),
      skipDuplicates: true,
      items: this.extract.items.map((item) => ({
        ...item,
        categoryId: item.categoryId || this.selectedCategoryId || item.suggestedCategoryId || null
      }))
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.reconciliation = result;
      },
      error: () => {
        this.reconciliation = null;
      },
      complete: () => {
        this.reconciling = false;
      }
    });
  }
}
