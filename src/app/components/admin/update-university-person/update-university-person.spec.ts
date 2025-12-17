import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateUniversityPerson } from './update-university-person';

describe('UpdateUniversityPerson', () => {
  let component: UpdateUniversityPerson;
  let fixture: ComponentFixture<UpdateUniversityPerson>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateUniversityPerson]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateUniversityPerson);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
