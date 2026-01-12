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
  avatarUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  language?: string;
  currency?: string;
  locales?: string[];
}

export interface Preferences {
  currency: string;
  locales: string[];
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly baseUrl = `${API_BASE_URL}/profile`;
  private readonly prefsUrl = `${API_BASE_URL}/preferences`;

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

  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.http.post<void>(`${API_BASE_URL}/auth/change-password`, payload);
  }

  getPreferences() {
    return this.http.get<Preferences>(this.prefsUrl);
  }

  updatePreferences(prefs: Preferences) {
    return this.http.put<Preferences>(this.prefsUrl, prefs);
  }
}
