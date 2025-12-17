import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateVisaManager } from './update-visa-manager';

describe('UpdateVisaManager', () => {
  let component: UpdateVisaManager;
  let fixture: ComponentFixture<UpdateVisaManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateVisaManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateVisaManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
