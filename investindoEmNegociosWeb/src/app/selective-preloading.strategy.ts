import { Injectable } from '@angular/core';
import { Route, PreloadingStrategy } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, fn: () => Observable<unknown>): Observable<unknown> {
    return route.data?.['preload'] ? fn() : of(null);
  }
}
