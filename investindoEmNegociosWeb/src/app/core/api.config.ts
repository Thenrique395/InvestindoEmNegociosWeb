// Configuração centralizada da base da API.
// - No NAVEGADOR: lê window.__API_BASE_URL__, injetado por /config.js (servido pelo SSR
//   a partir do env do container). process.env NÃO existe no browser.
// - No SERVIDOR (SSR): lê process.env['API_BASE_URL'].
// Assim o build é único e cada ambiente (dev/prod) usa a URL do seu próprio container.
declare global {
  interface Window {
    __API_BASE_URL__?: string;
    __FARO_URL__?: string;
  }
}

function clean(value: unknown): string {
  return value ? String(value).trim().replace(/\/$/, '') : '';
}

const fromWindow =
  typeof window !== 'undefined' ? clean((window as Window).__API_BASE_URL__) : '';

const fromProcess =
  typeof process !== 'undefined' && process.env ? clean(process.env['API_BASE_URL']) : '';

export const API_BASE_URL = fromWindow || fromProcess || 'http://localhost:4200/api/v1';
