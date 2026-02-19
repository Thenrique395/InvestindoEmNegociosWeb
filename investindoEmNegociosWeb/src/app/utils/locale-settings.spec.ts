import { getLocaleSettings, setLocaleSettings } from './locale-settings';

describe('locale-settings', () => {
  it('atualiza locale e currency em memoria', () => {
    const updated = setLocaleSettings({ locale: 'en-US', currency: 'USD' });

    expect(updated.locale).toBe('en-US');
    expect(updated.currency).toBe('USD');
    expect(getLocaleSettings()).toEqual(updated);
  });
});
