export type FormFieldErrors<TField extends string> = Partial<Record<TField, string>>;
export type FormTouchedState<TField extends string> = Record<TField, boolean>;
export type FormValidator<TField extends string> = () => FormFieldErrors<TField>;

export class FormState<TField extends string> {
  submitted = false;
  touched: FormTouchedState<TField>;
  private apiErrors: FormFieldErrors<TField> = {};

  constructor(
    private readonly fields: readonly TField[],
    private readonly validator: FormValidator<TField>
  ) {
    this.touched = this.createTouchedState(false);
  }

  markTouched(field: TField): void {
    this.touched[field] = true;
  }

  markAllTouched(): void {
    this.touched = this.createTouchedState(true);
  }

  submit(): void {
    this.submitted = true;
    this.markAllTouched();
  }

  reset(): void {
    this.submitted = false;
    this.touched = this.createTouchedState(false);
    this.clearApiErrors();
  }

  setApiErrors(errors: FormFieldErrors<TField>): void {
    this.apiErrors = this.normalizeErrors(errors);
    this.markAllTouched();
  }

  clearApiErrors(): void {
    this.apiErrors = {};
  }

  clearApiError(field: TField): void {
    const next = { ...this.apiErrors };
    delete next[field];
    this.apiErrors = next;
  }

  shouldShowError(field: TField): boolean {
    return this.submitted || this.touched[field];
  }

  error(field: TField): string {
    if (!this.shouldShowError(field)) return '';
    return this.rawError(field);
  }

  rawError(field: TField): string {
    return this.apiErrors[field] || this.validator()[field] || '';
  }

  firstErrorField(): TField | null {
    return this.fields.find((field) => !!this.rawError(field)) ?? null;
  }

  shouldAnimate(field: TField): boolean {
    return this.submitted && this.firstErrorField() === field;
  }

  isValid(): boolean {
    return this.fields.every((field) => !this.validator()[field]);
  }

  hasErrors(): boolean {
    return this.fields.some((field) => !!this.rawError(field));
  }

  private normalizeErrors(errors: FormFieldErrors<TField>): FormFieldErrors<TField> {
    return Object.entries(errors).reduce<FormFieldErrors<TField>>((acc, [field, message]) => {
      if (typeof message === 'string' && message.trim()) {
        acc[field as TField] = message.trim();
      }
      return acc;
    }, {});
  }

  private createTouchedState(value: boolean): FormTouchedState<TField> {
    return this.fields.reduce((acc, field) => {
      acc[field] = value;
      return acc;
    }, {} as FormTouchedState<TField>);
  }
}
