import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../investindoEmNegociosWeb/', import.meta.url));
const entry = 'dist/investindo-em-negocios-web/server/server.mjs';
const production = {
  ...process.env, NODE_ENV: 'production', APP_ENVIRONMENT: 'production',
  LEGAL_NAME: '', LEGAL_TAX_ID: '', LEGAL_ADDRESS: '', LEGAL_CONTACT_EMAIL: '',
};

test('produção sem identificação oficial encerra com erro', () => {
  const result = spawnSync(process.execPath, [entry], { cwd, env: production, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Publicação bloqueada/);
});

test('SSR resolve os campos de termos e privacidade com a configuração de runtime', async () => {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const child = spawn(process.execPath, [entry], {
    cwd, env: {
      ...production, PORT: String(port), ANGULAR_ALLOWED_HOSTS: 'localhost,127.0.0.1',
      // Fixtures exclusivamente locais; nunca configuram a publicação real.
      LEGAL_NAME: 'Responsável de Teste', LEGAL_TAX_ID: '52998224725',
      LEGAL_ADDRESS: 'Rua de Teste, 100, Recife - PE', LEGAL_CONTACT_EMAIL: 'contato@teste.local',
    }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', data => { logs += data; });
  child.stderr.on('data', data => { logs += data; });
  try {
    const deadline = Date.now() + 15000;
    while (!logs.includes('Node Express server listening')) {
      assert.equal(child.exitCode, null, logs);
      assert.ok(Date.now() < deadline, logs);
      await delay(50);
    }
    for (const path of ['/termos', '/privacidade', '/config.js']) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert.ok(html.includes('Responsável de Teste'), path);
      assert.ok(!html.includes('{{RAZAO_SOCIAL}}'), path);
    }
  } finally {
    child.kill();
    if (child.exitCode === null) await once(child, 'exit');
  }
});
