import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { ProfileService, UserProfile } from './profile.service';

export type UserContextState = {
  profile: UserProfile | null;
  displayName: string;
  avatarUrl: string;
  userInitials: string;
};

const initialState: UserContextState = {
  profile: null,
  displayName: 'Usuário',
  avatarUrl: '',
  userInitials: 'U'
};

@Injectable({ providedIn: 'root' })
export class UserContextFacadeService {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly stateSubject = new BehaviorSubject<UserContextState>(initialState);
  private profileSub?: Subscription;

  readonly state$ = this.stateSubject.asObservable();

  loadProfile(): void {
    if (!this.profileSub) {
      this.profileSub = this.profileService.profile$.subscribe((profile) => {
        this.setProfile(profile);
      });
    }

    this.profileService.getProfile().subscribe({
      error: () => {
        /* ignore */
      }
    });
  }

  reset(): void {
    this.profileSub?.unsubscribe();
    this.profileSub = undefined;
    this.profileService.clearProfile();
    this.stateSubject.next(initialState);
  }

  private setProfile(profile: UserProfile | null): void {
    const displayName = profile?.fullName?.trim() || this.authService.getUserName() || 'Usuário';
    this.stateSubject.next({
      profile,
      displayName,
      avatarUrl: profile?.avatarUrl || '',
      userInitials: this.resolveInitials(displayName)
    });
  }

  private resolveInitials(displayName: string): string {
    const name = displayName.trim();
    if (!name) return 'U';

    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts.shift() || '';
    const last = parts.pop() || '';
    const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    return initials || first.charAt(0).toUpperCase() || 'U';
  }
}
