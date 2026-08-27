import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserMenuComponent } from './user-menu.component';
import { UserRole } from '../../../../core/roles';

describe('UserMenuComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [provideRouter([])]
    });
  });

  function roleLabelFor(role: UserRole | null): string {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentRef.setInput('role', role);
    return fixture.componentInstance.roleLabel();
  }

  it('roleLabel mapeia o papel e cai em Basic quando nulo', () => {
    expect(roleLabelFor('Intermediate')).toBe('Perfil Intermediário');
    expect(roleLabelFor(null)).toBe(roleLabelFor('Basic'));
  });

  it('navegação por teclado move o foco entre os itens do menu', () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('avatarUrl', '');
    fixture.componentRef.setInput('initials', 'EU');
    fixture.componentRef.setInput('displayName', 'E2E User');
    fixture.componentRef.setInput('role', 'Basic');
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('[role="menuitem"]')
    ) as HTMLElement[];
    expect(buttons.length).toBeGreaterThan(1);

    buttons[0].focus();
    const key = (k: string) =>
      fixture.componentInstance.onMenuKeydown(new KeyboardEvent('keydown', { key: k }));

    key('ArrowDown');
    expect(document.activeElement).toBe(buttons[1]);
    key('ArrowUp');
    expect(document.activeElement).toBe(buttons[0]);
    key('End');
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    key('Home');
    expect(document.activeElement).toBe(buttons[0]);

    document.body.removeChild(fixture.nativeElement);
  });
});
