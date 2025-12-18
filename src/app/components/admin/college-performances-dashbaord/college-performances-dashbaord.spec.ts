import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollegePerformancesDashbaord } from './college-performances-dashbaord';

describe('CollegePerformancesDashbaord', () => {
  let component: CollegePerformancesDashbaord;
  let fixture: ComponentFixture<CollegePerformancesDashbaord>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CollegePerformancesDashbaord]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollegePerformancesDashbaord);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
