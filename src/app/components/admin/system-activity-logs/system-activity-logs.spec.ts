import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemActivityLogs } from './system-activity-logs';

describe('SystemActivityLogs', () => {
  let component: SystemActivityLogs;
  let fixture: ComponentFixture<SystemActivityLogs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SystemActivityLogs]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SystemActivityLogs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
