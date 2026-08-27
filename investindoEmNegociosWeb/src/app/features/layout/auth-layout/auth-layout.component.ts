import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface AuthTrustSeal {
  icon: 'shield' | 'lock' | 'download';
  label: string;
}

/** Selos padrão. A tela pode trocar por outros, ou passar `[]` para esconder. */
export const SELOS_DE_CONFIANCA: readonly AuthTrustSeal[] = [
  { icon: 'shield', label: 'Conexão protegida' },
  { icon: 'lock', label: 'Sem senha de banco' },
  { icon: 'download', label: 'Seus dados exportáveis' },
];

/**
 * Moldura das telas de autenticação: cartão dividido, painel navy à esquerda
 * com a marca e a promessa, formulário à direita.
 *
 * Componente de apresentação puro — não conhece login, cadastro nem
 * recuperação. Cada tela injeta o próprio texto no painel e projeta o próprio
 * formulário. Toda a lógica de autenticação continua nos componentes de rota.
 *
 * O painel esquerdo some abaixo de 900px: em telas estreitas ele empurraria o
 * formulário para fora da primeira dobra, e o formulário é o que importa aqui.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent {
  readonly brandName = input('Investindo em Negócios');
  readonly logoSrc = input('assets/logoHeaderInvestindoemNegocios.png');

  /**
   * Prova visual do produto no painel esquerdo. Números ilustrativos: quem está
   * nesta tela não tem sessão, então não há dado real a mostrar.
   */
  readonly showcase = input(true);
  readonly trustSeals = input<readonly AuthTrustSeal[]>(SELOS_DE_CONFIANCA);

  readonly showcaseCells = [
    { label: 'Entrou', value: 'R$ 18.900', tone: 'income' },
    { label: 'Saiu', value: 'R$ 9.842', tone: 'expense' },
    { label: 'A vencer', value: 'R$ 2.421', tone: 'neutral' },
  ] as const;

  /** Doze meses; os três últimos em destaque, como no protótipo. */
  readonly showcaseBars = [38, 52, 34, 60, 46, 68, 50, 74, 58, 86, 78, 100].map((altura, i, todos) => ({
    altura,
    destaque: i >= todos.length - 3,
  }));

  /** Painel esquerdo. */
  readonly asideEyebrow = input.required<string>();
  readonly asideTitle = input.required<string>();
  readonly asideText = input.required<string>();
  readonly proofLabel = input<string | null>(null);
  readonly proofText = input<string | null>(null);

  /** Link de saída no topo do formulário. */
  readonly backLabel = input('Voltar para o site');
  readonly backRoute = input('/');

  /** Cabeçalho do formulário. */
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
