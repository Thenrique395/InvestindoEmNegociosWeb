import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import { BodyPortalDirective } from '../body-portal.directive';
import { getActiveLocale } from '../../core/utils/locale-utils';
import { maskDateDDMMYYYY } from '../../core/utils/input-mask';

interface DayCell {
  day: number;
  date: Date;
  iso: string;
  inRange: boolean;
  selected: boolean;
  today: boolean;
  ariaLabel: string;
}

/**
 * Campo de data com calendário. O usuário pode digitar (DD/MM/AAAA, máscara
 * automática) ou escolher no calendário — os dois lados ficam sincronizados.
 * Respeita min/max (fora do intervalo é bloqueado). Formato do valor: 'local'
 * (DD/MM/AAAA) ou 'iso' (yyyy-MM-dd). Emite '' quando vazio, incompleto ou
 * fora do intervalo, para a validação do formulário pai barrar.
 */
@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [BodyPortalDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="date-picker" [class.date-picker--disabled]="disabled">
      <input
        #anchor
        type="text"
        class="date-picker__input"
        inputmode="numeric"
        autocomplete="off"
        maxlength="10"
        [attr.id]="inputId || null"
        [attr.aria-label]="ariaLabel || null"
        [attr.aria-invalid]="invalid ? 'true' : null"
        [attr.placeholder]="placeholder"
        [disabled]="disabled"
        [value]="display"
        (input)="onInput($event)"
        (focus)="openCalendar()"
        (click)="openCalendar()"
        (keydown)="onKeydown($event)" />
      <button
        type="button"
        class="date-picker__toggle"
        [disabled]="disabled"
        [attr.aria-label]="open ? 'Fechar calendário' : 'Abrir calendário'"
        [attr.aria-expanded]="open"
        (click)="toggleCalendar($event)">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <rect x="3" y="4.5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.7" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    @if (open) {
      <div
        appBodyPortal
        class="date-popover"
        role="dialog"
        aria-label="Calendário"
        [style.top.px]="popTop"
        [style.left.px]="popLeft"
        [style.width.px]="popWidth">
        <div class="date-popover__head">
          <button type="button" class="date-popover__nav" aria-label="Mês anterior" (click)="prevMonth()">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <span class="date-popover__title">{{ monthTitle }}</span>
          <button type="button" class="date-popover__nav" aria-label="Próximo mês" (click)="nextMonth()">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="date-popover__weekdays" aria-hidden="true">
          @for (w of weekdays; track $index) { <span>{{ w }}</span> }
        </div>
        <div class="date-popover__grid" role="grid">
          @for (cell of cells; track $index) {
            @if (cell) {
              <button
                type="button"
                class="date-popover__day"
                [class.date-popover__day--selected]="cell.selected"
                [class.date-popover__day--today]="cell.today"
                [disabled]="!cell.inRange"
                [attr.aria-label]="cell.ariaLabel"
                [attr.aria-selected]="cell.selected"
                (click)="selectDay(cell)">{{ cell.day }}</button>
            } @else {
              <span class="date-popover__day date-popover__day--empty"></span>
            }
          }
        </div>
        <div class="date-popover__foot">
          <button type="button" class="date-popover__today-btn" (click)="goToday()">Hoje</button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .date-picker {
      position: relative;
      display: flex;
      align-items: center;
    }

    .date-picker__input {
      width: 100%;
      min-height: var(--h-input, 52px);
      padding: 0 2.6rem 0 1rem;
      border: 1px solid var(--border, var(--border));
      border-radius: var(--radius-inner);
      background: var(--surface-sunken, var(--surface));
      color: var(--text);
      font-size: var(--fs-subhead, 1rem);
      font-weight: var(--fw-medium, 500);
      box-sizing: border-box;
      transition: var(--control-transition, border-color 160ms ease, box-shadow 160ms ease);
    }

    .date-picker__input:focus {
      outline: none;
      border-color: var(--primary);
      background: var(--surface, var(--surface));
      box-shadow: 0 0 0 4px var(--primary-ring, color-mix(in srgb, var(--primary) 20%, transparent));
    }

    .date-picker__input[aria-invalid='true'] {
      border-color: var(--expense, var(--expense));
    }

    .date-picker__toggle {
      position: absolute;
      right: 0.5rem;
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border: none;
      border-radius: var(--radius-control);
      background: transparent;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: color 160ms ease, background-color 160ms ease;
    }
    .date-picker__toggle:hover { color: var(--text); background: var(--surface-sunken); }
    .date-picker--disabled .date-picker__toggle { cursor: not-allowed; opacity: 0.5; }

    .date-popover {
      position: fixed;
      z-index: 10001;
      min-width: 260px;
      padding: 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-inner);
      background: var(--surface);
      box-shadow: var(--shadow-modal, 0 12px 32px rgba(0,0,0,0.18));
      color: var(--text);
    }

    .date-popover__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .date-popover__title {
      font-weight: var(--fw-semibold, 600);
      font-size: var(--fs-subhead, 1rem);
      text-transform: capitalize;
    }
    .date-popover__nav {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-control);
      background: var(--surface-sunken);
      color: var(--text);
      cursor: pointer;
      transition: background-color 160ms ease;
    }
    .date-popover__nav:hover { background: var(--surface-inset, var(--surface-sunken)); }

    .date-popover__weekdays,
    .date-popover__grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .date-popover__weekdays {
      margin-bottom: 4px;
    }
    .date-popover__weekdays span {
      text-align: center;
      font-size: var(--fs-caption, 0.72rem);
      font-weight: var(--fw-semibold, 600);
      color: var(--text-tertiary);
      text-transform: uppercase;
      padding: 2px 0;
    }

    .date-popover__day {
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      border: 1px solid transparent;
      border-radius: var(--radius-control);
      background: transparent;
      color: var(--text);
      font-size: var(--fs-meta, 0.9rem);
      cursor: pointer;
      transition: background-color 120ms ease, color 120ms ease;
    }
    .date-popover__day:hover:not(:disabled) { background: var(--surface-sunken); }
    .date-popover__day--empty { cursor: default; }
    .date-popover__day--today { border-color: var(--border-strong, var(--border)); font-weight: var(--fw-semibold, 600); }
    .date-popover__day--selected {
      background: var(--primary);
      color: var(--primary-contrast);
      font-weight: var(--fw-semibold, 600);
    }
    .date-popover__day--selected:hover { background: var(--primary); }
    .date-popover__day:disabled { color: var(--text-tertiary); opacity: 0.35; cursor: not-allowed; }

    .date-popover__foot {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }
    .date-popover__today-btn {
      border: none;
      background: transparent;
      color: var(--primary-text, var(--primary));
      font-size: var(--fs-meta, 0.9rem);
      font-weight: var(--fw-semibold, 600);
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-control);
    }
    .date-popover__today-btn:hover { background: var(--surface-sunken); }

    @media (prefers-reduced-motion: reduce) {
      .date-picker__input, .date-picker__toggle, .date-popover__day { transition: none; }
    }
  `]
})
export class DatePickerComponent implements OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  @Input() value = '';
  @Input() format: 'local' | 'iso' = 'local';
  @Input() min?: string;
  @Input() max?: string;
  @Input() placeholder = 'DD/MM/AAAA';
  @Input() disabled = false;
  @Input() inputId?: string;
  @Input() ariaLabel?: string;
  @Input() invalid = false;

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('anchor') anchor?: ElementRef<HTMLInputElement>;

  display = '';
  open = false;
  cells: (DayCell | null)[] = [];
  weekdays: string[] = [];
  monthTitle = '';
  popTop = 0;
  popLeft = 0;
  popWidth = 280;

  private viewYear = new Date().getFullYear();
  private viewMonth = new Date().getMonth();
  private selected: Date | null = null;
  private lastEmitted = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value !== this.lastEmitted) {
      this.selected = this.parseIncoming(this.value);
      this.display = this.selected ? this.toLocal(this.selected) : '';
      if (this.selected) {
        this.viewYear = this.selected.getFullYear();
        this.viewMonth = this.selected.getMonth();
      }
    }
    this.buildWeekdays();
    this.buildGrid();
  }

  // ---- Entrada por digitação ----
  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.display = maskDateDDMMYYYY(raw);
    const parsed = this.parseLocal(this.display);
    if (parsed) {
      this.selected = parsed;
      this.viewYear = parsed.getFullYear();
      this.viewMonth = parsed.getMonth();
      this.emit(parsed);
    } else {
      this.selected = null;
      this.emit(null);
    }
    this.buildGrid();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open) {
      this.closeCalendar();
      event.stopPropagation();
    }
  }

  // ---- Calendário ----
  toggleCalendar(event: Event): void {
    event.preventDefault();
    if (this.open) { this.closeCalendar(); } else { this.openCalendar(); this.anchor?.nativeElement.focus(); }
  }

  openCalendar(): void {
    if (this.disabled || this.open) return;
    if (this.selected) { this.viewYear = this.selected.getFullYear(); this.viewMonth = this.selected.getMonth(); }
    this.open = true;
    this.buildGrid();
    this.reposition();
    this.cdr.markForCheck();
  }

  closeCalendar(): void {
    if (!this.open) return;
    this.open = false;
    this.cdr.markForCheck();
  }

  prevMonth(): void { this.shiftMonth(-1); }
  nextMonth(): void { this.shiftMonth(1); }

  private shiftMonth(delta: number): void {
    const d = new Date(this.viewYear, this.viewMonth + delta, 1);
    this.viewYear = d.getFullYear();
    this.viewMonth = d.getMonth();
    this.buildGrid();
    this.cdr.markForCheck();
  }

  goToday(): void {
    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.buildGrid();
    this.cdr.markForCheck();
  }

  selectDay(cell: DayCell): void {
    if (!cell.inRange) return;
    this.selected = cell.date;
    this.display = this.toLocal(cell.date);
    this.emit(cell.date);
    this.closeCalendar();
  }

  // ---- Reposicionamento / clique fora ----
  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.open) return;
    const target = event.target as Node;
    const inHost = this.hostRef.nativeElement.contains(target);
    const pop = document.querySelector('.date-popover');
    const inPop = pop?.contains(target) ?? false;
    if (!inHost && !inPop) this.closeCalendar();
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.open) this.reposition();
  }

  /** Cabe um mês inteiro sem apertar, e ainda entra numa tela de 320px. */
  private static readonly PopoverWidth = 300;

  private reposition(): void {
    const el = this.anchor?.nativeElement;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    // A largura é do calendário, não do campo: sete colunas de dia têm tamanho
    // próprio. Copiar a largura do campo esticava o grid até virar uma parede em
    // formulário de campo largo (onboarding, perfil) — cada dia com centenas de
    // pixels de distância do seguinte.
    const width = Math.min(DatePickerComponent.PopoverWidth, window.innerWidth - 12);
    const estimatedHeight = 340;
    const below = rect.bottom + 6;
    const above = rect.top - estimatedHeight - 6;
    const openBelow = below + estimatedHeight <= window.innerHeight || above < 0;
    this.popTop = openBelow ? below : Math.max(6, above);
    this.popLeft = Math.min(Math.max(6, rect.left), window.innerWidth - width - 6);
    this.popWidth = width;
    this.cdr.markForCheck();
  }

  // ---- Construção do grid ----
  private buildWeekdays(): void {
    const locale = getActiveLocale();
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    // 2023-01-01 é domingo
    this.weekdays = Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2023, 0, 1 + i)).replace('.', '').slice(0, 3)
    );
  }

  private buildGrid(): void {
    const locale = getActiveLocale();
    this.monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
      .format(new Date(this.viewYear, this.viewMonth, 1));

    const min = this.minDate();
    const max = this.maxDate();
    const todayIso = this.toIso(new Date());
    const selIso = this.selected ? this.toIso(this.selected) : '';

    const firstWeekday = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const cells: (DayCell | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(this.viewYear, this.viewMonth, day);
      const iso = this.toIso(date);
      cells.push({
        day,
        date,
        iso,
        inRange: (!min || date >= min) && (!max || date <= max),
        selected: iso === selIso,
        today: iso === todayIso,
        ariaLabel: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
      });
    }
    this.cells = cells;
  }

  // ---- Emissão / conversões ----
  private emit(date: Date | null): void {
    const min = this.minDate();
    const max = this.maxDate();
    let out = '';
    if (date && (!min || date >= min) && (!max || date <= max)) {
      out = this.format === 'iso' ? this.toIso(date) : this.toLocal(date);
    }
    this.lastEmitted = out;
    this.valueChange.emit(out);
    this.cdr.markForCheck();
  }

  private parseIncoming(value: string): Date | null {
    if (!value) return null;
    return this.format === 'iso' ? this.parseIso(value) : this.parseLocal(value);
  }

  private parseLocal(value: string): Date | null {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length !== 8) return null;
    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    return this.buildValid(year, month, day);
  }

  private parseIso(value: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
    if (!m) return null;
    return this.buildValid(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  private buildValid(year: number, month: number, day: number): Date | null {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month || d.getDate() !== day) return null;
    return d;
  }

  private toLocal(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }

  private toIso(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  }

  private minDate(): Date | null {
    return this.min ? this.parseIncomingLoose(this.min) : new Date(1900, 0, 1);
  }
  private maxDate(): Date | null {
    return this.max ? this.parseIncomingLoose(this.max) : new Date(2100, 11, 31);
  }
  private parseIncomingLoose(value: string): Date | null {
    return this.parseIso(value) ?? this.parseLocal(value);
  }
}
