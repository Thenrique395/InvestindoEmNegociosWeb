import { test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * Recortes pareados dos blocos que se repetem em toda tela — marca, sidebar e
 * card de indicador.
 *
 * Comparar a tela inteira esconde o que é sistemático: um card de indicador
 * fora do protótipo aparece em 20 telas, e na captura de página inteira ele
 * some no meio do resto.
 */
const SAIDA = join(process.cwd(), '..', 'investindoEmNegociosWeb', 'docs', 'ai-reports', 'qa-desktop');
const PROTOTIPO = pathToFileURL(
  join(process.cwd(), '..', 'design_handoff_investindo_redesign', 'prototipos', 'Despesas-e-Receitas.dc.html')
).href;

async function recorte(page: Page, seletor: string, arquivo: string): Promise<void> {
  await page.locator(seletor).first().screenshot({ path: join(SAIDA, arquivo), scale: 'css' });
}

test('recortes do protótipo', async ({ page }) => {
  mkdirSync(SAIDA, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(PROTOTIPO, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  await recorte(page, 'aside > div', 'zoom-proto-marca.png');
  await recorte(page, '.kpi', 'zoom-proto-kpi.png');
});

test('recortes do app', async ({ page }) => {
  mkdirSync(SAIDA, { recursive: true });
  await setupAuthenticatedApp(page, { role: 'Advanced' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await recorte(page, '.sidebar__brand', 'zoom-app-marca.png');
  await recorte(page, 'app-transaction-summary-card', 'zoom-app-kpi.png');
});
