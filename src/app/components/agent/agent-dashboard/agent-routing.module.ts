import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgentDashboard } from './agent-dashboard';
import { AgentStudentResgistration } from '../agent-student-resgistration/agent-student-resgistration';

// 1. Import your new component

const routes: Routes = [
  {
    path: '', // This is the base for 'agent-dashboard'
    redirectTo: 'dashboard', // Default to the dashboard
    pathMatch: 'full'
  },
  {
    path: 'dashboard', // This will be /agent-dashboard/dashboard
    component: AgentDashboard,
    data: { title: 'Agent Dashboard' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AgentRoutingModule { }