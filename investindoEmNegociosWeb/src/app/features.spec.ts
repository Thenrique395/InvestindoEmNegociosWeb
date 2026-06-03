import { APP_FEATURE_KEYS, hasFeatureForRole } from './features';

describe('features matrix', () => {
  it('deve liberar cartões para Basic', () => {
    expect(hasFeatureForRole('Basic', APP_FEATURE_KEYS.cardsAccess)).toBeTrue();
    expect(hasFeatureForRole('Basic', APP_FEATURE_KEYS.cardsRead)).toBeTrue();
    expect(hasFeatureForRole('Basic', APP_FEATURE_KEYS.cardsCreateUpdate)).toBeTrue();
    expect(hasFeatureForRole('Basic', APP_FEATURE_KEYS.cardsDelete)).toBeTrue();
  });

  it('deve liberar leitura de categorias para Basic', () => {
    expect(hasFeatureForRole('Basic', APP_FEATURE_KEYS.categoriesAccess)).toBeTrue();
    expect(hasFeatureForRole('Basic', APP_FEATURE_KEYS.categoriesRead)).toBeTrue();
  });

  it('deve bloquear investimentos para Basic e Intermediate', () => {
    expect(hasFeatureForRole('Basic', APP_FEATURE_KEYS.investmentsAccess)).toBeFalse();
    expect(hasFeatureForRole('Intermediate', APP_FEATURE_KEYS.investmentsAccess)).toBeFalse();
  });

  it('deve liberar importação de fatura para Intermediate+', () => {
    expect(hasFeatureForRole('Intermediate', APP_FEATURE_KEYS.invoiceImportAccess)).toBeTrue();
    expect(hasFeatureForRole('Advanced', APP_FEATURE_KEYS.invoiceImportAccess)).toBeTrue();
  });

  it('deve liberar todas as features para Admin', () => {
    const keys = Object.values(APP_FEATURE_KEYS);
    expect(keys.every((key) => hasFeatureForRole('Admin', key))).toBeTrue();
  });

  it('deve bloquear tudo quando role for nula', () => {
    expect(hasFeatureForRole(null, APP_FEATURE_KEYS.cardsAccess)).toBeFalse();
  });
});
