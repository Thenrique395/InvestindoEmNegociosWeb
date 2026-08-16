#!/usr/bin/env node
/**
 * Briefing do redesign — o que precisa estar na cabeça antes de tocar em tela.
 *
 * Existe porque a auditoria de 2026-08-16 mostrou um padrão: as regras estavam escritas
 * no handoff, o plano registrava as correções, e mesmo assim quatro telas foram dadas por
 * concluídas divergindo delas. Documento longo não é lido no meio da tarefa; este script
 * cabe em uma tela e roda em um segundo.
 *
 * Os números vêm do gate ao vivo (`check-handoff-fidelity.mjs`), não de texto fixo — um
 * briefing com número escrito à mão vira mentira no primeiro commit.
 *
 * Uso:
 *   npm run handoff:briefing
 *   node scripts/briefing-redesign.mjs
 */

import { avaliar, CORES } from './check-handoff-fidelity.mjs';

const { verde, vermelho, amarelo, fraco, fim } = CORES;
const NEGRITO = '\x1b[1m';

const linha = (c = '─') => c.repeat(74);
const titulo = (t) => console.log(`\n${NEGRITO}  ${t}${fim}\n  ${fraco}${linha()}${fim}\n`);

/* --------------------------------------------------------------- o critério */

console.log(`\n  ${NEGRITO}Redesign Investindo em Negócios — briefing${fim}`);
console.log(`  ${fraco}${linha('═')}${fim}`);
console.log(`
  O pacote em ${NEGRITO}design_handoff_investindo_redesign/${fim} é a especificação, não uma
  referência de inspiração. O critério de aceite é ${NEGRITO}igual ao handoff, não parecido${fim}.

  Uma tela pode ter o conteúdo certo — rótulos, KPIs, regra de negócio — e ainda assim não
  estar pronta, se a forma divergir. ${fraco}TELAS.md diz o que a tela mostra;${fim}
  ${fraco}ARQUITETURA_ANGULAR.md diz como ela é construída. Os dois são vinculantes.${fim}`);

/* ------------------------------------------------------- as regras, ao vivo */

titulo('Estado da fidelidade agora');

const resumo = avaliar();
const regressoes = resumo.filter((r) => r.estado === 'regressao');
const dividas = resumo.filter((r) => r.estado === 'divida');
const total = dividas.reduce((n, r) => n + r.hits.length, 0);

for (const { rule, hits, teto, estado } of resumo) {
  const marca = { ok: `${verde}✓${fim}`, divida: `${amarelo}⚠${fim}`, regressao: `${vermelho}✗${fim}` }[estado];
  const placar =
    estado === 'regressao'
      ? `${vermelho}REGREDIU ${hits.length}/${teto}${fim}`
      : estado === 'divida'
        ? `${amarelo}${String(hits.length).padStart(2)} abertas${fim}`
        : `${verde} zerada  ${fim}`;
  console.log(`  ${marca} ${rule.id.padEnd(3)} ${placar}  ${rule.titulo}`);
}

console.log(`\n  ${fraco}Detalhe com arquivo:linha → npm run handoff:report${fim}`);

if (regressoes.length) {
  console.log(`\n  ${vermelho}${NEGRITO}Há regressão aberta.${fim} Alguma mudança recente violou uma regra que já estava`);
  console.log(`  respeitada. Isso vem antes de qualquer tarefa nova: ${regressoes.map((r) => r.rule.id).join(', ')}.`);
}

/* -------------------------------------------------- o que não se faz, nunca */

titulo('As cinco coisas que não se faz');

console.log(`  ${vermelho}1.${fim} ${NEGRITO}Subir o BASELINE do gate para destravar entrega.${fim}
     O baseline é dívida com prazo, não permissão. Se o gate falhou, o código mudou para
     pior — corrija o código. Afrouxar a regra apaga a única memória que sobrou de por
     que ela existe.

  ${vermelho}2.${fim} ${NEGRITO}Reimplementar um primitivo de shared/ dentro da feature.${fim}
     Nem por cópia de SCSS, nem por ${fraco}::ng-deep${fim} no interior dele. Se a tela precisa de
     uma variação, ela vira \`@Input\` no primitivo. Três telas com a mesma variação = ela
     virou o padrão do primitivo.

  ${vermelho}3.${fim} ${NEGRITO}Corrigir a violação só na tela onde ela foi vista.${fim}
     Foi o que aconteceu com \`grid auto-fit\`: corrigido no dashboard, registrado no plano,
     e continuava em cinco arquivos — um deles compartilhado por três telas. Achou uma
     violação, procure as irmãs antes de fechar.

  ${vermelho}4.${fim} ${NEGRITO}Marcar tela como concluída sem rodar o gate.${fim}
     ${fraco}npm run handoff:check${fim} antes de escrever "✅ CONCLUÍDA" no plano. Sempre.

  ${vermelho}5.${fim} ${NEGRITO}Escrever hex, espaçamento, raio ou sombra literal.${fim}
     Se o valor não existe como token, ele vira token primeiro — em design-tokens.scss.`);

