export function scrollToFirstInvalidFormField(root: Document | HTMLElement = document): boolean {
  const element = root.querySelector('.form-field--invalid') as HTMLElement | null;
  if (!element) return false;

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  });

  const focusable = element.querySelector('input, select, textarea, button') as HTMLElement | null;
  window.setTimeout(() => focusable?.focus?.({ preventScroll: true }), 250);

  return true;
}
