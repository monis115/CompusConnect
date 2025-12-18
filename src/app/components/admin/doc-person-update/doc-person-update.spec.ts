import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocPersonUpdate } from './doc-person-update';

describe('DocPersonUpdate', () => {
  let component: DocPersonUpdate;
  let fixture: ComponentFixture<DocPersonUpdate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocPersonUpdate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocPersonUpdate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
