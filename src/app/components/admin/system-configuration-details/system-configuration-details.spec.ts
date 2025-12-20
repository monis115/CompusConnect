import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemConfigurationDetails } from './system-configuration-details';

describe('SystemConfigurationDetails', () => {
  let component: SystemConfigurationDetails;
  let fixture: ComponentFixture<SystemConfigurationDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SystemConfigurationDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemConfigurationDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
