import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './components/home/home';
import { StudentLogin } from './components/student-login/student-login';
import { AdminLogin } from './components/admin-login/admin-login';
import { AdminDashboars } from './components/admin/admin-dashboars/admin-dashboars';
import { AdminAgentRegistration } from './components/admin/admin-agent-registration/admin-agent-registration';
import { AdminDashboardOverview } from './components/admin/admin-dashboard-overview/admin-dashboard-overview';
import { ActiveAgents } from './components/admin/active-agents/active-agents';
import { PendingAgents } from './components/admin/pending-agents/pending-agents';
import { AddmissionManagerRegistration } from './components/admin/addmission-manager-registration/addmission-manager-registration';
import { AdmissionManagerAccessCollege } from './components/admin/admission-manager-access-college/admission-manager-access-college';
import { AdmissionManagerUpdate } from './components/admin/admission-manager-update/admission-manager-update';
import { ActiveAdmissionManager } from './components/admin/active-admission-manager/active-admission-manager';
import { StudentAgentDetails } from './components/admin/student-agent-details/student-agent-details';
import { AllAgentDetails } from './components/admin/all-agent-details/all-agent-details';
import { UniversityPersonDashboard } from './components/university-person-dashbaord/university-person-dashbaord';
import { DocPersonDashbaord } from './components/doc-person-dashbaord/doc-person-dashbaord';

const routes: Routes = [
  { path: '', component: Home },
  { path: 'StudentLogin', component: StudentLogin },
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
      { path: 'update-admission-manager-details', component: AdmissionManagerUpdate },
      { path: 'active-admission-manager', component: ActiveAdmissionManager },
      { path: 'student-agent-details', component: StudentAgentDetails },
      { path: 'all-agent-details', component: AllAgentDetails }
    ]
  },

  // Agent Dashboard Routes (Lazy Loaded Module) - NO AUTH GUARD
  {
    path: 'agent-dashboard',
    loadChildren: () => import('../app/components/agent/agent-dashboard/agent.module').then(m => m.AgentModule)
  },
  // Add this route inside your routes array (after agent-dashboard or before wildcard)
  {
    path: 'admission-manager-dashboard',
    loadChildren: () => import('../app/components/admissionManager/admission-manager-dashboard/admission-manager.module')
      .then(m => m.AdmissionManagerModule)
  },
  {
    path: 'university-dashboard',
    component: UniversityPersonDashboard
  },
  {
    path: 'doc-manager-dashboard',
    component: DocPersonDashbaord
  },

  // Wildcard route
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }