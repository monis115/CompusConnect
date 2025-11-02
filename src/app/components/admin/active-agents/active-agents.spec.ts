import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveAgents } from './active-agents';

describe('ActiveAgents', () => {
  let component: ActiveAgents;
  let fixture: ComponentFixture<ActiveAgents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ActiveAgents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiveAgents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
