import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './components/home/home';
import { StudentLogin } from './components/student-login/student-login';
import { AdminLogin } from './components/admin-login/admin-login';
import { AdminDashboars } from './components/admin/admin-dashboars/admin-dashboars';
import { AdminAgentRegistration } from './components/admin/admin-agent-registration/admin-agent-registration';
import { AdminDashboardOverview } from './components/admin/admin-dashboard-overview/admin-dashboard-overview';
import { AdminAnalytics } from './components/admin/admin-analytics/admin-analytics';
import { ActiveAgents } from './components/admin/active-agents/active-agents';
import { PendingAgents } from './components/admin/pending-agents/pending-agents';
import { AddmissionManagerRegistration } from './components/admin/addmission-manager-registration/addmission-manager-registration';
import { AdmissionManagerAccessCollege } from './components/admin/admission-manager-access-college/admission-manager-access-college';
import { AdmissionManagerUpdate } from './components/admin/admission-manager-update/admission-manager-update';
import { ActiveAdmissionManager } from './components/admin/active-admission-manager/active-admission-manager';
import { StudentAgentDetails } from './components/admin/student-agent-details/student-agent-details';
import { AllAgentDetails } from './components/admin/all-agent-details/all-agent-details';
import { UniversityPersonDashboard } from './components/university-person-dashbaord/university-person-dashbaord';
import { StudentDashboard } from './components/admin/student-dashboard/student-dashboard';
import { StudentAdmissionLetters } from './components/admin/student-admission-letters/student-admission-letters';
import { DocPersonDashbaord } from './components/doc-person-dashbaord/doc-person-dashbaord';
import { TelexManagerDashboard } from './components/telex-manager-dashboard/telex-manager-dashboard';
import { AccountantDashboard } from './components/accountant-dashboard/accountant-dashboard';
import { VisaManDashboard } from './components/visa-man-dashboard/visa-man-dashboard';
import { AuthGuard } from './guards/auth.guard';
import { UpdateAgentAccess } from './components/admin/update-agent-access/update-agent-access';
import { SystemActivityLogs } from './components/admin/system-activity-logs/system-activity-logs';
import { UpdateTelexManager } from './components/admin/update-telex-manager/update-telex-manager';
import { TelexManagerStudentDirectory } from './components/admin/telex-manager-student-directory/telex-manager-student-directory';
import { UpdateVisaManager } from './components/admin/update-visa-manager/update-visa-manager';
import { VisaManagerStudentDirectory } from './components/admin/visa-manager-student-directory/visa-manager-student-directory';
import { UpdateUniversityPerson } from './components/admin/update-university-person/update-university-person';
import { UniversityPersonStudentDirectory } from './components/admin/university-person-student-directory/university-person-student-directory';
import { UniversityWiseUniversityPerson } from './components/admin/university-wise-university-person/university-wise-university-person';

const routes: Routes = [
  { path: '', component: AdminLogin },
  { path: 'StudentLogin', component: StudentLogin },
  { path: 'AdminLogin', component: AdminLogin },
  { path: 'admin-login', component: AdminLogin },

  // Admin Dashboard Routes - Protected
  {
    path: 'admin-dashboard',
    component: AdminDashboars,
    canActivate: [AuthGuard],
    data: { role: 'admin' },
    children: [
      { path: '', component: AdminAnalytics, data: { section: 'overview' } },
      { path: 'overview', component: AdminAnalytics, data: { section: 'overview' } },
      { path: 'students', component: AdminDashboardOverview, data: { section: 'students' } },
      { path: 'student-dashboard', component: StudentDashboard },
      { path: 'student-admission-letters', component: StudentAdmissionLetters }, // <--- ADDED THIS ROUTE
      { path: 'agents', component: AdminDashboardOverview, data: { section: 'agents' } },
      { path: 'telex', component: AdminDashboardOverview, data: { section: 'telex' } },
      { path: 'visa', component: AdminDashboardOverview, data: { section: 'visa' } },
      { path: 'university-coordinators', component: AdminDashboardOverview, data: { section: 'university-coordinators' } },
      { path: 'account', component: AdminDashboardOverview, data: { section: 'account' } },
      { path: 'doc-person', component: AdminDashboardOverview, data: { section: 'doc-person' } },
      { path: 'news-management', component: AdminDashboardOverview, data: { section: 'news-management' } },
      { path: 'admission-managers', component: AdminDashboardOverview, data: { section: 'admission-managers' } },
      { path: 'colleges', component: AdminDashboardOverview, data: { section: 'colleges' } },
      { path: 'users', component: AdminDashboardOverview, data: { section: 'users' } },
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
      { path: 'all-agent-details', component: AllAgentDetails },
      { path: 'update-agent-access', component: UpdateAgentAccess },
      { path: 'system-activity', component: SystemActivityLogs },
      { path: 'manage-telex-man', component: UpdateTelexManager, data: { section: 'telex' } },
      { path: 'telex-man-directory', component: TelexManagerStudentDirectory, data: { section: 'telex' } },
      { path: 'manage-visa-man', component: UpdateVisaManager, data: { section: 'visa' } },
      { path: 'visa-man-directory', component: VisaManagerStudentDirectory, data: { section: 'visa' } },
      { path: 'manage-university-person', component: UpdateUniversityPerson, data: { section: 'university-coordinators' } },
      { path: 'university-person-directory', component: UniversityPersonStudentDirectory, data: { section: 'university-coordinators' } },
      { path: 'university-wise-coordinator', component: UniversityWiseUniversityPerson, data: { section: 'university-coordinators' } }
    ]
  },

  // Agent Dashboard Routes - Protected
  {
    path: 'agent-dashboard',
    canActivate: [AuthGuard],
    data: { role: 'agent' },
    loadChildren: () => import('../app/components/agent/agent-dashboard/agent.module').then(m => m.AgentModule)
  },

  // Admission Manager Dashboard - Protected
  {
    path: 'admission-manager-dashboard',
    canActivate: [AuthGuard],
    data: { role: 'admission_manager' },
    loadChildren: () => import('../app/components/admissionManager/admission-manager-dashboard/admission-manager.module')
      .then(m => m.AdmissionManagerModule)
  },

  // University Dashboard - Protected
  {
    path: 'university-dashboard',
    component: UniversityPersonDashboard,
    canActivate: [AuthGuard],
    data: { role: 'UniversityCoordinator' }
  },

  // Doc Manager Dashboard - Protected
  {
    path: 'doc-manager-dashboard',
    component: DocPersonDashbaord,
    canActivate: [AuthGuard],
    data: { role: 'doc_manager' }
  },

  // Telex Manager Dashboard - Protected
  {
    path: 'telex-manager-dashboard',
    component: TelexManagerDashboard,
    canActivate: [AuthGuard],
    data: { role: 'telex_manager' }
  },

  // Accountant Dashboard - Protected
  {
    path: 'accountant-dashboard',
    component: AccountantDashboard,
    canActivate: [AuthGuard],
    data: { role: 'accountant' }
  },

  // Visa Manager Dashboard - Protected
  {
    path: 'visa-man-dashboard',
    component: VisaManDashboard,
    canActivate: [AuthGuard],
    data: { role: 'visa_manager' }
  },

  // Wildcard route
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }