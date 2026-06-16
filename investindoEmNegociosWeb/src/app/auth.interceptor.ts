import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { UiFeedbackService } from './ui-feedback.service';

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
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return next(req);
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  const feedback = inject(UiFeedbackService);
  const token = auth.getAccessToken();
  const isAuthRequest =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password');

  const withAuth = token && !isAuthRequest
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(withAuth).pipe(
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

      const refreshToken = auth.getRefreshToken();
      if (!refreshToken) {
        auth.clearSession();
        if (!router.url.startsWith('/login')) {
          router.navigateByUrl('/login');
        }
        return throwError(() => err);
      }

      return auth.refresh(refreshToken).pipe(
        switchMap((res) => {
          const retry = req.clone({
            setHeaders: {
              Authorization: `Bearer ${res.token}`
            }
          });
          return next(retry);
        }),
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
