import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SectionCardComponent } from '../../../../shared/section-card/section-card.component';
import { CsvExtractResponse, OfxExtractResponse } from '../../../accounts/data-access/accounts.service';

@Component({
  selector: 'app-account-import',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionCardComponent],
  templateUrl: './account-import.component.html'
})
export class AccountImportComponent {
  @Input() ofxFileName = '';
  @Input() extractingOfx = false;
  @Input() importingOfx = false;
  @Input() ofxExtract: OfxExtractResponse = { items: [], rawText: '' };
  @Input() duplicateCount = 0;

  @Input() extractingCsv = false;
  @Input() importingCsv = false;
  @Input() csvExtract: CsvExtractResponse = { delimiter: ';', detectedColumns: [], items: [], rawText: '' };
  @Input() csvSkipDuplicates = true;

  @Output() ofxSelected = new EventEmitter<Event>();
  @Output() csvSelected = new EventEmitter<Event>();
  @Output() clearOfx = new EventEmitter<void>();
  @Output() clearCsv = new EventEmitter<void>();
  @Output() csvSkipDuplicatesChange = new EventEmitter<boolean>();

  onCsvSkipDuplicatesChange(value: boolean): void {
    this.csvSkipDuplicates = value;
    this.csvSkipDuplicatesChange.emit(value);
  }
}
