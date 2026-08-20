import { expect, test, type Page } from '@playwright/test';

/**
 * Despesas ponta a ponta com **perfil Basic**, contra a API real.
 *
 * Roda sob demanda:
 *
 * ```bash
 * cd quality-tests
 * RUN_LIVE_SERVER_E2E=1 APP_BASE_URL=http://35.174.50.187:4201 \
 *   npx playwright test e2e/live-despesas-basic.spec.ts --project=chromium
 * ```
 *
 * Por que Basic: é o perfil que mais restringe (sem conta de baixa escolhível,
 * sem importação de fatura), então é onde um gate errado aparece. Mocks não
 * pegam isso — quem decide é o `FeatureAccessEvaluator` do backend.
 *
 * Todo dado criado aqui é apagado no fim, pelo próprio fluxo de exclusão que a
 * spec valida.
 */

const EMAIL = process.env['LIVE_BASIC_EMAIL'] || 'e2e.basic@teste.com';
const SENHA = process.env['LIVE_BASIC_PASSWORD'] || 'Teste@2026';

/** Prefixo único: a conta é compartilhada entre execuções. */
const MARCA = `QA${Date.now().toString().slice(-6)}`;

const nomes = {
  avista: `${MARCA} Avista`,
  cartao: `${MARCA} Cartao`,
  recorrente: `${MARCA} Recorrente`
};

