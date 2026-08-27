import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { B3ExtractResponse, B3ImportStrategy, InvestmentPositionRequest } from '../../../../core/investments.service';
import { AppCurrencyPipe } from '../../../../shared/app-currency.pipe';
import { ModalComponent } from '../../../../shared/modal/modal.component';

@Component({
  selector: 'app-investment-import-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AppCurrencyPipe, ModalComponent],
  templateUrl: './investment-import-modal.component.html',
  styleUrl: './investment-import-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentImportModalComponent {
  @Input() open = false;
  @Input() b3Loading = false;
  @Input() b3Importing = false;
  @Input() b3Error = '';
  @Input() b3FileName = '';
  @Input() b3Preview: B3ExtractResponse | null = null;
  @Input() b3Strategy: B3ImportStrategy = 'merge';
  @Input() csvError = '';
  @Input() csvImported = 0;
  @Input() csvPreviewRows: InvestmentPositionRequest[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() b3FileSelected = new EventEmitter<Event>();
  @Output() csvSelected = new EventEmitter<Event>();
  @Output() downloadCsvModel = new EventEmitter<void>();
  @Output() b3StrategyChange = new EventEmitter<B3ImportStrategy>();
  @Output() confirmB3Import = new EventEmitter<void>();

  trackByIndex(index: number): number {
    return index;
  }
}
