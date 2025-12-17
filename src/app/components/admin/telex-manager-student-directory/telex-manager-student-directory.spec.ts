import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TelexManagerStudentDirectory } from './telex-manager-student-directory';

describe('TelexManagerStudentDirectory', () => {
  let component: TelexManagerStudentDirectory;
  let fixture: ComponentFixture<TelexManagerStudentDirectory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TelexManagerStudentDirectory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TelexManagerStudentDirectory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
