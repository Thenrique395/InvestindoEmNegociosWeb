import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle' });
await page.fill('input[type="email"], input[name="email"]', 'teste.rl@example.com');
await page.fill('input[type="password"]', 'Teste@12345');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 15000 });
console.log('1) Login OK, URL:', page.url());

// ---- DESPESAS ----
await page.goto('http://localhost:4200/despesas', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

async function criarDespesa(nome, valor, vencimento) {
  await page.click('button:has-text("Adicionar despesa")');
  await page.waitForTimeout(300);
  await page.fill('input[name="nome"]', nome);
  await page.selectOption('select[name="categoria"]', { index: 1 });
  await page.fill('input[name="valor"]', valor);
  await page.fill('input[name="vencimento"]', vencimento);
  await page.waitForTimeout(200);
  await page.click('button:has-text("Salvar despesa")');
  await page.waitForTimeout(800);
}

try {
  await criarDespesa('Aluguel Teste', '180000', '30/06/2026');
  await criarDespesa('Internet Teste', '12000', '28/06/2026');
  console.log('2) Despesas criadas');
} catch (e) {
  console.log('2) ERRO ao criar despesas:', e.message);
}

await page.screenshot({ path: '/tmp/rl-despesas.png', fullPage: true });

const rows = await page.locator('.responsive-list__row').count();
console.log('3) Linhas na tabela de despesas:', rows);

// ordenar por nome
const sortNome = page.locator('.responsive-list__sort:has-text("Nome")');
if (await sortNome.count()) {
  await sortNome.click();
  await page.waitForTimeout(300);
  console.log('4) Ordenação por Nome clicada, sem erro');
}

// selecionar uma linha
const firstCheckbox = page.locator('.responsive-list__item--checkbox input').first();
if (await firstCheckbox.count()) {
  await firstCheckbox.check();
  await page.waitForTimeout(200);
  console.log('5) Checkbox de linha marcado:', await firstCheckbox.isChecked());
}

// selecionar todas
const headerCheckbox = page.locator('.responsive-list__cell--checkbox input').first();
if (await headerCheckbox.count()) {
  await headerCheckbox.check();
  await page.waitForTimeout(200);
  console.log('6) Selecionar todas clicado');
}

await page.screenshot({ path: '/tmp/rl-despesas-2.png', fullPage: true });

// ---- RECEITAS ----
await page.goto('http://localhost:4200/receitas', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

async function criarReceita(nome, valor, recebimento) {
  await page.click('button:has-text("Adicionar receita")');
  await page.waitForTimeout(300);
  await page.fill('input[name="fonte"]', nome);
  await page.selectOption('select[name="categoria"]', { index: 1 });
  await page.fill('input[name="valor"]', valor);
  await page.fill('input[name="recebimento"]', recebimento);
  await page.waitForTimeout(200);
  await page.click('button:has-text("Salvar receita")');
  await page.waitForTimeout(800);
}

try {
  await criarReceita('Salário Teste', '500000', '05/06/2026');
  console.log('7) Receita criada');
} catch (e) {
  console.log('7) ERRO ao criar receita:', e.message);
}

await page.screenshot({ path: '/tmp/rl-receitas.png', fullPage: true });
const receitaRows = await page.locator('.responsive-list__row').count();
console.log('8) Linhas na tabela de receitas:', receitaRows);

await browser.close();
console.log('OK');