/* ---------------------------------------------------- as regras que pegam mais */

titulo('As que mais aparecem, e o que fazer');

console.log(`  ${NEGRITO}Faixa de indicadores${fim}  ${fraco}README §4${fim}
    ${verde}flex-wrap com flex: 1 1 210px${fim} — a última linha cresce e preenche
    ${vermelho}grid auto-fit${fim} — deixa célula vazia à direita em largura específica

  ${NEGRITO}Todo indicador tem tooltip${fim}  ${fraco}README §8 · ARQUITETURA §7${fim}
    Obrigatório, e pedido explícito do usuário. Deve dizer o que é ${NEGRITO}e como é calculado${fim} —
    tooltip que repete o rótulo não conta. Referência boa: investment-overview-panel.

  ${NEGRITO}Card em repouso não tem sombra${fim}  ${fraco}README §3${fim}
    Borda de 1px e raio 16px em repouso. Sombra só em ${fraco}:hover${fim} e em camada flutuante
    (modal, dropdown, toast).

  ${NEGRITO}Gráfico mora em shared/charts/${fim}  ${fraco}ARQUITETURA §8${fim}
    Nenhuma feature desenha série em SVG. Ícone inline é permitido; ${fraco}[attr.points]${fim} não.
    Se o primitivo não cobre o caso, estenda o primitivo pelo contrato ChartSeries.

  ${NEGRITO}Tabela${fim}  ${fraco}ARQUITETURA §7${fim}
    Uma única definição de coluna alimenta cabeçalho e linha. Nunca dois
    ${fraco}grid-template-columns${fim} escritos separadamente — divergem na primeira mudança.`);

/* ------------------------------------------------------------ o que está aberto */

titulo('O que está aberto');

if (total === 0 && !regressoes.length) {
  console.log(`  ${verde}Nenhuma dívida. A Fase 8 pode ser encerrada no PLANO_REDESIGN.md.${fim}`);
} else {
  console.log(`  ${amarelo}${total} violações${fim} de dívida herdada, mapeadas na ${NEGRITO}Fase 8${fim} do PLANO_REDESIGN.md.

  A ordem é por dependência, não por tamanho — 8.1 primeiro, porque as etapas seguintes
  reescrevem os mesmos arquivos. Ajustar sombra num card que vai ser trocado é trabalho
  jogado fora.

  ${NEGRITO}8.1 tem uma decisão pendente que bloqueia o resto${fim} e não é de escrever código:
  em cada par ${fraco}primitivo do handoff × componente legado${fim}, decidir qual sobrevive.
  O outro é ${NEGRITO}apagado${fim} — manter os dois é o que a regra R1 mede.

    app-kpi-strip      × app-transaction-summary-card
    app-progress-bar   × app-usage-bar
    app-data-table     × app-responsive-list      ${fraco}← o legado tem argumento real:${fim}
    app-money          × formatCurrency na tela   ${fraco}  já resolve tabela→cards no mobile${fim}
    app-chart-line     × SVG próprio da feature

  Registre a decisão na tabela da Fase 8 ${NEGRITO}antes${fim} de migrar. Se o legado vencer, o
  primitivo é apagado e ARQUITETURA_ANGULAR.md §7 recebe a emenda.`);
}

/* ------------------------------------------------------------------- fechamento */

titulo('Antes de dar qualquer tela por pronta');

console.log(`    npm run handoff:check      ${fraco}fidelidade — bloqueia regressão${fim}
    npm run typecheck          ${fraco}tsc --noEmit${fim}
    npm run test:ci            ${fraco}suíte completa${fim}
    npm run quality:frontend   ${fraco}os três acima + build de produção${fim}

  ${fraco}E a captura Playwright desktop/mobile da tela, em docs/ai-reports/.${fim}
  ${fraco}Testar em 1440px, 1024px e 390px — vários desses bugs só aparecem numa largura.${fim}
`);
