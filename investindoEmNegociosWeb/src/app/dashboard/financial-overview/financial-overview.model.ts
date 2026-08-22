import { hasAtLeastRole, UserRole } from '../../roles';
import { AiHealthStatus } from '../../financial-assistant.service';

export type OverviewPeriodo = 'month' | 'quarter' | 'year';

/** Fator que compõe a nota de saúde, com a severidade que a IA atribuiu. */
export interface OverviewHealthFactor {
  rotulo: string;
  status: AiHealthStatus;
  explicacao: string;
}

/**
 * Snapshot com os dados reais que o dashboard já calcula hoje.
 * `null` significa "sem dados" — nunca inventar valor no lugar.
 */
export interface FinancialOverviewInput {
  periodoContexto: {
    nome: string;
    nomeComArtigo: string;
    detalheReceitas: string;
    detalheDespesas: string;
    detalheProjetado: string;
  };
  saldoPeriodo: number;
  saldoDisponivel: number;
  saldoEmContas: number;
  pendencias: number;
  saldoProjetado: number;
  receitas: { total: number; pendentes: number; anterior: number | null };
  despesas: { total: number; pagas: number; emAberto: number; anterior: number | null };
  patrimonio: {
    liquido: number;
    ativos: number;
    passivos: number;
    investimentos: number;
    delta: number | null;
  };
  compromissos: {
    emAtraso: number;
    proximosSeteDias: number;
    valorEmAberto: number;
    dividaCartoes: number;
    temCartoes: boolean;
  };
  saude: {
    status: AiHealthStatus;
    resumo: string;
    score: number;
    fatores: OverviewHealthFactor[];
  } | null;
}

export type OverviewCardId = 'saldo' | 'receitas' | 'despesas' | 'patrimonio' | 'comprometido' | 'sobra';
export type OverviewTone = 'primary' | 'success' | 'danger' | 'info' | 'warning' | 'neutral' | 'brand';

export interface OverviewCardDelta {
  direction: 'up' | 'down';
  favorable: boolean;
  /** Só a variação, dentro da pílula colorida: "2,6%". */
  text: string;
  /** O recorte, fora da pílula e em cinza: "no mês", "vs. mês anterior". */
  context?: string;
}

/**
 * Barra fina no rodapé da célula.
 *
 * **Regra única: parte ÷ (parte + resto).** Toda barra da faixa mede a mesma
 * coisa — quanto de um todo do período já se concretizou. Barra cheia sempre
 * quer dizer "acabou, não falta nada":
 *
 * | Célula          | Barra                                    | Cheia significa            |
 * |-----------------|------------------------------------------|----------------------------|
 * | Receitas        | recebidas ÷ (recebidas + a receber)      | tudo que esperava já caiu  |
 * | Despesas        | pagas ÷ (pagas + em aberto)              | já quitou tudo do mês      |
 * | Dá para gastar  | sobra ÷ (sobra + comprometido)           | quase nada tem dono ainda  |
 *
 * As demais células **não têm barra**, e isso é deliberado. Saldo é a resposta
 * da tela, não uma proporção. Patrimônio é composição (ativos sobre o total) e
 * Comprometido é peso na renda — perguntas legítimas, mas diferentes desta. Já
 * existiu uma versão com as cinco barras, cada uma medindo uma família
 * diferente; ninguém conseguia aprender uma regra e aplicar na faixa inteira.
 *
 * **Barra vazia é dado, não falha.** Começo de mês sem nada recebido ou pago dá
 * 0% em Receitas e Despesas — e é exatamente o que a nota logo acima da barra
 * diz ("Recebidas no mês: R$ 0,00"). Não preencher um mínimo visual para
 * "parecer melhor": isso mostraria progresso que não aconteceu.
 */
export interface OverviewCardProgress {
  /** 0–100, já limitado. */
  percent: number;
  /** O que a barra representa. Vira o rótulo acessível. */
  label: string;
}

export interface OverviewCard {
  id: OverviewCardId;
  tone: OverviewTone;
  /** Lavagem de fundo da célula. Marca a resposta principal do perfil. */
  wash?: 'brand' | 'income';
  title: string;
  value: string;
  delta: OverviewCardDelta | null;
  progress: OverviewCardProgress | null;
  note: string;
  tooltip?: string;
  detailsRoute?: string;
  detailsLabel?: string;
}

export interface OverviewSummary {
  analytical: boolean;
  text: string;
}

export interface OverviewHealth {
  score: number;
  /** Faixa da nota em palavra: "frágil", "atenção", "boa", "sólida". */
  faixa: string;
  tone: 'success' | 'warning' | 'danger';
  resumo: string;
  fatores: OverviewHealthFactor[];
}

export type CurrencyFormatter = (value: number) => string;

