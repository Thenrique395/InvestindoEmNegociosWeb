import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
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
      if (err.status !== 401 || isAuthRequest) {
        return throwError(() => err);
      }

      const refreshToken = auth.getRefreshToken();
      if (!refreshToken) {
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
          router.navigateByUrl('/login');
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
