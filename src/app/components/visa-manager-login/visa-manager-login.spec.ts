import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisaManagerLogin } from './visa-manager-login';

describe('VisaManagerLogin', () => {
  let component: VisaManagerLogin;
  let fixture: ComponentFixture<VisaManagerLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VisaManagerLogin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisaManagerLogin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
