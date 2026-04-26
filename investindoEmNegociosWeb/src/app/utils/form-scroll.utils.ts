export type ScrollToInvalidFieldOptions = {
  root?: Document | HTMLElement;
  offsetTop?: number;
  behavior?: ScrollBehavior;
  focusDelayMs?: number;
};

const DEFAULT_HEADER_OFFSET = 96;

export function scrollToFirstInvalidFormField(options: ScrollToInvalidFieldOptions = {}): boolean {
  const {
    root = document,
    offsetTop = DEFAULT_HEADER_OFFSET,
    behavior = 'smooth',
    focusDelayMs = 250
  } = options;

  const element = root.querySelector('.form-field--invalid') as HTMLElement | null;
  if (!element) return false;

  const elementTop = element.getBoundingClientRect().top + window.scrollY;
  const targetTop = Math.max(elementTop - offsetTop, 0);

  window.scrollTo({
    top: targetTop,
    behavior
  });

  const focusable = element.querySelector('input, select, textarea, button') as HTMLElement | null;
  window.setTimeout(() => focusable?.focus?.({ preventScroll: true }), focusDelayMs);

  return true;
}