function hojeNoMes(dia: number): string {
  const hoje = new Date();
  return `${String(dia).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
}

async function login(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByPlaceholder('Digite sua senha').fill(SENHA);
  await page.locator('form').getByRole('button', { name: /Entrar no dashboard/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 45000 });
}

const linha = (page: Page, nome: string) => page.locator('tbody tr').filter({ hasText: nome });

/**
 * Procura o lançamento no mês aberto e, se não estiver lá, avança até achar.
 *
 * Compra no cartão não entra no mês da compra: ela cai na competência da
 * fatura, que depende do dia de fechamento do cartão.
 */
async function acharNoPeriodo(page: Page, nome: string, mesesAdiante = 2): Promise<number> {
  for (let mes = 0; mes <= mesesAdiante; mes += 1) {
    if (mes > 0) {
      await page.getByRole('button', { name: /Próximo mês|próximo/i }).first().click();
      await page.waitForTimeout(2500);
    }
    if ((await linha(page, nome).count()) > 0) return mes;
  }
  return -1;
}

async function irParaDespesas(page: Page): Promise<void> {
  // Recarrega de propósito: o mês aberto é estado do componente, e um teste que
  // navegou pela competência da fatura deixaria o próximo em outro mês.
  await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Adicionar despesa' }).first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1500);
}

/** Cadastro pelo modal. `parcelas` > 1 exige cartão selecionado. */
async function criarDespesa(
  page: Page,
  dados: { nome: string; valor: string; dia: number; cartao?: string; parcelas?: number; recorrenteMeses?: number }
): Promise<void> {
  await page.getByRole('button', { name: 'Adicionar despesa' }).first().click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();

  await modal.getByPlaceholder('Ex.: mercado, farmácia, aluguel').fill(dados.nome);
  await modal.getByPlaceholder('0,00').fill(dados.valor);
  await modal.getByRole('textbox', { name: 'Vencimento' }).fill(hojeNoMes(dados.dia));

  await modal.getByRole('combobox', { name: 'Categoria da despesa' }).click();
  await page.getByRole('listbox').getByRole('option').first().click();

  if (dados.cartao) {
    await modal.getByRole('combobox', { name: 'Forma de pagamento' }).click();
    await page.getByRole('listbox').getByRole('option', { name: /cart[ãa]o de crédito/i }).click();

    // A conta tem um único cartão durante o teste; o rótulo da opção é montado
    // pela tela (bandeira + final), então escolher a primeira é mais estável.
    await modal.getByRole('combobox', { name: 'Cartão do lançamento' }).click();
    await page.getByRole('listbox').getByRole('option').first().click();
  }

  if (dados.parcelas || dados.recorrenteMeses) {
    // O input do toggle é sr-only e fica atrás do trilho: clica-se no trilho.
    await modal.locator('.toggle-field__switch').first().click();
  }

  if (dados.parcelas && dados.parcelas > 1) {
    await modal.getByRole('spinbutton', { name: 'Número de parcelas' }).fill(String(dados.parcelas));
  }

  if (dados.recorrenteMeses) {
    await modal.getByRole('spinbutton', { name: /Repetir|meses/i }).first().fill(String(dados.recorrenteMeses));
  }

  const resposta = page.waitForResponse(
    (res) => res.request().method() === 'POST' && res.url().includes('/plans'),
    { timeout: 30000 }
  );
  await modal.getByRole('button', { name: 'Salvar despesa' }).click();
  expect((await resposta).ok()).toBe(true);
  await page.waitForTimeout(1200);
}

async function excluir(page: Page, nome: string, escopo: 'single' | 'all' = 'single'): Promise<void> {
  await linha(page, nome).first().getByRole('button', { name: /excluir|remover/i }).first().click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();

  const opcoes = dialogo.getByRole('radio');
  if ((await opcoes.count()) > 0 && escopo === 'all') {
    await opcoes.nth(1).click();
  }

  await dialogo.getByRole('button', { name: /^(Excluir|Encerrar)/ }).click();
  await page.waitForTimeout(1500);
}

/**
 * Apaga pela API os cartões e planos marcados pelo teste.
 *
 * Usa a sessão do próprio navegador: os cookies já estão no contexto, e o
 * backend exige o `X-XSRF-TOKEN` correspondente em métodos de escrita.
 */
async function limparCartoesPelaApi(page: Page): Promise<void> {
  const cookies = await page.context().cookies();
  const xsrf = cookies.find((c) => c.name === 'XSRF-TOKEN')?.value;
  if (!xsrf) return;

  // A API é sempre a da origem que serve o app: no DEV é o próprio host, no
  // servidor local é o proxy `/api`. Fixar o host mandaria a requisição para
  // fora do domínio dos cookies.
  const api = (caminho: string) => new URL(`/api/v1/${caminho}`, page.url()).toString();
  const headers = { 'X-XSRF-TOKEN': xsrf };

  const planos = await (await page.request.get(api('plans?type=Expense'), { headers })).json();
  for (const plano of planos as Array<{ id: string; title: string }>) {
    if (/^QA\d{6} /.test(plano.title || '')) {
      await page.request.delete(api(`plans/${plano.id}`), { headers });
    }
  }

  const cartoes = await (await page.request.get(api('cards'), { headers })).json();
  for (const cartao of cartoes as Array<{ id: string; nickname: string }>) {
    if (/^QA\d{6} Cartao/.test(cartao.nickname || '')) {
      await page.request.delete(api(`cards/${cartao.id}`), { headers });
    }
  }
}

test.describe('live — Despesas com perfil Basic', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120000);

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('a tela abre e o perfil é Basic', async () => {
    await irParaDespesas(page);
    await expect(page.locator('.sidebar__profile-plan')).toContainText(/Essencial|Basic/i);
    await expect(page.getByRole('heading', { level: 2, name: /Despesas de/i })).toBeVisible();
  });

  test('cadastra um cartão para os lançamentos de crédito', async () => {
    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });

    // Resíduo de execução interrompida atrapalha o cadastro seguinte: a conta é
    // compartilhada e o índice único do cartão inclui os 4 últimos dígitos.
    await limparCartoesPelaApi(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // O botão engloba título e descrição ("Adicionar cartão" + "Registrar um
    // novo cartão com limite e ciclo."), então nada de `exact`.
    const novoCartao = page.getByRole('button', { name: /Adicionar cartão/ }).first();
    await expect(novoCartao).toBeVisible({ timeout: 60000 });

    const jaExiste = await page.getByText(MARCA, { exact: false }).count();
    if (jaExiste === 0) {
      await novoCartao.click();
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Os 4 últimos dígitos entram num índice único (UserId, BrandId, Last4):
      // repetir o número faz o cadastro falhar mesmo com apelido diferente.
      // A bandeira vem da API e já entra selecionada; salvar antes disso derruba
      // a validação do formulário inteiro.
      await expect(modal.getByRole('combobox', { name: 'Bandeira do cartão' })).toContainText(/\S/, { timeout: 20000 });

      await modal.getByPlaceholder('0000 0000 0000 0000').fill(`42424242424${MARCA.slice(-5)}`);
      await modal.getByPlaceholder('Ex.: JOAO P SANTOS').fill('QA BASIC');
      await modal.getByPlaceholder('Ex.: Nubank pessoal').fill(`${MARCA} Cartao`);
      await modal.getByRole('combobox', { name: 'Banco' }).fill('Banco QA');
      await modal.getByPlaceholder('R$ 0,00').fill('5000,00');

      const resposta = page.waitForResponse(
        (res) => res.request().method() === 'POST' && res.url().includes('/cards'),
        { timeout: 30000 }
      );
      await modal.getByRole('button', { name: 'Salvar cartão' }).click();
      expect((await resposta).ok()).toBe(true);
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(`${MARCA} Cartao`).first()).toBeVisible({ timeout: 20000 });
  });

  test('cria despesa à vista e ela aparece na listagem', async () => {
    await irParaDespesas(page);
    await criarDespesa(page, { nome: nomes.avista, valor: '150,00', dia: 12 });
    await expect(linha(page, nomes.avista)).toBeVisible({ timeout: 20000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(linha(page, nomes.avista)).toBeVisible({ timeout: 20000 });
  });

  test('cria despesa parcelada no cartão', async () => {
    await irParaDespesas(page);
    await criarDespesa(page, {
      nome: nomes.cartao,
      valor: '900,00',
      dia: 15,
      cartao: `${MARCA} Cartao`,
      parcelas: 3
    });

    // A compra é no dia 15 e o cartão fecha no dia 1, então a parcela cai na
    // fatura do mês seguinte — e a tela precisa dizer isso, senão o lançamento
    // recém-criado simplesmente some da lista.
    await expect(
      page.locator('.global-alert').filter({ hasText: /fatura de/i }),
      'compra que caiu em outra competência precisa avisar em qual fatura entrou'
    ).toBeVisible({ timeout: 15000 });

    const mesesAdiante = await acharNoPeriodo(page, nomes.cartao);
    expect(mesesAdiante, 'a parcela deveria aparecer na competência da fatura').toBeGreaterThan(0);

    // Primeira de três: a tabela mostra a posição da parcela.
    await expect(linha(page, nomes.cartao).first()).toContainText('1/3');
  });

  test('a recusa de remover o cartão diz quantas despesas há e em que mês', async () => {
    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Remover cartão' }).first().click();
    await page.waitForTimeout(800);

    // Antes dizia só "existem despesas vinculadas a ele", sem dizer onde.
    const alerta = page.locator('.global-alert');
    await expect(alerta).toContainText(/despesa(s)? vinculada(s)?/i);
    await expect(alerta).toContainText(/de \d{4}/);
    await expect(page.locator('.confirm-sheet')).toHaveCount(0);
  });

  test('cria despesa recorrente', async () => {
    await irParaDespesas(page);
    await criarDespesa(page, { nome: nomes.recorrente, valor: '80,00', dia: 20, recorrenteMeses: 3 });
    await expect(linha(page, nomes.recorrente)).toBeVisible({ timeout: 20000 });
  });

  test('edita o valor de uma despesa', async () => {
    await irParaDespesas(page);
    await linha(page, nomes.avista).getByRole('button', { name: /editar/i }).first().click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await modal.getByPlaceholder('0,00').fill('175,50');
    await modal.getByRole('button', { name: /Salvar/ }).click();
    await page.waitForTimeout(1500);

    await expect(linha(page, nomes.avista)).toContainText('175,50');
  });

  test('busca e filtro de status estreitam a lista', async () => {
    await irParaDespesas(page);
    await page.getByPlaceholder('Nome da despesa').fill(nomes.avista);
    await expect(linha(page, nomes.avista)).toBeVisible();
    await expect(linha(page, nomes.recorrente)).toHaveCount(0);
    await page.getByPlaceholder('Nome da despesa').fill('');
    await expect(linha(page, nomes.recorrente)).toBeVisible();
  });

  test('exclui a despesa do cartão — o caso que estava bloqueado', async () => {
    await irParaDespesas(page);
    expect(await acharNoPeriodo(page, nomes.cartao)).toBeGreaterThanOrEqual(0);
    await excluir(page, nomes.cartao, 'all');

    await expect(page.getByText(/Não é possível excluir uma despesa associada/i)).toHaveCount(0);
    await expect(linha(page, nomes.cartao)).toHaveCount(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await expect(linha(page, nomes.cartao)).toHaveCount(0);
  });

  test('exclui a recorrente encerrando a recorrência', async () => {
    await irParaDespesas(page);
    await excluir(page, nomes.recorrente, 'all');
    await expect(linha(page, nomes.recorrente)).toHaveCount(0);
  });

  test('exclui a avulsa e a lista fica limpa do teste', async () => {
    await irParaDespesas(page);
    await excluir(page, nomes.avista);
    await expect(linha(page, nomes.avista)).toHaveCount(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await expect(page.getByText(MARCA, { exact: false })).toHaveCount(0);
  });

  test('remove os cartões de teste — inclusive de execuções anteriores', async () => {
    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Adicionar cartão/ }).first()).toBeVisible({ timeout: 60000 });

    // Caminho normal: remover pela tela. A tela recusa cartão com despesa
    // vinculada — inclusive despesa em competência de fatura futura, que não
    // aparece no mês aberto —, então a limpeza cai para a API quando isso
    // acontece. Sem essa saída, um resíduo de execução anterior deixaria a
    // conta suja para sempre.
    const alvo = page
      .locator('li, article')
      .filter({ hasText: /QA\d{6} Cartao/ })
      .filter({ has: page.getByRole('button', { name: 'Remover cartão' }) })
      .first();

    if (await alvo.count()) {
      await alvo.getByRole('button', { name: 'Remover cartão' }).first().click();
      await page.waitForTimeout(800);
      const sheet = page.locator('.confirm-sheet');
      if (await sheet.count()) {
        await sheet.getByRole('button', { name: 'Remover cartão' }).click();
        await page.waitForTimeout(2500);
      }
    }

    await limparCartoesPelaApi(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await expect(page.getByText(/QA\d{6} Cartao/)).toHaveCount(0);
  });
});
