import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AccountRequest,
  AccountResponse,
  AccountTransferRequest,
  AccountTransactionResponse,
  AccountType,
  CsvExtractResponse,
  OfxExtractResponse,
  OfxTransactionPreview
} from '../accounts.service';
import { CategoriesService, CategoryDto, CategoryType } from '../categories.service';
import { AccountsStore } from '../accounts.store';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { SectionCardComponent } from '../shared/section-card/section-card.component';

@Component({
  selector: 'app-contas',
  standalone: true,
  imports: [CommonModule, FormsModule, FormFieldComponent, SectionCardComponent],
  templateUrl: './contas.component.html',
  styleUrls: ['./contas.component.scss']
})
export class ContasComponent implements OnInit {
  // (restante do código permanece igual)
}
