import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAgentRegistration } from './admin-agent-registration';

describe('AdminAgentRegistration', () => {
  let component: AdminAgentRegistration;
  let fixture: ComponentFixture<AdminAgentRegistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminAgentRegistration]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdminAgentRegistration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
