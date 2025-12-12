import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentAdmissionLetters } from './student-admission-letters';

describe('StudentAdmissionLetters', () => {
  let component: StudentAdmissionLetters;
  let fixture: ComponentFixture<StudentAdmissionLetters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StudentAdmissionLetters]
    })
      .compileComponents();

    fixture = TestBed.createComponent(StudentAdmissionLetters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
