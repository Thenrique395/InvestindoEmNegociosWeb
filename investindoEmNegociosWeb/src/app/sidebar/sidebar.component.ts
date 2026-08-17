import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserRole } from '../roles';
import { NAV_SECTIONS, canShowItem } from '../navigation';
import { planLabelForRole } from '../plan-labels';

export type SidebarRouteReload = {
  path: string;
  event?: Event;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly isLightTheme = input.required<boolean>();
  readonly brandName = input.required<string>();
  readonly currentRole = input<UserRole | null>(null);
  readonly mobileOpen = input(false);
  readonly displayName = input('');
  readonly userInitials = input('');
  readonly avatarUrl = input('');

  readonly routeReload = output<SidebarRouteReload>();
  readonly preferencesOpen = output<Event | undefined>();
  readonly profileOpen = output<Event | undefined>();

  /** Rótulo comercial do plano, exibido no rodapé. */
  readonly planLabel = computed(() => planLabelForRole(this.currentRole()));

  readonly visibleSections = computed(() => {
    const role = this.currentRole();
    return NAV_SECTIONS
      .map(section => ({ ...section, items: section.items.filter(item => canShowItem(role, item)) }))
      .filter(section => section.items.length > 0);
  });

  reloadIfSame(path: string, event?: Event): void {
    this.routeReload.emit({ path, event });
  }

  goToPreferences(event?: Event): void {
    this.preferencesOpen.emit(event);
  }

  goToProfile(event?: Event): void {
    this.profileOpen.emit(event);
  }
}
