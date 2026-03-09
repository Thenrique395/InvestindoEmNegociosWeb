import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InvoiceImportComponent } from './invoice-import.component';
import { InvoiceImportService } from '../invoice-import.service';

describe('InvoiceImportComponent smoke', () => {
  let fixture: ComponentFixture<InvoiceImportComponent>;
  let component: InvoiceImportComponent;
  let service: jasmine.SpyObj<InvoiceImportService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<InvoiceImportService>('InvoiceImportService', ['extract', 'import']);
    service.import.and.returnValue(of({ created: 2, skipped: 1, failed: 0 }));
    service.extract.and.returnValue(of({ items: [], rawText: '' } as any));

    await TestBed.configureTestingModule({
      imports: [InvoiceImportComponent],
      providers: [{ provide: InvoiceImportService, useValue: service }]
    })
      .overrideComponent(InvoiceImportComponent, {
        set: {
          providers: [{ provide: InvoiceImportService, useValue: service }]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(InvoiceImportComponent);
    component = fixture.componentInstance;
    component.open = true;
    component.cards = [{ id: 'c1', nome: 'Cartão principal', numero: '**** 1234' } as any];
    component.extract = {
      dueDate: '15/03/2026',
      items: [{ description: 'Mercado', amount: 'R$ 100,00', date: '10/03/2026', suggestedCategoryId: 'cat-1', suggestedCategoryName: 'Alimentação' }]
    } as any;
    component.fileName = 'fatura.pdf';
    component.selectedCardId = 'c1';
  });

  it('deve importar e emitir resultado', () => {
    const importedSpy = jasmine.createSpy('imported');
    component.imported.subscribe(importedSpy);

    component.salvarImportacao();

    expect(service.import).toHaveBeenCalled();
    expect(importedSpy).toHaveBeenCalledWith({ created: 2, skipped: 1, failed: 0 });
  });
});
