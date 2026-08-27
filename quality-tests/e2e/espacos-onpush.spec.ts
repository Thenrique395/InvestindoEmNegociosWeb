import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('espaços — OnPush + signals', () => {
  test('todos os cenários da tela', async ({ page }) => {
    test.setTimeout(90000);
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

    await setupAuthenticatedApp(page, { role: 'Advanced' });

    // A suíte não mocka /spaces: stub local com estado, para exercitar a tela inteira.
    let spaces = [
      { id: 's1', name: 'Pessoal', isDefault: true, hasPassword: false, createdAt: '2026-06-01T00:00:00Z' },
      { id: 's2', name: 'Negócio', isDefault: false, hasPassword: true, createdAt: '2026-06-02T00:00:00Z' }
    ];
    await page.route('**/api/v1/spaces**', async (route) => {
      const req = route.request();
      const method = req.method();
      const json = (body: unknown, status = 200) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

      if (method === 'GET') return json(spaces);
      if (method === 'POST' && req.url().includes('/enter')) return json({ token: 'x' });
      if (method === 'POST') {
        const body = req.postDataJSON();
        spaces = [...spaces, { id: `s${spaces.length + 1}`, name: body.name, isDefault: false, hasPassword: !!body.password, createdAt: '2026-06-03T00:00:00Z' }];
        return json(spaces.at(-1), 201);
      }
      if (method === 'PUT') return json({});
      if (method === 'DELETE') { spaces = spaces.filter((x) => x.id !== 's2'); return route.fulfill({ status: 204, body: '' }); }
      return json({});
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/espacos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Espaços' })).toBeVisible();

    // 1) digitar nos campos precisa refletir na tela (armadilha clássica de OnPush)
    const nome = page.getByLabel('Nome').first();
    await nome.fill('Meu Negócio');
    await expect(nome).toHaveValue('Meu Negócio');

    const senha = page.getByLabel('Senha').first();
    await senha.fill('segredo');
    await expect(senha).toHaveValue('segredo');

    // 2) criar → o campo tem que LIMPAR (estado escrito pelo componente, lido pelo input)
    await page.getByRole('button', { name: 'Criar espaço' }).click();
    await expect(nome).toHaveValue('', { timeout: 10000 });
    await expect(senha).toHaveValue('');
    console.log('OK criar + limpeza dos campos');

    // 3) lista renderizada
    const cards = page.locator('app-section-card', { hasText: 'Meus espaços' }).locator('article');
    await expect(cards.first()).toBeVisible();
    const total = await cards.count();
    console.log('ESPACOS na lista =', total);

    // 4) editar: abre o formulário inline, digita, cancela
    await cards.first().getByRole('button', { name: 'Editar' }).click();
    const editNome = cards.first().getByLabel('Nome');
    await expect(editNome).toBeVisible();
    await editNome.fill('Renomeado');
    await expect(editNome).toHaveValue('Renomeado');
    await cards.first().getByRole('button', { name: 'Cancelar' }).click();
    await expect(cards.first().getByRole('button', { name: 'Editar' })).toBeVisible();
    console.log('OK editar/cancelar');

    // 5) excluir: confirm-dialog abre com o nome certo e cancela
    const excluivel = cards.filter({ has: page.getByRole('button', { name: 'Excluir' }) }).first();
    if (await excluivel.count()) {
      await excluivel.getByRole('button', { name: 'Excluir' }).click();
      // O conteúdo é portalizado para o body: o host fica sem tamanho, então
      // a asserção tem que mirar o diálogo em si, não o elemento hospedeiro.
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Excluir o espaço');
      await dialog.getByRole('button', { name: 'Cancelar' }).click();
      await expect(page.locator('app-confirm-dialog')).toHaveCount(0);
      console.log('OK confirmar exclusão (abre e cancela)');
    }

    await page.screenshot({ path: '../docs/ai-reports/primitivos/espacos.png', fullPage: true });
    console.log('ERROS de console =', erros.length, erros.slice(0, 3));
    expect(erros).toEqual([]);
  });
});
