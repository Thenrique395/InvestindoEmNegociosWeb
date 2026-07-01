// Configuração centralizada para base da API (sempre servidor).
const runtimeEnv =
  typeof process !== 'undefined' && process.env && process.env['API_BASE_URL']
    ? String(process.env['API_BASE_URL']).trim().replace(/\/$/, '')
    : '';

export const API_BASE_URL = runtimeEnv || 'http://localhost:4200/api/v1';
