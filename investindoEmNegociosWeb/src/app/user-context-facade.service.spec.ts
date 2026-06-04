import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ProfileService, UserProfile } from './profile.service';
import { UserContextFacadeService } from './user-context-facade.service';

describe('UserContextFacadeService', () => {
  let service: UserContextFacadeService;
  let authService: jasmine.SpyObj<Pick<AuthService, 'getUserName'>>;
  let profileService: jasmine.SpyObj<Pick<ProfileService, 'clearProfile' | 'getProfile'>> & {
    profile$: BehaviorSubject<UserProfile | null>;
  };

  const profile: UserProfile = {
    userId: 'user-1',
    fullName: 'Tiago Henrique dos Santos',
    document: '01587610493',
    phone: '81995257823',
    avatarUrl: 'https://example.com/avatar.png'
  };

  beforeEach(() => {
    authService = jasmine.createSpyObj<Pick<AuthService, 'getUserName'>>('AuthService', ['getUserName']);
    profileService = jasmine.createSpyObj<Pick<ProfileService, 'clearProfile' | 'getProfile'>>(
      'ProfileService',
      ['clearProfile', 'getProfile']
    ) as jasmine.SpyObj<Pick<ProfileService, 'clearProfile' | 'getProfile'>> & {
      profile$: BehaviorSubject<UserProfile | null>;
    };
    profileService.profile$ = new BehaviorSubject<UserProfile | null>(null);
    profileService.getProfile.and.returnValue(of(profile));
    authService.getUserName.and.returnValue('Usuário Teste');

    TestBed.configureTestingModule({
      providers: [
        UserContextFacadeService,
        { provide: AuthService, useValue: authService },
        { provide: ProfileService, useValue: profileService }
      ]
    });

    service = TestBed.inject(UserContextFacadeService);
  });

  it('publica nome, avatar e iniciais do perfil carregado', () => {
    const states = subscribeStates();

    service.loadProfile();
    profileService.profile$.next(profile);

    expect(states.at(-1)).toEqual({
      profile,
      displayName: 'Tiago Henrique dos Santos',
      avatarUrl: 'https://example.com/avatar.png',
      userInitials: 'TS'
    });
    expect(profileService.getProfile).toHaveBeenCalledTimes(1);
  });

  it('usa o nome da sessao quando perfil nao tem nome', () => {
    const states = subscribeStates();

    service.loadProfile();
    profileService.profile$.next({ ...profile, fullName: '   ', avatarUrl: '' });

    expect(states.at(-1)?.displayName).toBe('Usuário Teste');
    expect(states.at(-1)?.userInitials).toBe('UT');
    expect(states.at(-1)?.avatarUrl).toBe('');
  });

  it('reseta estado e limpa cache de perfil', () => {
    const states = subscribeStates();

    service.loadProfile();
    profileService.profile$.next(profile);
    service.reset();

    expect(profileService.clearProfile).toHaveBeenCalled();
    expect(states.at(-1)).toEqual({
      profile: null,
      displayName: 'Usuário',
      avatarUrl: '',
      userInitials: 'U'
    });
  });

  it('ignora erro ao buscar perfil remoto', () => {
    profileService.getProfile.and.returnValue(throwError(() => new Error('falha')));

    expect(() => service.loadProfile()).not.toThrow();
  });

  function subscribeStates() {
    const states: Array<{
      profile: UserProfile | null;
      displayName: string;
      avatarUrl: string;
      userInitials: string;
    }> = [];
    service.state$.subscribe((state) => states.push(state));
    return states;
  }
});
