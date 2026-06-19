export function resolveApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as Record<string, unknown>;
  if (e?.['status'] === 0) return 'Falha de conexão com o servidor.';
  const apiError = e?.['error'] as Record<string, unknown> | undefined;
  const detail = apiError?.['detail'] || apiError?.['title'] || apiError?.['message'] || e?.['message'];
  const status = e?.['status'] ? ` (HTTP ${e['status']})` : '';
  return detail ? `${detail}${status}` : `${fallback}${status}`;
}

export function mapApiErrors<T extends string>(
  error: unknown,
  mapping: Record<string, T>
): Partial<Record<T, string>> {
  const result: Partial<Record<T, string>> = {};

  const e = error as Record<string, unknown> | undefined;
  const apiErrors = (e?.['error'] as Record<string, unknown> | undefined)?.['errors'] as Record<string, unknown> | undefined;
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
