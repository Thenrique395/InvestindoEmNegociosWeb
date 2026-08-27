import { STYLEGUIDE_CATEGORY_LABELS, STYLEGUIDE_COMPONENTS } from './styleguide-catalog';

describe('STYLEGUIDE_COMPONENTS', () => {
  it('não tem slugs vazios ou duplicados', () => {
    const slugs = STYLEGUIDE_COMPONENTS.map((item) => item.slug);

    expect(slugs.every((slug) => !!slug.trim())).toBeTrue();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('toda categoria usada tem um rótulo correspondente', () => {
    const usedCategories = new Set(STYLEGUIDE_COMPONENTS.map((item) => item.category));

    usedCategories.forEach((category) => {
      expect(STYLEGUIDE_CATEGORY_LABELS[category]).toBeTruthy();
    });
  });

  it('todo item tem nome, seletor e descrição preenchidos', () => {
    STYLEGUIDE_COMPONENTS.forEach((item) => {
      expect(item.name.trim()).not.toBe('');
      expect(item.selector.trim()).not.toBe('');
      expect(item.description.trim()).not.toBe('');
    });
  });
});
