#!/usr/bin/env node
/**
 * Gate de fidelidade ao handoff de design.
 *
 * O handoff (`design_handoff_investindo_redesign/`) tem regras vinculantes. Elas foram
 * escritas porque cada uma já custou um bug ou um retrabalho. Revisão humana não pega
 * todas — este script pega, e roda no `quality:frontend`.
 *
 * Cada regra aponta para a seção do handoff que a define. Quando uma regra falhar, a
 * correção é ajustar o código, não afrouxar a regra. Se a regra estiver errada, ela muda
 * no handoff primeiro, e aqui depois.
 *
 * Uso:
 *   node scripts/check-handoff-fidelity.mjs           # falha se houver violação
 *   node scripts/check-handoff-fidelity.mjs --report  # lista tudo, sai 0 (diagnóstico)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const APP = join(ROOT, 'investindoEmNegociosWeb', 'src', 'app');
const TOKENS = join(ROOT, 'investindoEmNegociosWeb', 'src', 'styles', 'design-tokens.scss');
const HANDOFF_TOKENS = join(ROOT, 'design_handoff_investindo_redesign', 'tokens.css');

const REPORT_ONLY = process.argv.includes('--report');

/* ------------------------------------------------------------------ helpers */

function walk(dir, exts) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

const rel = (f) => relative(ROOT, f).split(sep).join('/');
const isStyleguide = (f) => rel(f).includes('/styleguide/');
const isSpec = (f) => f.endsWith('.spec.ts');

const scss = walk(APP, ['.scss']);
const html = walk(APP, ['.html']);
const ts = walk(APP, ['.ts']).filter((f) => !isSpec(f));

function lines(file) {
  return readFileSync(file, 'utf8').split('\n');
}

/** Percorre linhas de arquivos e reporta as que casam com `test`. */
function scan(files, test, { skipStyleguide = true } = {}) {
  const hits = [];
  for (const file of files) {
    if (skipStyleguide && isStyleguide(file)) continue;
    lines(file).forEach((line, i) => {
      if (test(line, file)) hits.push({ file: rel(file), line: i + 1, text: line.trim() });
    });
  }
  return hits;
}

/* -------------------------------------------------------------------- regras */

const rules = [];

/**
 * R1 — Primitivos de `shared/` adotados de verdade.
 * ARQUITETURA_ANGULAR.md §7 e §13.1: os primitivos não podem ser reimplementados por
 * feature. Um primitivo que só aparece no /styleguide não é adoção — é um segundo design
 * system convivendo com o legado, que é justamente o que o handoff quer evitar.
 */
rules.push({
  id: 'R1',
  titulo: 'Primitivo de shared/ usado só no /styleguide',
  ref: 'ARQUITETURA_ANGULAR.md §7 · §13.1',
  run() {
    // `app-data-table` saiu da lista porque foi APAGADO na 8.1: o
    // `app-responsive-list` venceu o par (resolve tabela→cards no mobile, que o
    // primitivo do handoff não cobria). Ver PLANO_REDESIGN §8.1.
    const primitivos = [
      'app-kpi-strip',
      'app-money',
      'app-number-stepper',
      'app-progress-bar',
      'app-chart-bars',
      'app-chart-line',
      'app-select-menu',
    ];
    const usoReal = new Map(primitivos.map((p) => [p, 0]));
    for (const file of html) {
      if (isStyleguide(file)) continue;
      const src = readFileSync(file, 'utf8');
      for (const p of primitivos) if (src.includes(`<${p}`)) usoReal.set(p, usoReal.get(p) + 1);
    }
    return [...usoReal.entries()]
      .filter(([, n]) => n === 0)
      .map(([p]) => ({
        file: `src/app/shared/${p.replace('app-', '')}/`,
        line: 0,
        text: `${p} não é usado em nenhuma tela — existe só na demo do /styleguide`,
      }));
  },
});

/**
 * R2 — Faixa de indicadores é flex com quebra.
 * README.md §4 e ARQUITETURA_ANGULAR.md §7 (app-kpi-strip) e §12.
 * `grid auto-fit` deixa célula vazia à direita quando a contagem de KPIs não divide pelo
 * número de colunas. Flex faz a última linha crescer e preencher. Já foi corrigido uma vez
 * no dashboard (commit 4df1a1c) e voltou em outras telas.
 */
