import { of, throwError } from 'rxjs';
import { RelatoriosComponent } from './relatorios.component';
import { MonthlySummaryReportResponse } from '../reports.service';

class ReportsServiceMock {
  getMonthlySummary = jasmine.createSpy('getMonthlySummary').and.returnValue(of(buildReport()));
}

function buildReport(overrides: Partial<MonthlySummaryReportResponse> = {}): MonthlySummaryReportResponse {
  return {
    year: 2026,
    month: 6,
    totalIncome: 5000,
    totalExpenses: 3000,
    netBalance: 2000,
    savingsRate: 40,
    expensesByCategory: [{ categoryName: 'Moradia', amount: 1500, percentageOfTotal: 50 }],
    topExpenses: [],
    ...overrides
  };
}

function createComponent() {
  const reportsService = new ReportsServiceMock();
  const component = new RelatoriosComponent(
    reportsService as any,
    { markForCheck: jasmine.createSpy('markForCheck') } as any,
    { onDestroy: () => {} } as any,
    { run: (fn: () => void) => fn() } as any
  );
  return { component, reportsService };
}

describe('RelatoriosComponent', () => {
  it('carrega o resumo do mês atual ao iniciar', () => {
    const { component, reportsService } = createComponent();

    component.ngOnInit();

    expect(reportsService.getMonthlySummary).toHaveBeenCalledWith(component.year, component.month);
    expect(component.report()?.netBalance).toBe(2000);
    expect(component.loading()).toBeFalse();
  });

  it('limpa o loading e sinaliza erro quando a busca falha', () => {
    const { component, reportsService } = createComponent();
    reportsService.getMonthlySummary.and.returnValue(throwError(() => new Error('falhou')));

    component.ngOnInit();

    expect(component.loading()).toBeFalse();
    expect(component.report()).toBeNull();
    expect(component.error()).toContain('Não foi possível carregar');
  });

  it('deriva as maiores despesas do relatório (ordenadas e limitadas)', () => {
    const { component, reportsService } = createComponent();
    reportsService.getMonthlySummary.and.returnValue(of(buildReport({
      topExpenses: [
        { categoryName: 'Moradia', amount: 500, percentageOfTotal: 30 },
        { categoryName: 'Mercado', amount: 900, percentageOfTotal: 50 }
      ]
    })));

    component.ngOnInit();

    expect(component.topExpenses.map((c) => c.categoryName)).toEqual(['Mercado', 'Moradia']);
  });

  it('deriva barras de categorias a partir do relatório', () => {
    const { component } = createComponent();

    component.ngOnInit();

    expect(component.expenseCategoryBars[0].categoryName).toBe('Moradia');
    expect(component.expenseCategoryBars[0].percentageOfTotal).toBe(50);
  });

  it('carrega o comparativo junto do relatório mensal', () => {
    const { component, reportsService } = createComponent();
    component.year = 2026;
    component.month = 8;

    component.ngOnInit();

    expect(reportsService.getMonthlySummary).toHaveBeenCalledWith(2026, 3);
    expect(reportsService.getMonthlySummary).toHaveBeenCalledWith(2026, 8);
    expect(component.comparisonPoints.length).toBe(6);
    expect(component.comparisonLoading()).toBeFalse();
  });

  it('recarrega o comparativo ao trocar para 12 meses', () => {
    const { component, reportsService } = createComponent();
    component.year = 2026;
    component.month = 8;
    component.ngOnInit();
    reportsService.getMonthlySummary.calls.reset();

    component.setComparisonPeriod(12);

    expect(component.comparisonPeriod).toBe(12);
    expect(reportsService.getMonthlySummary).toHaveBeenCalledWith(2025, 9);
    expect(component.comparisonPoints.length).toBe(12);
  });

  it('limpa o erro ao recarregar com sucesso', () => {
    const { component, reportsService } = createComponent();
    reportsService.getMonthlySummary.and.returnValue(throwError(() => new Error('falhou')));
    component.ngOnInit();
    expect(component.error()).not.toBe('');

    reportsService.getMonthlySummary.and.returnValue(of(buildReport()));
    component.load();

    expect(component.error()).toBe('');
    expect(component.report()?.netBalance).toBe(2000);
  });

  it('volta um mês (incluindo virada de ano) e recarrega o relatório', () => {
    const { component, reportsService } = createComponent();
    component.year = 2026;
    component.month = 1;

    component.prevMonth();

    expect(component.month).toBe(12);
    expect(component.year).toBe(2025);
    expect(reportsService.getMonthlySummary).toHaveBeenCalledWith(2025, 12);
  });

  it('avança um mês (incluindo virada de ano) e recarrega o relatório', () => {
    const { component } = createComponent();
    component.year = 2026;
    component.month = 12;

    component.nextMonth();

    expect(component.month).toBe(1);
    expect(component.year).toBe(2027);
  });

  it('não exporta CSV nem PDF quando ainda não há relatório carregado', () => {
    const { component } = createComponent();
    const createSpy = spyOn(document, 'createElement').and.callThrough();

    component.exportCsv();
    component.exportPdf();

    expect(createSpy).not.toHaveBeenCalledWith('a');
  });

  it('gera e dispara o download do CSV quando há relatório carregado', () => {
    const { component } = createComponent();
    component.ngOnInit();
    const anchor = document.createElement('a');
    spyOn(anchor, 'click');
    spyOn(document, 'createElement').and.returnValue(anchor);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:fake');
    spyOn(URL, 'revokeObjectURL');

    component.exportCsv();

    expect(anchor.click).toHaveBeenCalled();
    expect(anchor.download).toBe(`relatorio-${component.year}-${String(component.month).padStart(2, '0')}.csv`);
  });

  it('monta o nome do mês a partir do índice numérico', () => {
    const { component } = createComponent();
    component.month = 6;

    expect(component.monthName).toBe('Junho');
  });
});
