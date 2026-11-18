import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { legalPublisherFromEnvironment, validateLegalPublisher } from './legal-publisher.mjs';
import compression from 'compression';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const publisher = legalPublisherFromEnvironment(process.env);
const legalIssues = validateLegalPublisher(publisher);
const publicationRequired = process.env['APP_ENVIRONMENT'] === 'production' ||
  (process.env['NODE_ENV'] === 'production' && process.env['APP_ENVIRONMENT'] !== 'development');
const app = express();
// Somente os hosts configurados podem ser renderizados pelo SSR.
const allowedHosts = (process.env['ANGULAR_ALLOWED_HOSTS'] || 'localhost,127.0.0.1')
  .split(',').map(host => host.trim()).filter(Boolean)
  .map(host => new URL(`http://${host}`).hostname);
const angularApp = new AngularNodeAppEngine({ allowedHosts });

app.use(
  compression({
    threshold: 1024,
  }),
);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    // Sem maxAge global: o Cache-Control é definido por arquivo abaixo. Assets com hash no
    // nome (imutáveis) podem ser cacheados por 1 ano; entrypoints (index.html, ngsw.json,
    // ngsw-worker.js, .html, manifest) precisam de no-cache — senão o navegador/SW seguem
    // servindo a versão antiga após um deploy (chunks somem → ChunkLoadError → tela branca).
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      const file = filePath.toLowerCase();
      const isEntrypoint =
        file.endsWith('.html') ||
        file.endsWith('ngsw.json') ||
        file.endsWith('ngsw-worker.js') ||
        file.endsWith('safety-worker.js') ||
        file.endsWith('.webmanifest') ||
        file.endsWith('manifest.json');
      // Nomes com hash do Angular: name-HASH.ext ou name.HASH.ext (>= 8 chars).
      const isHashed = /[.-][0-9a-z]{8,}\.[a-z0-9]+$/i.test(filePath);

      if (isEntrypoint || !isHashed) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

// In development, also serve assets directly from the source folder so
// requests to /assets/* work when the browser bundle is served from dev server
// and assets are not present in the built browser folder yet.
import { existsSync } from 'node:fs';

const candidates = [
  resolve(serverDistFolder, '../../src/assets'),
  resolve(process.cwd(), 'src/assets'),
  resolve(process.cwd(), './src/assets'),
];
const localAssets = candidates.find((p) => existsSync(p));
if (localAssets) {
  app.use('/assets', express.static(localAssets, { maxAge: '1y', index: false, redirect: false }));
} else {
  console.warn('[server] local assets folder not found, /assets will fallback to browser build assets');
}

/**
 * Expõe a configuração de runtime ao NAVEGADOR. O process.env só existe aqui no
 * servidor (SSR); o index.html carrega /config.js e o api.config.ts lê
 * window.__API_BASE_URL__. Assim o build é único e cada ambiente (dev/prod) usa a
 * URL do seu próprio container, sem hardcode.
 */
app.get('/config.js', (_req, res) => {
  const apiBaseUrl = process.env['API_BASE_URL'] ?? '';
  const faroUrl = process.env['FARO_URL'] ?? '';
  res.type('application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(
    `window.__API_BASE_URL__=${JSON.stringify(apiBaseUrl)};` +
      `window.__FARO_URL__=${JSON.stringify(faroUrl)};` +
      `window.__LEGAL_PUBLISHER__=${JSON.stringify(publisher)};`,
  );
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  if (publicationRequired && legalIssues.length) {
    console.error(`Publicação bloqueada: configure ${legalIssues.join(', ')}.`);
    process.exit(1);
  }
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
