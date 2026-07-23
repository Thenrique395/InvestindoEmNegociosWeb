#!/usr/bin/env node
// Teste de contrato FE↔Back: garante que as uniões de string do frontend (Angular/TS) continuam
// alinhadas com os enums do backend (.NET/C#). Pega "drift" de enum automaticamente — a classe de
// bug que causou o InstallmentStatus (backend "PartiallyPaid" × frontend "PARTIALLY_PAID").
//
// Roda no layout do monorepo (Api e Web como irmãos sob a raiz). Uso: `npm run test:contract`.
//
// Modos de comparação:
//   'identity'    → os valores devem ser idênticos nos dois lados.
//   'upper_snake' → o frontend usa UPPER_SNAKE derivado do PascalCase do backend
//                   ("PartiallyPaid" → "PARTIALLY_PAID"). Espelha types/money-types.ts::toInstallmentStatus.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../');
const ENUMS_DIR = path.join(root, 'InvestindoEmNegociosApi/InvestindoEmNegocio/Domain/Enums');
const FE_SRC = path.join(root, 'InvestindoEmNegociosWeb/investindoEmNegociosWeb/src/app');

// TS union  ->  { cs: enum C#, mode }
const CONTRACT = [
  { ts: 'GoalKind', cs: 'GoalKind', mode: 'identity' },
  { ts: 'GoalMode', cs: 'GoalMode', mode: 'identity' },
  { ts: 'GoalStatus', cs: 'GoalStatus', mode: 'identity' },
  { ts: 'GoalScopeType', cs: 'GoalScopeType', mode: 'identity' },
  { ts: 'CalculatedGoalState', cs: 'CalculatedGoalState', mode: 'identity' },
  { ts: 'RecurrenceType', cs: 'RecurrenceType', mode: 'identity' },
  { ts: 'ScheduleType', cs: 'ScheduleType', mode: 'identity' },
  { ts: 'MoneyType', cs: 'MoneyType', mode: 'identity' },
  { ts: 'CategoryType', cs: 'MoneyType', mode: 'identity' }, // FE CategoryType espelha MoneyType
  { ts: 'InvestmentType', cs: 'InvestmentType', mode: 'identity' },
  { ts: 'MovementType', cs: 'InvestmentMovementType', mode: 'identity' },
  { ts: 'AccountType', cs: 'AccountType', mode: 'identity' },
  { ts: 'InstallmentStatus', cs: 'InstallmentStatus', mode: 'upper_snake' }
];

function toUpperSnake(v) {
  return v.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

function csharpEnumValues(name) {
  for (const f of fs.readdirSync(ENUMS_DIR).filter((x) => x.endsWith('.cs'))) {
    const src = fs.readFileSync(path.join(ENUMS_DIR, f), 'utf8');
    const m = src.match(new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`));
    if (m) {
      const body = m[1].replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      return body.split(',').map((s) => s.trim().replace(/\s*=.*$/, '').trim()).filter(Boolean);
    }
  }
  throw new Error(`enum C# "${name}" não encontrado em ${ENUMS_DIR}`);
}

function scanTsUnions(dir, acc = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanTsUnions(full, acc);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      const src = fs.readFileSync(full, 'utf8');
      const re = /export type (\w+)\s*=\s*([^;]+);/g;
      let m;
      while ((m = re.exec(src))) {
        const vals = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
        if (vals.length) acc[m[1]] = vals;
      }
    }
  }
  return acc;
}

const eq = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

const tsUnions = scanTsUnions(FE_SRC);
const failures = [];

for (const { ts, cs, mode } of CONTRACT) {
  const feVals = tsUnions[ts];
  if (!feVals) {
    failures.push(`FE: união TS "${ts}" não encontrada em src/app`);
    continue;
  }
  const beVals = csharpEnumValues(cs);
  const expected = mode === 'upper_snake' ? beVals.map(toUpperSnake) : beVals;
  if (!eq(feVals, expected)) {
    failures.push(
      `DRIFT em "${ts}" (backend enum ${cs}, modo ${mode}):\n` +
      `   backend → ${JSON.stringify(mode === 'upper_snake' ? `${beVals} ⇒ ${expected}` : beVals)}\n` +
      `   frontend → ${JSON.stringify(feVals)}`
    );
  }
}

if (failures.length) {
  console.error(`❌ Contrato FE↔Back quebrado (${failures.length}):\n\n` + failures.join('\n\n'));
  process.exit(1);
}
console.log(`✅ Contrato FE↔Back ok — ${CONTRACT.length} enums alinhados.`);
