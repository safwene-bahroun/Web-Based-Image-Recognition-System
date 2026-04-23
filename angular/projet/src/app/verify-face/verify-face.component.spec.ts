import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyFaceComponent } from './verify-face.component';

describe('VerifyFaceComponent', () => {
  let component: VerifyFaceComponent;
  let fixture: ComponentFixture<VerifyFaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyFaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyFaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
