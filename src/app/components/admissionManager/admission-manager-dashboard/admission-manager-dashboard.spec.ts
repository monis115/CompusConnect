import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmissionManagerDashboard } from './admission-manager-dashboard';

describe('AdmissionManagerDashboard', () => {
  let component: AdmissionManagerDashboard;
  let fixture: ComponentFixture<AdmissionManagerDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdmissionManagerDashboard]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdmissionManagerDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
