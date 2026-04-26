import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  LearnCategoryRequest,
  LearnCategoryResponse
} from '../models/category-learning.models';

@Injectable({
  providedIn: 'root'
})
export class CategoryLearningService {
  private readonly baseUrl = '/api/category-learning';

  constructor(private readonly http: HttpClient) {}

  learn(request: LearnCategoryRequest): Observable<LearnCategoryResponse> {
    return this.http.post<LearnCategoryResponse>(`${this.baseUrl}/learn`, request)
      .pipe(
        catchError(() => {
          // 🔒 NÃO QUEBRA O APP SE BACKEND AINDA NÃO EXISTIR
          return of({ learned: false });
        })
      );
  }
}
