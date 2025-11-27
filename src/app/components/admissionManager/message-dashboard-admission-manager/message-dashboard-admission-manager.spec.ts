import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageDashboardAdmissionManager } from './message-dashboard-admission-manager';

describe('MessageDashboardAdmissionManager', () => {
  let component: MessageDashboardAdmissionManager;
  let fixture: ComponentFixture<MessageDashboardAdmissionManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MessageDashboardAdmissionManager]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MessageDashboardAdmissionManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
