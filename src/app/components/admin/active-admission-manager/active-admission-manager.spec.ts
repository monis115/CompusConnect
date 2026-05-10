import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveAdmissionManager } from './active-admission-manager';

describe('ActiveAdmissionManager', () => {
  let component: ActiveAdmissionManager;
  let fixture: ComponentFixture<ActiveAdmissionManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ActiveAdmissionManager]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ActiveAdmissionManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
