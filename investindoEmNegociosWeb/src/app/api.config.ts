// Configuração centralizada para base da API.
const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
const browserProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const runtimeEnv =
  typeof process !== 'undefined' && process.env && process.env['API_BASE_URL']
    ? process.env['API_BASE_URL']
    : '';

export const API_BASE_URL =
  runtimeEnv ||
  (browserHost
    ? `${browserProtocol}//${browserHost}:5059/api/v1`
    : 'http://localhost:5059/api/v1');
