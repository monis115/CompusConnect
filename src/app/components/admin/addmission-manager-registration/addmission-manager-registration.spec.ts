import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddmissionManagerRegistration } from './addmission-manager-registration';

describe('AddmissionManagerRegistration', () => {
  let component: AddmissionManagerRegistration;
  let fixture: ComponentFixture<AddmissionManagerRegistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddmissionManagerRegistration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddmissionManagerRegistration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
