import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface UserProfile {
  userId: string;
  fullName: string;
  document: string;
  phone: string;
  birthDate?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly baseUrl = `${API_BASE_URL}/profile`;

  constructor(private http: HttpClient) {}

  getProfile() {
    return this.http.get<UserProfile>(this.baseUrl).pipe(
      catchError((err) => {
        if (err.status === 404) return of(null);
        throw err;
      })
    );
  }

  upsert(profile: Partial<UserProfile>) {
    return this.http.put<UserProfile>(this.baseUrl, profile);
  }
}