const PLAN_LABELS: Record<UserRole, string> = {
  Basic: 'Essencial',
  Intermediate: 'Controle',
  Advanced: 'Patrimônio',
  Admin: 'Patrimônio'
};

const DELTA_PERIOD_LABELS: Record<OverviewPeriodo, string> = {
  month: 'vs. mês anterior',
  quarter: 'vs. trimestre anterior',
  year: 'vs. ano anterior'
};

export function planoComercialLabel(role: UserRole | null): string {
  return PLAN_LABELS[role ?? 'Basic'];
}

/**
 * Saudação do cabeçalho — COMPONENTES.md §2, "título 'Bom dia, <nome>' (varia por hora)".
 * Sem nome cadastrado a saudação fica sozinha; não inventar "usuário".
 */
export function buildOverviewGreeting(userName: string, agora: Date = new Date()): string {
  const hora = agora.getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroNome = userName.trim().split(/\s+/)[0] ?? '';
  return primeiroNome ? `${saudacao}, ${primeiroNome}` : saudacao;
}

/** Eyebrow do cabeçalho: "Visão geral · agosto de 2026". O uppercase é do CSS. */
export function buildOverviewEyebrow(periodoLabel: string): string {
  return `Visão geral · ${periodoLabel}`;
}

export function buildOverviewCards(
  input: FinancialOverviewInput,
  role: UserRole | null,
  periodo: OverviewPeriodo,
  fmt: CurrencyFormatter
): OverviewCard[] {
  const intermediate = hasAtLeastRole(role, 'Intermediate');
  const deltaLabel = DELTA_PERIOD_LABELS[periodo];

  // Essencial responde uma pergunta só: saldo, receitas, despesas.
  // Controle e Patrimônio veem os cinco (PERFIS_E_PERMISSOES.md, "Dashboard por perfil").
  const cards: OverviewCard[] = [buildSaldoCard(input, intermediate, fmt)];

  if (intermediate) {
    cards.push(buildPatrimonioCard(input, fmt));
  }

  cards.push(buildReceitasCard(input, deltaLabel, fmt), buildDespesasCard(input, deltaLabel, fmt));

  cards.push(intermediate ? buildComprometidoCard(input, fmt) : buildSobraCard(input, fmt));

  return cards;
}

export function buildOverviewSummary(
  input: FinancialOverviewInput,
  role: UserRole | null,
  periodo: OverviewPeriodo
): OverviewSummary {
  if (!hasAtLeastRole(role, 'Intermediate')) {
    return { analytical: false, text: 'Seu resumo financeiro do período está pronto.' };
  }

  // O resumo da IA só sobe para o cabeçalho quando o painel de saúde não vai
  // exibi-lo logo abaixo — senão a mesma frase aparece duas vezes na dobra.
  if (input.saude?.resumo && !mostraPainelSaude(input, role)) {
    return { analytical: true, text: input.saude.resumo };
  }

  const sentences: string[] = [];
  const periodoNome = periodo === 'month' ? 'mês' : periodo === 'quarter' ? 'trimestre' : 'ano';

  if (input.patrimonio.delta !== null && input.patrimonio.delta !== 0) {
    sentences.push(input.patrimonio.delta > 0 ? 'Seu patrimônio cresceu no período.' : 'Seu patrimônio recuou no período.');
  }

  const despesasPct = percentChange(input.despesas.total, input.despesas.anterior);
  if (despesasPct !== null && Math.abs(despesasPct) >= 5) {
    sentences.push(
      despesasPct < 0
        ? `Suas despesas caíram ${formatPercent(Math.abs(despesasPct))} em relação ao ${periodoNome} anterior.`
        : `Suas despesas subiram ${formatPercent(despesasPct)} em relação ao ${periodoNome} anterior.`
    );
  }

  if (sentences.length === 0) {
    return { analytical: false, text: 'Seu resumo financeiro do período está pronto.' };
  }

  return { analytical: true, text: sentences.slice(0, 2).join(' ') };
}

/**
 * Painel de saúde financeira — só o perfil Patrimônio o vê
 * (PERFIS_E_PERMISSOES.md). Sem análise da IA não há painel: um índice
 * inventado a partir de heurística local diria outra coisa que o número
 * mostrado no resto do app.
 */
export function buildOverviewHealth(input: FinancialOverviewInput, role: UserRole | null): OverviewHealth | null {
  if (!mostraPainelSaude(input, role)) {
    return null;
  }

  const score = clampPercent(input.saude!.score);
  return {
    score,
    faixa: score >= 80 ? 'sólida' : score >= 60 ? 'boa' : score >= 40 ? 'atenção' : 'frágil',
    tone: score >= 60 ? 'success' : score >= 40 ? 'warning' : 'danger',
    resumo: input.saude!.resumo,
    fatores: input.saude!.fatores
  };
}

