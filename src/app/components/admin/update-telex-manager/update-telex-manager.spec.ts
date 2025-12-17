import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateTelexManager } from './update-telex-manager';

describe('UpdateTelexManager', () => {
  let component: UpdateTelexManager;
  let fixture: ComponentFixture<UpdateTelexManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateTelexManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateTelexManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
