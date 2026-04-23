import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictImageComponent } from './predict-image.component';

describe('PredictImageComponent', () => {
  let component: PredictImageComponent;
  let fixture: ComponentFixture<PredictImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictImageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
