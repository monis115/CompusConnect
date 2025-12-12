import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateAgentAccess } from './update-agent-access';

describe('UpdateAgentAccess', () => {
  let component: UpdateAgentAccess;
  let fixture: ComponentFixture<UpdateAgentAccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateAgentAccess]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateAgentAccess);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
