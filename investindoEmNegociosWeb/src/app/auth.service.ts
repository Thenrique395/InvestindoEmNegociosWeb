import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export interface AuthResponse {
  token: string;
  expiresIn: number;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Simula um login contra a API .NET e devolve um JWT mockado.
   * Substitua a implementação por uma chamada HTTP real quando o backend estiver pronto.
   */
  login(email: string, password: string): Observable<AuthResponse> {
    const isValid = email.includes('@') && password.trim().length >= 4;
    if (!isValid) {
      return throwError(() => new Error('Credenciais inválidas'));
    }

    const mockToken = btoa(`${email}:${Date.now()}`);
    const response: AuthResponse = {
      token: mockToken,
      expiresIn: 3600,
      refreshToken: `refresh-${mockToken}`
    };

    return of(response).pipe(
      delay(600),
      map((res) => {
        // Salva localmente para simular sessão
        localStorage.setItem('access_token', res.token);
        localStorage.setItem('refresh_token', res.refreshToken);
        return res;
      })
    );
  }
}
