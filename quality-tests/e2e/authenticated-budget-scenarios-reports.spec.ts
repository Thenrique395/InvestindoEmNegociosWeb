import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('pagamento de parcelas de empréstimo', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('paga uma parcela em aberto e atualiza situação para Pago', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Título').fill('Empréstimo Parcelado');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Simulação' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Empréstimo Parcelado' })).toBeVisible();

    await page.getByRole('button', { name: 'Ver parcelas' }).first().click();
    await expect(page.getByText('Em aberto').first()).toBeVisible();

    await page.getByRole('button', { name: 'Pagar' }).first().click();

    await expect(page.getByText('Pago').first()).toBeVisible();
  });

  test('parcela já paga não exibe botão Pagar', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Título').fill('Empréstimo para Verificar Pago');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Empréstimo para Verificar Pago' })).toBeVisible();

    await page.getByRole('button', { name: 'Ver parcelas' }).first().click();
    await page.getByRole('button', { name: 'Pagar' }).first().click();
    await expect(page.getByText('Pago').first()).toBeVisible();

    const paidRows = page.locator('tr.row--paid');
    await expect(paidRows.first()).toBeVisible();
    await expect(paidRows.first().getByRole('button', { name: 'Pagar' })).not.toBeVisible();
  });

  test('ocultar parcelas esconde a tabela do cronograma', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Título').fill('Empréstimo Toggle');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Empréstimo Toggle' })).toBeVisible();

    await page.getByRole('button', { name: 'Ver parcelas' }).first().click();
    await expect(page.getByText('Em aberto').first()).toBeVisible();

    await page.getByRole('button', { name: 'Ocultar parcelas' }).first().click();
    await expect(page.getByText('Em aberto').first()).not.toBeVisible();
  });
});

test.describe('orçamento mensal', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('carrega página com estado vazio e exibe seção para adicionar categoria', async ({ page }) => {
    await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: /Orçamento/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Adicionar categoria' })).toBeVisible();
    await expect(page.getByPlaceholder('Nome da categoria')).toBeVisible();
    await expect(page.getByPlaceholder('Valor planejado')).toBeVisible();
  });

  test('adiciona uma categoria ao orçamento e exibe na tabela', async ({ page }) => {
    await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });

    await page.getByPlaceholder('Nome da categoria').fill('Alimentação');
    await page.getByPlaceholder('Valor planejado').fill('800');
    await page.getByRole('button', { name: 'Adicionar' }).click();

    await expect(page.getByText('Categoria adicionada ao orçamento.')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Alimentação' }).first()).toBeVisible();
  });

  test('remove uma categoria do orçamento', async ({ page }) => {
    await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });

    await page.getByPlaceholder('Nome da categoria').fill('Transporte');
    await page.getByPlaceholder('Valor planejado').fill('300');
    await page.getByRole('button', { name: 'Adicionar' }).click();
    await expect(page.getByRole('cell', { name: 'Transporte' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Remover' }).first().click();
    // Remover agora exige confirmação num confirm-sheet.
    await page.getByRole('dialog').getByRole('button', { name: 'Remover' }).click();
    await expect(page.getByText('Item removido do orçamento.')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Transporte' }).first()).not.toBeVisible();
  });

  test('navega para mês anterior e carrega novo orçamento', async ({ page }) => {
    await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    await page.getByRole('button', { name: '← Anterior' }).click();
    await expect(heading).toBeVisible();
  });
});

test.describe('simulador de cenários', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('carrega página com formulário de parâmetros', async ({ page }) => {
    await page.goto('/simulador', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: 'Simulador de Cenários' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Parâmetros' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Simular cenário' })).toBeVisible();
  });

  test('simula cenário com receita extra e exibe resultados', async ({ page }) => {
    await page.goto('/simulador', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Receita extra mensal').fill('1000');
    await page.getByRole('button', { name: 'Simular cenário' }).click();

    await expect(page.getByText('Saldo projetado (base)')).toBeVisible();
    await expect(page.getByText('Saldo projetado (cenário)')).toBeVisible();
    await expect(page.getByText('Potencial de poupança mensal')).toBeVisible();
  });

  test('exibe tabela de projeção diária após simulação', async ({ page }) => {
    await page.goto('/simulador', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Despesa extra mensal').fill('200');
    await page.getByRole('button', { name: 'Simular cenário' }).click();

    await expect(page.getByRole('heading', { level: 2, name: 'Projeção diária' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Saldo base' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Saldo cenário' })).toBeVisible();
  });

  test('simula com diferentes períodos usando o seletor', async ({ page }) => {
    await page.goto('/simulador', { waitUntil: 'domcontentloaded' });

    await page.getByRole('radio', { name: '3 meses' }).click();
    await page.getByRole('button', { name: 'Simular cenário' }).click();

    await expect(page.getByText('Saldo projetado (base)')).toBeVisible();
  });
});

test.describe('relatórios mensais', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('carrega relatório do mês atual com KPIs', async ({ page }) => {
    await page.goto('/relatorios', { waitUntil: 'domcontentloaded' });

    const main = page.getByRole('main');
    await expect(main.getByText('Relatório financeiro').first()).toBeVisible();
    await expect(main.getByText('Receitas', { exact: true }).first()).toBeVisible();
    await expect(main.getByText('Despesas', { exact: true }).first()).toBeVisible();
    await expect(main.getByText('Saldo líquido', { exact: true }).first()).toBeVisible();
    await expect(main.getByText('Taxa de poupança', { exact: true }).first()).toBeVisible();
  });

  test('exibe tabela de despesas por categoria', async ({ page }) => {
    await page.goto('/relatorios', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 2, name: 'Despesas por categoria' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Alimentação' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Transporte' })).toBeVisible();
  });

  test('exibe botão exportar CSV quando relatório carregado', async ({ page }) => {
    await page.goto('/relatorios', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible();
  });

  test('navega para mês anterior e recarrega relatório', async ({ page }) => {
    await page.goto('/relatorios', { waitUntil: 'domcontentloaded' });

    const heading = page.getByRole('heading', { level: 1 });
    const initialText = (await heading.textContent()) ?? '';

    await page.getByRole('button', { name: '← Anterior' }).click();
    await expect(heading).not.toHaveText(initialText);
  });
});
