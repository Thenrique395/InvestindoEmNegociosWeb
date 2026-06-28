import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { AuthSessionResponse } from './auth.service';

export interface SpaceResponse {
  id: string;
  name: string;
  isDefault: boolean;
  hasPassword: boolean;
  createdAt: string;
}

export interface SpaceRequest {
  name: string;
  password?: string | null;
}

export interface EnterSpaceRequest {
  password?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SpacesService {
  private readonly baseUrl = `${API_BASE_URL}/spaces`;

  constructor(private http: HttpClient) {}

  list(): Observable<SpaceResponse[]> {
    return this.http.get<SpaceResponse[]>(this.baseUrl);
  }

  create(payload: SpaceRequest): Observable<SpaceResponse> {
    return this.http.post<SpaceResponse>(this.baseUrl, payload);
  }

  update(id: string, payload: SpaceRequest): Observable<SpaceResponse> {
    return this.http.put<SpaceResponse>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  enter(id: string, payload: EnterSpaceRequest): Observable<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>(`${this.baseUrl}/${id}/enter`, payload);
  }
}
