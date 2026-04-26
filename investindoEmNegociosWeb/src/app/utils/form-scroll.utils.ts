export type ScrollToInvalidFieldOptions = {
  root?: Document | HTMLElement;
  offsetTop?: number;
  behavior?: ScrollBehavior;
  focusDelayMs?: number;
  autoDetectHeader?: boolean;
  scrollContainer?: HTMLElement | null;
};

const DEFAULT_HEADER_OFFSET = 96;
const HEADER_SAFE_GAP = 16;
const CONTAINER_SAFE_GAP = 16;

export function scrollToFirstInvalidFormField(options: ScrollToInvalidFieldOptions = {}): boolean {
  const {
    root = document,
    offsetTop,
    behavior = 'smooth',
    focusDelayMs = 250,
    autoDetectHeader = true,
    scrollContainer
  } = options;

  const element = root.querySelector('.form-field--invalid') as HTMLElement | null;
  if (!element) return false;

  const container = scrollContainer ?? findScrollableContainer(element);

  if (container) {
    scrollElementIntoContainer(element, container, behavior);
  } else {
    scrollElementIntoWindow(element, offsetTop, autoDetectHeader, behavior);
  }

  const focusable = element.querySelector('input, select, textarea, button') as HTMLElement | null;
  window.setTimeout(() => focusable?.focus?.({ preventScroll: true }), focusDelayMs);

  return true;
}

function scrollElementIntoWindow(
  element: HTMLElement,
  offsetTop: number | undefined,
  autoDetectHeader: boolean,
  behavior: ScrollBehavior
): void {
  const resolvedOffsetTop = offsetTop ?? (autoDetectHeader ? detectFixedHeaderOffset() : DEFAULT_HEADER_OFFSET);
  const elementTop = element.getBoundingClientRect().top + window.scrollY;
  const targetTop = Math.max(elementTop - resolvedOffsetTop, 0);

  window.scrollTo({
    top: targetTop,
    behavior
  });
}

function scrollElementIntoContainer(
  element: HTMLElement,
  container: HTMLElement,
  behavior: ScrollBehavior
): void {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const currentScrollTop = container.scrollTop;
  const relativeTop = elementRect.top - containerRect.top + currentScrollTop;
  const targetTop = Math.max(relativeTop - CONTAINER_SAFE_GAP, 0);

  container.scrollTo({
    top: targetTop,
    behavior
  });
}

function findScrollableContainer(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement;

  while (current && current !== document.body && current !== document.documentElement) {
    if (isScrollable(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

function isScrollable(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  const canScroll = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
  return canScroll && element.scrollHeight > element.clientHeight;
}

function detectFixedHeaderOffset(): number {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return DEFAULT_HEADER_OFFSET;
  }

  const candidates = Array.from(document.querySelectorAll<HTMLElement>('header, .header, .topbar, .navbar, [data-fixed-header]'));
  const visibleFixedHeaders = candidates
    .filter((element) => isVisible(element))
    .filter((element) => {
      const position = window.getComputedStyle(element).position;
      return position === 'fixed' || position === 'sticky';
    })
    .filter((element) => element.getBoundingClientRect().top <= 8);

  const detectedHeight = visibleFixedHeaders.reduce((height, element) => {
    const rect = element.getBoundingClientRect();
    return Math.max(height, rect.height);
  }, 0);

  return Math.max(detectedHeight + HEADER_SAFE_GAP, DEFAULT_HEADER_OFFSET);
}

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return rect.width > 0
    && rect.height > 0
    && style.display !== 'none'
    && style.visibility !== 'hidden'
    && style.opacity !== '0';
}
