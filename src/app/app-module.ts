import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components/home/home';
import { StudentLogin } from './components/student-login/student-login';
import { AdminLogin } from './components/admin-login/admin-login';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Material Modules (ONLY import modules, NOT components)
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Lucide Icons
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Plane,
  Building,
  University,
  Shield,
  FileText,
  CreditCard,
  BarChart,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  CheckCircle,
  Clock,
  AlertCircle,
  List,
  Check,
  AlertTriangle,
  Key,
  Search,
  DollarSign,
  Mail,
  Plus,
  Edit,
  Bell,
  Trash2,
  FolderOpen,
  PlusCircle,
  X,
  MapPin,
  Flag,
  User,
  Calendar,
  Phone,
  Copy,
  ShieldCheck,
  ChevronDown,
  Info,
  Edit3,
  Database
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

// Components
import { AdminDashboars } from './components/admin/admin-dashboars/admin-dashboars';
import { AdminAgentRegistration } from './components/admin/admin-agent-registration/admin-agent-registration';
import { AdminDashboardOverview } from './components/admin/admin-dashboard-overview/admin-dashboard-overview';
import { ActiveAgents } from './components/admin/active-agents/active-agents';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from "@angular/material/input"; // <-- CORRECTED IMPORT
import { MatFormFieldModule } from '@angular/material/form-field';
import { PendingAgents } from './components/admin/pending-agents/pending-agents';
import { AddmissionManagerRegistration } from './components/admin/addmission-manager-registration/addmission-manager-registration';
import { AdmissionManagerAccessCollege } from './components/admin/admission-manager-access-college/admission-manager-access-college';
import { AdmissionManagerUpdate } from './components/admin/admission-manager-update/admission-manager-update';
import { ActiveAdmissionManager } from './components/admin/active-admission-manager/active-admission-manager';
import { StudentAgentDetails } from './components/admin/student-agent-details/student-agent-details';
import { AllAgentDetails } from './components/admin/all-agent-details/all-agent-details';

@NgModule({
  declarations: [
    App,
    Home,
    StudentLogin,
    
    
    AdminLogin,
    AdminDashboars,
    AdminAgentRegistration,
    AdminDashboardOverview,
    ActiveAgents,
    PendingAgents,
    AddmissionManagerRegistration,
    AdmissionManagerAccessCollege,
    AdmissionManagerUpdate,
    ActiveAdmissionManager,
    StudentAgentDetails,
    AllAgentDetails,
    
    
    
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, // Required for Material
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    // Material Modules
    MatTableModule,
    MatIconModule,
    MatBadgeModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonModule,

    MatFormFieldModule, // <-- This is correct
    MatInputModule,     // <-- This is correct
    FormsModule,
    // Lucide Icons (picked)
    LucideAngularModule.pick({
        LayoutDashboard,
        GraduationCap,
        Users,
        Plane,
        Building,
        University,
        Shield,
        FileText,
        CreditCard,
        BarChart,
        ChevronLeft,
        ChevronRight,
        UserPlus,
        CheckCircle,
        Clock,
        AlertCircle,
        List,
        Check,
        AlertTriangle,
        Key,
        Search,
        DollarSign,
        Mail,
        Plus,
        Edit,
        Bell,
        Trash2,
        FolderOpen,
        PlusCircle,
        X,
        MapPin,
        Flag,
        User,
        Calendar,
        Phone,
        Copy,
        ShieldCheck,
        ChevronDown,
        Info,
          Edit3,
          Database


        
    }),
    // MatFormField, <-- REMOVED
    // MatLabel      <-- REMOVED
],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay())
  ],
  bootstrap: [App]
})
export class AppModule { }