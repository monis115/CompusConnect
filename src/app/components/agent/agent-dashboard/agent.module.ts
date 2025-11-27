import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- REQUIRED for *ngIf, *ngFor, pipes
import { FormsModule } from '@angular/forms'; // <-- REQUIRED for [(ngModel)]
import { HttpClientModule } from '@angular/common/http'; // <-- REQUIRED for this component's API calls
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // <-- REQUIRED for this component's animations

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
    CommonModule,       // <-- ADDED
    FormsModule,        // <-- ADDED
    HttpClientModule,   // <-- ADDED (This is the main fix)
    // BrowserAnimationsModule, // <-- ADDED - This might be needed here OR in app.module.ts. Add here if app.module.ts doesn't fix it.
    AgentRoutingModule
  ]
})
export class AgentModule { }