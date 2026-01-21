import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface AuthResponse {
  userId: string;
  name: string;
  email: string;
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
    const token = refreshToken || this.getRefreshToken();
    if (!token) {
      return throwError(() => new Error('Refresh token ausente.'));
    }
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken: token })
      .pipe(
        map((res) => this.persistSession(res)),
        catchError((err) => this.wrapError(err, 'Erro ao renovar sessão.'))
      );
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
    return typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  }

  getRefreshToken(): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('refresh_token') : null;
  }

  clearSession(): void {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('access_expires_at');
    } catch {
      /* ignore */
    }
  }

  private wrapError(err: unknown, fallback: string) {
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

    if (httpErr?.status === 401) {
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
