import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentRoutingModule } from './agent-routing.module';
import { AgentDashboard } from './agent-dashboard';

@NgModule({
  declarations: [
    AgentDashboard  // ✅ Declared here, NOT in app.module.ts
  ],
  imports: [
    CommonModule,
    FormsModule,
    AgentRoutingModule
  ]
})
export class AgentModule { }
