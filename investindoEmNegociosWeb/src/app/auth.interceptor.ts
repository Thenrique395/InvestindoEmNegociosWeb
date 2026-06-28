import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { UiFeedbackService } from './ui-feedback.service';
import { extractApiErrorMessage } from './utils/api-error.utils';

let lastForbiddenFeedbackAt = 0;
let lastServerErrorFeedbackAt = 0;

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'X-XSRF-TOKEN';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function shouldThrottle(lastFeedbackAt: number, throttleMs: number): boolean {
  return Date.now() - lastFeedbackAt <= throttleMs;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.substring(name.length + 1)) : null;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return next(req);
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  const feedback = inject(UiFeedbackService);
  const isAuthRequest =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password') ||
    (req.url.includes('/spaces/') && req.url.endsWith('/enter'));

  // Cookie httpOnly de sessão é enviado automaticamente pelo browser via withCredentials —
  // não há mais token para anexar manualmente no header Authorization.
  const headers: Record<string, string> = {};
  if (MUTATING_METHODS.has(req.method)) {
    const csrfToken = readCookie(CSRF_COOKIE);
    if (csrfToken) headers[CSRF_HEADER] = csrfToken;
  }

  const withAuth = req.clone({ withCredentials: true, setHeaders: headers });

  return next(withAuth).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 403 && !isAuthRequest) {
        if (!shouldThrottle(lastForbiddenFeedbackAt, 4000)) {
          feedback.warning(extractApiErrorMessage(err, 'Seu perfil atual não tem acesso a esta funcionalidade.'));
          lastForbiddenFeedbackAt = Date.now();
        }
        return throwError(() => err);
      }

      if (err.status >= 500) {
        if (!shouldThrottle(lastServerErrorFeedbackAt, 5000)) {
          feedback.error(extractApiErrorMessage(err, 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.'));
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
        switchMap(() => {
          const retry = req.clone({ withCredentials: true, setHeaders: headers });
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
