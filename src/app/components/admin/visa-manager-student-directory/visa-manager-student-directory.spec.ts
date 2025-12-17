import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisaManagerStudentDirectory } from './visa-manager-student-directory';

describe('VisaManagerStudentDirectory', () => {
  let component: VisaManagerStudentDirectory;
  let fixture: ComponentFixture<VisaManagerStudentDirectory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VisaManagerStudentDirectory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisaManagerStudentDirectory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
