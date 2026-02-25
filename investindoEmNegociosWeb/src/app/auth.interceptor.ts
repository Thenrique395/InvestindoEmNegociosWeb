import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { UiFeedbackService } from './ui-feedback.service';

let lastForbiddenFeedbackAt = 0;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
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
        const now = Date.now();
        if (now - lastForbiddenFeedbackAt > 4000) {
          feedback.warning('Seu perfil atual não tem acesso a esta funcionalidade.');
          lastForbiddenFeedbackAt = now;
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
