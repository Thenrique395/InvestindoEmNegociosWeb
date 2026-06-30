import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import compression from 'compression';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
// Desabilita a proteção SSRF de host no ambiente dev (HTTP sem domínio fixo).
// Em produção com HTTPS e domínio real, substitua '*' pela lista de origens permitidas.
const angularApp = new AngularNodeAppEngine({ allowedHosts: ['*'] });

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
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      if (/\.[0-9A-Z_-]{8,}\./i.test(path)) {
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
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
