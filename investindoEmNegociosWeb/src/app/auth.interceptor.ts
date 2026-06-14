import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { UiFeedbackService } from './ui-feedback.service';
import { API_BASE_URL } from './api.config';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let lastForbiddenFeedbackAt = 0;
let lastServerErrorFeedbackAt = 0;

type ProblemDetailsLike = {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[] | string>;
};

function extractProblemDetailsMessage(err: HttpErrorResponse, fallback: string): string {
  const payload = err.error as ProblemDetailsLike | string | null | undefined;

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

function shouldThrottle(lastFeedbackAt: number, throttleMs: number): boolean {
  return Date.now() - lastFeedbackAt <= throttleMs;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const feedback = inject(UiFeedbackService);
  const isAuthRequest =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password');

  const isApiRequest = req.url.startsWith(API_BASE_URL);

  const buildOutgoing = () => {
    if (!isApiRequest) return req;

    const headers: Record<string, string> = {};
    if (MUTATING_METHODS.has(req.method)) {
      const csrfToken = readCookie('XSRF-TOKEN');
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }
    return req.clone({ withCredentials: true, setHeaders: headers });
  };

  return next(buildOutgoing()).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 403 && !isAuthRequest) {
        if (!shouldThrottle(lastForbiddenFeedbackAt, 4000)) {
          feedback.warning(extractProblemDetailsMessage(err, 'Seu perfil atual não tem acesso a esta funcionalidade.'));
          lastForbiddenFeedbackAt = Date.now();
        }
        return throwError(() => err);
      }

      if (err.status >= 500) {
        if (!shouldThrottle(lastServerErrorFeedbackAt, 5000)) {
          feedback.error(extractProblemDetailsMessage(err, 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.'));
          lastServerErrorFeedbackAt = Date.now();
        }
        return throwError(() => err);
      }

      if (err.status !== 401 || isAuthRequest) {
        return throwError(() => err);
      }

      if (!auth.isAuthenticated()) {
        auth.clearSession();
        if (!router.url.startsWith('/login')) {
          router.navigateByUrl('/login');
        }
        return throwError(() => err);
      }

      return auth.refresh().pipe(
        switchMap(() => next(buildOutgoing())),
        catchError((refreshErr) => {
          auth.clearSession();
          if (!router.url.startsWith('/login')) {
            router.navigateByUrl('/login');
          }
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