rules.push({
  id: 'R2',
  titulo: 'grid auto-fit/auto-fill em faixa de indicadores',
  ref: 'README.md §4 · ARQUITETURA_ANGULAR.md §7, §12',
  run() {
    // Só vale para a faixa de KPI. O seletor que a precede identifica o bloco.
    const marcadores = /(summary|kpi|indicador|metric|stat)[a-z-]*\s*\{/i;
    const hits = [];
    for (const file of scss) {
      if (isStyleguide(file)) continue;
      const ls = lines(file);
      let blocoKpi = false;
      ls.forEach((line, i) => {
        if (marcadores.test(line)) blocoKpi = true;
        else if (line.trim() === '}') blocoKpi = false;
        if (blocoKpi && /repeat\(\s*auto-(fit|fill)/.test(line)) {
          hits.push({ file: rel(file), line: i + 1, text: line.trim() });
        }
      });
    }
    return hits;
  },
});

/**
 * R3 — Todo indicador tem tooltip.
 * README.md §8 e ARQUITETURA_ANGULAR.md §7 (app-metric-card): "tooltip é obrigatório.
 * Indicador sem explicação não passa em revisão." O usuário pediu isso explicitamente.
 */
rules.push({
  id: 'R3',
  titulo: 'Card de indicador sem tooltip',
  ref: 'README.md §8 · ARQUITETURA_ANGULAR.md §7',
  run() {
    const hits = [];
    for (const file of html) {
      if (isStyleguide(file)) continue;
      const src = readFileSync(file, 'utf8');
      const usos = (src.match(/<app-transaction-summary-card|<app-metric-card|<app-kpi-strip/g) || []).length;
      if (!usos) continue;
      const tips = (src.match(/tooltipText|\[tooltip\]|appTooltip|items=/g) || []).length;
      if (tips === 0) {
        hits.push({
          file: rel(file),
          line: 0,
          text: `${usos} card(s) de indicador, nenhum com tooltip`,
        });
      }
    }
    return hits;
  },
});

/**
 * R4 — Nenhuma feature desenha gráfico à mão.
 * ARQUITETURA_ANGULAR.md §8 e §13.5. Ícone SVG inline é permitido (README "Assets");
 * série de dados não é — ela reintroduz o bug de altura percentual da barra e foge do
 * contrato `ChartSeries`. O que denuncia gráfico é `points` vindo de binding.
 */
rules.push({
  id: 'R4',
  titulo: 'SVG de gráfico dentro de feature (use shared/charts)',
  ref: 'ARQUITETURA_ANGULAR.md §8 · §13.5',
  run() {
    return scan(
      html,
      (line, file) =>
        !rel(file).includes('/shared/') &&
        /<(polyline|polygon|path)\b/.test(line) &&
        /\[attr\.(points|d)\]|\[attr\.points\]/.test(line),
    );
  },
});

/**
 * R5 — Card não tem sombra em repouso.
 * README.md §3: "sem sombra em repouso. Sombra apenas em hover (elevação de 2px) e em
 * camadas flutuantes (modal, dropdown, toast)." Sombra fixa achata a hierarquia: quando
 * tudo está elevado, nada está.
 */
rules.push({
  id: 'R5',
  titulo: 'Sombra de hover aplicada em estado de repouso',
  ref: 'README.md §3',
  run() {
    const flutuante = /(modal|dropdown|toast|menu|popover|tooltip|sheet|overlay)/i;
    // O site público tem linguagem visual própria (decisão D8 do PLANO_REDESIGN):
    // no protótipo o plano recomendado sobe e ganha sombra de propósito.
    const foraDoApp = /\/site\//;
    // A regra é sobre CARD em repouso. Controle elevado não é card: o knob de um
    // switch e a aba ativa do segmented têm sombra por especificação — a própria
    // Fase 4.3 pede "aba ativa branca com sombra".
    const controle = /(thumb|knob|--active|--selected)/;
    const hits = [];
    for (const file of scss) {
      if (isStyleguide(file) || flutuante.test(rel(file)) || foraDoApp.test(rel(file))) continue;
      const ls = lines(file);
      let emHover = false;
      let seletor = '';
      ls.forEach((line, i) => {
        if (/\{\s*$/.test(line)) seletor = line;
        if (/:hover|:focus|:active|\.is-|\[open\]/.test(line)) emHover = true;
        else if (line.trim() === '}') emHover = false;
        if (!emHover && !controle.test(seletor) && /box-shadow:\s*var\(--shadow-card-hover\)/.test(line)) {
          hits.push({ file: rel(file), line: i + 1, text: line.trim() });
        }
      });
    }
    return hits;
  },
});

/**
 * R6 — Nenhum hex literal fora de design-tokens.scss.
 * ARQUITETURA_ANGULAR.md §6: "Se você precisa de uma cor que não existe no token, ela vira
 * token primeiro." Vale para SCSS de componente, template e .ts.
 */
rules.push({
  id: 'R6',
  titulo: 'Cor hex literal fora de design-tokens.scss',
  ref: 'ARQUITETURA_ANGULAR.md §6 · §12',
  run() {
    const hex = /#[0-9a-fA-F]{3,8}\b/;

    /**
     * Devolve cada linha do arquivo com os comentários removidos, para que um hex citado
     * numa explicação não conte como violação. Testar `^\s*(\/\/|\/\*|\*)` não bastava:
     * a linha do meio de um bloco começa com qualquer coisa.
     */
    const semComentarios = (file) => {
      let emBloco = false;
      return lines(file).map((linha) => {
        let resto = emBloco ? linha : linha.replace(/\/\/.*$/, '');
        let codigo = '';
        while (resto.length) {
          if (emBloco) {
            const fim = resto.indexOf('*/');
            if (fim === -1) return codigo;
            resto = resto.slice(fim + 2);
            emBloco = false;
          } else {
            const inicio = resto.indexOf('/*');
            if (inicio === -1) return codigo + resto;
            codigo += resto.slice(0, inicio);
            resto = resto.slice(inicio + 2);
            emBloco = true;
          }
        }
        return codigo;
      });
    };

    const hits = [];
    for (const file of [...scss, ...ts]) {
      if (isStyleguide(file)) continue;
      const alvo = file.endsWith('.scss') ? hex : /['"`]#[0-9a-fA-F]{3,8}['"`]/;
      semComentarios(file).forEach((codigo, i) => {
        if (alvo.test(codigo)) hits.push({ file: rel(file), line: i + 1, text: codigo.trim() });
      });
    }
    hits.push(...scan(html, (line) => /#[0-9a-fA-F]{6}\b/.test(line)));
    return hits;
  },
});

/**
 * R7 — Todo token do handoff existe no código.
 * README.md §"Fidelidade": os valores de `tokens.css` são a fonte. Um token que sumiu é
 * uma medida do design que virou literal em algum lugar.
 */
rules.push({
  id: 'R7',
  titulo: 'Token do handoff ausente em design-tokens.scss',
  ref: 'README.md "Fidelidade" · tokens.css',
  run() {
    const nomes = (src) => new Set((src.match(/^\s*(--[a-z0-9-]+)\s*:/gm) || []).map((m) => m.trim().split(':')[0]));
    const doHandoff = nomes(readFileSync(HANDOFF_TOKENS, 'utf8'));
    const doCodigo = nomes(readFileSync(TOKENS, 'utf8'));
    return [...doHandoff]
      .filter((t) => !doCodigo.has(t))
      .map((t) => ({ file: 'src/styles/design-tokens.scss', line: 0, text: `${t} definido no handoff e ausente no código` }));
  },
});

/**
 * R8 — ChangeDetectionStrategy.OnPush em todo componente.
 * ARQUITETURA_ANGULAR.md §4.5: "em todos os componentes. Sem exceção."
 * Legado ainda tem dívida aqui; o gate trava a entrada de componente NOVO sem OnPush.
 */
rules.push({
  id: 'R8',
  titulo: 'Componente sem ChangeDetectionStrategy.OnPush',
  ref: 'ARQUITETURA_ANGULAR.md §4.5 · §12',
  baseline: true,
  run() {
    return ts
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        return src.includes('@Component') && !src.includes('OnPush');
      })
      .map((f) => ({ file: rel(f), line: 0, text: 'sem ChangeDetectionStrategy.OnPush' }));
  },
});

/**
 * R9 — Feature não repinta primitivo por dentro com ::ng-deep.
 * ARQUITETURA_ANGULAR.md §3 e §7. É a versão CSS do erro §13.1: em vez de copiar o SCSS
 * do card, a tela fura o encapsulamento e reescreve o interior dele. O resultado é o
 * mesmo — cada tela com sua versão do primitivo, e o primitivo sem dono. Quando a tela
 * precisa de uma variação, ela vira `@Input` de variante no próprio primitivo.
 */
rules.push({
  id: 'R9',
  titulo: 'Feature reestiliza primitivo por dentro (::ng-deep)',
  ref: 'ARQUITETURA_ANGULAR.md §3 · §7 · §13.1',
  run() {
    return scan(scss, (line, file) => !rel(file).includes('/shared/') && line.includes('::ng-deep'));
  },
});

/* ------------------------------------------------------------------ execução */

/**
 * Dívida herdada, medida em 2026-08-16 (auditoria do handoff — ver PLANO_REDESIGN.md §8).
 *
 * O gate falha quando um número SOBE: quem escreve código novo não pode piorar o placar.
 * Cada linha aqui é uma dívida com prazo, não uma permissão permanente — a Fase 8 do plano
 * define quem zera o quê. Ao corrigir, baixe o número no mesmo commit. Meta: todos em 0.
 */
export const BASELINE = { R1: 4, R4: 10, R8: 49, R9: 14 };

/**
 * Roda todas as regras e classifica cada uma. Exportado para o briefing
 * (`briefing-redesign.mjs`) mostrar números vivos em vez de um texto que envelhece.
 */
export function avaliar() {
  return rules.map((rule) => {
    const hits = rule.run();
    const teto = BASELINE[rule.id] ?? 0;
    // 'regressao' = pior que o baseline. 'divida' = dentro do baseline, mas ainda não zerado.
    const estado = hits.length > teto ? 'regressao' : hits.length > 0 ? 'divida' : 'ok';
    return { rule, hits, teto, estado };
  });
}

/* ----------------------------------------------------------------------- CLI */

export const CORES = {
  verde: '\x1b[32m',
  vermelho: '\x1b[31m',
  amarelo: '\x1b[33m',
  fraco: '\x1b[2m',
  fim: '\x1b[0m',
};

function relatorioCli() {
  const { verde, vermelho, amarelo, fraco, fim } = CORES;

  const resumo = avaliar();
  const regrediu = resumo.some((r) => r.estado === 'regressao');
  const dividaAberta = resumo.filter((r) => r.estado === 'divida').reduce((n, r) => n + r.hits.length, 0);
  const melhorou = resumo
    .filter(({ hits, teto }) => teto > 0 && hits.length < teto)
    .map(({ rule, hits, teto }) => `${rule.id} ${teto}\u2192${hits.length}`);

  console.log(`\n  Fidelidade ao handoff de design\n  ${'\u2500'.repeat(64)}\n`);

  for (const { rule, hits, teto, estado } of resumo) {
    const marca = { ok: `${verde}\u2713${fim}`, divida: `${amarelo}\u26a0${fim}`, regressao: `${vermelho}\u2717${fim}` }[estado];
    const placar =
      estado === 'regressao'
        ? `\u2014 ${vermelho}REGREDIU: ${hits.length}, o teto \u00e9 ${teto}${fim}`
        : estado === 'divida'
          ? `\u2014 ${amarelo}${hits.length} de d\u00edvida herdada (teto ${teto})${fim}`
          : '';
    console.log(`  ${marca} ${rule.id}  ${rule.titulo}  ${placar}`);
    console.log(`       ${fraco}${rule.ref}${fim}`);
    if ((estado === 'regressao' || REPORT_ONLY) && hits.length) {
      for (const h of hits.slice(0, 12)) {
        console.log(`       ${h.file}${h.line ? `:${h.line}` : ''}  ${h.text.slice(0, 96)}`);
      }
      if (hits.length > 12) console.log(`       ${fraco}\u2026 e mais ${hits.length - 12} (use --report)${fim}`);
    }
    console.log('');
  }

  if (melhorou.length) {
    console.log(`  ${verde}D\u00edvida quitada nesta rodada: ${melhorou.join(', ')}.${fim}`);
    console.log(`  ${fraco}Baixe o BASELINE deste script no mesmo commit, sen\u00e3o ela pode voltar.${fim}\n`);
  }

  if (REPORT_ONLY) {
    console.log(`  ${fraco}modo --report: nada \u00e9 bloqueado.${fim}\n`);
    return 0;
  }

  if (regrediu) {
    console.error(
      `  ${vermelho}O c\u00f3digo divergiu do handoff.${fim} O handoff \u00e9 a especifica\u00e7\u00e3o: a tela precisa ficar\n` +
        `  igual ao prot\u00f3tipo, n\u00e3o parecida. Corrija o c\u00f3digo \u2014 n\u00e3o afrouxe a regra nem suba o\n` +
        `  baseline. Se a regra estiver errada, ela muda em design_handoff_investindo_redesign/\n` +
        `  primeiro, e s\u00f3 depois aqui.\n`,
    );
    return 1;
  }

  if (dividaAberta) {
    console.log(
      `  ${amarelo}Sem regress\u00e3o${fim}, mas ainda h\u00e1 ${dividaAberta} viola\u00e7\u00f5es de d\u00edvida herdada.\n` +
        `  ${fraco}O plano de quita\u00e7\u00e3o \u00e9 a Fase 8 do PLANO_REDESIGN.md. Enquanto houver d\u00edvida, a tela\n` +
        `  est\u00e1 parecida com o handoff, n\u00e3o igual.${fim}\n`,
    );
    return 0;
  }

  console.log(`  ${verde}Tudo conforme o handoff, sem d\u00edvida aberta.${fim}\n`);
  return 0;
}

// Importado (pelo briefing), o m\u00f3dulo entrega s\u00f3 `avaliar()` e n\u00e3o imprime nada.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(relatorioCli());
}
