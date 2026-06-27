import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- REQUIRED for *ngIf, *ngFor, pipes
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // <-- REQUIRED for [(ngModel)] and ReactiveForms
import { HttpClientModule } from '@angular/common/http'; // <-- REQUIRED for this component's API calls
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // <-- REQUIRED for this component's animations
import { TasksBoardComponent } from '../../shared/tasks-board/tasks-board';

import { AgentRoutingModule } from './agent-routing.module';
import { AgentDashboard } from './agent-dashboard';
import { AgentStudentResgistration } from '../agent-student-resgistration/agent-student-resgistration';
import { MessageDashboard } from '../message-dashboard/message-dashboard';

@NgModule({
  declarations: [
    AgentDashboard,
    AgentStudentResgistration,
    MessageDashboard
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule, // <-- ADDED
    HttpClientModule,
    AgentRoutingModule,
    TasksBoardComponent
  ],
  exports: [
    AgentStudentResgistration
  ]
})
export class AgentModule { }
