import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface AuthResponse {
  userId: string;
  name: string;
  email: string;
  token: string;
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
      localStorage.setItem('current_user', res.email);
      localStorage.setItem('user_name', res.name);
      localStorage.setItem('user_id', res.userId);
    } catch {
      /* ignore storage errors em ambientes não browser */
    }
    return res;
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
