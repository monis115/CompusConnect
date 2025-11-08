import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllAgentDetails } from './all-agent-details';

describe('AllAgentDetails', () => {
  let component: AllAgentDetails;
  let fixture: ComponentFixture<AllAgentDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AllAgentDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllAgentDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
