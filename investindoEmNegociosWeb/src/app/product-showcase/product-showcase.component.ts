
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

type HeroPreview = {
  eyebrow: string;
  title: string;
  description: string;
  kind: 'dashboard' | 'cards' | 'goals';
};

@Component({
  selector: 'app-product-showcase',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-showcase.component.html',
  styleUrls: ['./product-showcase.component.scss']
})
export class ProductShowcaseComponent implements OnInit, OnDestroy {
  protected readonly heroPreviews: HeroPreview[] = [
    {
      eyebrow: 'Resumo do mês',
      title: 'Seu mês com clareza',
      description: 'Veja o que entrou, saiu e o que ainda precisa da sua atenção.',
      kind: 'dashboard'
    },
    {
      eyebrow: 'Cartões e faturas',
      title: 'Compras conectadas ao ciclo',
      description: 'Acompanhe fechamento, vencimento e impacto das compras no período.',
      kind: 'cards'
    },
    {
      eyebrow: 'Metas financeiras',
      title: 'Objetivos com progresso visível',
      description: 'Registre aportes e acompanhe o quanto falta para chegar na meta.',
      kind: 'goals'
    }
  ];

  protected activePreviewIndex = 0;
  protected previewPaused = false;

  private previewTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    if (typeof window === 'undefined') return;

    this.previewTimer = window.setInterval(() => {
      if (!this.previewPaused) {
        this.activePreviewIndex = (this.activePreviewIndex + 1) % this.heroPreviews.length;
      }
    }, 6500);
  }

  ngOnDestroy(): void {
    if (this.previewTimer) {
      clearInterval(this.previewTimer);
    }
  }

  protected selectPreview(index: number): void {
    this.activePreviewIndex = index;
  }

  protected pausePreview(): void {
    this.previewPaused = true;
  }

  protected resumePreview(): void {
    this.previewPaused = false;
  }
}
