import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormulaMedicaFastComponent } from './formula-medica-fast.component';

describe('FormulaMedicaFastComponent', () => {
  let component: FormulaMedicaFastComponent;
  let fixture: ComponentFixture<FormulaMedicaFastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FormulaMedicaFastComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormulaMedicaFastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
