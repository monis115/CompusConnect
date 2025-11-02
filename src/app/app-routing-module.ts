import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './components/home/home';
import { StudentLogin } from './components/student-login/student-login';
import { AgentLogin } from './components/agent-login/agent-login';
import { VisaManagerLogin } from './components/visa-manager-login/visa-manager-login';
import { AdmissionManagerLogin } from './components/admission-manager-login/admission-manager-login';
import { AdminLogin } from './components/admin-login/admin-login';
import { AdminDashboars } from './components/admin/admin-dashboars/admin-dashboars';
import { AdminAgentRegistration } from './components/admin/admin-agent-registration/admin-agent-registration';
import { AdminDashboardOverview } from './components/admin/admin-dashboard-overview/admin-dashboard-overview';
import { ActiveAgents } from './components/admin/active-agents/active-agents';
import { PendingAgents } from './components/admin/pending-agents/pending-agents';
import { AddmissionManagerRegistration } from './components/admin/addmission-manager-registration/addmission-manager-registration';
import { AdmissionManagerAccessCollege } from './components/admin/admission-manager-access-college/admission-manager-access-college';
import { AdmissionManagerUpdate } from './components/admin/admission-manager-update/admission-manager-update';

const routes: Routes = [
  { path: '', component: Home },
  { path: 'StudentLogin', component: StudentLogin },
  { path: 'AgentLogin', component: AgentLogin },
  { path: 'VisaManagerLogin', component: VisaManagerLogin },
  { path: 'AdmissionManagerLogin', component: AdmissionManagerLogin },
  { path: 'AdminLogin', component: AdminLogin },
  
  // Admin Dashboard Routes
  {
    path: 'admin-dashboard',
    component: AdminDashboars,
    children: [
      { path: '', component: AdminDashboardOverview, data: { section: 'overview' } },
      { path: 'overview', component: AdminDashboardOverview, data: { section: 'overview' } },
      { path: 'students', component: AdminDashboardOverview, data: { section: 'students' } },
      { path: 'agents', component: AdminDashboardOverview, data: { section: 'agents' } },
      { path: 'visa-managers', component: AdminDashboardOverview, data: { section: 'visa-managers' } },
      { path: 'admission-managers', component: AdminDashboardOverview, data: { section: 'admission-managers' } },
      { path: 'colleges', component: AdminDashboardOverview, data: { section: 'colleges' } },
      { path: 'users', component: AdminDashboardOverview, data: { section: 'users' } },
      { path: 'applications', component: AdminDashboardOverview, data: { section: 'applications' } },
      { path: 'payments', component: AdminDashboardOverview, data: { section: 'payments' } },
      { path: 'reports', component: AdminDashboardOverview, data: { section: 'reports' } },
      { path: 'agent-registration', component: AdminAgentRegistration, data: { section: 'agents' } },
      { path: 'active-agents', component: ActiveAgents, data: { section: 'agents' } },
      { path: 'pending-agents', component: PendingAgents, data: { section: 'agents' } },
      { path: 'addmission-manager-registration', component: AddmissionManagerRegistration, data: { section: 'admission-managers' } },
      { path: 'admission-manager-access', component: AdmissionManagerAccessCollege },
      { path: 'update-admission-manager-details', component: AdmissionManagerUpdate }
    ]
  },
  
  // Agent Dashboard Routes (Lazy Loaded Module) - NO AUTH GUARD
  {
    path: 'agent-dashboard',
    loadChildren: () => import('../app/components/agent/agent-dashboard/agent.module').then(m => m.AgentModule)
  },
  
  // Wildcard route
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }