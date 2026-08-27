import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Route, PreloadingStrategy } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  private readonly preloadDelayMs = 5000;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  preload(route: Route, fn: () => Observable<unknown>): Observable<unknown> {
    if (!route.data?.['preload']) return of(null);
    if (!isPlatformBrowser(this.platformId)) return of(null);
    // Delay non-critical preloads so initial route remains responsive for performance metrics.
    return timer(this.preloadDelayMs).pipe(switchMap(() => fn()));
  }
}
