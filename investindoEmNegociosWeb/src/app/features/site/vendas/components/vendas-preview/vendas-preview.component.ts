import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Prévia do painel no hero — janela de navegador com um recorte do dashboard.
 *
 * É ilustração, não o app: números fixos, sem serviço, sem estado. Fica em
 * `vendas/components/` porque só a landing usa. Se o tour do produto precisar
 * de algo parecido, será outro recorte — não este.
 *
 * `aria-hidden` porque o conteúdo é decorativo e repete o que o texto ao lado
 * já diz; um leitor de tela lendo "R$ 12.480,35" aqui só adicionaria ruído.
 */
@Component({
  selector: 'app-vendas-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vendas-preview.component.html',
  styleUrl: './vendas-preview.component.scss',
  host: { 'aria-hidden': 'true' },
})
export class VendasPreviewComponent {
  readonly url = 'app.investindoemnegocios.com.br';

  readonly period = 'Agosto de 2026';
  readonly variation = '+ 12,4% vs. julho';

  readonly kpis = [
    { label: 'Saldo disponível', value: 'R$ 12.480,35', wide: true },
    { label: 'Entrou', value: 'R$ 18.900', tone: 'income' as const },
    { label: 'Saiu', value: 'R$ 9.842', tone: 'expense' as const },
  ];

  readonly rows = [
    { label: 'Vence em 3 dias', value: 'Energia · R$ 318,42' },
    { label: 'Meta reserva', value: '67% concluída' },
  ];
}
