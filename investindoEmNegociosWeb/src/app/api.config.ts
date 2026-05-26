// Configuração centralizada para base da API (sempre servidor).
const runtimeEnv =
  typeof process !== 'undefined' && process.env && process.env['API_BASE_URL']
    ? String(process.env['API_BASE_URL']).trim().replace(/\/$/, '')
    : '';

if (!runtimeEnv) {
  throw new Error(
    'API_BASE_URL nao configurada. Defina a URL da API correta para o ambiente atual.'
  );
}

export const API_BASE_URL = runtimeEnv;
