import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniversityPersonDashboard } from './university-person-dashbaord';

describe('UniversityPersonDashbaord', () => {
  let component: UniversityPersonDashboard;
  let fixture: ComponentFixture<UniversityPersonDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UniversityPersonDashboard]
    })
      .compileComponents();

    fixture = TestBed.createComponent(UniversityPersonDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
