import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legalPublisherFromEnvironment, validateLegalPublisher } from '../investindoEmNegociosWeb/src/legal-publisher.mjs';

const fixture = { name: 'Responsável de validação local', taxId: '12.345.678/0001-95', address: 'Endereço usado apenas em teste, 123', email: 'validacao@local.invalid' };
test('identificação incompleta impede publicação', () => {
  assert.equal(validateLegalPublisher(legalPublisherFromEnvironment({})).length, 4);
});
test('identificação com CNPJ válido resolve a configuração', () => {
  assert.deepEqual(validateLegalPublisher(fixture), []);
});
test('CPF válido também é aceito e dígito fiscal incorreto é rejeitado', () => {
  assert.deepEqual(validateLegalPublisher({ ...fixture, taxId: '529.982.247-25' }), []);
  assert.ok(validateLegalPublisher({ ...fixture, taxId: '12.345.678/0001-96' }).length);
});
test('placeholders e e-mail inválido não passam pelo gate', () => {
  assert.ok(validateLegalPublisher({ ...fixture, name: '{{RAZAO_SOCIAL}}' }).length);
  assert.ok(validateLegalPublisher({ ...fixture, email: '{{EMAIL_CONTATO}}' }).length);
  assert.ok(validateLegalPublisher({ ...fixture, taxId: '00.000.000/0000-00' }).length);
});
