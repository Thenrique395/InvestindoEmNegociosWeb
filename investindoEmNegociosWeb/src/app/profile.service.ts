import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, of, tap } from 'rxjs';
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
  financialGoal?: string;
  carryOverDay?: number;
  intelligenceMode?: 'B' | 'C';
  language?: string;
  currency?: string;
  locales?: string[];
}

export interface Preferences {
  currency: string;
  locales: string[];
  notifications?: NotificationPreferences;
}

export interface NotificationPreferences {
  upcomingEnabled: boolean;
  overdueEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  daysBeforeDue: number;
}

export interface PrivacySummary {
  activeSessions: number;
  pendingPasswordResetRequests: number;
  auditEntries: number;
  dataExportEnabled: boolean;
  selfServiceDeletionEnabled: boolean;
  deletionScope: string[];
  productionControls: string[];
  scalabilityPhase: string;
  retentionPolicy: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly baseUrl = `${API_BASE_URL}/profile`;
  private readonly prefsUrl = `${API_BASE_URL}/preferences`;
  private readonly profileSubject = new BehaviorSubject<UserProfile | null>(null);

  readonly profile$ = this.profileSubject.asObservable();

  constructor(private http: HttpClient) {}

  getProfile() {
    return this.http.get<UserProfile>(this.baseUrl).pipe(
      tap((profile) => this.profileSubject.next(profile)),
      catchError((err) => {
        if (err.status === 404) {
          this.profileSubject.next(null);
          return of(null);
        }
        throw err;
      })
    );
  }

  upsert(profile: Partial<UserProfile>) {
    return this.http.put<UserProfile>(this.baseUrl, profile).pipe(
      tap((saved) => this.profileSubject.next(saved))
    );
  }

  uploadAvatar(file: File) {
    const data = new FormData();
    data.append('avatar', file);
    return this.http.post<UserProfile>(`${this.baseUrl}/avatar`, data).pipe(
      tap((saved) => this.profileSubject.next(saved))
    );
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

  getPrivacySummary() {
    return this.http.get<PrivacySummary>(`${this.prefsUrl}/privacy-summary`);
  }

  deleteOwnAccount(payload: { currentPassword: string; confirmationText: string }) {
    return this.http.post<void>(`${this.prefsUrl}/account/delete`, payload);
  }
}
