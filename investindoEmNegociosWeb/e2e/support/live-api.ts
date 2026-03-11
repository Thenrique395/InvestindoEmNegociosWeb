import { expect, type Page } from '@playwright/test';

export const LIVE_API_BASE_URL = 'http://35.174.50.187:5059/api/v1';

type ApiOptions = {
  method?: string;
  body?: unknown;
};

async function accessToken(page: Page) {
  const token = await page.evaluate(() => window.localStorage.getItem('access_token'));
  expect(token).toBeTruthy();
  return token as string;
}

export async function liveApi<T>(page: Page, path: string, options: ApiOptions = {}): Promise<T> {
  const token = await accessToken(page);
  const response = await fetch(`${LIVE_API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Live API ${options.method ?? 'GET'} ${path} falhou com ${response.status}: ${detail}`);
  }
  if (response.status === 204) {
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
