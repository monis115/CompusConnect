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
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';

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
  Database,
  Map,
  Briefcase,
  UserCheck,
  Building2,
  FileCheck,
  Calculator,
  Send,
  Settings,
  Crown,
  Globe,
  RefreshCw,
  ChevronUp,
  LogOut,
  Activity,
  GitBranch,
  Inbox,
  TrendingUp,
  BarChart2,
  Layers,
  ArrowRight,
  UserCircle,
  IdCard,
  Hash,
  CalendarCheck,
  Landmark,
  Package,
  Circle,
  Wallet,
  // Student Dashboard icons
  Award,
  Banknote,
  CalendarClock,
  Download,
  ExternalLink,
  FileCheck2,
  FileSignature,
  FolderX,
  Image,
  IndianRupee,
  Receipt,
  Scroll,
  UserCog,
  UserX,
  CircleDot,
  ArrowLeft,
  FileX,
  // Admission Letters Premium icons
  Sparkles,
  CheckCircle2,
  LayoutList,
  MousePointer,
  Filter,
  Lock,
  School,
  Pause,
  Radio,
  ChevronsLeft,
  ChevronsRight,
  LogIn,
  // World-Class Activity Logs icons
  SlidersHorizontal,
  Columns,
  Sun,
  Moon,
  Menu,
  AlignJustify,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  FileJson,
  XCircle,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckSquare,
  Construction,
  Loader,
  ShieldAlert,
  Lightbulb,
  Pencil,
  PowerOff,
  Power,
  Layout,
  LayoutTemplate,
  FileWarning,
  BellRing,
  Luggage,
  Wand2,
  LayoutGrid,
  UsersRound,
  Ban,
  BookOpen,
  MinusCircle,
  Tag,
  ToggleRight,
  // College Performance Dashboard icons
  Target,
  TrendingDown,
  ClipboardList,
  Minus,
  AlertOctagon
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

  ],
  imports: [
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
      Lock,
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
      Database,
      ChevronUp,
      Map,
      Briefcase,
      UserCheck,
      Building2,
      FileCheck,
      Calculator,
      Send,
      Settings,
      Crown,
      Globe,
      RefreshCw,
      LogOut,
      Activity,
      GitBranch,
      Inbox,
      TrendingUp,
      BarChart2,
      Layers,
      ArrowRight,
      UserCircle,
      IdCard,
      Hash,
      LayoutTemplate,
      CalendarCheck,
      FileWarning,
      BellRing,
      Landmark,
      Package,
      Circle,
      Wallet,
      School,
      // Student Dashboard icons
      Award,
      Banknote,

      CalendarClock,
      Download,
      ExternalLink,
      FileCheck2,
      FileSignature,
      FolderX,
      Image,
      IndianRupee,
      Pause,
      Receipt,
      Scroll,
      Radio,
      UserCog,
      UserX,
      CircleDot,
      ArrowLeft,
      FileX,
      Pencil,
      PowerOff,
      Power,
      LayoutGrid,
      UsersRound,
      Ban,
      BookOpen,
      MinusCircle,
      Tag,
      ToggleRight,
      // Admission Letters Premium icons
      Sparkles,
      CheckCircle2,
      LayoutList,
      MousePointer,
      Filter,
      // System Activity Logs icons
      ChevronsLeft,
      ChevronsRight,
      LogIn,
      // World-Class Activity Logs icons
      SlidersHorizontal,
      Construction,
      Loader,
      Columns,
      Sun,
      Moon,
      Menu,
      AlignJustify,
      BarChart3,
      PieChart,
      FileSpreadsheet,
      FileJson,
      XCircle,
      Loader2,
      ArrowUp,
      ArrowDown,
      ArrowUpDown,
      CheckSquare,
      ShieldAlert,
      Lightbulb,
      Luggage,
      Wand2,
      // College Performance Dashboard icons
      Target,
      TrendingDown,
      ClipboardList,
      Minus,
      AlertOctagon,
    }),
    StudentStatusPipe
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
  bootstrap: [App]
})
export class AppModule { }