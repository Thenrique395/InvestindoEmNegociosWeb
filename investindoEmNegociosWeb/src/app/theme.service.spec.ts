import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
    localStorage.removeItem('investindo-em-negocios-theme');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('theme-dark');
  });

  afterEach(() => {
    localStorage.removeItem('investindo-em-negocios-theme');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('theme-dark');
  });

  it('applies and persists an explicit theme', () => {
    service.set('dark');

    expect(service.current()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBeTrue();
    expect(localStorage.getItem('investindo-em-negocios-theme')).toBe('dark');
  });

  it('toggles between light and dark', () => {
    service.set('light');

    expect(service.toggle()).toBe('dark');
    expect(service.toggle()).toBe('light');
  });

  it('restores a stored theme on init', () => {
    localStorage.setItem('investindo-em-negocios-theme', 'dark');

    expect(service.init()).toBe('dark');
    expect(service.current()).toBe('dark');
  });
});
