import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniversityWiseUniversityPerson } from './university-wise-university-person';

describe('UniversityWiseUniversityPerson', () => {
  let component: UniversityWiseUniversityPerson;
  let fixture: ComponentFixture<UniversityWiseUniversityPerson>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UniversityWiseUniversityPerson]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UniversityWiseUniversityPerson);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
