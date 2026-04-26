export type FormFieldErrors<TField extends string> = Partial<Record<TField, string>>;
export type FormTouchedState<TField extends string> = Record<TField, boolean>;
export type FormValidator<TField extends string> = () => FormFieldErrors<TField>;

export class FormState<TField extends string> {
  submitted = false;
  touched: FormTouchedState<TField>;

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
  }

  shouldShowError(field: TField): boolean {
    return this.submitted || this.touched[field];
  }

  error(field: TField): string {
    if (!this.shouldShowError(field)) return '';
    return this.validator()[field] || '';
  }

  rawError(field: TField): string {
    return this.validator()[field] || '';
  }

  firstErrorField(): TField | null {
    return this.fields.find((field) => !!this.rawError(field)) ?? null;
  }

  shouldAnimate(field: TField): boolean {
    return this.submitted && this.firstErrorField() === field;
  }

  isValid(): boolean {
    return this.fields.every((field) => !this.rawError(field));
  }

  private createTouchedState(value: boolean): FormTouchedState<TField> {
    return this.fields.reduce((acc, field) => {
      acc[field] = value;
      return acc;
    }, {} as FormTouchedState<TField>);
  }
}
