import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { OnboardingService } from './onboarding.service';

/**
 * Tela alcançável a partir do próprio onboarding: o formulário de despesa
 * inicial oferece "Cadastrar cartão", e sem esta exceção o guard devolvia o
 * link para /onboarding — o clique parecia não fazer nada. O caminho de volta
 * é o app-onboarding-return-banner, que a tela exibe enquanto o cadastro
 * inicial não termina.
 *
 * Categoria não entra na lista: no onboarding a opção de criar categoria fica
 * escondida (permiteCriarCategoria), justamente para não tirar a pessoa do
 * formulário que ela estava preenchendo.
 */
const LIBERADAS_NO_ONBOARDING = ['/cartoes'];

/**
 * Bloqueia rotas privadas para usuários sem token e segura o usuário no onboarding
 * até a configuração inicial ser concluída.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const onboarding = inject(OnboardingService);
  const platformId = inject(PLATFORM_ID);

  // No SSR não há acesso ao localStorage; evita redirecionamento incorreto no refresh.
  if (!isPlatformBrowser(platformId)) return true;

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/login') as UrlTree;
  }

  const targetUrl = (state.url || '/').split('?')[0];
  if (targetUrl.startsWith('/onboarding')) return true;
  if (LIBERADAS_NO_ONBOARDING.some((rota) => targetUrl.startsWith(rota))) return true;

  return onboarding.getStatus().pipe(
    map((status) => status.completed ? true : router.parseUrl('/onboarding')),
    catchError((err: unknown) => {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        return of(router.parseUrl('/login'));
      }
      // Erro sem status HTTP (rede instável, erro genérico) não significa sessão inválida —
      // não desloga o usuário por um erro ambíguo, segura no onboarding.
      return of(router.parseUrl('/onboarding'));
    })
  );
};
