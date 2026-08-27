import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectMenuOption {
  value: string;
  label: string;
  /** Ponto colorido à esquerda — cor de categoria, por exemplo. */
  color?: string;
  /** Selo curto à esquerda do rótulo — bandeira do cartão, por exemplo. */
  badge?: string;
  /** Texto à direita da opção: média, contagem, atalho. */
  meta?: string;
  disabled?: boolean;
}

/**
 * Dropdown padrão do sistema — COMPONENTES.md §5.3.
 *
 * **Todo campo de valor múltiplo usa este componente.** Chips em linha são
 * proibidos por decisão de produto: não escalam quando o usuário cadastra 20
 * categorias (ARQUITETURA_ANGULAR.md §7).
 *
 * Implementa `ControlValueAccessor`, então funciona tanto com `[value]` +
 * `(valueChange)` quanto dentro de `FormGroup` tipado.
 *
 * Acessibilidade: segue o padrão combobox — `role="combobox"` no gatilho,
 * `role="listbox"`/`option` na lista, navegação por setas, Home/End, Enter,
 * Escape e busca por digitação quando `searchable`.
 */
@Component({
  selector: 'app-select-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select-menu.component.html',
  styleUrl: './select-menu.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectMenuComponent),
      multi: true,
    },
  ],
  host: {
    '[class.select-menu--open]': 'open()',
    '[class.select-menu--open-above]': 'openAbove()',
    '[class.select-menu--disabled]': 'isDisabled()',
  },
})
export class SelectMenuComponent implements ControlValueAccessor {
  readonly options = input.required<readonly SelectMenuOption[]>();
  readonly placeholder = input('Selecione');
  readonly searchable = input(false);
  /** Quando presente, mostra a ação de criar no rodapé do menu. */
  readonly createLabel = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);

  readonly valueChange = output<string>();
  readonly createRequested = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _value = signal<string>('');
  private readonly _open = signal(false);
  private readonly _openAbove = signal(false);
  private readonly _query = signal('');
  private readonly _activeIndex = signal(-1);
  private readonly _disabled = signal(false);

  readonly value = this._value.asReadonly();
  readonly open = this._open.asReadonly();
  readonly openAbove = this._openAbove.asReadonly();
  readonly panelTop = signal<number | null>(null);
  readonly panelBottom = signal<number | null>(null);
  readonly panelLeft = signal(0);
  readonly panelWidth = signal(0);
  readonly query = this._query.asReadonly();
  readonly activeIndex = this._activeIndex.asReadonly();
  readonly isDisabled = this._disabled.asReadonly();

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly selected = computed(() => this.options().find((o) => o.value === this._value()) ?? null);

  readonly visibleOptions = computed(() => {
    const q = this._query().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter((o) => o.label.toLowerCase().includes(q));
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // No SSR não existe `document`: registrar o listener aqui quebrava o
    // prerender das rotas que usam este campo (ex.: /receitas).
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    // Fechar ao clicar fora. Sem isto, dois dropdowns abertos disputam a tela —
    // o handoff pede que abrir um feche os outros.
    const onDocClick = (event: MouseEvent) => {
      if (!this._open()) return;
      if (!this.host.nativeElement.contains(event.target as Node)) this.close();
    };
    document.addEventListener('click', onDocClick, true);
    this.destroyRef.onDestroy(() => document.removeEventListener('click', onDocClick, true));
  }

  // ---- ControlValueAccessor ------------------------------------------------

  writeValue(value: string | null): void {
    this._value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  // ---- Interação -----------------------------------------------------------

  toggle(): void {
    if (this._disabled()) return;
    this._open() ? this.close() : this.openMenu();
  }

  openMenu(): void {
    if (this._disabled()) return;
    const bounds = this.host.nativeElement.getBoundingClientRect();
    const menuHeight = 260;
    const dialogFooter = this.host.nativeElement
      .closest('[role="dialog"]')
      ?.querySelector('footer')
      ?.getBoundingClientRect();
    const lowerBoundary = dialogFooter?.top ?? window.innerHeight;
    const openAbove = bounds.bottom + menuHeight > lowerBoundary && bounds.top > menuHeight;
    this._openAbove.set(openAbove);
    this.panelTop.set(openAbove ? null : bounds.bottom + 8);
    this.panelBottom.set(openAbove ? window.innerHeight - bounds.top - 8 : null);
    this.panelLeft.set(bounds.left);
    this.panelWidth.set(bounds.width);
    this._open.set(true);
    this._query.set('');
    const index = this.visibleOptions().findIndex((o) => o.value === this._value());
    this._activeIndex.set(index);

    if (this.searchable()) {
      // Espera o menu existir no DOM antes de focar o campo de busca.
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
    }
  }

  close(): void {
    if (!this._open()) return;
    this._open.set(false);
    this._openAbove.set(false);
    this._activeIndex.set(-1);
    this.onTouched();
  }

  select(option: SelectMenuOption): void {
    if (option.disabled) return;
    this._value.set(option.value);
    this.onChange(option.value);
    this.valueChange.emit(option.value);
    this.close();
  }

  onSearch(value: string): void {
    this._query.set(value);
    this._activeIndex.set(this.visibleOptions().length ? 0 : -1);
  }

  requestCreate(): void {
    this.createRequested.emit();
    this.close();
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this._disabled()) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        event.preventDefault();
        this._open() ? this.move(event.key === 'ArrowUp' ? -1 : 1) : this.openMenu();
        break;
      case 'Escape':
        this.close();
        break;
      case 'Home':
        if (this._open()) {
          event.preventDefault();
          this._activeIndex.set(0);
        }
        break;
      case 'End':
        if (this._open()) {
          event.preventDefault();
          this._activeIndex.set(this.visibleOptions().length - 1);
        }
        break;
    }
  }

  onMenuKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Enter': {
        event.preventDefault();
        const option = this.visibleOptions()[this._activeIndex()];
        if (option) this.select(option);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  private move(delta: number): void {
    const list = this.visibleOptions();
    if (!list.length) return;
    const next = (this._activeIndex() + delta + list.length) % list.length;
    this._activeIndex.set(next);
  }
}
