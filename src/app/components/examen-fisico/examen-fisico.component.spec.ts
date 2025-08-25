import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamenFisicoComponent } from './examen-fisico.component';

describe('ExamenFisicoComponent', () => {
  let component: ExamenFisicoComponent;
  let fixture: ComponentFixture<ExamenFisicoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExamenFisicoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamenFisicoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
