import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const legalContentPath = resolve(repoRoot, 'investindoEmNegociosWeb/src/app/site/legal/legal.content.ts');
const source = readFileSync(legalContentPath, 'utf8');

const placeholders = [
  '{{RAZAO_SOCIAL}}',
  '{{CNPJ}}',
  '{{ENDERECO}}',
  '{{EMAIL_CONTATO}}',
];

const lines = source.split(/\r?\n/);
const contentStart = lines.findIndex((line) => line.startsWith('export const TERMOS_DE_USO'));
const findings = [];

for (const placeholder of placeholders) {
  lines.forEach((line, index) => {
    if (index < contentStart) return;
    if (line.includes(placeholder)) {
      findings.push({ placeholder, line: index + 1 });
    }
  });
}

if (findings.length > 0) {
  console.error('Legal pages are not ready for publication. Replace these placeholders first:');
  for (const finding of findings) {
    console.error(`- ${finding.placeholder} in ${legalContentPath}:${finding.line}`);
  }
  process.exit(1);
}

console.log('Legal pages do not contain publication-blocking placeholders.');
