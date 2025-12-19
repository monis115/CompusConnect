import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsGeneratedDashbaord } from './reports-generated-dashbaord';

describe('ReportsGeneratedDashbaord', () => {
  let component: ReportsGeneratedDashbaord;
  let fixture: ComponentFixture<ReportsGeneratedDashbaord>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportsGeneratedDashbaord]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsGeneratedDashbaord);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
