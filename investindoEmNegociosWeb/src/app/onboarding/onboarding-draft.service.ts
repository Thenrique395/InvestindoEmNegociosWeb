import { Injectable } from '@angular/core';
import { FocusArea, IntelligenceMode } from './onboarding.types';

export type OnboardingDraft = {
  focus: FocusArea | null;
  intelligenceMode: IntelligenceMode | null;
  carryOverDay: number;
};

const draftStorageKey = 'onboarding_draft';
const validFocusAreas = new Set<FocusArea>([
  'vida-financeira',
  'sair-dividas',
  'comecar-investir',
  'reserva-emergencia'
]);

@Injectable({ providedIn: 'root' })
export class OnboardingDraftService {
  read(): OnboardingDraft | null {
    const storage = this.getStorage();
    if (!storage) return null;

    try {
      const raw = storage.getItem(draftStorageKey);
      if (!raw) return null;

      const draft = JSON.parse(raw) as Partial<OnboardingDraft>;
      return {
        focus: this.resolveFocus(draft.focus),
        intelligenceMode: this.resolveIntelligenceMode(draft.intelligenceMode),
        carryOverDay: this.resolveCarryOverDay(draft.carryOverDay)
      };
    } catch {
      storage.removeItem(draftStorageKey);
      return null;
    }
  }

  save(draft: OnboardingDraft): void {
    const storage = this.getStorage();
    if (!storage) return;

    storage.setItem(draftStorageKey, JSON.stringify({
      focus: draft.focus,
      intelligenceMode: draft.intelligenceMode,
      carryOverDay: this.resolveCarryOverDay(draft.carryOverDay)
    }));
  }

  clear(): void {
    this.getStorage()?.removeItem(draftStorageKey);
  }

  private resolveFocus(value: unknown): FocusArea | null {
    return typeof value === 'string' && validFocusAreas.has(value as FocusArea)
      ? value as FocusArea
      : null;
  }

  private resolveIntelligenceMode(value: unknown): IntelligenceMode | null {
    return value === 'B' || value === 'C' ? value : null;
  }

  private resolveCarryOverDay(value: unknown): number {
    const day = Number(value);
    return Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1;
  }

  private getStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }
}
