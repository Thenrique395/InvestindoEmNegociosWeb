
import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MARKETING_PLANS } from '../marketing-plans';

type HeroPreview = {
  eyebrow: string;
  title: string;
  description: string;
  kind: 'dashboard' | 'cards' | 'goals';
};

type PersonaCard = {
  title: string;
  description: string;
  modules: string[];
};

type TrustPoint = {
  icon: 'lock' | 'shield' | 'eye' | 'export';
  title: string;
  description: string;
};

@Component({
  selector: 'app-product-showcase',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './product-showcase.component.html',
  styleUrls: ['./product-showcase.component.scss']
})
export class ProductShowcaseComponent implements OnInit, OnDestroy {
  protected readonly heroPreviews: HeroPreview[] = [
    {
      eyebrow: 'Resumo do mês',
      title: 'Quanto sobra, sem precisar somar nada',
      description: 'Entradas, saídas e o que falta vencer aparecem prontos assim que você abre o painel.',
      kind: 'dashboard'
    },
    {
      eyebrow: 'Cartões e faturas',
      title: 'A fatura conectada ao mês certo',
      description: 'Compras, parcelas e fechamento por competência, sem fazer essa conta na cabeça.',
      kind: 'cards'
    },
    {
      eyebrow: 'Metas financeiras',
      title: 'Cada aporte aproxima da meta',
      description: 'Defina o objetivo e acompanhe o progresso real, mês a mês, sem perder o fio.',
      kind: 'goals'
    }
  ];

  protected readonly personas: PersonaCard[] = [
    {
      title: 'Autônomo ou freelancer',
      description: 'Receita varia de mês a mês? Veja o que já entrou, o que falta receber e o que pode comprometer agora.',
      modules: ['Receitas', 'Despesas', 'Calendário']
    },
    {
      title: 'Casal ou família',
      description: 'Centralize contas, cartões e despesas do casal em um lugar só, com saldo real sempre à vista.',
      modules: ['Contas', 'Cartões', 'Metas']
    },
    {
      title: 'Quem vive no cartão',
      description: 'Acompanhe fechamento, vencimento e parcelas de cada cartão sem surpresa na próxima fatura.',
      modules: ['Cartões', 'Faturas', 'Importação de PDF']
    },
    {
      title: 'Quem quer crescer patrimônio',
      description: 'Depois que o mês está sob controle, conecte investimentos e acompanhe a evolução do patrimônio.',
      modules: ['Investimentos', 'Patrimônio', 'Projeções']
    }
  ];

  protected readonly trustPoints: TrustPoint[] = [
    {
      icon: 'lock',
      title: 'Acesso protegido por login próprio',
      description: 'Sua conta é protegida por autenticação e senha — só você acessa seus dados.'
    },
    {
      icon: 'shield',
      title: 'Sem conectar sua conta bancária',
      description: 'Você registra as informações no seu ritmo, sem compartilhar senha de banco com terceiros.'
    },
    {
      icon: 'eye',
      title: 'Você decide o que ver',
      description: 'Oculte valores na tela quando quiser e controle o que cada visão mostra, do seu jeito.'
    },
    {
      icon: 'export',
      title: 'Seus dados são seus',
      description: 'Exporte suas informações quando quiser — nada fica preso à plataforma.'
    }
  ];

  protected readonly plans = MARKETING_PLANS;

  protected readonly planIconVariants: Record<string, string> = {
    basic: 'feature-card__icon--info',
    intermediate: 'feature-card__icon--primary',
    advanced: 'feature-card__icon--success'
  };

  private readonly tagVariants: Record<string, string> = {
    Receitas: 'tag--income',
    Despesas: 'tag--expense',
    Faturas: 'tag--expense',
    Cartões: 'tag--expense',
    Investimentos: 'tag--investment',
    Patrimônio: 'tag--investment',
    Projeções: 'tag--investment',
    Contas: 'tag--organize',
    Calendário: 'tag--organize',
    Metas: 'tag--organize',
    'Importação de PDF': 'tag--organize'
  };

  protected activePreviewIndex = 0;
  protected previewPaused = false;

  private previewTimer?: number;

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

  protected tagVariant(module: string): string {
    return this.tagVariants[module] ?? 'tag--organize';
  }
}
