import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';

export interface OnboardingStatus {
  step: number;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly baseUrl = `${API_BASE_URL}/onboarding`;

  constructor(private http: HttpClient) {}

  getStatus() {
    return this.http.get<OnboardingStatus>(this.baseUrl);
  }

  updateStatus(payload: OnboardingStatus) {
    return this.http.put<OnboardingStatus>(this.baseUrl, payload);
  }
}
