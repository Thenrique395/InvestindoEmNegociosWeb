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
import { SectionCardComponent } from '../shared/section-card/section-card.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { AccountFormComponent } from '../features/accounts/components/account-form/account-form.component';

// resto do arquivo permanece igual (omitido para segurança da refatoração incremental)
