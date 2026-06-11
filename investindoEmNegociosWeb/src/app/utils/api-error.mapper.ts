export function resolveApiErrorMessage(err: any, fallback: string): string {
  if (err?.status === 0) return 'Falha de conexão com o servidor.';
  const detail = err?.error?.detail || err?.error?.title || err?.error?.message || err?.message;
  const status = err?.status ? ` (HTTP ${err.status})` : '';
  return detail ? `${detail}${status}` : `${fallback}${status}`;
}

export function mapApiErrors<T extends string>(
  error: any,
  mapping: Record<string, T>
): Partial<Record<T, string>> {
  const result: Partial<Record<T, string>> = {};

  const apiErrors = error?.error?.errors;
  if (!apiErrors) return result;

  Object.keys(apiErrors).forEach((key) => {
    const mappedField = mapping[key] || mapping[key.toLowerCase()];
    if (mappedField) {
      const messages = apiErrors[key];
      const message = Array.isArray(messages) ? messages[0] : messages;
      if (message) {
        result[mappedField] = String(message);
      }
    }
  });

  return result;
}
