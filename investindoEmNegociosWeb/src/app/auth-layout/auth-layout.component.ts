import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

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
