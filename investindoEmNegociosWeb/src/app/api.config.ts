// Configuração centralizada para base da API (sempre servidor).
const runtimeEnv =
  typeof process !== 'undefined' && process.env && process.env['API_BASE_URL']
    ? String(process.env['API_BASE_URL'])
    : '';

const serverEndpoint = 'http://35.174.50.187:5059/api/v1';

export const API_BASE_URL = runtimeEnv.trim().replace(/\/$/, '') || serverEndpoint;
