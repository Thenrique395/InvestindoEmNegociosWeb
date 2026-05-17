import { of, throwError } from 'rxjs';
import { SubscriptionsComponent } from './subscriptions.component';

describe('SubscriptionsComponent', () => {
  function createComponent(overrides?: { subscriptionsService?: any; authService?: any; billingService?: any; router?: any; uiFeedback?: any }) {
    const subscriptionsService = overrides?.subscriptionsService ?? {
      getCatalog: jasmine.createSpy().and.returnValue(of({
        current: {
          planCode: 'basic',
          planName: 'Basic',
          role: 'Basic',
          status: 'Active',
          billingCycle: 'Monthly',
          priceAmount: 0,
          currency: 'BRL',
          autoRenew: false,
          startedAt: '2026-03-14T10:00:00Z',
          renewsAt: null,
          cancelledAt: null
        },
        plans: [
          {
            code: 'basic',
            name: 'Basic',
            role: 'Basic',
            description: 'desc',
            monthlyPrice: 0,
            yearlyPrice: 0,
            recommended: false,
            current: true,
            features: [],
            limits: {}
          },
          {
            code: 'intermediate',
            name: 'Intermediate',
            role: 'Intermediate',
            description: 'desc',
            monthlyPrice: 29.9,
            yearlyPrice: 299,
            recommended: true,
            current: false,
            features: [],
            limits: {}
          }
        ],
        notes: ['nota']
      })),
      change: jasmine.createSpy().and.returnValue(of({
        current: {
          planCode: 'intermediate',
          planName: 'Intermediate',
          role: 'Intermediate',
          status: 'Active',
          billingCycle: 'Monthly',
          priceAmount: 29.9,
          currency: 'BRL',
          autoRenew: true,
          startedAt: '2026-03-14T10:00:00Z',
          renewsAt: '2026-04-14T10:00:00Z',
          cancelledAt: null
        },
        session: {
          userId: '1',
          name: 'Teste',
          email: 'teste@teste.com',
          role: 'Intermediate',
          token: 'jwt',
          refreshToken: 'refresh',
          expiresAt: '2026-03-14T11:00:00Z'
        },
        notes: ['nota']
      })),
      cancel: jasmine.createSpy().and.returnValue(of({
        current: {
          planCode: 'intermediate',
          planName: 'Intermediate',
          role: 'Basic',
          status: 'Cancelled',
          billingCycle: 'Monthly',
          priceAmount: 29.9,
          currency: 'BRL',
          autoRenew: false,
          startedAt: '2026-03-14T10:00:00Z',
          renewsAt: '2026-04-14T10:00:00Z',
          cancelledAt: '2026-03-14T10:00:00Z'
        },
        session: {
          userId: '1',
          name: 'Teste',
          email: 'teste@teste.com',
          role: 'Basic',
          token: 'jwt-basic',
          refreshToken: 'refresh-basic',
          expiresAt: '2026-03-14T11:00:00Z'
        },
        notes: ['nota']
      }))
    };
    const authService = overrides?.authService ?? { applySession: jasmine.createSpy() };
    const billingService = overrides?.billingService ?? { createPortalSession: jasmine.createSpy().and.returnValue(of({ url: 'https://billing.test' })) };
    const router = overrides?.router ?? { navigate: jasmine.createSpy() };
    const uiFeedback = overrides?.uiFeedback ?? { success: jasmine.createSpy(), error: jasmine.createSpy() };

    return {
      component: new SubscriptionsComponent(subscriptionsService, authService, billingService, router, uiFeedback),
      subscriptionsService,
      authService,
      billingService,
      router,
      uiFeedback
    };
  }

  it('deve carregar catálogo ao iniciar', () => {
    const ctx = createComponent();

    expect(ctx.subscriptionsService.getCatalog).toHaveBeenCalled();
    expect(ctx.component.catalog?.current.planCode).toBe('basic');
  });

  it('deve redirecionar planos pagos para o checkout', () => {
    const ctx = createComponent();
    const plan = ctx.component.catalog!.plans[1];

    ctx.component.change(plan);

    expect(ctx.router.navigate).toHaveBeenCalledWith(['/checkout'], {
      queryParams: { plan: 'intermediate', cycle: 'Monthly' }
    });
    expect(ctx.subscriptionsService.change).not.toHaveBeenCalled();
    expect(ctx.authService.applySession).not.toHaveBeenCalled();
    expect(ctx.component.catalog?.current.planCode).toBe('basic');
  });

  it('deve exibir erro quando a troca falhar', () => {
    const subscriptionsService = {
      getCatalog: jasmine.createSpy().and.returnValue(of({
        current: { planCode: 'intermediate', planName: 'Intermediate', role: 'Intermediate', status: 'Active', billingCycle: 'Monthly', priceAmount: 29.9, currency: 'BRL', autoRenew: true, startedAt: '2026-03-14T10:00:00Z', renewsAt: '2026-04-14T10:00:00Z', cancelledAt: null },
        plans: [{ code: 'basic', name: 'Basic', role: 'Basic', description: 'desc', monthlyPrice: 0, yearlyPrice: 0, recommended: false, current: false, features: [], limits: {} }],
        notes: []
      })),
      change: jasmine.createSpy().and.returnValue(throwError(() => ({ error: { detail: 'Falha ao alterar' } }))),
      cancel: jasmine.createSpy()
    };
    const uiFeedback = { success: jasmine.createSpy(), error: jasmine.createSpy() };
    const ctx = createComponent({ subscriptionsService, uiFeedback });

    ctx.component.change(ctx.component.catalog!.plans[0]);

    expect(ctx.subscriptionsService.change).toHaveBeenCalledWith('basic', 'Monthly');
    expect(uiFeedback.error).toHaveBeenCalledWith('Falha ao alterar');
  });
});