function mostraPainelSaude(input: FinancialOverviewInput, role: UserRole | null): boolean {
  return hasAtLeastRole(role, 'Advanced') && input.saude !== null;
}

function buildSaldoCard(input: FinancialOverviewInput, intermediate: boolean, fmt: CurrencyFormatter): OverviewCard {
  if (!intermediate) {
    return {
      id: 'saldo',
      tone: 'primary',
      wash: 'brand',
      title: 'Saldo do período',
      value: fmt(input.saldoPeriodo),
      delta: null,
      progress: null,
      note: 'Receitas recebidas menos despesas com vencimento no período.',
      tooltip:
        'Saldo do período = saldo anterior acumulado mais receitas recebidas, menos despesas com vencimento no período selecionado.'
    };
  }

  return {
    id: 'saldo',
    tone: 'primary',
    wash: 'brand',
    title: 'Saldo disponível',
    value: fmt(input.saldoDisponivel),
    delta: null,
    // A célula em destaque não leva barra: ela é a resposta, não uma proporção.
    progress: null,
    // Duas informações, não três: a projeção crowd a célula em destaque e já
    // aparece na seção de evolução patrimonial logo abaixo.
    note: `Em contas: ${fmt(input.saldoEmContas)} · Em aberto: ${fmt(input.pendencias)}`,
    tooltip:
      'Saldo disponível real = saldo atual das contas ativas. A projeção considera receitas pendentes e despesas em aberto do período selecionado.',
    detailsRoute: '/contas',
    detailsLabel: 'Ver contas'
  };
}

function buildPatrimonioCard(input: FinancialOverviewInput, fmt: CurrencyFormatter): OverviewCard {
  const { patrimonio } = input;
  const base = patrimonio.ativos + patrimonio.passivos;
  return {
    id: 'patrimonio',
    tone: 'brand',
    title: 'Patrimônio líquido',
    value: fmt(patrimonio.liquido),
    delta: buildPatrimonioDelta(input, fmt),
    // Sem barra: composição de ativos e passivos não é "quanto já foi feito",
    // e a faixa passou a ter uma regra só (ver `OverviewCardProgress`).
    progress: null,
    note: `Ativos: ${fmt(patrimonio.ativos)} · Passivos: ${fmt(patrimonio.passivos)} · Investimentos: ${fmt(patrimonio.investimentos)}`,
    tooltip:
      'Tudo que você tem menos tudo que você deve: saldos das contas e investimentos, descontando faturas em aberto, parcelas e financiamentos. A variação respeita o período selecionado.'
  };
}

function buildReceitasCard(input: FinancialOverviewInput, deltaLabel: string, fmt: CurrencyFormatter): OverviewCard {
  const totalPrevisto = input.receitas.total + input.receitas.pendentes;
  return {
    id: 'receitas',
    tone: 'success',
    title: 'Receitas',
    value: fmt(totalPrevisto),
    delta: buildPercentDelta(totalPrevisto, input.receitas.anterior, deltaLabel, 'upIsGood'),
    progress:
      totalPrevisto > 0
        ? { percent: ratio(input.receitas.total, totalPrevisto), label: 'Recebidas sobre o previsto do período' }
        : null,
    note: `Recebidas ${input.periodoContexto.nomeComArtigo}: ${fmt(input.receitas.total)} · ${input.periodoContexto.detalheReceitas}: ${fmt(input.receitas.pendentes)}`,
    tooltip:
      'Tudo que entrou no período escolhido: salário, serviços, aluguéis, rendimentos. A barra é recebidas ÷ (recebidas + a receber): cheia significa que tudo que você esperava receber já caiu.',
    detailsRoute: '/receitas',
    detailsLabel: 'Ver receitas'
  };
}

function buildDespesasCard(input: FinancialOverviewInput, deltaLabel: string, fmt: CurrencyFormatter): OverviewCard {
  // Denominador é pagas + em aberto, não o total do card: `total` pode carregar
  // lançamento cancelado, e aí a barra nunca fecharia em 100% mesmo com tudo quitado.
  const movimentado = input.despesas.pagas + input.despesas.emAberto;
  return {
    id: 'despesas',
    tone: 'danger',
    title: 'Despesas',
    value: fmt(input.despesas.total),
    delta: buildPercentDelta(input.despesas.total, input.despesas.anterior, deltaLabel, 'downIsGood'),
    progress:
      movimentado > 0
        ? { percent: ratio(input.despesas.pagas, movimentado), label: 'Pagas sobre o total do período' }
        : null,
    note: `Pagas ${input.periodoContexto.nomeComArtigo}: ${fmt(input.despesas.pagas)} · ${input.periodoContexto.detalheDespesas}: ${fmt(input.despesas.emAberto)}`,
    tooltip:
      'Tudo que saiu ou ainda vai sair no período, pago ou em aberto. A barra é pagas ÷ (pagas + em aberto): cheia significa que você já quitou tudo do mês.',
    detailsRoute: '/despesas',
    detailsLabel: 'Ver despesas'
  };
}

