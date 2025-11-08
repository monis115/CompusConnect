import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentAgentDetails } from './student-agent-details';

describe('StudentAgentDetails', () => {
  let component: StudentAgentDetails;
  let fixture: ComponentFixture<StudentAgentDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StudentAgentDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentAgentDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
