import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('pagamento de parcelas de empréstimo', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('paga uma parcela em aberto e atualiza situação para Pago', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Novo contrato' }).click();
    await page.getByLabel('Título').fill('Empréstimo Parcelado');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Simulação' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Empréstimo Parcelado' })).toBeVisible();

    await page.getByRole('button', { name: 'Ver parcelas' }).first().click();
    await expect(page.getByText('Em aberto').first()).toBeVisible();

    await page.getByRole('button', { name: 'Pagar' }).first().click();
    await page.getByRole('button', { name: 'Confirmar pagamento' }).click();

    await expect(page.getByText('Pago').first()).toBeVisible();
  });

  test('parcela já paga não exibe botão Pagar', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Novo contrato' }).click();
    await page.getByLabel('Título').fill('Empréstimo para Verificar Pago');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Empréstimo para Verificar Pago' })).toBeVisible();

    await page.getByRole('button', { name: 'Ver parcelas' }).first().click();
    await page.getByRole('button', { name: 'Pagar' }).first().click();
    await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
    await expect(page.getByText('Pago').first()).toBeVisible();

    const paidRows = page.getByRole('row').filter({ hasText: 'Pago' });
    await expect(paidRows.first()).toBeVisible();
    await expect(paidRows.first().getByRole('button', { name: 'Pagar' })).not.toBeVisible();
  });

  test('ocultar parcelas esconde a tabela do cronograma', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Novo contrato' }).click();
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
    await page.getByRole('button', { name: 'Adicionar categoria' }).click();
    const dialog = page.getByRole('dialog', { name: 'Adicionar categoria' });
    await expect(dialog.getByRole('heading', { name: 'Adicionar categoria' })).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: 'Categoria do orçamento' })).toBeVisible();
    await expect(dialog.getByPlaceholder('0,00')).toBeVisible();
    await expect(dialog.getByText('Planejado do mês depois de adicionar')).toBeVisible();
  });

  test('adiciona uma categoria ao orçamento e exibe na tabela', async ({ page }) => {
    await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Adicionar categoria' }).click();
    const dialog = page.getByRole('dialog', { name: 'Adicionar categoria' });
    await dialog.getByPlaceholder('0,00').fill('800');
    await expect(dialog.getByLabel('Planejado do mês depois de adicionar').getByText('R$ 800,00')).toBeVisible();
    await dialog.getByRole('button', { name: 'Adicionar' }).click();

    await expect(page.getByText('Categoria adicionada ao orçamento.')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Mercado' }).first()).toBeVisible();
  });

  test('copia orçamento do mês anterior para o mês atual', async ({ page }) => {
    await page.route('**/api/v1/budget/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const match = url.pathname.match(/\/api\/v1\/budget\/(\d+)\/(\d+)(?:\/items)?$/);
      if (!match) return route.fallback();

      const [, year, month] = match;
      if (request.method() === 'GET' && year === '2026' && month === '8') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ year: 2026, month: 8, totalPlanned: 0, totalRealized: 0, totalVariance: 0, items: [] })
        });
        return;
      }

      if (request.method() === 'GET' && year === '2026' && month === '7') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            year: 2026,
            month: 7,
            totalPlanned: 1500,
            totalRealized: 350,
            totalVariance: 1150,
            items: [
              { id: 'prev-1', categoryName: 'Moradia', plannedAmount: 1200, realizedAmount: 300, variance: 900 },
              { id: 'prev-2', categoryName: 'Transporte', plannedAmount: 300, realizedAmount: 50, variance: 250 }
            ]
          })
        });
        return;
      }

      if (request.method() === 'PUT' && year === '2026' && month === '8') {
        expect(await request.postDataJSON()).toEqual([
          { categoryName: 'Moradia', plannedAmount: 1200 },
          { categoryName: 'Transporte', plannedAmount: 300 }
        ]);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            year: 2026,
            month: 8,
            totalPlanned: 1500,
            totalRealized: 0,
            totalVariance: 1500,
            items: [
              { id: 'new-1', categoryName: 'Moradia', plannedAmount: 1200, realizedAmount: 0, variance: 1200 },
              { id: 'new-2', categoryName: 'Transporte', plannedAmount: 300, realizedAmount: 0, variance: 300 }
            ]
          })
        });
        return;
      }

      return route.fallback();
    });

    await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Copiar do mês anterior' }).click();

    await expect(page.getByText('Orçamento do mês anterior copiado.')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Moradia' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Transporte' }).first()).toBeVisible();
    await expect(page.getByText('2 categorias neste filtro')).toBeVisible();
  });

  test('edita o valor planejado na linha da categoria', async ({ page }) => {
    await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Adicionar categoria' }).click();
    const dialog = page.getByRole('dialog', { name: 'Adicionar categoria' });
    await dialog.getByPlaceholder('0,00').fill('800');
    await dialog.getByRole('button', { name: 'Adicionar' }).click();

    await page.getByRole('button', { name: 'Editar valor planejado de Mercado' }).click();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();

    await page.locator('.edit-input').fill('900');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Valor planejado atualizado.')).toBeVisible();
  });

  test('filtra categorias do orçamento por atenção e estouro', async ({ page }) => {
    await page.route('**/api/v1/budget/**', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          year: 2026,
          month: 8,
          totalPlanned: 1500,
          totalRealized: 350,
          totalVariance: 1150,
          items: [
            { id: 'b1', categoryName: 'Moradia', plannedAmount: 300, realizedAmount: 350, variance: -50 },
            { id: 'b2', categoryName: 'Lazer', plannedAmount: 1200, realizedAmount: 0, variance: 1200 }
          ]
        })
      });
    });

    await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });

    const totalRow = page.getByLabel('Total exibido no orçamento');
    await expect(page.getByText('2 categorias neste filtro')).toBeVisible();
    await expect(totalRow.getByText('R$ 1.500,00')).toBeVisible();
    await expect(totalRow.getByText('23%')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ritmo do mês' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Composição planejada' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Estouraram o planejado' })).toBeVisible();
    await expect(page.getByText('Reveja o valor ou corte o gasto no que resta do mês.')).toBeVisible();
    await expect(page.getByText('117% do planejado')).toBeVisible();

    await page.getByRole('radiogroup', { name: 'Filtrar orçamento' }).getByRole('radio', { name: 'Em atenção' }).click();
    await expect(page.getByText('1 categoria neste filtro')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Moradia' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Lazer' })).toHaveCount(0);
    await expect(totalRow.getByText('R$ 300,00')).toBeVisible();
    await expect(totalRow.getByText('117%')).toBeVisible();

    await page.getByRole('radiogroup', { name: 'Filtrar orçamento' }).getByRole('radio', { name: 'Estouradas' }).click();
    await expect(page.getByText('1 categoria neste filtro')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Moradia' }).first()).toBeVisible();
    await expect(totalRow.getByText('R$ 300,00')).toBeVisible();
    await expect(totalRow.getByText('117%')).toBeVisible();

    await page.getByRole('radiogroup', { name: 'Filtrar orçamento' }).getByRole('radio', { name: 'Todas' }).click();
    await expect(page.getByText('2 categorias neste filtro')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Lazer' }).first()).toBeVisible();
    await expect(totalRow.getByText('R$ 1.500,00')).toBeVisible();
  });

  test('remove uma categoria do orçamento', async ({ page }) => {
    await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Adicionar categoria' }).click();
    const dialog = page.getByRole('dialog', { name: 'Adicionar categoria' });
    await dialog.getByPlaceholder('0,00').fill('300');
    await dialog.getByRole('button', { name: 'Adicionar' }).click();
    await expect(page.getByRole('cell', { name: 'Mercado' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Remover' }).first().click();
    // Remover agora exige confirmação num confirm-sheet.
    await page.getByRole('dialog').getByRole('button', { name: 'Remover' }).click();
    await expect(page.getByText('Item removido do orçamento.')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Mercado' }).first()).not.toBeVisible();
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
