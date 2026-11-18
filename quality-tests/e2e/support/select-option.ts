import { expect, type Locator } from '@playwright/test';

export async function selectOption(control: Locator, choice: string | { label?: string; value?: string; index?: number }): Promise<string[]> {
  await expect(control).toBeVisible();
  if (await control.evaluate(el => el.tagName === 'SELECT')) return control.selectOption(choice);
  const trigger = control.and(control.page().getByRole('combobox'));
  await trigger.click();
  const options = control.page().getByRole('option');
  let target: Locator;
  if (typeof choice !== 'string' && choice.index !== undefined) target = options.nth(choice.index);
  else if (typeof choice !== 'string' && choice.label !== undefined) target = control.page().getByRole('option', { name: choice.label, exact: true });
  else {
    const value = typeof choice === 'string' ? choice : choice.value!;
    target = control.page().locator('[role="option"][data-value=' + JSON.stringify(value) + ']:visible');
  }
  await expect(target).toBeVisible();
  const value = await target.getAttribute('data-value');
  await target.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  return value ? [value] : [];
}

export async function expectOption(control: Locator, label: string): Promise<void> {
  if (await control.evaluate(el => el.tagName === 'SELECT')) { await expect(control.locator('option', { hasText: label })).toHaveCount(1); return; }
  const trigger = control.and(control.page().getByRole('combobox'));
  await trigger.click();
  await expect(control.page().getByRole('option', { name: label, exact: true })).toBeVisible();
  await trigger.press('Escape');
}
