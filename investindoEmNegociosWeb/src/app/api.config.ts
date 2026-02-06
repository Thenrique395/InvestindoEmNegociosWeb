// Configuração centralizada para base da API.
const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
const browserProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const isLocalhost = browserHost === 'localhost' || browserHost === '127.0.0.1';
const runtimeEnv =
  typeof process !== 'undefined' && process.env && process.env['API_BASE_URL']
    ? process.env['API_BASE_URL']
    : '';

export const API_BASE_URL =
  runtimeEnv ||
  (browserHost
    ? isLocalhost
      ? 'http://35.174.50.187:5059/api/v1'
      : `${browserProtocol}//${browserHost}:5059/api/v1`
    : 'http://35.174.50.187:5059/api/v1');
