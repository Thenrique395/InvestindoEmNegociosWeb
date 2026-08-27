import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TopbarComponent } from './topbar.component';
import { UserRole } from '../../../core/roles';

describe('TopbarComponent — assistente por role', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TopbarComponent],
      providers: [provideRouter([])]
    });
  });

  function canUseAssistant(role: UserRole | null): boolean {
    const fixture = TestBed.createComponent(TopbarComponent);
    fixture.componentRef.setInput('unreadCount', 0);
    fixture.componentRef.setInput('currentRole', role);
    return fixture.componentInstance.canUseAssistant();
  }

  it('Basic e deslogado NÃO usam o Assistente IA', () => {
    expect(canUseAssistant('Basic')).toBeFalse();
    expect(canUseAssistant(null)).toBeFalse();
  });

  it('Intermediate, Advanced e Admin usam o Assistente IA', () => {
    expect(canUseAssistant('Intermediate')).toBeTrue();
    expect(canUseAssistant('Advanced')).toBeTrue();
    expect(canUseAssistant('Admin')).toBeTrue();
  });
});
