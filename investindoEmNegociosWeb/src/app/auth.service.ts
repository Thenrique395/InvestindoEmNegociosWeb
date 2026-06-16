import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, map, shareReplay, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
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
  cpf: string;
}

export interface CheckAvailabilityResponse {
  emailExists: boolean;
  documentExists: boolean;
}

type ProblemDetailsLike = {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[] | string>;
};

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
      return throwError(() => new Error('Sessão expirada. Faça login novamente.'));
    }
    const request$ = this.http
      .post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken: token })
      .pipe(
        map((res) => this.persistSession(res)),
        catchError((err) => this.wrapError(err, 'Sessão expirada. Faça login novamente.', false, false)),
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
      password: payload.senha,
      document: (payload.cpf || '').replace(/\D/g, '')
    };
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, body)
      .pipe(catchError((err) => this.wrapError(err, 'Erro ao criar conta.')));
  }

  checkAvailability(email?: string, cpf?: string) {
    const body = {
      email: email ? email.trim().toLowerCase() : null,
      document: cpf ? cpf.replace(/\D/g, '') : null
    };
    return this.http
      .post<CheckAvailabilityResponse>(`${this.baseUrl}/check-availability`, body)
      .pipe(catchError((err) => this.wrapError(err, 'Não foi possível verificar a disponibilidade.', false, false)));
  }

  forgotPassword(email: string) {
    const body = {
      email: email.trim().toLowerCase()
    };

    return this.http
      .post<void>(`${this.baseUrl}/forgot-password`, body)
      .pipe(catchError((err) => this.wrapError(err, 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.', false, false)));
  }

  resetPassword(token: string, newPassword: string) {
    const body = {
      token,
      newPassword
    };

    return this.http
      .post<void>(`${this.baseUrl}/reset-password`, body)
      .pipe(catchError((err) => this.wrapError(err, 'Não foi possível redefinir a senha. Verifique o link e tente novamente.', false, false)));
  }

  private persistSession(res: AuthResponse): AuthResponse {
    this.setStorageItem('access_token', res.token);
    if (res.role) this.setStorageItem('user_role', res.role);
    if (res.refreshToken) this.setStorageItem('refresh_token', res.refreshToken);
    if (res.expiresAt) this.setStorageItem('access_expires_at', res.expiresAt);
    if (res.name) this.setStorageItem('user_name', res.name);
    if (res.email) this.setStorageItem('user_email', res.email);
    return res;
  }

  applySession(res: AuthResponse): AuthResponse {
    return this.persistSession(res);
  }

  getAccessToken(): string | null {
    return this.getStorageItem('access_token');
  }

  getRefreshToken(): string | null {
    return this.getStorageItem('refresh_token');
  }

  getRole(): UserRole | null {
    const stored = parseRole(this.getStorageItem('user_role'));
    if (stored) return stored;

    const tokenRole = parseRole(this.readRoleFromToken(this.getAccessToken()));
    if (tokenRole) {
      this.setStorageItem('user_role', tokenRole);
      return tokenRole;
    }
    if (this.getAccessToken()) {
      this.setStorageItem('user_role', 'Basic');
      return 'Basic';
    }
    return null;
  }

  getUserName(): string {
    return this.getStorageItem('user_name') || '';
  }

  getUserEmail(): string {
    return this.getStorageItem('user_email') || '';
  }

  clearSession(): void {
    this.removeStorageItem('access_token');
    this.removeStorageItem('refresh_token');
    this.removeStorageItem('access_expires_at');
    this.removeStorageItem('user_role');
    this.removeStorageItem('user_name');
    this.removeStorageItem('user_email');
  }

  isAuthenticated(): boolean {
    return !!this.getStorageItem('access_token') && !!this.getRefreshToken();
  }

  isAccessTokenExpired(): boolean {
    const token = this.getStorageItem('access_token');
    if (!token) return true;

    const expiresAt = this.getStorageItem('access_expires_at');
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

  getAccessTokenExpiresAtMs(): number | null {
    const token = this.getStorageItem('access_token');
    if (!token) return null;

    const expiresAt = this.getStorageItem('access_expires_at');
    if (expiresAt) {
      const exp = new Date(expiresAt).getTime();
      if (Number.isFinite(exp)) return exp;
    }

    const jwtExp = this.readExpFromToken(token);
    return jwtExp ? jwtExp * 1000 : null;
  }

  private readRoleFromToken(token: string | null): string | null {
    if (!token) return null;
    try {
      const decoded = jwtDecode<Record<string, unknown>>(token);
      return (decoded['role'] as string | undefined)
        ?? (decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string | undefined)
        ?? null;
    } catch {
      return null;
    }
  }

  private readExpFromToken(token: string | null): number | null {
    if (!token) return null;
    try {
      const decoded = jwtDecode<{ exp?: number }>(token);
      return decoded.exp ?? null;
    } catch {
      return null;
    }
  }

  private wrapError(
    err: unknown,
    fallback: string,
    mapUnauthorizedToLogin = true,
    exposeProblemDetails = true
  ) {
    let message = fallback;
    let code: string | undefined;

    const httpErr = err as HttpErrorResponse;
    const status = Number(httpErr?.status) || 0;
    const detail = this.extractSafeProblemDetailsMessage(httpErr);

    if (status === 401 && mapUnauthorizedToLogin) {
      message = 'E-mail ou senha inválidos.';
      code = 'unauthorized';
    } else if (typeof detail === 'string' && detail.includes('CPF já está em uso')) {
      code = 'documentInUse';
      message = 'CPF já está em uso.';
    } else if (status === 409 || (typeof detail === 'string' && detail.includes('E-mail já está em uso'))) {
      code = 'emailInUse';
      message = 'E-mail já está em uso.';
    } else if (status >= 500) {
      message = fallback;
    } else if (exposeProblemDetails && detail) {
      message = detail;
    }

    const error = new Error(message) as Error & { code?: string; status?: number };
    if (code) error.code = code;
    if (status) error.status = status;
    return throwError(() => error);
  }

  private extractSafeProblemDetailsMessage(err: HttpErrorResponse): string | null {
    const payload = err?.error as ProblemDetailsLike | string | null | undefined;

    if (typeof payload === 'string') {
      return payload.trim() || null;
    }

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const firstValidationMessage = Object.values(payload.errors ?? {})
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .find((message) => typeof message === 'string' && message.trim());

    return payload.detail?.trim() || firstValidationMessage || payload.title?.trim() || null;
  }

  private getStorageItem(key: string): string | null {
    const storage = this.getSafeStorage();
    return storage ? storage.getItem(key) : null;
  }

  private setStorageItem(key: string, value: string): void {
    const storage = this.getSafeStorage();
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch {
      /* ignore storage errors */
    }
  }

  private removeStorageItem(key: string): void {
    const storage = this.getSafeStorage();
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      /* ignore storage errors */
    }
  }

  private getSafeStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
    const storage = window.localStorage as Partial<Storage>;
    if (
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function'
    ) {
      return null;
    }
    return storage as Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  }
}
