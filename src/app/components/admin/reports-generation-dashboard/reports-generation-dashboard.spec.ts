import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsGenerationDashboard } from './reports-generation-dashboard';

describe('ReportsGenerationDashboard', () => {
  let component: ReportsGenerationDashboard;
  let fixture: ComponentFixture<ReportsGenerationDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportsGenerationDashboard]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ReportsGenerationDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
