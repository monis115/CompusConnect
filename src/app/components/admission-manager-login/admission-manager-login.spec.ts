import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmissionManagerLogin } from './admission-manager-login';

describe('AdmissionManagerLogin', () => {
  let component: AdmissionManagerLogin;
  let fixture: ComponentFixture<AdmissionManagerLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdmissionManagerLogin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdmissionManagerLogin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
