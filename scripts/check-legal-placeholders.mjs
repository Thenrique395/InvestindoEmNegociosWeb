import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { legalPublisherFromEnvironment, validateLegalPublisher } from '../investindoEmNegociosWeb/src/legal-publisher.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(repoRoot, 'investindoEmNegociosWeb/src/app/features/site/legal/legal.content.ts'), 'utf8');
const known = new Set(['RAZAO_SOCIAL', 'DOCUMENTO', 'ENDERECO', 'EMAIL_CONTATO']);
const unknown = [...source.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).filter(key => !known.has(key));
const findings = [...validateLegalPublisher(legalPublisherFromEnvironment(process.env)), ...unknown.map(key => `Campo sem resolução: ${key}`)];
if (findings.length) {
  console.error('Publicação legal bloqueada. Configure a identificação e o contato oficiais do responsável:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}
console.log('Dados institucionais configurados e campos dos documentos legais resolvidos.');
