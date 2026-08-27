export type FocusArea = 'vida-financeira' | 'sair-dividas' | 'comecar-investir' | 'reserva-emergencia';
// A = agressivo, B = balanceado, C = conservador (o backend guarda a letra).
export type IntelligenceMode = 'A' | 'B' | 'C';

export type FocusIcon = 'growth' | 'debt' | 'invest' | 'shield';
export type ModeIcon = 'balance' | 'shield' | 'accelerate';

export interface FocusOption {
  id: FocusArea;
  title: string;
  description: string;
  tooltip: string;
  icon: FocusIcon;
}

export interface IntelligenceModeOption {
  id: IntelligenceMode;
  title: string;
  description: string;
  tooltip: string;
  icon: ModeIcon;
}
