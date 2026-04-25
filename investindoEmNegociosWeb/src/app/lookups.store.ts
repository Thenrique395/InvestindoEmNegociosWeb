import { computed, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import {
  CardBrandLookup,
  InstitutionLookup,
  LookupsService,
  PaymentMethodLookup
} from './lookups.service';

type LookupState<T> = {
  data: T[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

type InstitutionType = 'Bank' | 'Broker';

const initialState = <T>(): LookupState<T> => ({
  data: [],
  loading: false,
  loaded: false,
  error: null
});

@Injectable({ providedIn: 'root' })
export class LookupsStore {
  private readonly paymentMethodsState = signal<LookupState<PaymentMethodLookup>>(initialState());
  private readonly cardBrandsState = signal<LookupState<CardBrandLookup>>(initialState());
  private readonly institutionsState = signal<Record<string, LookupState<InstitutionLookup>>>({});

  readonly paymentMethods = computed(() => this.paymentMethodsState().data);
  readonly paymentMethodsLoading = computed(() => this.paymentMethodsState().loading);
  readonly paymentMethodsError = computed(() => this.paymentMethodsState().error);

  readonly cardBrands = computed(() => this.cardBrandsState().data);
  readonly cardBrandsLoading = computed(() => this.cardBrandsState().loading);
  readonly cardBrandsError = computed(() => this.cardBrandsState().error);

  constructor(private lookups: LookupsService) {}

  loadPaymentMethods(force = false): void {
    const current = this.paymentMethodsState();
    if (!force && (current.loaded || current.loading)) return;

    this.paymentMethodsState.set({ ...current, loading: true, error: null });
    this.lookups.paymentMethods()
      .pipe(finalize(() => this.patchPaymentMethods({ loading: false })))
      .subscribe({
        next: (data) => this.paymentMethodsState.set({ data, loading: false, loaded: true, error: null }),
        error: () => this.patchPaymentMethods({ error: 'Não foi possível carregar formas de pagamento.' })
      });
  }

  loadCardBrands(force = false): void {
    const current = this.cardBrandsState();
    if (!force && (current.loaded || current.loading)) return;

    this.cardBrandsState.set({ ...current, loading: true, error: null });
    this.lookups.cardBrands()
      .pipe(finalize(() => this.patchCardBrands({ loading: false })))
      .subscribe({
        next: (data) => this.cardBrandsState.set({ data, loading: false, loaded: true, error: null }),
        error: () => this.patchCardBrands({ error: 'Não foi possível carregar bandeiras de cartão.' })
      });
  }

  institutions(type?: InstitutionType): InstitutionLookup[] {
    return this.getInstitutionState(type).data;
  }

  institutionsLoading(type?: InstitutionType): boolean {
    return this.getInstitutionState(type).loading;
  }

  institutionsError(type?: InstitutionType): string | null {
    return this.getInstitutionState(type).error;
  }

  loadInstitutions(type?: InstitutionType, force = false): void {
    const key = this.institutionKey(type);
    const current = this.getInstitutionState(type);
    if (!force && (current.loaded || current.loading)) return;

    this.patchInstitutions(key, { loading: true, error: null });
    this.lookups.institutions(type)
      .pipe(finalize(() => this.patchInstitutions(key, { loading: false })))
      .subscribe({
        next: (data) => this.patchInstitutions(key, { data, loading: false, loaded: true, error: null }),
        error: () => this.patchInstitutions(key, { error: 'Não foi possível carregar instituições.' })
      });
  }

  refreshAll(): void {
    this.lookups.invalidateCache();
    this.paymentMethodsState.set(initialState());
    this.cardBrandsState.set(initialState());
    this.institutionsState.set({});
    this.loadPaymentMethods(true);
    this.loadCardBrands(true);
  }

  private patchPaymentMethods(patch: Partial<LookupState<PaymentMethodLookup>>): void {
    this.paymentMethodsState.update((state) => ({ ...state, ...patch }));
  }

  private patchCardBrands(patch: Partial<LookupState<CardBrandLookup>>): void {
    this.cardBrandsState.update((state) => ({ ...state, ...patch }));
  }

  private patchInstitutions(key: string, patch: Partial<LookupState<InstitutionLookup>>): void {
    this.institutionsState.update((state) => ({
      ...state,
      [key]: {
        ...(state[key] ?? initialState<InstitutionLookup>()),
        ...patch
      }
    }));
  }

  private getInstitutionState(type?: InstitutionType): LookupState<InstitutionLookup> {
    return this.institutionsState()[this.institutionKey(type)] ?? initialState<InstitutionLookup>();
  }

  private institutionKey(type?: InstitutionType): string {
    return type ?? 'all';
  }
}
