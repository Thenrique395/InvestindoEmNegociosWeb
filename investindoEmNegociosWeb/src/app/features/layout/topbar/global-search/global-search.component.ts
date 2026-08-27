import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiDataService } from '../../../../core/data/api-data.service';
import { AccountsStore } from '../../../../core/accounts.store';
import { CategoriesStore } from '../../../../core/categories.store';

interface SearchItem {
  label: string;
  sublabel: string;
  route: string;
  queryParams?: Record<string, string>;
}

interface SearchGroup {
  title: string;
  items: SearchItem[];
}

const MAX_PER_GROUP = 5;

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'handleShortcut($event)'
  }
})
export class GlobalSearchComponent implements OnInit {
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');
  private readonly router = inject(Router);
  private readonly db = inject(ApiDataService);
  private readonly accountsStore = inject(AccountsStore);
  private readonly categoriesStore = inject(CategoriesStore);

  readonly shortcutLabel = isMacPlatform() ? '⌘K' : 'Ctrl K';
  readonly query = signal('');
  readonly open = signal(false);

  private readonly cards = toSignal(this.db.cards$, { initialValue: [] });
  private readonly expenses = toSignal(this.db.expenses$, { initialValue: [] });
  private readonly incomes = toSignal(this.db.incomes$, { initialValue: [] });

  readonly groups = computed<SearchGroup[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length < 2) return [];

    const groups: SearchGroup[] = [];
    const has = (value: string | null | undefined) => (value ?? '').toLowerCase().includes(q);

    const accounts = this.accountsStore.accounts()
      .filter((a) => has(a.name))
      .slice(0, MAX_PER_GROUP)
      .map<SearchItem>((a) => ({ label: a.name, sublabel: 'Conta', route: '/contas' }));
    if (accounts.length) groups.push({ title: 'Contas', items: accounts });

    const cards = this.cards()
      .filter((c) => has(c.nome) || has(c.banco))
      .slice(0, MAX_PER_GROUP)
      .map<SearchItem>((c) => ({ label: c.nome, sublabel: c.banco ? `Cartão · ${c.banco}` : 'Cartão', route: '/cartoes' }));
    if (cards.length) groups.push({ title: 'Cartões', items: cards });

    const categories = this.categoriesStore.categories()
      .filter((c) => has(c.name))
      .slice(0, MAX_PER_GROUP)
      .map<SearchItem>((c) => ({ label: c.name, sublabel: 'Categoria', route: '/categorias' }));
    if (categories.length) groups.push({ title: 'Categorias', items: categories });

    const expenses = this.expenses()
      .filter((e) => has(e.nome) || has(e.categoria))
      .slice(0, MAX_PER_GROUP)
      .map<SearchItem>((e) => ({ label: e.nome, sublabel: 'Despesa', route: '/despesas', queryParams: { q: e.nome } }));
    if (expenses.length) groups.push({ title: 'Despesas', items: expenses });

    const incomes = this.incomes()
      .filter((i) => has(i.fonte) || has(i.categoria))
      .slice(0, MAX_PER_GROUP)
      .map<SearchItem>((i) => ({ label: i.fonte, sublabel: 'Receita', route: '/receitas', queryParams: { q: i.fonte } }));
    if (incomes.length) groups.push({ title: 'Receitas', items: incomes });

    return groups;
  });

  readonly hasResults = computed(() => this.groups().length > 0);
  private readonly flatItems = computed(() => this.groups().flatMap((g) => g.items));

  ngOnInit(): void {
    // Garante contas e categorias carregadas para a busca (loads são idempotentes).
    this.accountsStore.load();
    this.categoriesStore.load();
  }

  onInput(value: string): void {
    this.query.set(value);
    this.open.set(value.trim().length >= 2);
  }

  onSubmit(): void {
    const first = this.flatItems()[0];
    if (first) this.select(first);
  }

  select(item: SearchItem): void {
    this.query.set('');
    this.open.set(false);
    this.blurSearch();
    this.router.navigate([item.route], item.queryParams ? { queryParams: item.queryParams } : {});
  }

  closePanel(): void {
    this.open.set(false);
  }

  handleShortcut(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchInput().nativeElement.focus();
    }
  }

  blurSearch(): void {
    this.searchInput().nativeElement.blur();
    this.open.set(false);
  }
}

function isMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
}
