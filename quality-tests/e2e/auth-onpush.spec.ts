import { expect, test } from '@playwright/test';

test.describe('telas de auth sob OnPush', () => {
  test('esqueci a senha: digita, envia e mostra sucesso', async ({ page }) => {
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

    await page.route('**/api/v1/auth/forgot-password', (r) =>
      r.fulfill({ status: 204, body: '' }));

    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });
    const email = page.getByPlaceholder('Digite seu e-mail');
    await email.fill('alguem@teste.com');
    await expect(email).toHaveValue('alguem@teste.com');

    await page.getByRole('button', { name: /Enviar link/ }).click();
    await expect(page.getByRole('status')).toBeVisible({ timeout: 10000 });
    console.log('OK forgot-password: sucesso renderizou sob OnPush');
    expect(erros).toEqual([]);
  });

  test('redefinir senha: os requisitos reagem à digitação', async ({ page }) => {
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));

    await page.goto('/reset-password?token=abc123', { waitUntil: 'domcontentloaded' });
    const nova = page.locator('input[type="password"]').first();
    await nova.fill('abc');

    // canSubmit/hasMinLength viraram computed: o botão tem que continuar reagindo
    const botao = page.getByRole('button', { name: /Redefinir|Salvar/ });
    await expect(botao).toBeDisabled();

    await nova.fill('Senha12345');
    const confirma = page.locator('input[type="password"]').nth(1);
    await confirma.fill('Senha12345');
    await expect(botao).toBeEnabled();
    console.log('OK reset-password: computed reagem à digitação');
    expect(erros).toEqual([]);
  });
});
