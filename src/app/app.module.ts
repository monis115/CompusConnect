import { TasksBoardComponent } from './components/shared/tasks-board/tasks-board';
import { NgModule, NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, isDevMode } from '@angular/core';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components/home/home';
import { StudentLogin } from './components/student-login/student-login';
import { AdminLogin } from './components/admin-login/admin-login';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AgentModule } from './components/agent/agent-dashboard/agent.module';

// Material Modules (ONLY import modules, NOT components)
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { provideCharts, withDefaultRegisterables, BaseChartDirective } from 'ng2-charts';

// Lucide Icons - All icons used in the app
import { 
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  AlignJustify,
  Ban,
  BarChart2,
  BarChart3,
  BookOpen,
  Box,
  Briefcase,
  Building,
  Building2,
  Calculator,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Edit,
  Edit3,
  FileCheck,
  FileText,
  Files,
  GitBranch,
  GraduationCap,
  Image,
  Inbox,
  LayoutDashboard,
  Link,
  MapPin,
  PieChart,
  Plane,
  Plus,
  Power,
  Radio,
  RefreshCw,
  RotateCcw,
  School,
  Search,
  Send,
  Settings,
  Shield,
  Tag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  University,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
  X,
  XCircle,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckSquare,
  ShieldAlert,
  Mail,
  Bell,
  FolderOpen,
  PlusCircle,
  Map,
  Flag,
  Phone,
  Copy,
  ShieldCheck,
  ChevronDown,
  Info,
  Database,
  ChevronUp,
  FileWarning,
  BellRing,
  Landmark,
  Package,
  Circle,
  Wallet,
  Award,
  Banknote,
  CalendarX,
  Download,
  ExternalLink,
  FileCheck2,
  FileSignature,
  FolderX,
  IndianRupee,
  Pause,
  Receipt,
  Scroll,
  UserX,
  CircleDot,
  ArrowLeft,
  FileX,
  Pencil,
  PowerOff,
  LayoutGrid,
  MinusCircle,
  ToggleRight,
  Sparkles,
  LayoutList,
  MousePointer,
  Filter,
  Lock,
  ChevronsLeft,
  ChevronsRight,
  LogIn,
  SlidersHorizontal,
  Construction,
  Loader,
  Columns,
  Sun,
  Moon,
  Menu,
  FileSpreadsheet,
  FileJson,
  Loader2,
  Star,
  Crown,
  Globe,
  LogOut,
  Layers,
  UserCircle,
  IdCard,
  Hash,
  LayoutTemplate,
  CalendarCheck,
  ChevronLeft,
  Lightbulb,
  Luggage,
  BarChart,
  Minus,
  Trophy,
  GitMerge,
  FilePlus,
  CornerUpLeft,
  Eye,
  AtSign
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

// Components
import { AdminDashboars } from './components/admin/admin-dashboars/admin-dashboars';
import { StudentStatusPipe } from './pipes/student-status.pipe';
import { AdminAgentRegistration } from './components/admin/admin-agent-registration/admin-agent-registration';
import { AdminDashboardOverview } from './components/admin/admin-dashboard-overview/admin-dashboard-overview';
import { ActiveAgents } from './components/admin/active-agents/active-agents';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from '@angular/material/form-field';
import { PendingAgents } from './components/admin/pending-agents/pending-agents';
import { AddmissionManagerRegistration } from './components/admin/addmission-manager-registration/addmission-manager-registration';
import { AdmissionManagerAccessCollege } from './components/admin/admission-manager-access-college/admission-manager-access-college';
import { AdmissionManagerUpdate } from './components/admin/admission-manager-update/admission-manager-update';
import { ActiveAdmissionManager } from './components/admin/active-admission-manager/active-admission-manager';
import { StudentAgentDetails } from './components/admin/student-agent-details/student-agent-details';
import { AllAgentDetails } from './components/admin/all-agent-details/all-agent-details';
import { UniversityPersonDashboard } from './components/university-person-dashbaord/university-person-dashbaord';
import { DocPersonDashbaord } from './components/doc-person-dashbaord/doc-person-dashbaord';
import { ReplaceUnderscorePipe } from './pipes/replace-underscore.pipe';
import { TelexManagerDashboard } from './components/telex-manager-dashboard/telex-manager-dashboard';
import { AccountantDashboard } from './components/accountant-dashboard/accountant-dashboard';
import { VisaManDashboard } from './components/visa-man-dashboard/visa-man-dashboard';
import { AdminAnalytics } from './components/admin/admin-analytics/admin-analytics';
import { StudentAdmissionLetters } from './components/admin/student-admission-letters/student-admission-letters';
import { StudentDashboard } from './components/admin/student-dashboard/student-dashboard';
import { UpdateAgentAccess } from './components/admin/update-agent-access/update-agent-access';
import { SystemActivityLogs } from './components/admin/system-activity-logs/system-activity-logs';
import { UpdateTelexManager } from './components/admin/update-telex-manager/update-telex-manager';
import { TelexManagerStudentDirectory } from './components/admin/telex-manager-student-directory/telex-manager-student-directory';
import { UpdateVisaManager } from './components/admin/update-visa-manager/update-visa-manager';
import { VisaManagerStudentDirectory } from './components/admin/visa-manager-student-directory/visa-manager-student-directory';
import { UpdateUniversityPerson } from './components/admin/update-university-person/update-university-person';
import { UniversityPersonStudentDirectory } from './components/admin/university-person-student-directory/university-person-student-directory';
import { UniversityWiseUniversityPerson } from './components/admin/university-wise-university-person/university-wise-university-person';
import { UpdateAccountant } from './components/admin/update-accountant/update-accountant';
import { AccountantStudentDirectory } from './components/admin/accountant-student-directory/accountant-student-directory';
import { DocPersonUpdate } from './components/admin/doc-person-update/doc-person-update';
import { DocPersonStudentDirectory } from './components/admin/doc-person-student-directory/doc-person-student-directory';
import { NewsDashboard } from './components/admin/news-dashboard/news-dashboard';
import { CollegePerformancesDashbaord } from './components/admin/college-performances-dashbaord/college-performances-dashbaord';
import { ReportsGenerationDashboard } from './components/admin/reports-generation-dashboard/reports-generation-dashboard';
import { ReportsGeneratedDashbaord } from './components/admin/reports-generated-dashbaord/reports-generated-dashbaord';
import { SystemConfigurationDetails } from './components/admin/system-configuration-details/system-configuration-details';
import { AgentApply } from './components/agent-apply/agent-apply';
import { StudentPublicApplyComponent } from './components/student-public-apply/student-public-apply.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { SystemUsersDashboard } from './components/admin/system-users-dashboard/system-users-dashboard';
import { ManageLocations } from './components/admin/manage-locations/manage-locations';
import { TrackApplicationComponent } from './components/track-application/track-application';

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
    StudentPublicApplyComponent,
    AllAgentDetails,
    UniversityPersonDashboard,
    DocPersonDashbaord,
    TelexManagerDashboard,
    AccountantDashboard,
    VisaManDashboard,
    AdminAnalytics,
    StudentDashboard,
    StudentAdmissionLetters,
    UpdateAgentAccess,
    SystemActivityLogs,
    UpdateTelexManager,
    TelexManagerStudentDirectory,
    UpdateVisaManager,
    VisaManagerStudentDirectory,
    UpdateUniversityPerson,
    UniversityPersonStudentDirectory,
    UniversityWiseUniversityPerson,
    UpdateAccountant,
    AccountantStudentDirectory,
    DocPersonUpdate,
    DocPersonStudentDirectory,
    NewsDashboard,
    CollegePerformancesDashbaord,
    ReportsGenerationDashboard,
    ReportsGeneratedDashbaord,
    SystemConfigurationDetails,
    AgentApply,
    SystemUsersDashboard,
    ManageLocations,
    TrackApplicationComponent
  ],
  imports: [
    TasksBoardComponent,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    BaseChartDirective,
    MatIconModule,
    MatBadgeModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReplaceUnderscorePipe,
    LucideAngularModule.pick({
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  AlignJustify,
  Ban,
  BarChart2,
  BarChart3,
  BookOpen,
  Box,
  Briefcase,
  Building,
  Building2,
  Calculator,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Edit,
  Edit3,
  FileCheck,
  FileText,
  Files,
  GitBranch,
  GraduationCap,
  Image,
  Inbox,
  LayoutDashboard,
  Link,
  MapPin,
  PieChart,
  Plane,
  Plus,
  Power,
  Radio,
  RefreshCw,
  RotateCcw,
  School,
  Search,
  Send,
  Settings,
  Shield,
  Tag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  University,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
  X,
  XCircle,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckSquare,
  ShieldAlert,
  Mail,
  Bell,
  FolderOpen,
  PlusCircle,
  Map,
  Flag,
  Phone,
  Copy,
  ShieldCheck,
  ChevronDown,
  Info,
  Database,
  ChevronUp,
  FileWarning,
  BellRing,
  Landmark,
  Package,
  Circle,
  Wallet,
  Award,
  Banknote,
  CalendarX,
  Download,
  ExternalLink,
  FileCheck2,
  FileSignature,
  FolderX,
  IndianRupee,
  Pause,
  Receipt,
  Scroll,
  UserX,
  CircleDot,
  ArrowLeft,
  FileX,
  Pencil,
  PowerOff,
  LayoutGrid,
  MinusCircle,
  ToggleRight,
  Sparkles,
  LayoutList,
  MousePointer,
  Filter,
  Lock,
  ChevronsLeft,
  ChevronsRight,
  LogIn,
  SlidersHorizontal,
  Construction,
  Loader,
  Columns,
  Sun,
  Moon,
  Menu,
  FileSpreadsheet,
  FileJson,
  Loader2,
  Star,
  Crown,
  Globe,
  LogOut,
  Layers,
  UserCircle,
  IdCard,
  Hash,
  LayoutTemplate,
  CalendarCheck,
  ChevronLeft,
  Lightbulb,
  Luggage,
  BarChart,
  Minus,
  Trophy,
  GitMerge,
  FilePlus,
  CornerUpLeft,
  Eye,
  AtSign
}),
    AgentModule,
    StudentStatusPipe,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    provideCharts(withDefaultRegisterables()),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [App],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }