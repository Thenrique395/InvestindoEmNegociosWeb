import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { getProblemDetails } from './utils/api-error.utils';

type FieldErrors = Record<string, string>;
type FormErrorsState = Record<string, FieldErrors>;

@Injectable({ providedIn: 'root' })
export class ApiValidationErrorsService {
  private readonly errorsByForm = signal<FormErrorsState>({});

  getError(formKey: string | null | undefined, fieldKey: string | null | undefined): string {
    if (!formKey || !fieldKey) return '';
    return this.errorsByForm()[formKey]?.[this.normalizeKey(fieldKey)] ?? '';
  }

  setErrors(formKey: string, errors: FieldErrors): void {
    this.errorsByForm.update((state) => ({
      ...state,
      [formKey]: this.normalizeErrors(errors)
    }));
  }

  setFromHttpError(
    formKey: string,
    error: HttpErrorResponse,
    fieldMap: Record<string, string> = {}
  ): boolean {
    const problem = getProblemDetails(error);
    const validationErrors = problem?.errors;
    if (!validationErrors) return false;

    const normalized: FieldErrors = {};
    Object.entries(validationErrors).forEach(([apiField, messages]) => {
      const targetField = fieldMap[apiField] || fieldMap[this.normalizeKey(apiField)] || apiField;
      const message = Array.isArray(messages) ? messages.find(Boolean) : messages;
      if (message?.trim()) {
        normalized[this.normalizeKey(targetField)] = message.trim();
      }
    });

    this.setErrors(formKey, normalized);
    return Object.keys(normalized).length > 0;
  }

  clearForm(formKey: string): void {
    this.errorsByForm.update((state) => {
      const next = { ...state };
      delete next[formKey];
      return next;
    });
  }

  clearField(formKey: string, fieldKey: string): void {
    this.errorsByForm.update((state) => {
      const current = state[formKey];
      if (!current) return state;

      const nextForm = { ...current };
      delete nextForm[this.normalizeKey(fieldKey)];

      return {
        ...state,
        [formKey]: nextForm
      };
    });
  }

  private normalizeErrors(errors: FieldErrors): FieldErrors {
    return Object.entries(errors).reduce<FieldErrors>((acc, [key, value]) => {
      if (value?.trim()) {
        acc[this.normalizeKey(key)] = value.trim();
      }
      return acc;
    }, {});
  }

  private normalizeKey(key: string): string {
    return key
      .replace(/^\$\./, '')
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .filter(Boolean)
      .pop()
      ?.trim()
      .toLowerCase() || key.toLowerCase();
  }
}
