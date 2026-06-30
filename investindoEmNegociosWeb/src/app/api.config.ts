// Configuração centralizada para base da API (sempre servidor).
const runtimeEnv =
  typeof process !== 'undefined' && process.env && process.env['API_BASE_URL']
    ? String(process.env['API_BASE_URL']).trim().replace(/\/$/, '')
    : '';

export const API_BASE_URL = runtimeEnv || 'http://35.174.50.187:5055/api/v1';
