import { expect, test, type Page } from '@playwright/test';
import { completeLiveOnboarding } from './support/live-auth';

async function createCategory(page: Page, name: string, type: 'Income' | 'Expense') {
  await page.goto('/categorias', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Organize receitas e despesas' })).toBeVisible();

  await page.getByPlaceholder('Nome da categoria').fill(name);
  await page.locator('.add-card select').selectOption(type);
  const createResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().includes('/categories')
  );
  await page.getByRole('button', { name: 'Adicionar' }).click();
  expect((await createResponse).ok()).toBeTruthy();

  await expect(page.getByText(name)).toBeVisible({ timeout: 20000 });
  return page.locator('div').filter({ hasText: name }).filter({ hasText: 'Categoria personalizada' }).first();
}

test.describe('live write flow', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('cria categoria de despesa real, lanca despesa e marca como pago', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Despesa Live ${suffix}`;
    const expenseName = `Mercado Real ${suffix}`;

    await createCategory(page, categoryName, 'Expense');

    await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Adicionar despesa' }).first().click();
    await expect(page.getByRole('heading', { level: 3, name: 'Adicionar lançamento' })).toBeVisible();
    const expenseForm = page.locator('form').filter({ has: page.getByLabel('Nome da despesa') }).first();
    await expenseForm.getByLabel('Nome da despesa').fill(expenseName);
    await expenseForm.getByLabel('Categoria').selectOption({ label: categoryName });
    await expenseForm.getByLabel('Valor (R$)').fill('12550');
    await expenseForm.getByLabel('Primeiro vencimento (DD/MM/AAAA)').fill('09032026');
    const createResponse = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/plans')
    );
    await expenseForm.getByRole('button', { name: 'Salvar despesa' }).click();
    expect((await createResponse).ok()).toBeTruthy();
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const expenseRow = page.locator('tr').filter({ hasText: expenseName }).first();
    await expect(expenseRow).toBeVisible({ timeout: 20000 });
    await expect(expenseRow.getByText('Pendente')).toBeVisible();
    await expenseRow.getByLabel('Selecionar despesa').check();
    await page.getByRole('button', { name: 'Marcar como pago' }).click();
    await expect(expenseRow.getByText('Pago')).toBeVisible({ timeout: 20000 });
  });

  test('cria categoria de receita real, lanca receita e marca como recebida', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Receita Live ${suffix}`;
    const incomeName = `Freela Real ${suffix}`;

    await createCategory(page, categoryName, 'Income');

    await page.goto('/receitas', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Adicionar receita' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Adicionar receita' })).toBeVisible();
    const incomeForm = page.locator('form').filter({ has: page.getByRole('textbox', { name: 'Fonte', exact: true }) }).first();
    await incomeForm.getByRole('textbox', { name: 'Fonte', exact: true }).fill(incomeName);
    await incomeForm.getByLabel('Categoria').selectOption({ label: categoryName });
    await incomeForm.getByLabel('Valor (R$)').fill('240000');
    await incomeForm.getByLabel('Data de recebimento (DD/MM/AAAA)').fill('09032026');
    const createResponse = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/plans')
    );
    await incomeForm.getByRole('button', { name: 'Salvar receita' }).click();
    expect((await createResponse).ok()).toBeTruthy();
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const incomeRow = page.locator('tr').filter({ hasText: incomeName }).first();
    await expect(incomeRow).toBeVisible({ timeout: 20000 });
    await expect(incomeRow.getByText('Pendente')).toBeVisible();
    await incomeRow.getByLabel('Selecionar receita').check();
    await page.getByRole('button', { name: 'Marcar como recebida' }).click();
    await expect(incomeRow.getByText('Recebido')).toBeVisible({ timeout: 20000 });
  });

  test('cria categoria e remove a categoria personalizada real', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Excluir Live ${suffix}`;

    const categoryCard = await createCategory(page, categoryName, 'Expense');
    await categoryCard.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Remover categoria' })).toBeVisible();
    await page.getByRole('button', { name: 'Remover' }).click();

    await expect(page.getByText(categoryName)).toHaveCount(0, { timeout: 20000 });
  });

  test('cria receita recorrente real e filtra por tipo recorrente', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Recorrente Live ${suffix}`;
    const incomeName = `Mensalidade Real ${suffix}`;

    await createCategory(page, categoryName, 'Income');

    await page.goto('/receitas', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Adicionar receita' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Adicionar receita' })).toBeVisible();
    const incomeForm = page.locator('form').filter({ has: page.getByRole('textbox', { name: 'Fonte', exact: true }) }).first();
    await incomeForm.getByRole('textbox', { name: 'Fonte', exact: true }).fill(incomeName);
    await incomeForm.getByLabel('Categoria').selectOption({ label: categoryName });
    await incomeForm.getByLabel('Receita recorrente mensal').check();
    await incomeForm.getByLabel('Valor (R$)').fill('325000');
    await incomeForm.getByLabel('Data de recebimento (DD/MM/AAAA)').fill('09032026');
    const createResponse = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/plans')
    );
    await incomeForm.getByRole('button', { name: 'Salvar receita' }).click();
    expect((await createResponse).ok()).toBeTruthy();
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const incomeRow = page.locator('tr').filter({ hasText: incomeName }).first();
    await expect(incomeRow).toBeVisible({ timeout: 20000 });
    await expect(incomeRow.getByRole('cell', { name: 'Recorrente', exact: true })).toBeVisible();

    await page.getByLabel('Tipo').selectOption('recurring');
    await expect(incomeRow).toBeVisible({ timeout: 20000 });
    await expect(page.locator('tr').filter({ hasText: 'Salario teste live' })).toHaveCount(0);
  });

  test('edita despesa real em aberto e reflete novo valor', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Editar Desp ${suffix}`;
    const expenseName = `Conta Luz ${suffix}`;
    const updatedName = `Conta Luz Ajustada ${suffix}`;

    await createCategory(page, categoryName, 'Expense');

    await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Adicionar despesa' }).first().click();
    await expect(page.getByRole('heading', { level: 3, name: 'Adicionar lançamento' })).toBeVisible();
    const expenseForm = page.locator('form').filter({ has: page.getByLabel('Nome da despesa') }).first();
    await expenseForm.getByLabel('Nome da despesa').fill(expenseName);
    await expenseForm.getByLabel('Categoria').selectOption({ label: categoryName });
    await expenseForm.getByLabel('Valor (R$)').fill('8800');
    await expenseForm.getByLabel('Primeiro vencimento (DD/MM/AAAA)').fill('09032026');
    const createResponse = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/plans')
    );
    await expenseForm.getByRole('button', { name: 'Salvar despesa' }).click();
    expect((await createResponse).ok()).toBeTruthy();
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const expenseRow = page.locator('tr').filter({ hasText: expenseName }).first();
    await expect(expenseRow).toBeVisible({ timeout: 20000 });
    await expenseRow.getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Editar lançamento' })).toBeVisible();
    const editForm = page.locator('form').filter({ has: page.getByLabel('Nome da despesa') }).first();
    await editForm.getByLabel('Nome da despesa').fill(updatedName);
    await editForm.getByLabel('Valor (R$)').fill('9900');
    const updateResponse = page.waitForResponse((response) =>
      response.request().method() === 'PUT' && response.url().includes('/plans/')
    );
    await editForm.getByRole('button', { name: 'Editar despesa' }).click();
    expect((await updateResponse).ok()).toBeTruthy();
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const updatedRow = page.locator('tr').filter({ hasText: updatedName }).first();
    await expect(updatedRow).toBeVisible({ timeout: 20000 });
    await expect(updatedRow.getByText('R$ 99,00')).toBeVisible();
  });

  test('edita e exclui receita recorrente real', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Gerir Rec ${suffix}`;
    const incomeName = `Assinatura SaaS ${suffix}`;
    const updatedName = `Assinatura SaaS Ajustada ${suffix}`;

    await createCategory(page, categoryName, 'Income');

    await page.goto('/receitas', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Adicionar receita' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Adicionar receita' })).toBeVisible();
    const incomeForm = page.locator('form').filter({ has: page.getByRole('textbox', { name: 'Fonte', exact: true }) }).first();
    await incomeForm.getByRole('textbox', { name: 'Fonte', exact: true }).fill(incomeName);
    await incomeForm.getByLabel('Categoria').selectOption({ label: categoryName });
    await incomeForm.getByLabel('Receita recorrente mensal').check();
    await incomeForm.getByLabel('Valor (R$)').fill('450000');
    await incomeForm.getByLabel('Data de recebimento (DD/MM/AAAA)').fill('09032026');
    const createResponse = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/plans')
    );
    await incomeForm.getByRole('button', { name: 'Salvar receita' }).click();
    expect((await createResponse).ok()).toBeTruthy();
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const incomeRow = page.locator('tr').filter({ hasText: incomeName }).first();
    await expect(incomeRow).toBeVisible({ timeout: 20000 });
    await incomeRow.getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Editar receita' })).toBeVisible();
    const editForm = page.locator('form').filter({ has: page.getByRole('textbox', { name: 'Fonte', exact: true }) }).first();
    await editForm.getByRole('textbox', { name: 'Fonte', exact: true }).fill(updatedName);
    await editForm.getByLabel('Valor (R$)').fill('470000');
    const updateResponse = page.waitForResponse((response) =>
      response.request().method() === 'PUT' && response.url().includes('/plans/')
    );
    await editForm.getByRole('button', { name: 'Salvar alterações' }).click();
    expect((await updateResponse).ok()).toBeTruthy();
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });

    const updatedRow = page.locator('tr').filter({ hasText: updatedName }).first();
    await expect(updatedRow).toBeVisible({ timeout: 20000 });
    await expect(updatedRow.getByText('R$ 4.700,00')).toBeVisible();
    await updatedRow.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByRole('heading', { level: 3, name: updatedName })).toBeVisible();
    const deleteResponse = page.waitForResponse((response) =>
      response.request().method() === 'DELETE' && response.url().includes('/plans/')
    );
    await page.getByRole('button', { name: 'Excluir recorrência' }).click();
    expect((await deleteResponse).ok()).toBeTruthy();
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('tr').filter({ hasText: updatedName })).toHaveCount(0);
  });
});
