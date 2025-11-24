import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocPersonDashbaord } from './doc-person-dashbaord';

describe('DocPersonDashbaord', () => {
  let component: DocPersonDashbaord;
  let fixture: ComponentFixture<DocPersonDashbaord>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocPersonDashbaord]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DocPersonDashbaord);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
