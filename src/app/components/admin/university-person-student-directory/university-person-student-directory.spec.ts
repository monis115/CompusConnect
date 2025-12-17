import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniversityPersonStudentDirectory } from './university-person-student-directory';

describe('UniversityPersonStudentDirectory', () => {
  let component: UniversityPersonStudentDirectory;
  let fixture: ComponentFixture<UniversityPersonStudentDirectory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UniversityPersonStudentDirectory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UniversityPersonStudentDirectory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
