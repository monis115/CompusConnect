import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDashboars } from './admin-dashboars';

describe('AdminDashboars', () => {
  let component: AdminDashboars;
  let fixture: ComponentFixture<AdminDashboars>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminDashboars]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboars);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
