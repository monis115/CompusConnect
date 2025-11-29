import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TelexManagerDashboard } from './telex-manager-dashboard';

describe('TelexManagerDashboard', () => {
  let component: TelexManagerDashboard;
  let fixture: ComponentFixture<TelexManagerDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TelexManagerDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TelexManagerDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
