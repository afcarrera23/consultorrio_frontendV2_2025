import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintFormulaComponent } from './print-formula.component';

describe('PrintFormulaComponent', () => {
  let component: PrintFormulaComponent;
  let fixture: ComponentFixture<PrintFormulaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintFormulaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintFormulaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
