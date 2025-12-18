import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountantStudentDirectory } from './accountant-student-directory';

describe('AccountantStudentDirectory', () => {
  let component: AccountantStudentDirectory;
  let fixture: ComponentFixture<AccountantStudentDirectory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountantStudentDirectory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountantStudentDirectory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