/**
 * Comprometido = despesas em aberto do período. Cartões e parcelas entram
 * porque cada parcela de fatura é uma despesa com cartão vinculado — somar
 * `dividaCartoes` por cima contaria o mesmo dinheiro duas vezes.
 */
function buildComprometidoCard(input: FinancialOverviewInput, fmt: CurrencyFormatter): OverviewCard {
  const comprometido = input.despesas.emAberto;
  return {
    id: 'comprometido',
    tone: 'brand',
    title: 'Comprometido',
    value: fmt(comprometido),
    delta: null,
    // Sem barra: "peso na receita" é outra pergunta que não a das barras de
    // conclusão, e misturar as duas na mesma faixa tira o sentido de ambas.
    progress: null,
    note: 'Cartões, parcelas e contas a vencer',
    tooltip:
      'Cartões, parcelas e contas com vencimento futuro dentro do período. É o que já tem dono no seu saldo, mesmo que ainda não tenha saído.'
  };
}

/**
 * "Dá para gastar" — a resposta do perfil Essencial (TELAS.md §1: projeção de
 * sobra no fim do período, com a conta explícita). É o saldo projetado que o
 * backend já calcula: saldo de hoje, mais o que há a receber, menos tudo que
 * ainda vence. Os perfis pagos veem "Comprometido" nesta posição — a pergunta
 * deles é outra.
 */
function buildSobraCard(input: FinancialOverviewInput, fmt: CurrencyFormatter): OverviewCard {
  // Margem restante contra margem total: o que sobra e o que já tem dono somam
  // a margem do período. Sobra negativa vira 0 no numerador — não resta nada,
  // e barra negativa não existe; o denominador segue positivo por causa do
  // comprometido, então a barra aparece vazia em vez de sumir.
  const sobra = Math.max(0, input.saldoProjetado);
  const comprometido = input.despesas.emAberto;
  const margemTotal = sobra + comprometido;
  return {
    id: 'sobra',
    tone: 'success',
    wash: 'income',
    title: 'Dá para gastar',
    value: fmt(input.saldoProjetado),
    delta: null,
    progress:
      margemTotal > 0
        ? { percent: ratio(sobra, margemTotal), label: 'Margem que resta sobre a margem do período' }
        : null,
    note: `${input.periodoContexto.detalheProjetado}, já descontado o que vence`,
    tooltip:
      'Projeção do que ainda cabe no período: pega o saldo de hoje, soma o que você tem a receber e desconta tudo que ainda vence. A barra é o que sobra ÷ (o que sobra + o que já está comprometido): cheia significa que quase nada da sua margem tem dono.'
  };
}

function buildPercentDelta(
  atual: number,
  anterior: number | null,
  deltaLabel: string,
  goodWhen: 'upIsGood' | 'downIsGood'
): OverviewCardDelta | null {
  const pct = percentChange(atual, anterior);
  if (pct === null || pct === 0) {
    return null;
  }

  const up = pct > 0;
  return {
    direction: up ? 'up' : 'down',
    favorable: goodWhen === 'upIsGood' ? up : !up,
    text: formatPercent(Math.abs(pct)),
    context: deltaLabel
  };
}

/**
 * A variação do patrimônio aparece em porcentagem, não em reais: sobre um
 * patrimônio de seis dígitos, "+R$ 5.400" não diz se foi muito ou pouco.
 * Sem posição anterior positiva a porcentagem não existe, e aí o valor
 * absoluto é a única leitura honesta.
 */
function buildPatrimonioDelta(input: FinancialOverviewInput, fmt: CurrencyFormatter): OverviewCardDelta | null {
  const { delta, liquido } = input.patrimonio;
  if (delta === null || delta === 0) {
    return null;
  }

  const anterior = liquido - delta;
  const pct = percentChange(liquido, anterior);
  return {
    direction: delta > 0 ? 'up' : 'down',
    favorable: delta > 0,
    text: pct === null ? fmt(Math.abs(delta)) : formatPercent(Math.abs(pct)),
    context: input.periodoContexto.nomeComArtigo
  };
}

function percentChange(atual: number, anterior: number | null): number | null {
  if (anterior === null || anterior <= 0) {
    return null;
  }
  return ((atual - anterior) / anterior) * 100;
}

function ratio(parte: number, todo: number): number {
  return clampPercent((parte / todo) * 100);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',')}%`;
}
