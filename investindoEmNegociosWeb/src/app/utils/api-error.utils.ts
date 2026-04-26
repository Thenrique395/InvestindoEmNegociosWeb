import { HttpErrorResponse } from '@angular/common/http';
import { UiFeedbackType } from '../ui-feedback.service';

export type ApiProblemDetails = {
  title?: string;
  detail?: string;
  status?: number;
  instance?: string;
  traceId?: string;
  errors?: Record<string, string[] | string>;
  extensions?: {
    traceId?: string;
    [key: string]: unknown;
  };
};

export type BusinessErrorKind =
  | 'validation'
  | 'authentication'
  | 'payment-required'
  | 'permission'
  | 'not-found'
  | 'conflict'
  | 'rate-limit'
  | 'server'
  | 'unavailable'
  | 'unknown';

export type ApiErrorPresentation = {
  kind: BusinessErrorKind;
  status: number;
  title: string;
  message: string;
  feedbackType: UiFeedbackType;
  shouldToast: boolean;
  traceId?: string;
  primaryAction?: {
    label: string;
    route: string;
  };
};

export function getProblemDetails(error: HttpErrorResponse): ApiProblemDetails | null {
  const payload = error.error as ApiProblemDetails | string | null | undefined;
  if (!payload || typeof payload !== 'object') return null;
  return payload;
}

export function getProblemTraceId(problem: ApiProblemDetails | null): string | undefined {
  return problem?.extensions?.traceId || problem?.traceId;
}

export function extractApiErrorMessage(error: HttpErrorResponse, fallback: string): string {
  const payload = error.error as ApiProblemDetails | string | null | undefined;

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  if (payload.detail?.trim()) {
    return payload.detail;
  }

  const firstValidationMessage = Object.values(payload.errors ?? {})
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .find((message) => typeof message === 'string' && message.trim());

  if (firstValidationMessage) {
    return firstValidationMessage;
  }

  if (payload.title?.trim()) {
    return payload.title;
  }

  return fallback;
}

export function mapApiErrorToPresentation(error: HttpErrorResponse): ApiErrorPresentation {
  const problem = getProblemDetails(error);
  const status = problem?.status || error.status || 0;
  const traceId = getProblemTraceId(problem);

  switch (status) {
    case 400:
    case 422:
      return {
        kind: 'validation',
        status,
        title: problem?.title || 'Revise as informações',
        message: extractApiErrorMessage(error, 'Algumas informações precisam ser revisadas antes de continuar.'),
        feedbackType: 'warning',
        shouldToast: true,
        traceId
      };

    case 401:
      return {
        kind: 'authentication',
        status,
        title: problem?.title || 'Sessão inválida',
        message: extractApiErrorMessage(error, 'Faça login novamente para continuar.'),
        feedbackType: 'warning',
        shouldToast: false,
        traceId,
        primaryAction: { label: 'Entrar novamente', route: '/login' }
      };

    case 402:
      return {
        kind: 'payment-required',
        status,
        title: problem?.title || 'Plano necessário',
        message: extractApiErrorMessage(error, 'Essa funcionalidade exige contratação ou atualização do plano.'),
        feedbackType: 'warning',
        shouldToast: true,
        traceId,
        primaryAction: { label: 'Ver planos', route: '/assinatura' }
      };

    case 403:
      return {
        kind: 'permission',
        status,
        title: problem?.title || 'Acesso não permitido',
        message: extractApiErrorMessage(error, 'Seu perfil atual não tem acesso a esta funcionalidade.'),
        feedbackType: 'warning',
        shouldToast: true,
        traceId
      };

    case 404:
      return {
        kind: 'not-found',
        status,
        title: problem?.title || 'Recurso não encontrado',
        message: extractApiErrorMessage(error, 'Não encontramos o recurso solicitado.'),
        feedbackType: 'info',
        shouldToast: false,
        traceId
      };

    case 409:
      return {
        kind: 'conflict',
        status,
        title: problem?.title || 'Conflito de dados',
        message: extractApiErrorMessage(error, 'Existe um conflito com o estado atual dos dados.'),
        feedbackType: 'warning',
        shouldToast: true,
        traceId
      };

    case 429:
      return {
        kind: 'rate-limit',
        status,
        title: problem?.title || 'Limite atingido',
        message: extractApiErrorMessage(error, 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.'),
        feedbackType: 'warning',
        shouldToast: true,
        traceId
      };

    case 503:
      return {
        kind: 'unavailable',
        status,
        title: problem?.title || 'Serviço indisponível',
        message: extractApiErrorMessage(error, 'Uma dependência externa está indisponível no momento.'),
        feedbackType: 'error',
        shouldToast: true,
        traceId
      };

    default:
      if (status >= 500) {
        return {
          kind: 'server',
          status,
          title: problem?.title || 'Erro inesperado',
          message: extractApiErrorMessage(error, 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.'),
          feedbackType: 'error',
          shouldToast: true,
          traceId
        };
      }

      return {
        kind: 'unknown',
        status,
        title: problem?.title || 'Não foi possível concluir',
        message: extractApiErrorMessage(error, 'Não foi possível concluir a operação.'),
        feedbackType: 'error',
        shouldToast: true,
        traceId
      };
  }
}

export function buildToastMessage(presentation: ApiErrorPresentation): string {
  if (!presentation.traceId) return presentation.message;
  return `${presentation.message} Código de suporte: ${presentation.traceId}`;
}
