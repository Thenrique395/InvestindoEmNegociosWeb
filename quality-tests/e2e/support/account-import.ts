import { expect, type Page } from '@playwright/test';

export async function openAccountImport(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: 'Importar extrato', exact: true });
  await expect(button).toBeVisible();
  if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
  await expect(page.getByRole('heading', { name: 'Motor de importação com IA' })).toBeVisible();
}
