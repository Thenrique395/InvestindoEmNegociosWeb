import { HttpParams } from '@angular/common/http';

export type SortDir = 'asc' | 'desc';

export interface ListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDir;
}

export function applyListQuery(params: HttpParams, query?: ListQuery): HttpParams {
  let next = params;
  if (!query) {
    return next;
  }

  if (query.page !== undefined) {
    next = next.set('page', query.page.toString());
  }
  if (query.pageSize !== undefined) {
    next = next.set('pageSize', query.pageSize.toString());
  }
  if (query.sortBy) {
    next = next.set('sortBy', query.sortBy);
  }
  if (query.sortDir) {
    next = next.set('sortDir', query.sortDir);
  }

  return next;
}
