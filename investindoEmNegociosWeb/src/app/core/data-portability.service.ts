import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';

export interface ImportUserDataResult {
  importedRecords: number;
}

@Injectable({ providedIn: 'root' })
export class DataPortabilityService {
  private readonly baseUrl = `${API_BASE_URL}/dataportability`;

  constructor(private http: HttpClient) {}

  exportData() {
    return this.http.get(`${this.baseUrl}/export`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  importData(file: File, replaceExisting: boolean) {
    const form = new FormData();
    form.append('file', file);
    form.append('replaceExisting', String(replaceExisting));
    return this.http.post<ImportUserDataResult>(`${this.baseUrl}/import`, form);
  }
}
