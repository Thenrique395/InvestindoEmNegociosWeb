import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProfileService } from './profile.service';
import { UserPreferencesFacadeService } from './user-preferences-facade.service';
import { getLocaleSettings, setLocaleSettings } from './utils/locale-settings';

describe('UserPreferencesFacadeService', () => {
  let service: UserPreferencesFacadeService;
  let profileService: jasmine.SpyObj<Pick<ProfileService, 'getPreferences'>>;

  beforeEach(() => {
    profileService = jasmine.createSpyObj<Pick<ProfileService, 'getPreferences'>>('ProfileService', ['getPreferences']);
    localStorage.clear();
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
    document.documentElement.lang = 'pt-BR';

    TestBed.configureTestingModule({
      providers: [
        UserPreferencesFacadeService,
        { provide: ProfileService, useValue: profileService }
      ]
    });

    service = TestBed.inject(UserPreferencesFacadeService);
  });

  afterEach(() => {
    localStorage.clear();
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
    document.documentElement.lang = 'pt-BR';
  });

  it('aplica preferencias salvas localmente ao inicializar', () => {
    localStorage.setItem('app_locale', 'en-US');
    localStorage.setItem('app_currency', 'USD');

    service.initFromStorage();

    expect(document.documentElement.lang).toBe('en-US');
    expect(getLocaleSettings()).toEqual({ locale: 'en-US', currency: 'USD' });
  });

  it('carrega preferencias remotas e persiste locale e moeda', () => {
    profileService.getPreferences.and.returnValue(of({
      currency: 'EUR',
      locales: ['pt-PT']
    }));

    service.loadRemotePreferences();

    expect(document.documentElement.lang).toBe('pt-PT');
    expect(getLocaleSettings()).toEqual({ locale: 'pt-PT', currency: 'EUR' });
    expect(localStorage.getItem('app_locale')).toBe('pt-PT');
    expect(localStorage.getItem('app_currency')).toBe('EUR');
  });
});
