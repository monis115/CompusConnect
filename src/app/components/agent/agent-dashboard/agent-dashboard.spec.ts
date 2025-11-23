import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // <-- 1. Import
import { NoopAnimationsModule } from '@angular/platform-browser/animations'; // <-- 2. Import
import { FormsModule } from '@angular/forms'; // <-- 3. Import
import { AgentDashboard } from './agent-dashboard';

describe('AgentDashboard', () => {
  let component: AgentDashboard;
  let fixture: ComponentFixture<AgentDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AgentDashboard],
      imports: [
        HttpClientTestingModule, // <-- 4. Add
        NoopAnimationsModule,    // <-- 5. Add
        FormsModule              // <-- 6. Add
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AgentDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});