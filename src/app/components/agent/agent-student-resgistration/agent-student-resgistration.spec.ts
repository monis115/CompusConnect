import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentStudentResgistration } from './agent-student-resgistration';

describe('AgentStudentResgistration', () => {
  let component: AgentStudentResgistration;
  let fixture: ComponentFixture<AgentStudentResgistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AgentStudentResgistration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgentStudentResgistration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
