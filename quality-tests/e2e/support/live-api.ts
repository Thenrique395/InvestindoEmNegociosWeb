import type { Page } from '@playwright/test';

export const LIVE_API_BASE_URL = 'http://35.174.50.187:5059/api/v1';

type ApiOptions = {
  method?: string;
  body?: unknown;
};

export async function liveEndpointAvailable(path: string): Promise<boolean> {
  try {
    const response = await fetch(`${LIVE_API_BASE_URL}${path}`, { method: 'GET' });
    return response.status !== 404;
  } catch {
    return false;
  }
}

// access_token/refresh_token agora são cookies httpOnly — page.request compartilha o
// cookie jar do contexto do browser, então a sessão é enviada automaticamente sem
// precisar extrair/anexar o token manualmente (que nem é mais legível via JS).
export async function liveApi<T>(page: Page, path: string, options: ApiOptions = {}): Promise<T> {
  const response = await page.request.fetch(`${LIVE_API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    data: options.body === undefined ? undefined : options.body
  });
  if (!response.ok()) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Live API ${options.method ?? 'GET'} ${path} falhou com ${response.status()}: ${detail}`);
  }
  if (response.status() === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function createExpenseCategory(page: Page, name: string) {
  return liveApi<{ id: string; name: string }>(page, '/categories', {
    method: 'POST',
    body: {
      name,
      appliesTo: 'Expense'
    }
  });
}

export async function createCard(page: Page, holderName: string, last4: string) {
  return liveApi<{ id: string }>(page, '/cards', {
    method: 'POST',
    body: {
      brandId: 1,
      holderName,
      nickname: holderName,
      last4,
      bank: 'Banco Live',
      creditLimit: 8500,
      statementCloseDay: 12,
      dueDay: 20
    }
  });
}
