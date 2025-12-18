import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateAccountant } from './update-accountant';

describe('UpdateAccountant', () => {
  let component: UpdateAccountant;
  let fixture: ComponentFixture<UpdateAccountant>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateAccountant]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateAccountant);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
