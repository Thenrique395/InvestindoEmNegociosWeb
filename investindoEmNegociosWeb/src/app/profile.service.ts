import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

export interface UserProfile {
  userId: string;
  fullName: string;
  document: string;
  phone: string;
  birthDate?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly baseUrl = 'http://localhost:5059/api/profile';

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
