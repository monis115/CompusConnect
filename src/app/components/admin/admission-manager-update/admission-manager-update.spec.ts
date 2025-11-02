import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmissionManagerUpdate } from './admission-manager-update';

describe('AdmissionManagerUpdate', () => {
  let component: AdmissionManagerUpdate;
  let fixture: ComponentFixture<AdmissionManagerUpdate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdmissionManagerUpdate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdmissionManagerUpdate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
