import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  const isAuthRequest = req.url.includes('/auth/login') || req.url.includes('/auth/register') || req.url.includes('/auth/refresh');

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
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
