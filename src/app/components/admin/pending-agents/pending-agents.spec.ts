import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingAgents } from './pending-agents';

describe('PendingAgents', () => {
  let component: PendingAgents;
  let fixture: ComponentFixture<PendingAgents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PendingAgents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PendingAgents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
