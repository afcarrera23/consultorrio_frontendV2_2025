import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AntecedentePersonalComponent } from './antecedente-personal.component';

describe('AntecedentePersonalComponent', () => {
  let component: AntecedentePersonalComponent;
  let fixture: ComponentFixture<AntecedentePersonalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AntecedentePersonalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AntecedentePersonalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
