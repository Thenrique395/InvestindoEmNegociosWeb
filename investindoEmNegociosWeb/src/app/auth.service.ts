import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, map, shareReplay, throwError } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { parseRole, UserRole } from './roles';

export interface AuthResponse {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${API_BASE_URL}/auth`;
  private refreshInFlight$?: Observable<AuthResponse>;

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    const body = {
      email: email.trim().toLowerCase(),
      password: password
    };
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, body).pipe(
      map((res) => this.persistSession(res)),
      catchError((err) => this.wrapError(err, 'Erro ao autenticar.'))
    );
  }

  refresh(refreshToken?: string) {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const token = refreshToken || this.getRefreshToken();
    if (!token) {
      return throwError(() => new Error('Refresh token ausente.'));
    }
    const request$ = this.http
      .post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken: token })
      .pipe(
        map((res) => this.persistSession(res)),
        catchError((err) => this.wrapError(err, 'Sessão expirada. Faça login novamente.', false)),
        finalize(() => {
          this.refreshInFlight$ = undefined;
        }),
        shareReplay(1)
      );
    this.refreshInFlight$ = request$;
    return request$;
  }

  register(payload: RegisterPayload) {
    const body = {
      name: payload.nome.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.senha
    };
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, body)
      .pipe(catchError((err) => this.wrapError(err, 'Erro ao criar conta.')));
  }

  private persistSession(res: AuthResponse): AuthResponse {
    try {
      localStorage.setItem('access_token', res.token);
      if (res.role) {
        localStorage.setItem('user_role', res.role);
      }
      if (res.refreshToken) {
        localStorage.setItem('refresh_token', res.refreshToken);
      }
      if (res.expiresAt) {
        localStorage.setItem('access_expires_at', res.expiresAt);
      }
    } catch {
      /* ignore storage errors em ambientes não browser */
    }
    return res;
  }

  getAccessToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    if (this.isAccessTokenExpired()) {
      this.clearSession();
      return null;
    }
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('refresh_token') : null;
  }

  getRole(): UserRole | null {
    if (typeof localStorage === 'undefined') return null;
    const stored = parseRole(localStorage.getItem('user_role'));
    if (stored) return stored;

    const tokenRole = parseRole(this.readRoleFromToken(this.getAccessToken()));
    if (tokenRole) {
      localStorage.setItem('user_role', tokenRole);
      return tokenRole;
    }
    if (this.getAccessToken()) {
      localStorage.setItem('user_role', 'Basic');
      return 'Basic';
    }
    return null;
  }

  clearSession(): void {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('access_expires_at');
      localStorage.removeItem('user_role');
    } catch {
      /* ignore */
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  isAccessTokenExpired(): boolean {
    if (typeof localStorage === 'undefined') return true;
    const token = localStorage.getItem('access_token');
    if (!token) return true;

    const expiresAt = localStorage.getItem('access_expires_at');
    if (expiresAt) {
      const exp = new Date(expiresAt).getTime();
      if (Number.isFinite(exp)) {
        return Date.now() >= exp;
      }
    }

    const jwtExp = this.readExpFromToken(token);
    if (jwtExp) {
      return Date.now() >= jwtExp * 1000;
    }

    return false;
  }

  private readRoleFromToken(token: string | null): string | null {
    if (!token || typeof atob === 'undefined') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');

    try {
      const decoded = JSON.parse(atob(padded));
      return decoded?.role || decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || null;
    } catch {
      return null;
    }
  }

  private readExpFromToken(token: string | null): number | null {
    if (!token || typeof atob === 'undefined') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    try {
      const decoded = JSON.parse(atob(padded));
      return Number(decoded?.exp) || null;
    } catch {
      return null;
    }
  }

  private wrapError(err: unknown, fallback: string, mapUnauthorizedToLogin = true) {
    // Log detalhado no console para facilitar depuração no front.
    // Não lança erro aqui; apenas registra e converte para mensagem amigável.
    // eslint-disable-next-line no-console
    console.error('AuthService error', err);

    let message = fallback;
    let code: string | undefined;

    const httpErr = err as HttpErrorResponse;
    const payload = httpErr?.error;
    const detail = typeof payload === 'string' ? payload : payload?.detail || payload?.title;

    if (detail) {
      message = detail;
    }

    if (httpErr?.status === 401 && mapUnauthorizedToLogin) {
      message = 'E-mail ou senha inválidos.';
      code = 'unauthorized';
    }

    if (httpErr?.status === 409 || (typeof detail === 'string' && detail.includes('E-mail já está em uso'))) {
      code = 'emailInUse';
      message = detail || 'E-mail já está em uso.';
    }

    const error = new Error(message) as Error & { code?: string };
    if (code) error.code = code;
    return throwError(() => error);
  }
}
