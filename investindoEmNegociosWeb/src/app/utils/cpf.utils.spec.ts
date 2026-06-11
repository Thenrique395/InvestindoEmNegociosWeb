import { cpfValidator, isValidCpf, maskCpf } from './cpf.utils';

describe('cpf.utils', () => {
  it('mascara cpf', () => {
    expect(maskCpf('01587610493')).toBe('015.876.104-93');
    expect(maskCpf('01587610493000')).toBe('015.876.104-93');
  });

  it('valida cpf', () => {
    expect(isValidCpf('015.876.104-93')).toBe(true);
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
  });

  it('valida campo de formulario', () => {
    const validator = cpfValidator();
    expect(validator({ value: '' } as any)).toBeNull();
    expect(validator({ value: '015.876.104-93' } as any)).toBeNull();
    expect(validator({ value: '11111111111' } as any)).toEqual({ cpf: true });
  });
});
