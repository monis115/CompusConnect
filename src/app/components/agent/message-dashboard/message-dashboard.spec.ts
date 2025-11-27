import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageDashboard } from './message-dashboard';

describe('MessageDashboard', () => {
  let component: MessageDashboard;
  let fixture: ComponentFixture<MessageDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MessageDashboard]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MessageDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
