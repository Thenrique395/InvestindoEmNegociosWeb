import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type ProgressMode, type ProgressTone, toneFor } from './progress-thresholds';

/**
 * Barra de progresso — COMPONENTES.md §9.
 *
 * A cor vem do modo (`consumo` × `conquista`), não da tela. Passar `tone`
 * manualmente só é necessário quando a barra não representa nem consumo nem
 * conquista — o que é raro.
 */
@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent {
  readonly value = input.required<number>();
  readonly max = input(100);
  readonly mode = input<ProgressMode>('consumo');
  /** Só para conquista: o ritmo alcança o prazo? */
  readonly onTrack = input(true);
  /** Sobrepõe o limiar. Use apenas fora das duas semânticas. */
  readonly tone = input<ProgressTone | null>(null);
  readonly ariaLabel = input<string | null>(null);

  /** Percentual real, que pode passar de 100 — é o que decide a cor. */
  readonly percent = computed(() => {
    const max = this.max();
    if (max <= 0) return 0;
    return (this.value() / max) * 100;
  });

  /** Largura visual, presa a 100: a barra não vaza do trilho ao estourar. */
  readonly width = computed(() => Math.min(100, Math.max(0, this.percent())));

  readonly effectiveTone = computed(
    () => this.tone() ?? toneFor(this.mode(), this.percent(), this.onTrack()),
  );
}
