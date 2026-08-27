import { AbstractControl, ValidatorFn } from '@angular/forms';

export function maskCpf(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function calculateCpfVerifier(base: string, startWeight: number): number {
  const sum = base
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * (startWeight - index), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCpf(value: string): boolean {
  const digits = (value || '').toString().replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const firstVerifier = calculateCpfVerifier(digits.slice(0, 9), 10);
  const secondVerifier = calculateCpfVerifier(digits.slice(0, 10), 11);

  return Number(digits[9]) === firstVerifier && Number(digits[10]) === secondVerifier;
}

export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const digits = (control.value || '').toString().replace(/\D/g, '');
    if (!digits) return null;
    return isValidCpf(digits) ? null : { cpf: true };
  };
}
