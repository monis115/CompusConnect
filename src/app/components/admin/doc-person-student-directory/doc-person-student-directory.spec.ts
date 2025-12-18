import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocPersonStudentDirectory } from './doc-person-student-directory';

describe('DocPersonStudentDirectory', () => {
  let component: DocPersonStudentDirectory;
  let fixture: ComponentFixture<DocPersonStudentDirectory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocPersonStudentDirectory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocPersonStudentDirectory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
