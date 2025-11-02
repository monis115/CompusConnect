import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmissionManagerAccessCollege } from './admission-manager-access-college';

describe('AdmissionManagerAccessCollege', () => {
  let component: AdmissionManagerAccessCollege;
  let fixture: ComponentFixture<AdmissionManagerAccessCollege>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdmissionManagerAccessCollege]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdmissionManagerAccessCollege);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
