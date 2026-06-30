import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef, ViewChild, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, finalize } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AdmissionManagerService } from '../../../services/admission-manager.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { environment } from '../../../../environments/environment';
import { FileService } from '../../../services/file.service';
import * as XLSX from 'xlsx';

// --- Interfaces ---
interface User {
  id: number;
  fullName: string;
  email: string;
  username: string;
  userId?: string;
}

import { forkJoin } from 'rxjs';

interface StatusHistory {
  id: number;
  studentApplicationStatus: string;
  updatedBy: string;
  updatedByName?: string;
  updatedAt: string;
  newStatus: string;
  remarks?: string;
}

interface Student {
  affidavitPath: any;
  action: any;
  actionOnUser: string;
  id: number;
  fullName: string;
  applicationId: string;
  dob: string;
  age: number;
  createdAt: string;
  applicationStatus: string;
  email: string;
  contactNo: string;
  address: string;
  // Family
  emergencyContactNo: string;
  emergencyRelation: string;
  mothersName: string;
  fathersName: string;
  // ID & Passport
  passportNo: string;
  passportValidTill: string;
  passportPath: string | null;
  adhaarCardNo: string;
  adhaarPath: string | null;
  // Academic
  class12thPassingYear: string;
  baords: string;
  class12thMarks: number;
  maxMarks: number;
  markseetPath: string | null;
  hasGivenNEET: boolean;
  neetScore: number | null;
  neetYear: string | null;
  neetMarksheetPath: string | null;
  // Application
  intake: string;
  appliedFor: string;
  college: { id: number; collegeName: string; logoUrl?: string } | null;
  nextStep: string | null;
  // Docs - Basic
  confirmationPagePath: string | null;
  conditionalOfferLetterPath: string | null;
  admissionLetterPathInternal: string | null;
  profileImagePath: string | null;
  // Personal/Visa Information
  surname: string | null;
  firstName: string | null;
  middleName: string | null;
  sex: string | null;
  countryOfBirth: string | null;
  placeOfBirth: string | null;
  maritalStatus: string | null;
  citizenship: string | null;
  previousCitizenship: string | null;
  passportType: string | null;
  passportIssueDate: string | null;
  passportExpirationDate: string | null;
  durationOfVisaProcedure: string | null;
  placeOfVisaIssuance: string | null;
  visaPhotoPath: string | null;
  visaPassportCopyPath: string | null;
  visaNumber: string | null;
  // Visa Payment Fields
  visaManServiceCharge: number | null;
  visaPaymentRequestedAmount: number | null;
  visaPaymentRequestedCurrency: string | null;
  visaBankDetailsSentDate: string | null;
  visaPaymentTxId: string | null;
  visaPaymentConfirmationPath: string | null;
  visaPaymentReceivedAmount: number | null;
  visaPaymentReceivedDate: string | null;
  // Bank Details
  visaBankName: string | null;
  visaBankAccountNumber: string | null;
  visaBankSwiftCode: string | null;
  visaBankBeneficiaryName: string | null;
  visaBankBranchAddress: string | null;
  // Telex Details
  telexNumber: string | null;
  telexIssueDate: string | null;
  telexDocumentsPath: string | null;
  passportValidationDate: string | null;
  telexPaymentAmount: number | null;
  telexPaymentScreenshotPath: string | null;
  telexPaymentTxId: string | null;
  telexPaymentReceivedAmount: number | null;
  telexPaymentReceivedDate: string | null;
  isTelexAccountantApproved: boolean | null;
  isTelexDocApproved: boolean | null;
  docPersonComment: string | null;
  // Document Tracking
  originalDocLocation: string | null;
  originalDocsSent: boolean | null;
  docDeliveryMethod: string | null;
  courierPartner: string | null;
  courierTrackingId: string | null;
  selfPersonContact: string | null;
  docTentativeReachDate: string | null;
  docReceivedDate: string | null;
  received12thMarksheet: boolean | null;
  received10thMarksheet: boolean | null;
  receivedNeetScorecard: boolean | null;
  receivedPassport: boolean | null;
  docReturnedDate: string | null;
  docReturnMethod: string | null;
  docReturnTrackingId: string | null;
  readyForDocReturn: boolean | null;
  // Travel Details
  travelDoj: string | null;
  travelAirlines: string | null;
  travelSource: string | null;
  travelDestination: string | null;
  travelTicketPdfPath: string | null;
  travelPnrNumber: string | null;
  travelFlightNumber: string | null;
  admissionPlanStatus: string | null;
  admissionNotes: string | null;
  // Driver Details
  pickupDriverName?: string | null;
  pickupDriverContact?: string | null;
  pickupVehicleInfo?: string | null;
  // Payment Details
  hasPaid: boolean | null;
  paidAmount: number | null;
  paidTo: string | null;
  ttCopyPath: string | null;
  paymentConfirmationPath: string | null;
  paymentDueDate: string | null;
  paymentType: string | null;
  // Payment Components
  telexTuitionFee: boolean | null;
  telexHostelFee: boolean | null;
  telexMessFee: boolean | null;
  telexContractFee: boolean | null;
  telexRegistrationFee: boolean | null;
  telexOneTimeCharge: boolean | null;
  // Workflow
  telexMan: User | null;
  visaMan: User | null;
  docPerson: User | null;
  accountant: User | null;
  agent: User | null;
  admissionManager: User | null;
  canRequestDocReturn: boolean | null;
  hasRaiseReturnRequest: boolean | null;
  documentReturnRequest: any;
  docPersonAssignedDate: string | null;
  paymentStatus: string | null;
  visaTalabNumaPath: string | null;
  // History
  studentStatusHistory: StatusHistory[];
}

interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
  universityPerson: {
    id: number;
    userName: string;
    students: Student[];
  };
}

interface ManagerData {
  id: number;
  fullName: string;
  username: string;
  colleges: College[];
  students: Student[];
}

interface VisaManager {
  id: number;
  username: string;
  fullName: string;
  status: string;
}

interface NewsDTO {
  id?: number;
  activeFrom: string;
  tillDate: string;
  heading: string;
  content: string;
  tag: string;
  username: string;
  forUser: string;  // STUDENT | AGENT | ALL
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
}

interface SessionDTO {
  id?: number;
  sessionName: string;
  academicYear: string;
  status: string;
}

interface DashboardStats {
  totalStudents: number;
  newApplications: number;
  pendingUniversityAction: number;
  admissionLettersGenerated: number;
  rejected: number;
  statusDistribution: { [key: string]: number };
  recentStudents: {
    id: number;
    fullName: string;
    email: string;
    applicationStatus: string;
    updatedAt: string;
  }[];
}

@Component({
  selector: 'app-admission-manager-dashboard',
  standalone: false,
  templateUrl: './admission-manager-dashboard.html',
  styleUrls: ['./admission-manager-dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('200ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
  ],
})
export class AdmissionManagerDashboard implements OnInit, OnDestroy {
  // Theme System
  isThemePanelOpen = signal<boolean>(false);
  activeTheme = signal<string>('default');

  themes: { id: string; name: string; preview: string[]; vars: Record<string, string> }[] = [
    {
      id: 'default', name: 'Burgundy Classic', preview: ['#630018', '#c5a059', '#f8fafc'],
      vars: {
        '--primary-burgundy': '#630018', '--primary-light': '#8a0f2e', '--primary-dark': '#3f000f',
        '--gold-accent': '#c5a059', '--bg-ivory': '#f8fafc', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1e293b', '--text-secondary': '#475569',
        '--border-classic': '#e2e8f0', '--shadow-hover': '0 10px 25px rgba(99, 0, 24, 0.15)'
      }
    },
    {
      id: 'ocean', name: 'Ocean Blue', preview: ['#0C4A6E', '#38BDF8', '#F0F9FF'],
      vars: {
        '--primary-burgundy': '#0C4A6E', '--primary-light': '#0369A1', '--primary-dark': '#082F49',
        '--gold-accent': '#38BDF8', '--bg-ivory': '#F0F9FF', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#0C4A6E', '--text-secondary': '#475569',
        '--border-classic': '#BAE6FD', '--shadow-hover': '0 10px 25px rgba(12, 74, 110, 0.15)'
      }
    },
    {
      id: 'emerald', name: 'Emerald Forest', preview: ['#064E3B', '#34D399', '#ECFDF5'],
      vars: {
        '--primary-burgundy': '#064E3B', '--primary-light': '#047857', '--primary-dark': '#022C22',
        '--gold-accent': '#34D399', '--bg-ivory': '#ECFDF5', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#064E3B', '--text-secondary': '#475569',
        '--border-classic': '#A7F3D0', '--shadow-hover': '0 10px 25px rgba(6, 78, 59, 0.15)'
      }
    },
    {
      id: 'royal', name: 'Royal Purple', preview: ['#4C1D95', '#A78BFA', '#F5F3FF'],
      vars: {
        '--primary-burgundy': '#4C1D95', '--primary-light': '#6D28D9', '--primary-dark': '#2E1065',
        '--gold-accent': '#A78BFA', '--bg-ivory': '#F5F3FF', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1E1B4B', '--text-secondary': '#475569',
        '--border-classic': '#DDD6FE', '--shadow-hover': '0 10px 25px rgba(76, 29, 149, 0.15)'
      }
    },
    {
      id: 'midnight', name: 'Midnight Dark', preview: ['#1E293B', '#60A5FA', '#0F172A'],
      vars: {
        '--primary-burgundy': '#3B82F6', '--primary-light': '#60A5FA', '--primary-dark': '#1E40AF',
        '--gold-accent': '#FBBF24', '--bg-ivory': '#0F172A', '--bg-surface': '#1E293B',
        '--bg-sidebar': '#1E293B', '--text-charcoal': '#F1F5F9', '--text-secondary': '#94A3B8',
        '--border-classic': '#334155', '--shadow-hover': '0 10px 25px rgba(59, 130, 246, 0.2)'
      }
    },
    {
      id: 'sunset', name: 'Sunset Amber', preview: ['#92400E', '#F59E0B', '#FFFBEB'],
      vars: {
        '--primary-burgundy': '#92400E', '--primary-light': '#B45309', '--primary-dark': '#78350F',
        '--gold-accent': '#F59E0B', '--bg-ivory': '#FFFBEB', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#451A03', '--text-secondary': '#78716C',
        '--border-classic': '#FDE68A', '--shadow-hover': '0 10px 25px rgba(146, 64, 14, 0.15)'
      }
    },
    {
      id: 'rose', name: 'Rose Garden', preview: ['#9F1239', '#FB7185', '#FFF1F2'],
      vars: {
        '--primary-burgundy': '#9F1239', '--primary-light': '#E11D48', '--primary-dark': '#881337',
        '--gold-accent': '#FB7185', '--bg-ivory': '#FFF1F2', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1C1917', '--text-secondary': '#57534E',
        '--border-classic': '#FECDD3', '--shadow-hover': '0 10px 25px rgba(159, 18, 57, 0.15)'
      }
    },
    {
      id: 'slate', name: 'Slate Professional', preview: ['#334155', '#94A3B8', '#F8FAFC'],
      vars: {
        '--primary-burgundy': '#334155', '--primary-light': '#475569', '--primary-dark': '#1E293B',
        '--gold-accent': '#94A3B8', '--bg-ivory': '#F8FAFC', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#0F172A', '--text-secondary': '#64748B',
        '--border-classic': '#CBD5E1', '--shadow-hover': '0 10px 25px rgba(51, 65, 85, 0.15)'
      }
    },
    {
      id: 'teal', name: 'Teal Medical', preview: ['#0D9488', '#5EEAD4', '#F0FDFA'],
      vars: {
        '--primary-burgundy': '#0D9488', '--primary-light': '#14B8A6', '--primary-dark': '#115E59',
        '--gold-accent': '#5EEAD4', '--bg-ivory': '#F0FDFA', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#134E4A', '--text-secondary': '#475569',
        '--border-classic': '#99F6E4', '--shadow-hover': '0 10px 25px rgba(13, 148, 136, 0.15)'
      }
    },
    {
      id: 'indigo', name: 'Indigo Corporate', preview: ['#3730A3', '#818CF8', '#EEF2FF'],
      vars: {
        '--primary-burgundy': '#3730A3', '--primary-light': '#4F46E5', '--primary-dark': '#312E81',
        '--gold-accent': '#818CF8', '--bg-ivory': '#EEF2FF', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1E1B4B', '--text-secondary': '#6366F1',
        '--border-classic': '#C7D2FE', '--shadow-hover': '0 10px 25px rgba(55, 48, 163, 0.15)'
      }
    },
    {
      id: 'coral', name: 'Coral Warm', preview: ['#C2410C', '#FB923C', '#FFF7ED'],
      vars: {
        '--primary-burgundy': '#C2410C', '--primary-light': '#EA580C', '--primary-dark': '#9A3412',
        '--gold-accent': '#FB923C', '--bg-ivory': '#FFF7ED', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#431407', '--text-secondary': '#78716C',
        '--border-classic': '#FED7AA', '--shadow-hover': '0 10px 25px rgba(194, 65, 12, 0.15)'
      }
    },
    {
      id: 'navy', name: 'Navy Classic', preview: ['#1E3A5F', '#60A5FA', '#EFF6FF'],
      vars: {
        '--primary-burgundy': '#1E3A5F', '--primary-light': '#2563EB', '--primary-dark': '#172554',
        '--gold-accent': '#D4AF37', '--bg-ivory': '#EFF6FF', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#0F172A', '--text-secondary': '#475569',
        '--border-classic': '#BFDBFE', '--shadow-hover': '0 10px 25px rgba(30, 58, 95, 0.15)'
      }
    },
    {
      id: 'olive', name: 'Olive Earth', preview: ['#3F6212', '#A3E635', '#F7FEE7'],
      vars: {
        '--primary-burgundy': '#3F6212', '--primary-light': '#4D7C0F', '--primary-dark': '#365314',
        '--gold-accent': '#A3E635', '--bg-ivory': '#F7FEE7', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1A2E05', '--text-secondary': '#4B5563',
        '--border-classic': '#BEF264', '--shadow-hover': '0 10px 25px rgba(63, 98, 18, 0.15)'
      }
    },
    {
      id: 'cherry', name: 'Cherry Blossom', preview: ['#BE185D', '#F9A8D4', '#FDF2F8'],
      vars: {
        '--primary-burgundy': '#BE185D', '--primary-light': '#DB2777', '--primary-dark': '#9D174D',
        '--gold-accent': '#F9A8D4', '--bg-ivory': '#FDF2F8', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1C1917', '--text-secondary': '#6B7280',
        '--border-classic': '#FBCFE8', '--shadow-hover': '0 10px 25px rgba(190, 24, 93, 0.15)'
      }
    }
  ];

  // --- Professional Toast System ---
  toastQueue: { message: string, type: 'success' | 'error' | 'info' | 'warning', id: number }[] = [];
  toastIdCounter: number = 0;

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  private destroy$ = new Subject<void>();
  private avatarColors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED'];

  managerData: ManagerData | null = null;
  dashboardStats: DashboardStats | null = null;
  selectedStudent: Student | null = null;
  isEditingStudent = false;
  editStudentData: any = {};
  editDocuments: any = {
    adhaar: null,
    class12thMarksheet: null,
    photograph: null,
    neetMarksheet: null,
    passport: null
  };

  // Dropdown Data
  availableTelexManagers: { username: string; studentCount: number }[] = [];
  availableVisaManagers: { username: string; studentCount: number }[] = [];

  // Views & Lists
  pipelineCompletedCount = 0;
  pipelineWaitingUniCount = 0;
  pipelinePendingOnYouCount = 0;

  telexPipelinePendingAssignCount = 0;
  telexPipelineInProgressCount = 0;
  telexPipelineCompletedCount = 0;

  visaPipelinePendingAssignCount = 0;
  visaPipelineInProgressCount = 0;
  visaPipelineCompletedCount = 0;

  activeView: 'dashboard' | 'actions-required' | 'forward-uni' | 'approve-admission' | 'assign-telex' | 'assign-visa' | 'pending-university' | 'processing' | 'completed' | 'reports' | 'payment' | 'profile' | 'messages' | 'news' | 'sessions' | 'travel' | 'travelling' | 'requested-docs' | 'tasks' = 'dashboard';
  isSidebarCollapsed = false;
  actionRequiredStudents: Student[] = [];
  pendingUniversityStudents: Student[] = [];
  processingStudents: Student[] = [];
  // Pagination
  currentPage: number = 1;
  pageSize: number = 15;

  get paginatedList(): Student[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredList.length / this.pageSize) || 1;
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (this.currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }

    if (this.currentPage >= total - 2) {
      return [total - 4, total - 3, total - 2, total - 1, total];
    }

    return [this.currentPage - 2, this.currentPage - 1, this.currentPage, this.currentPage + 1, this.currentPage + 2];
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  allStudents: Student[] = [];
  filteredList: Student[] = [];
  docRequests: any[] = [];

  // --- Tasks Module State ---
  tasksDashboardData: any = {
    allTasks: [], myTasks: [], followUps: [], escalations: [], overdueTasks: []
  };
  tasksFilter: string = 'all'; // 'all', 'my', 'followups', 'overdue', 'escalations'
  isTaskModalOpen: boolean = false;
  newTask: any = {
    title: '', description: '', department: 'VISA', assignedToRole: '', type: 'TASK', dueDate: ''
  };

  // Task Engine settings
  showSettingsModal = false;
  currentSyncInterval = 15;
  isUpdatingSettings = false;

  // --- Enterprise Dashboard Metrics ---
  entPaymentStats = {
    pendingPayments: 0,
    paidPayments: 0,
    totalCollection: 0,
    pendingCollection: 0,
    completionPercentage: 0
  };

  entUniversityDistribution: { name: string; students: number; admissions: number; arrivals: number }[] = [];

  entTaskStats = {
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    high: 0,
    medium: 0,
    low: 0,
    completionPercentage: 0
  };

  entQuickInsights = {
    todayAdmissions: 0,
    todayArrivals: 0,
    pendingDocs: 0,
    pendingTelex: 0,
    awaitingApproval: 0
  };

  entTopPendingTasks: any[] = [];

  dashboardStudents: Student[] = [];

  // --- SaaS Dashboard UI Methods ---
  selectedTimeframe: string = 'THIS_MONTH';

  onTimeframeChange(event: any) {
    this.selectedTimeframe = event.target.value;
    // Note: To fully implement this, backend endpoints should accept `timeframe` filters.
    // For now, we simulate a reload to show the UI interactivity.
    this.loadInitialData(false);
  }

  entKpiTrends: Record<string, { value: string, direction: 'up' | 'down' | 'neutral' }> = {
    'Total Students': { value: '0.0', direction: 'neutral' },
    'Admission Letters': { value: '0.0', direction: 'neutral' },
    'Telex Issued': { value: '0.0', direction: 'neutral' },
    'Visa Stamped': { value: '0.0', direction: 'neutral' },
    'Documents Pending': { value: '0.0', direction: 'neutral' },
    'Travel Arranged': { value: '0.0', direction: 'neutral' },
    'Students Arrived': { value: '0.0', direction: 'neutral' },
    'Pending Payments': { value: '0.0', direction: 'neutral' },
  };

  calculateTrends(): void {
    const now = new Date();
    let currentStart = new Date(0);
    let prevStart = new Date(0);
    let prevEnd = new Date(0);

    if (this.selectedTimeframe === 'ALL' || !this.selectedTimeframe) {
      this.resetTrends();
      return;
    }

    if (this.selectedTimeframe === 'TODAY') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (this.selectedTimeframe === 'LAST_7_DAYS') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 23, 59, 59, 999);
    } else if (this.selectedTimeframe === 'THIS_MONTH') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (this.selectedTimeframe === 'YTD') {
      currentStart = new Date(now.getFullYear(), 0, 1);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999); 
    }

    const prevStudents = this.allStudents.filter(s => {
      if (!s.createdAt) return false;
      const d = new Date(s.createdAt);
      return d >= prevStart && d <= prevEnd;
    });

    const currentStudents = this.dashboardStudents;

    const calcTrend = (currCount: number, prevCount: number) => {
      if (prevCount === 0) return { value: currCount > 0 ? '100.0' : '0.0', direction: currCount > 0 ? 'up' as const : 'neutral' as const };
      const diff = currCount - prevCount;
      const perc = (diff / prevCount) * 100;
      return {
        value: Math.abs(perc).toFixed(1),
        direction: perc > 0 ? 'up' as const : perc < 0 ? 'down' as const : 'neutral' as const
      };
    };

    this.entKpiTrends['Total Students'] = calcTrend(currentStudents.length, prevStudents.length);

    const getStageCount = (list: any[], statusList: string[]) => list.filter(s => statusList.some(st => s.applicationStatus?.includes(st))).length;
    
    const admStatuses = ['CONDITIONAL_OFFER_LETTER_GENERATED', 'PENDING_ADMISSION_LETTER', 'ADMISSION_LETTER_GENERATED', 'FORWARDED_TO_UNI'];
    this.entKpiTrends['Admission Letters'] = calcTrend(getStageCount(currentStudents, admStatuses), getStageCount(prevStudents, admStatuses));

    const telexStatuses = ['TELEX_PAYMENT_DOCS_SUBMITTED', 'TELEX_INITIATED', 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY', 'TELEX_APPLICATION_SUBMITTED_TO_MEA', 'TELEX_NUMBER_ISSUED'];
    this.entKpiTrends['Telex Issued'] = calcTrend(getStageCount(currentStudents, telexStatuses), getStageCount(prevStudents, telexStatuses));

    const visaStatuses = ['DOCS_VARIFICATION_COMPLETE', 'VISA_FEE_PENDING', 'VISA_FEE_RECEIVED', 'VISA_APPLIED', 'PASSPORT_SUBMITTED_TO_EMBASSY', 'VISA_STAMPED'];
    this.entKpiTrends['Visa Stamped'] = calcTrend(getStageCount(currentStudents, visaStatuses), getStageCount(prevStudents, visaStatuses));

    const getDocsPending = (list: any[]) => list.filter(s => !s.passportPath || !s.markseetPath).length;
    this.entKpiTrends['Documents Pending'] = calcTrend(getDocsPending(currentStudents), getDocsPending(prevStudents));

    const getUpcomingTravel = (list: any[]) => {
      const t = new Date(); t.setHours(0,0,0,0);
      return list.filter(s => s.travelDoj && new Date(s.travelDoj) >= t).length;
    };
    this.entKpiTrends['Travel Arranged'] = calcTrend(getUpcomingTravel(currentStudents), getUpcomingTravel(prevStudents));

    const getArrived = (list: any[]) => list.filter(s => s.admissionPlanStatus === 'MARK_ARRIVED').length;
    this.entKpiTrends['Students Arrived'] = calcTrend(getArrived(currentStudents), getArrived(prevStudents));

    const getPendingPayment = (list: any[]) => list.filter(s => {
      const vReq = s.visaPaymentRequestedAmount || 0;
      const vRec = s.visaPaymentReceivedAmount || 0;
      const tReq = s.telexPaymentAmount || 0;
      const tRec = s.telexPaymentReceivedAmount || 0;
      return (vReq + tReq) > (vRec + tRec);
    }).length;
    this.entKpiTrends['Pending Payments'] = calcTrend(getPendingPayment(currentStudents), getPendingPayment(prevStudents));
  }

  resetTrends(): void {
    Object.keys(this.entKpiTrends).forEach(k => {
      this.entKpiTrends[k] = { value: '0.0', direction: 'neutral' };
    });
  }

  getOverdueDays(dueDate: string | Date | null): number {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const now = new Date();
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - due.getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // --- SaaS Dashboard: Pipeline Stages ---
  get pipelineStages(): { label: string; count: number; color: string; view: string }[] {
    let regCount = 0;
    let admCount = 0;
    let telexCount = 0;
    let visaCount = 0;
    let arrivedCount = 0;

    this.dashboardStudents.forEach(s => {
      const dist = s.applicationStatus;
      if (['REGISTERED', 'UNDER_REVIEW', 'APPROVED'].includes(dist)) regCount++;
      if (['CONDITIONAL_OFFER_LETTER_GENERATED', 'PENDING_ADMISSION_LETTER', 'ADMISSION_LETTER_GENERATED', 'FORWARDED_TO_UNI'].includes(dist)) admCount++;
      if (['TELEX_PAYMENT_DOCS_SUBMITTED', 'TELEX_INITIATED', 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY', 'TELEX_APPLICATION_SUBMITTED_TO_MEA', 'TELEX_NUMBER_ISSUED'].includes(dist)) telexCount++;
      if (['DOCS_VARIFICATION_COMPLETE', 'VISA_FEE_PENDING', 'VISA_FEE_RECEIVED', 'VISA_APPLIED', 'PASSPORT_SUBMITTED_TO_EMBASSY', 'VISA_STAMPED'].includes(dist)) visaCount++;
      if (s.admissionPlanStatus === 'MARK_ARRIVED') arrivedCount++;
    });

    return [
      { label: 'Applications', count: regCount, color: '#031061', view: 'actions-required' },
      { label: 'Admission Letters', count: admCount, color: '#115ee8', view: 'forward-uni' },
      { label: 'Telex Issued', count: telexCount, color: '#7c3aed', view: 'assign-telex' },
      { label: 'Visa Stamped', count: visaCount, color: '#0d9488', view: 'assign-visa' },
      { label: 'Students Arrived', count: this.dashboardStudents.filter(s => s.admissionPlanStatus === 'MARK_ARRIVED').length, color: '#f97316', view: 'completed' }
    ];
  }

  get pipelineMaxCount(): number {
    return Math.max(...this.pipelineStages.map(s => s.count), 1);
  }

  getPipelineStageCount(label: string): number {
    const stage = this.pipelineStages.find(s => s.label === label);
    return stage ? stage.count : 0;
  }

  getPendingPaymentStudentsCount(): number {
    return this.dashboardStudents.filter(s => {
      const visaReq = s.visaPaymentRequestedAmount || 0;
      const visaRec = s.visaPaymentReceivedAmount || 0;
      const telexReq = s.telexPaymentAmount || 0;
      const telexRec = s.telexPaymentReceivedAmount || 0;
      return (visaReq + telexReq) > (visaRec + telexRec);
    }).length;
  }

  // --- SaaS Dashboard: Upcoming Travel ---
  get upcomingTravel(): Student[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.dashboardStudents
      .filter(s => s.travelDoj && new Date(s.travelDoj) >= today)
      .sort((a, b) => new Date(a.travelDoj!).getTime() - new Date(b.travelDoj!).getTime())
      .slice(0, 5);
  }

  // --- SaaS Dashboard: Document Completion ---
  get documentCompletionStats(): { complete: number; incomplete: number; percentage: number; missingStudents: Student[] } {
    const total = this.dashboardStudents.length;
    if (total === 0) return { complete: 0, incomplete: 0, percentage: 0, missingStudents: [] };
    const incomplete = this.dashboardStudents.filter(s => !s.passportPath || !s.markseetPath);
    const complete = total - incomplete.length;
    return {
      complete,
      incomplete: incomplete.length,
      percentage: Math.round((complete / total) * 100),
      missingStudents: incomplete.slice(0, 5)
    };
  }

  // --- SaaS Dashboard: Follow-Up Tasks ---
  entFollowUpTasks: any[] = [];

  // --- SaaS Dashboard: Payment Dynamic Target ---
  get dynamicPaymentTarget(): number {
    let total = 0;
    if (this.managerData?.students) {
      this.managerData.students.forEach(s => {
        total += (s.visaPaymentRequestedAmount || 0) + (s.telexPaymentAmount || 0);
      });
    }
    return total || 1; // avoid division by zero
  }


  entTaskPriorityChartData: ChartData<'doughnut'> = {
    labels: ['Completed', 'Pending', 'Overdue'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0
    }]
  };

  entTaskPriorityChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { display: false }
    }
  };

  entPaymentChartData: ChartData<'doughnut'> = {
    labels: ['Collected', 'Pending'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#10b981', '#f1f5f9'],
      borderWidth: 0
    }]
  };

  isForwardingRequest = false;
  isRejectingRequest = false;
  selectedRequestForReject: any = null;
  selectedDocRequest: any = null;

  get getForwardUniCount(): number {
    return this.actionRequiredStudents.filter(s => s.action === 'FORWARD_TO_UNI').length;
  }
  get getApproveAdmissionCount(): number {
    return this.actionRequiredStudents.filter(s => s.action === 'APPROVE_ADMISSION_LETTER').length;
  }
  get getAssignTelexCount(): number {
    return this.actionRequiredStudents.filter(s => s.action === 'ASSIGN_TELEX_MAN').length;
  }
  get getAssignVisaCount(): number {
    return this.actionRequiredStudents.filter(s => s.action === 'ASSIGN_TO_VISA_MAN').length;
  }

  get getTravellingCount(): number {
    return this.allStudents.filter(s => s.travelDoj || s.travelAirlines || s.hasRaiseReturnRequest).length;
  }

  get getTravelLogisticsCount(): number {
    return this.travelStudents.length + this.docReturnStudents.length;
  }

  // --- Travel & Logistics ---
  travelTab: 'travel' | 'docs' = 'travel';
  travelStudents: Student[] = [];
  docReturnStudents: Student[] = [];

  switchTravelTab(tab: 'travel' | 'docs') {
    this.travelTab = tab;
    this.buildTravelHeatmapAndTimeline();
  }

  travelFilterAgent = '';
  travelFilterCollege = '';
  travelFilterStartDate = '';
  travelFilterEndDate = '';

  // --- Travel Tracking & Heatmap ---
  todayTravelers: Student[] = [];
  tomorrowTravelers: Student[] = [];
  next7DaysTravelers: Student[] = [];
  past7DaysTravelers: Student[] = [];

  heatmapDays: { date: number, fullDate: string, count: number }[] = [];
  heatmapMonthName: string = '';
  selectedHeatmapDate: string | null = null;

  toggleHeatmapDate(date: string) {
    if (this.selectedHeatmapDate === date) {
      this.selectedHeatmapDate = null; // deselect
    } else {
      this.selectedHeatmapDate = date;
    }
  }

  // --- Bulk Actions ---
  selectedTravelStudents = new Set<number>();
  isBulkUpdating = false;

  toggleTravelStudentSelection(studentId: number) {
    if (this.selectedTravelStudents.has(studentId)) {
      this.selectedTravelStudents.delete(studentId);
    } else {
      this.selectedTravelStudents.add(studentId);
    }
  }

  toggleAllTravelStudents(event: any, students: Student[]) {
    if (event.target.checked) {
      students.forEach(s => this.selectedTravelStudents.add(s.id));
    } else {
      this.selectedTravelStudents.clear();
    }
  }

  bulkUpdateAdmissionPlan(status: string) {
    if (this.selectedTravelStudents.size === 0) return;

    this.isBulkUpdating = true;
    this.cdr.markForCheck();

    const requests = Array.from(this.selectedTravelStudents).map(studentId => {
      const payload = { admissionPlanStatus: status, admissionNotes: '' };
      return this.http.put<Student>(`${environment.apiUrl}/api/managers/student/${studentId}/admission-plan`, payload);
    });

    forkJoin(requests).subscribe({
      next: (results) => {
        this.isBulkUpdating = false;
        this.selectedTravelStudents.clear();
        this.showToast(`Successfully updated ${results.length} students to ${status}.`, 'success');
        this.refreshData(); // Refresh to get the latest updated objects
      },
      error: (err) => {
        this.isBulkUpdating = false;
        this.showToast('Failed to bulk update some students.', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  get filteredTravelStudents(): Student[] {
    let filtered = this.travelStudents.filter(s => {
      if (this.travelFilterAgent && s.agent?.fullName !== this.travelFilterAgent) return false;
      if (this.travelFilterCollege && s.college?.collegeName !== this.travelFilterCollege) return false;
      if (this.travelFilterStartDate && s.travelDoj) {
        if (new Date(s.travelDoj) < new Date(this.travelFilterStartDate)) return false;
      }
      if (this.travelFilterEndDate && s.travelDoj) {
        if (new Date(s.travelDoj) > new Date(this.travelFilterEndDate)) return false;
      }

      // Heatmap Filter
      if (this.selectedHeatmapDate && s.travelDoj !== this.selectedHeatmapDate) return false;

      return true;
    });

    // Grouping/Sorting by Date then Flight Number for Pickup Coordination
    return filtered.sort((a, b) => {
      const dA = new Date(a.travelDoj || 0).getTime();
      const dB = new Date(b.travelDoj || 0).getTime();
      if (dA !== dB) return dA - dB;
      return (a.travelFlightNumber || '').localeCompare(b.travelFlightNumber || '');
    });
  }

  get filteredDocReturnStudents(): Student[] {
    let filtered = this.docReturnStudents.filter(s => {
      if (this.travelFilterAgent && s.agent?.fullName !== this.travelFilterAgent) return false;
      if (this.travelFilterCollege && s.college?.collegeName !== this.travelFilterCollege) return false;
      if (this.travelFilterStartDate && s.documentReturnRequest?.travelDate) {
        if (new Date(s.documentReturnRequest.travelDate) < new Date(this.travelFilterStartDate)) return false;
      }
      if (this.travelFilterEndDate && s.documentReturnRequest?.travelDate) {
        if (new Date(s.documentReturnRequest.travelDate) > new Date(this.travelFilterEndDate)) return false;
      }

      // Heatmap Filter
      const tDate = s.documentReturnRequest?.travelDate;
      if (this.selectedHeatmapDate && tDate !== this.selectedHeatmapDate) return false;

      return true;
    });

    // Grouping/Sorting by Date then Flight Number
    return filtered.sort((a, b) => {
      const dA = new Date(a.documentReturnRequest?.travelDate || 0).getTime();
      const dB = new Date(b.documentReturnRequest?.travelDate || 0).getTime();
      if (dA !== dB) return dA - dB;
      return (a.travelFlightNumber || '').localeCompare(b.travelFlightNumber || '');
    });
  }

  // --- Flight Grouping ---
  get flightGroups(): any[] {
    const students = this.travelTab === 'travel' ? this.filteredTravelStudents : this.filteredDocReturnStudents;
    const groupsMap = new Map<string, { flightNumber: string, date: string, destination: string, students: Student[] }>();

    students.forEach(s => {
      const flightNumber = s.travelFlightNumber || 'Unknown Flight';
      const date = this.travelTab === 'travel' ? s.travelDoj : s.documentReturnRequest?.travelDate;
      const destination = this.travelTab === 'travel' ? s.travelDestination : s.documentReturnRequest?.toAirport;

      const key = `${flightNumber}_${date}_${destination}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, { flightNumber, date: date || '', destination: destination || 'Unknown', students: [] });
      }
      groupsMap.get(key)!.students.push(s);
    });

    return Array.from(groupsMap.values()).sort((a, b) => {
      const dA = new Date(a.date).getTime();
      const dB = new Date(b.date).getTime();
      return dA - dB;
    });
  }

  selectGroup(groupStudents: Student[]) {
    this.selectedTravelStudents.clear(); // Clear existing
    groupStudents.forEach(s => this.selectedTravelStudents.add(s.id));
    this.cdr.markForCheck();
  }

  // --- Travel Details Side Modal ---
  showTravelDetailsModal: boolean = false;
  selectedTravelDetailStudent: Student | null = null;

  openTravelDetails(student: Student) {
    this.selectedTravelDetailStudent = student;
    this.showTravelDetailsModal = true;
    this.cdr.markForCheck();
  }

  closeTravelDetails() {
    this.showTravelDetailsModal = false;
    this.selectedTravelDetailStudent = null;
    this.cdr.markForCheck();
  }

  // --- WhatsApp & Flight Tracking ---
  copyGroupContacts(students: Student[]) {
    const contacts = students
      .map(s => s.contactNo)
      .filter(c => c && c.trim().length > 0)
      .join(', ');

    if (!contacts) {
      this.showToast('No contact numbers found for this group.', 'error');
      return;
    }

    navigator.clipboard.writeText(contacts).then(() => {
      this.showToast('Successfully copied all contact numbers!', 'success');
    }).catch(err => {
      this.showToast('Failed to copy contacts.', 'error');
    });
  }

  // --- Assign Driver Modal ---
  showAssignDriverModal: boolean = false;
  isSubmittingDriver: boolean = false;
  assignDriverForm = {
    pickupDriverName: '',
    pickupDriverContact: '',
    pickupVehicleInfo: ''
  };
  assignDriverStudentIds: number[] = [];

  openAssignDriverModal(students: Student[]) {
    this.assignDriverStudentIds = students.map(s => s.id);
    // Pre-fill if the first student has driver details
    if (students.length > 0) {
      this.assignDriverForm.pickupDriverName = students[0].pickupDriverName || '';
      this.assignDriverForm.pickupDriverContact = students[0].pickupDriverContact || '';
      this.assignDriverForm.pickupVehicleInfo = students[0].pickupVehicleInfo || '';
    }
    this.showAssignDriverModal = true;
    this.cdr.markForCheck();
  }

  closeAssignDriverModal() {
    this.showAssignDriverModal = false;
    this.assignDriverStudentIds = [];
    this.assignDriverForm = { pickupDriverName: '', pickupDriverContact: '', pickupVehicleInfo: '' };
    this.cdr.markForCheck();
  }

  saveDriverAssignment() {
    if (!this.assignDriverForm.pickupDriverName || !this.assignDriverForm.pickupDriverContact) {
      this.showToast('Driver Name and Contact are required.', 'error');
      return;
    }

    this.isSubmittingDriver = true;
    this.cdr.markForCheck();

    const payload = {
      studentIds: this.assignDriverStudentIds,
      pickupDriverName: this.assignDriverForm.pickupDriverName,
      pickupDriverContact: this.assignDriverForm.pickupDriverContact,
      pickupVehicleInfo: this.assignDriverForm.pickupVehicleInfo
    };

    this.http.put(`${environment.apiUrl}/api/managers/student/bulk-assign-driver`, payload).subscribe({
      next: (res: any) => {
        this.isSubmittingDriver = false;
        this.closeAssignDriverModal();
        this.showToast('Driver assigned successfully!', 'success');
        this.refreshData(); // Refresh UI
      },
      error: (err) => {
        this.isSubmittingDriver = false;
        this.showToast('Failed to assign driver.', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  clearTravelFilters(): void {
    this.travelFilterAgent = '';
    this.travelFilterCollege = '';
    this.travelFilterStartDate = '';
    this.travelFilterEndDate = '';
  }

  // --- Session Management ---
  sessionList: SessionDTO[] = [];
  isLoadingSessions = false;
  showSessionModal = false;
  isEditingSession = false;
  currentSessionId: number | null = null;
  sessionForm = {
    sessionName: '',
    academicYear: '',
    status: 'ACTIVE'
  };
  private readonly SESSION_API_URL = environment.apiUrl + '/api/sessions';

  // State
  isLoading = true;
  isRefreshing = false;
  isSubmitting = false;
  searchTerm = '';
  isFullscreen = false;
  isLoadingMessages = false;

  // Smart Filters
  filterAgent = '';
  filterCollege = '';
  filterStatus = '';
  filterStartDate = '';
  filterEndDate = '';
  uniqueAgents: { fullName: string; username: string }[] = [];
  uniqueColleges: string[] = [];
  uniqueStatuses: string[] = [];

  getMessagesCount(): number {
    return 0;
  }

  // --- Reports ---
  reportFilterAgent = '';
  reportFilterCollege = '';
  reportFilterStatus = '';
  reportFilterStartDate = '';
  reportFilterEndDate = '';
  reportList: Student[] = [];

  // Modals
  showStudentDetail = false;
  showActionModal = false;
  showSuccessModal = false;
  successModalMessage = '';
  showExportModal = false;
  exportColumns = [
    { key: 'Student Name', selected: true },
    { key: 'Email', selected: true },
    { key: 'Contact', selected: true },
    { key: 'Agent', selected: true },
    { key: 'Agent Username', selected: true },
    { key: 'College', selected: true },
    { key: 'Intake', selected: true },
    { key: 'Applied For', selected: true },
    { key: 'Status', selected: true },
    { key: 'Passport No', selected: true },
    { key: 'DOB', selected: true },
    { key: 'Address', selected: true },
    { key: 'Father', selected: true },
    { key: 'Mother', selected: true },
  ];

  get allColumnsSelected(): boolean {
    return this.exportColumns.every(c => c.selected);
  }

  toggleAllColumns(event: any): void {
    const checked = event.target.checked;
    this.exportColumns.forEach(c => c.selected = checked);
  }

  // --- News Management ---
  newsList: NewsDTO[] = [];
  isLoadingNews = false;
  showNewsModal = false;
  showNewsSuccessModal = false;
  newsSuccessMessage = '';
  showDeleteConfirmModal = false;
  deleteNewsId: number | null = null;
  isEditingNews = false;
  currentNewsId: number | null = null;
  newsForm = {
    heading: '',
    content: '',
    tag: '',
    forUser: '',
    activeFrom: '',
    tillDate: ''
  };
  userTypeOptions = [
    { value: 'STUDENT', label: 'Students' },
    { value: 'AGENT', label: 'Agents' },
    { value: 'ALL', label: 'All Users' }
  ];
  tagOptions = [
    { value: 'admission', label: 'Admission' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'fees_update', label: 'Fees Update' },
    { value: 'scholarship', label: 'Scholarship' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'visa', label: 'Visa Update' },
    { value: 'documents', label: 'Documents' },
    { value: 'university', label: 'University News' },
    { value: 'intake', label: 'New Intake' },
    { value: 'general', label: 'General' }
  ];
  private readonly NEWS_API_URL = environment.apiUrl + '/api/news';

  // --- Logout Confirmation Modal & Messages ---
  isLogoutModalOpen = false;
  logoutMessages = [
    'Great work today! See you soon!',
    'You made a difference today! Rest well!',
    'Your dedication inspires us! Come back refreshed!',
    'Another day of excellence! Take care!',
    'Thank you for your amazing efforts! Until next time!',
    'You are a star! See you tomorrow!',
    'Mission accomplished! Time to recharge!',
    'Your hard work matters! Stay blessed!',
    'Take a moment to celebrate your wins! Bye for now!',
    'Goals achieved! You deserve a break!',
    'Your positive energy brightens our day! See you!',
    'Creativity and dedication - you have both! Rest up!',
    'Strong work ethic! Time to relax!',
    'Keep blooming! We appreciate you!',
    'You bring harmony to the team! Until next time!',
    'Champion mindset! Take a well-deserved break!',
    'Stars shine brighter because of people like you! Goodnight!',
    'Your transformation of students\' lives is beautiful! See you!',
    'You are precious to this team! Stay safe!'
  ];
  currentLogoutMessage = '';

  // Action Logic
  studentForAction: Student | null = null;
  actionType: 'forward' | 'approve' | 'assign-telex' | 'assign-visa' | 'reject' | null = null;
  selectedManagerUsername: string = '';
  rejectionReason: string = '';

  // Coordinator Validation
  coordinatorValidationError: string = '';
  showCoordinatorValidationModal: boolean = false;
  isValidatingCoordinator: boolean = false;

  // --- Charts Configuration ---

  // 1. Main Pipeline Chart (Bar)
  public pipelineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: 'Inter', size: 13 },
        bodyFont: { family: 'Inter', size: 13 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#F1F5F9' },
        ticks: { font: { family: 'Inter' }, color: '#64748B' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', weight: 'bold' }, color: '#475569' }
      }
    }
  };
  public pipelineChartType: ChartType = 'bar';
  public pipelineChartData: ChartData<'bar'> = {
    labels: ['Registration', 'Admission', 'Telex Process', 'Visa Process'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'],
      borderRadius: 8,
      barThickness: 40,
    }]
  };

  // 2. Distribution Chart (Doughnut)
  public distributionChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { font: { family: 'Inter', size: 11 }, usePointStyle: true } }
    }
  };
  public distributionChartType: ChartType = 'doughnut';
  public distributionChartData: ChartData<'doughnut'> = {
    labels: ['Active', 'Rejected', 'Completed'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#3B82F6', '#EF4444', '#10B981'],
      hoverOffset: 4
    }]
  };

  public applicationsTrendChartType: ChartType = 'line';
  public applicationsTrendChartData: ChartData<'line'> = {
    labels: ['1 May', '7 May', '14 May', '21 May', '28 May'],
    datasets: [
      {
        label: 'Applications',
        data: [15, 30, 45, 60, 80],
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        borderWidth: 2
      },
      {
        label: 'Admissions',
        data: [5, 12, 20, 35, 50],
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        borderWidth: 2
      }
    ]
  };
  public applicationsTrendChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6, font: { family: 'Inter', size: 11 } } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' } },
      y: { border: { display: false }, grid: { color: '#f1f5f9' }, min: 0, max: 100, ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' } }
    }
  };

  constructor(
    private admissionService: AdmissionManagerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private fileService: FileService
  ) { }

  ngOnInit(): void {
    this.loadSavedTheme();
    // Start initial load
    this.loadInitialData(true);
    this.loadStaffLists();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.cdr.detectChanges();

    // Small delay for visual feedback, then load data
    setTimeout(() => {
      this.loadInitialData(false);
    }, 300);
  }

  loadInitialData(isInitial: boolean): void {
    const username = sessionStorage.getItem('userId');
    if (!username) {
      this.isLoading = false;
      this.isRefreshing = false;
      this.router.navigate(['/login']);
      return;
    }

    if (isInitial) {
      this.isLoading = true;
    }
    // Note: isRefreshing is already set by refreshData() for refresh cases
    this.cdr.detectChanges();

    // Parallel loading logic
    if (this.activeView === 'dashboard') {
      this.loadDashboardStats(username);
      this.loadTasksDashboard();
    }

    // Safety timeout - reset loading states after 15 seconds max
    const safetyTimeout = setTimeout(() => {
      if (this.isLoading || this.isRefreshing) {
        console.warn('Loading timeout - resetting loading states');
        this.isLoading = false;
        this.isRefreshing = false;
        this.cdr.detectChanges();
      }
    }, 15000);

    this.admissionService.getManagerDetails(username)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          clearTimeout(safetyTimeout);
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.managerData = data;
          this.categorizeStudents();
          this.processEnterpriseDashboardMetrics();
          // Only filter if not in dashboard view, otherwise dashboard stats handle the view
          if (this.activeView !== 'dashboard') {
            this.filterStudents();
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading data:', error);
          // Ensure loading states are reset on error
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadDashboardStats(username: string): void {
    this.admissionService.getDashboardStats(username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats: DashboardStats) => {
          this.dashboardStats = stats;
          this.processChartData(stats);
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading stats:', err)
      });
  }

  processChartData(stats: DashboardStats): void {
    const dist = stats.statusDistribution;

    // 1. Pipeline Logic (Grouping)
    // Registration Stage
    const regCount = (dist['REGISTERED'] || 0) + (dist['UNDER_REVIEW'] || 0) + (dist['APPROVED'] || 0);

    // Admission Stage
    const admCount = (dist['CONDITIONAL_OFFER_LETTER_GENERATED'] || 0) +
      (dist['PENDING_ADMISSION_LETTER'] || 0) +
      (dist['ADMISSION_LETTER_GENERATED'] || 0) +
      (dist['FORWARDED_TO_UNI'] || 0);

    // Telex Stage
    const telexCount = (dist['TELEX_PAYMENT_DOCS_SUBMITTED'] || 0) +
      (dist['TELEX_INITIATED'] || 0) +
      (dist['TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY'] || 0) +
      (dist['TELEX_APPLICATION_SUBMITTED_TO_MEA'] || 0) +
      (dist['TELEX_NUMBER_ISSUED'] || 0);

    // Visa Stage
    const visaCount = (dist['DOCS_VARIFICATION_COMPLETE'] || 0) +
      (dist['VISA_FEE_PENDING'] || 0) +
      (dist['VISA_FEE_RECEIVED'] || 0) +
      (dist['VISA_APPLIED'] || 0) +
      (dist['PASSPORT_SUBMITTED_TO_EMBASSY'] || 0) +
      (dist['VISA_STAMPED'] || 0);

    this.pipelineChartData.datasets[0].data = [regCount, admCount, telexCount, visaCount];

    // 2. Distribution Logic
    const rejected = stats.rejected || 0;
    const completed = (dist['VISA_STAMPED'] || 0);
    const active = stats.totalStudents - rejected - completed;

    this.distributionChartData.datasets[0].data = [active, rejected, completed];

    // Update charts
    if (this.chart) {
      this.chart.update();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UNIVERSITY-CENTRIC DASHBOARD (single university at a time)
  // ═══════════════════════════════════════════════════════════════

  selectedDashboardCollege = '';
  dashboardStartDate = '';
  dashboardEndDate = '';

  get selectedCollegeLogo(): string {
    if (!this.selectedDashboardCollege) return '';
    const student = this.allStudents.find(s => s.college?.collegeName === this.selectedDashboardCollege && s.college?.logoUrl);
    const path = student?.college?.logoUrl || '';
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return environment.apiUrl + '/api/file/serve?path=' + encodeURIComponent(path);
  }

  get dashboardCollegeOptions(): string[] {
    const set = new Set<string>();
    for (const s of this.allStudents) {
      if (s.college?.collegeName) set.add(s.college.collegeName);
    }
    return Array.from(set).sort();
  }

  // Auto-select first college if none selected
  private ensureCollegeSelected(): void {
    if (!this.selectedDashboardCollege && this.dashboardCollegeOptions.length > 0) {
      this.selectedDashboardCollege = this.dashboardCollegeOptions[0];
    }
  }

  get filteredByCollege(): Student[] {
    this.ensureCollegeSelected();
    let students = this.allStudents;
    if (this.selectedDashboardCollege) {
      students = students.filter(s => s.college?.collegeName === this.selectedDashboardCollege);
    }
    if (this.dashboardStartDate) {
      const start = new Date(this.dashboardStartDate);
      start.setHours(0, 0, 0, 0);
      students = students.filter(s => s.createdAt && new Date(s.createdAt) >= start);
    }
    if (this.dashboardEndDate) {
      const end = new Date(this.dashboardEndDate);
      end.setHours(23, 59, 59, 999);
      students = students.filter(s => s.createdAt && new Date(s.createdAt) <= end);
    }
    return students;
  }

  get dashboardKPIs() {
    const students = this.filteredByCollege;
    const total = students.length;
    const telexCount = students.filter(s => ['TELEX_PAYMENT_DOCS_SUBMITTED', 'TELEX_INITIATED', 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY', 'TELEX_APPLICATION_SUBMITTED_TO_MEA', 'TELEX_NUMBER_ISSUED'].includes(s.applicationStatus)).length;
    const paymentCount = students.filter(s => s.hasPaid).length;
    const paymentTotal = students.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const visaStamped = students.filter(s => s.applicationStatus === 'VISA_STAMPED').length;
    const rejected = students.filter(s => s.applicationStatus === 'REJECTED').length;
    const newApps = students.filter(s => s.applicationStatus === 'REGISTERED').length;
    const admissionLetters = students.filter(s => s.applicationStatus === 'ADMISSION_LETTER_GENERATED').length;
    const underReview = students.filter(s => ['UNDER_REVIEW', 'FORWARDED_TO_UNI'].includes(s.applicationStatus)).length;
    return { total, telexCount, paymentCount, paymentTotal, visaStamped, rejected, newApps, admissionLetters, underReview };
  }

  get collegeStatusBreakdown(): { status: string; label: string; count: number; color: string }[] {
    const students = this.filteredByCollege;
    const statusMap = new Map<string, number>();
    for (const s of students) {
      statusMap.set(s.applicationStatus, (statusMap.get(s.applicationStatus) || 0) + 1);
    }
    return Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, label: this.getStatusLabel(status), count, color: this.getStatusColor(status) }))
      .sort((a, b) => b.count - a.count);
  }

  get intakeBreakdown(): { intake: string; count: number }[] {
    const students = this.filteredByCollege;
    const map = new Map<string, number>();
    for (const s of students) {
      const intake = s.intake || 'Unknown';
      map.set(intake, (map.get(intake) || 0) + 1);
    }
    return Array.from(map.entries()).map(([intake, count]) => ({ intake, count })).sort((a, b) => b.count - a.count);
  }

  get courseBreakdown(): { course: string; count: number }[] {
    const students = this.filteredByCollege;
    const map = new Map<string, number>();
    for (const s of students) {
      const course = s.appliedFor || 'Unknown';
      map.set(course, (map.get(course) || 0) + 1);
    }
    return Array.from(map.entries()).map(([course, count]) => ({ course, count })).sort((a, b) => b.count - a.count);
  }

  get collegePipelineChartData(): ChartData<'doughnut'> {
    const kpi = this.dashboardKPIs;
    const other = kpi.total - kpi.telexCount - kpi.paymentCount - kpi.visaStamped - kpi.rejected;
    return {
      labels: ['Telex', 'Payments', 'Visa Stamped', 'Rejected', 'Other'],
      datasets: [{
        data: [kpi.telexCount, kpi.paymentCount, kpi.visaStamped, kpi.rejected, Math.max(other, 0)],
        backgroundColor: ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#e2e8f0'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    };
  }

  collegePipelineChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: true, position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, font: { size: 11, weight: 'bold' } } }
    }
  };
  collegePipelineChartType: 'doughnut' = 'doughnut';

  get recentActivityTimeline(): { student: string; action: string; time: string; status: string; agent: string; college: string }[] {
    const students = this.filteredByCollege;
    const timeline: { student: string; action: string; time: string; status: string; agent: string; college: string }[] = [];
    for (const s of students) {
      if (s.studentStatusHistory && s.studentStatusHistory.length > 0) {
        for (const h of s.studentStatusHistory.slice(0, 2)) {
          timeline.push({
            student: s.fullName,
            action: h.remarks || this.getStatusLabel(h.studentApplicationStatus || h.newStatus),
            time: h.updatedAt,
            status: h.studentApplicationStatus || h.newStatus,
            agent: s.agent?.fullName || 'N/A',
            college: s.college?.collegeName || 'N/A'
          });
        }
      }
    }
    return timeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);
  }

  get agentPerformance(): { name: string; username: string; total: number; paid: number; telex: number; visa: number; completed: number }[] {
    const students = this.filteredByCollege;
    const agentMap = new Map<string, { name: string; username: string; total: number; paid: number; telex: number; visa: number; completed: number }>();
    for (const s of students) {
      const key = s.agent?.fullName || 'Unknown';
      if (!agentMap.has(key)) agentMap.set(key, { name: key, username: s.agent?.username || s.agent?.userId || '', total: 0, paid: 0, telex: 0, visa: 0, completed: 0 });
      const a = agentMap.get(key)!;
      a.total++;
      if (s.hasPaid) a.paid++;
      const st = s.applicationStatus;
      if (['TELEX_PAYMENT_DOCS_SUBMITTED', 'TELEX_INITIATED', 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY', 'TELEX_APPLICATION_SUBMITTED_TO_MEA', 'TELEX_NUMBER_ISSUED'].includes(st)) a.telex++;
      if (['VISA_FEE_PENDING', 'VISA_FEE_RECEIVED', 'VISA_APPLIED', 'PASSPORT_SUBMITTED_TO_EMBASSY', 'VISA_STAMPED'].includes(st)) a.visa++;
      if (st === 'VISA_STAMPED') a.completed++;
    }
    return Array.from(agentMap.values()).sort((a, b) => b.total - a.total);
  }

  loadStaffLists(): void {
    this.admissionService.getTelexManagerUsernames().subscribe(u => {
      this.availableTelexManagers = u;
      this.cdr.detectChanges();
    });

    // Use the usernames endpoint which includes student counts
    this.admissionService.getVisaManagerUsernames().subscribe(managers => {
      this.availableVisaManagers = managers;
      this.cdr.detectChanges();
    });
  }

  processEnterpriseDashboardMetrics(): void {
    if (!this.managerData?.students) return;

    let pendingPayments = 0;
    let paidPayments = 0;

    let pendingDocs = 0;
    let pendingTelex = 0;
    let todayAdmissions = 0;
    let todayArrivals = 0;
    let awaitingApproval = 0;

    const uniMap = new Map<string, { students: number, admissions: number, arrivals: number }>();
    const todayStr = new Date().toISOString().split('T')[0];

    this.dashboardStudents.forEach(s => {
      // Payments Logic
      const visaReq = s.visaPaymentRequestedAmount || 0;
      const visaRec = s.visaPaymentReceivedAmount || 0;
      const telexReq = s.telexPaymentAmount || 0;
      const telexRec = s.telexPaymentReceivedAmount || 0;

      const totalReqForStudent = visaReq + telexReq;
      const totalRecForStudent = visaRec + telexRec;

      paidPayments += totalRecForStudent;
      pendingPayments += Math.max(0, totalReqForStudent - totalRecForStudent);

      // University Analytics
      if (s.college && s.college.collegeName) {
        const uniName = s.college.collegeName;
        if (!uniMap.has(uniName)) {
          uniMap.set(uniName, { students: 0, admissions: 0, arrivals: 0 });
        }
        const uniStats = uniMap.get(uniName)!;
        uniStats.students++;
        if (s.applicationStatus === 'ADMISSION_LETTER_GENERATED' || s.applicationStatus === 'PENDING_ADMISSION_LETTER' || s.applicationStatus === 'CONDITIONAL_OFFER_LETTER_GENERATED' || s.applicationStatus === 'FORWARDED_TO_UNI') {
          uniStats.admissions++;
        }
        if (s.admissionPlanStatus === 'MARK_ARRIVED') {
          uniStats.arrivals++;
        }
      }

      // Insights Logic
      if (!s.passportPath || !s.markseetPath) pendingDocs++;
      if (s.applicationStatus === 'TELEX_PAYMENT_DOCS_SUBMITTED' || s.applicationStatus === 'TELEX_INITIATED') pendingTelex++;
      if (s.applicationStatus === 'PENDING_ADMISSION_LETTER') awaitingApproval++;

      // Basic date check for today's activities (simplified using createdAt or updated status)
      if (s.createdAt && s.createdAt.startsWith(todayStr)) todayAdmissions++;
      if (s.admissionPlanStatus === 'MARK_ARRIVED') todayArrivals++;
    });

    this.entPaymentStats = {
      pendingPayments: pendingPayments,
      paidPayments: paidPayments,
      totalCollection: paidPayments,
      pendingCollection: pendingPayments,
      completionPercentage: (paidPayments + pendingPayments) > 0 ? Math.round((paidPayments / (paidPayments + pendingPayments)) * 100) : 0
    };

    this.entPaymentChartData.datasets[0].data = [this.entPaymentStats.paidPayments, this.entPaymentStats.pendingPayments];

    this.entUniversityDistribution = Array.from(uniMap.entries()).map(([name, stats]) => ({
      name,
      ...stats
    })).sort((a, b) => b.students - a.students);

    this.entQuickInsights = {
      todayAdmissions,
      todayArrivals,
      pendingDocs,
      pendingTelex,
      awaitingApproval
    };

    this.updateApplicationsTrendChart();

    if (this.chart) {
      this.chart.update();
    }
  }

  updateApplicationsTrendChart(): void {
    if (!this.dashboardStudents || this.dashboardStudents.length === 0) {
      this.applicationsTrendChartData.labels = [];
      this.applicationsTrendChartData.datasets[0].data = [];
      this.applicationsTrendChartData.datasets[1].data = [];
      return;
    }

    const students = [...this.dashboardStudents].filter(s => s.createdAt).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    if (students.length === 0) return;

    const startDate = new Date(students[0].createdAt!);
    const endDate = new Date(students[students.length - 1].createdAt!);
    
    let buckets = 5;
    const timeSpan = endDate.getTime() - startDate.getTime();
    let bucketSize = timeSpan > 0 ? timeSpan / (buckets - 1) : 86400000;

    const labels: string[] = [];
    const appsData: number[] = new Array(buckets).fill(0);
    const admitsData: number[] = new Array(buckets).fill(0);

    for (let i = 0; i < buckets; i++) {
      const bucketDate = new Date(startDate.getTime() + i * bucketSize);
      labels.push(bucketDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
    }

    if (timeSpan === 0) {
      buckets = 1;
      labels.length = 1;
      appsData.length = 1;
      admitsData.length = 1;
      bucketSize = 1;
    }

    const admissionStatuses = [
      'CONDITIONAL_OFFER_LETTER_GENERATED', 'PENDING_ADMISSION_LETTER', 'ADMISSION_LETTER_GENERATED', 'FORWARDED_TO_UNI'
    ];

    students.forEach(s => {
       const t = new Date(s.createdAt!).getTime();
       let bucketIndex = timeSpan > 0 ? Math.round((t - startDate.getTime()) / bucketSize) : 0;
       if (bucketIndex >= buckets) bucketIndex = buckets - 1;
       if (bucketIndex < 0) bucketIndex = 0;
       
       appsData[bucketIndex]++;
       
       if (admissionStatuses.includes(s.applicationStatus) || 
           s.applicationStatus.includes('TELEX') || 
           s.applicationStatus.includes('VISA') || 
           s.applicationStatus === 'DOCS_VARIFICATION_COMPLETE' || 
           s.admissionPlanStatus === 'MARK_ARRIVED') {
         admitsData[bucketIndex]++;
       }
    });

    for (let i = 1; i < buckets; i++) {
       appsData[i] += appsData[i-1];
       admitsData[i] += admitsData[i-1];
    }

    this.applicationsTrendChartData = {
      labels: labels,
      datasets: [
        { ...this.applicationsTrendChartData.datasets[0], data: appsData },
        { ...this.applicationsTrendChartData.datasets[1], data: admitsData }
      ]
    };
  }

  categorizeStudents(): void {
    if (!this.managerData || !this.managerData.colleges) {
      return;
    }

    // Use a Map to ensure unique students by ID
    const studentMap = new Map<number, Student>();

    // 1. Add top-level students if available
    if (this.managerData.students) {
      this.managerData.students.forEach(s => studentMap.set(s.id, s));
    }

    // 2. Add nested students from colleges -> universityPerson -> students
    if (this.managerData.colleges) {
      for (const college of this.managerData.colleges) {
        if (college.universityPerson && college.universityPerson.students) {
          college.universityPerson.students.forEach(s => studentMap.set(s.id, s));
        }
      }
    }

    this.allStudents = Array.from(studentMap.values());

    // Apply timeframe filter for dashboard widgets only
    let dashboardStuds = [...this.allStudents];
    if (this.selectedTimeframe && this.selectedTimeframe !== 'ALL') {
      const now = new Date();
      let startDate = new Date(0);
      if (this.selectedTimeframe === 'TODAY') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (this.selectedTimeframe === 'LAST_7_DAYS') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      } else if (this.selectedTimeframe === 'THIS_MONTH') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (this.selectedTimeframe === 'YTD') {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      dashboardStuds = dashboardStuds.filter(s => {
        if (!s.createdAt) return false;
        return new Date(s.createdAt) >= startDate;
      });
    }

    this.dashboardStudents = dashboardStuds;
    this.calculateTrends();

    console.log('Total aggregated students:', this.allStudents.length);
    console.log('Dashboard students (filtered):', this.dashboardStudents.length);

    this.actionRequiredStudents = this.allStudents.filter(s => s.actionOnUser === 'admission_manager');
    this.pendingUniversityStudents = this.allStudents.filter(s => s.actionOnUser === 'UniversityCoordinator');
    this.processingStudents = this.allStudents.filter(s =>
      s.actionOnUser !== 'admission_manager' &&
      s.actionOnUser !== 'UniversityCoordinator' &&
      s.actionOnUser !== null
    );

    this.travelStudents = this.allStudents.filter(s => (s.travelDoj || s.travelAirlines) && !s.hasRaiseReturnRequest);
    this.docReturnStudents = this.allStudents.filter(s => !!s.hasRaiseReturnRequest);

    // Build Travel Heatmap & Timeline Data
    this.buildTravelHeatmapAndTimeline();

    // Build unique filter options
    const agentMap = new Map<string, { fullName: string; username: string }>();
    const collegeSet = new Set<string>();
    const statusSet = new Set<string>();
    for (const s of this.allStudents) {
      if (s.agent?.fullName) {
        agentMap.set(s.agent.fullName, { fullName: s.agent.fullName, username: s.agent.username || s.agent.userId || '' });
      }
      if (s.college?.collegeName) collegeSet.add(s.college.collegeName);
      if (s.applicationStatus) statusSet.add(s.applicationStatus);
    }
    this.uniqueAgents = Array.from(agentMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
    this.uniqueColleges = Array.from(collegeSet).sort();
    this.uniqueStatuses = Array.from(statusSet).sort();
  }

  switchView(view: typeof this.activeView): void {
    this.activeView = view;
    if (view === 'actions-required' || view === 'forward-uni' || view === 'approve-admission' || view === 'assign-telex' || view === 'assign-visa' || view === 'pending-university' || view === 'processing' || view === 'completed' || view === 'travelling') {
      this.searchTerm = '';
      this.filterAgent = '';
      this.filterCollege = '';
      this.filterStatus = '';
    }

    if (view === 'messages') {
      this.isLoadingMessages = true;
      this.cdr.detectChanges();
      // Simulate loading delay for smooth transition
      setTimeout(() => {
        this.isLoadingMessages = false;
        this.cdr.detectChanges();
      }, 800);
    } else if (view === 'tasks') {
      this.loadDocRequests();
      this.loadTasksDashboard();
    } else if (view === 'requested-docs') {
      this.loadDocRequests();
    } else if (view === 'dashboard') {
      const username = sessionStorage.getItem('userId');
      if (username) this.loadDashboardStats(username);
    } else if (view === 'news') {
      this.loadMyNews();
    } else if (view === 'sessions') {
      this.loadSessions();
    } else {
      this.filterStudents();
    }
    this.cdr.detectChanges();
  }

  // --- Session Management Methods ---
  loadSessions(): void {
    this.isLoadingSessions = true;
    this.cdr.detectChanges();
    this.http.get<SessionDTO[]>(this.SESSION_API_URL).subscribe({
      next: (data) => {
        this.sessionList = data;
        this.isLoadingSessions = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading sessions', err);
        this.isLoadingSessions = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreateSessionModal(): void {
    this.isEditingSession = false;
    this.currentSessionId = null;
    this.sessionForm = { sessionName: '', academicYear: '', status: 'ACTIVE' };
    this.showSessionModal = true;
    this.cdr.detectChanges();
  }

  openEditSessionModal(session: SessionDTO): void {
    this.isEditingSession = true;
    this.currentSessionId = session.id!;
    this.sessionForm = {
      sessionName: session.sessionName,
      academicYear: session.academicYear,
      status: session.status
    };
    this.showSessionModal = true;
    this.cdr.detectChanges();
  }

  closeSessionModal(): void {
    this.showSessionModal = false;
    this.cdr.detectChanges();
  }

  saveSession(): void {
    if (!this.sessionForm.sessionName || !this.sessionForm.academicYear) {
      alert('Please fill all required fields');
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    if (this.isEditingSession && this.currentSessionId) {
      this.http.put(`${this.SESSION_API_URL}/${this.currentSessionId}`, this.sessionForm).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeSessionModal();
          this.loadSessions();
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.http.post(this.SESSION_API_URL, this.sessionForm).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeSessionModal();
          this.loadSessions();
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  toggleSessionStatus(session: SessionDTO): void {
    const newStatus = session.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.http.put(`${this.SESSION_API_URL}/${session.id}`, { ...session, status: newStatus }).subscribe({
      next: () => this.loadSessions(),
      error: (err) => console.error(err)
    });
  }

  getActiveSessionCount(): number {
    return this.sessionList.filter(s => s.status === 'ACTIVE').length;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.cdr.detectChanges();
  }

  isAdmissionLetterCompleted(status: string | null | undefined): boolean {
    if (!status) return false;
    const postAdmissionStatuses = [
      'ADMISSION_LETTER_GENERATED', 'TELEX_PAYMENT_DOCS_SUBMITTED', 'TELEX_INITIATED',
      'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY', 'TELEX_APPLICATION_SUBMITTED_TO_MEA',
      'TELEX_NUMBER_ISSUED', 'DOCS_VARIFICATION_COMPLETE', 'VISA_FEE_PENDING',
      'VISA_FEE_RECEIVED', 'VISA_APPLIED', 'PASSPORT_SUBMITTED_TO_EMBASSY',
      'VISA_STAMPED', 'TRAVELLING', 'COMPLETED'
    ];
    return postAdmissionStatuses.includes(status);
  }

  isTelexCompleted(status: string | null | undefined): boolean {
    if (!status) return false;
    const postTelexStatuses = [
      'TELEX_NUMBER_ISSUED', 'VISA_FEE_PENDING',
      'VISA_FEE_RECEIVED', 'VISA_APPLIED', 'PASSPORT_SUBMITTED_TO_EMBASSY',
      'VISA_STAMPED', 'TRAVELLING', 'COMPLETED'
    ];
    return postTelexStatuses.includes(status);
  }

  isVisaCompleted(status: string | null | undefined): boolean {
    if (!status) return false;
    const postVisaStatuses = [
      'VISA_STAMPED', 'TRAVELLING', 'COMPLETED'
    ];
    return postVisaStatuses.includes(status);
  }

  filterStudents(): void {
    let sourceList: Student[] = [];
    switch (this.activeView) {
      case 'actions-required': sourceList = this.actionRequiredStudents; break;
      case 'forward-uni':
        sourceList = this.allStudents.filter(s =>
          s.action === 'FORWARD_TO_UNI' ||
          s.action === 'UPLOAD_ADMISSION_LETTER' ||
          s.action === 'APPROVE_ADMISSION_LETTER' ||
          this.isAdmissionLetterCompleted(s.applicationStatus)
        ).sort((a, b) => {
          const aIsPending = a.action === 'FORWARD_TO_UNI' || a.action === 'APPROVE_ADMISSION_LETTER' || a.action === 'UPLOAD_ADMISSION_LETTER';
          const bIsPending = b.action === 'FORWARD_TO_UNI' || b.action === 'APPROVE_ADMISSION_LETTER' || b.action === 'UPLOAD_ADMISSION_LETTER';
          if (aIsPending && !bIsPending) return -1;
          if (!aIsPending && bIsPending) return 1;
          return 0;
        });
        this.pipelineCompletedCount = sourceList.filter(s => this.isAdmissionLetterCompleted(s.applicationStatus)).length;
        this.pipelineWaitingUniCount = sourceList.filter(s => s.action === 'UPLOAD_ADMISSION_LETTER').length;
        this.pipelinePendingOnYouCount = sourceList.filter(s => s.action === 'FORWARD_TO_UNI' || s.action === 'APPROVE_ADMISSION_LETTER').length;
        break;
      case 'approve-admission': sourceList = this.actionRequiredStudents.filter(s => s.action === 'APPROVE_ADMISSION_LETTER'); break;
      case 'assign-telex':
        sourceList = this.allStudents.filter(s =>
          s.action === 'ASSIGN_TELEX_MAN' ||
          s.applicationStatus === 'TELEX_INITIATED' ||
          s.applicationStatus === 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY' ||
          s.applicationStatus === 'TELEX_APPLICATION_SUBMITTED_TO_MEA' ||
          this.isTelexCompleted(s.applicationStatus) ||
          (s.telexNumber && s.telexNumber.trim() !== '')
        ).sort((a, b) => {
          if (a.action === 'ASSIGN_TELEX_MAN' && b.action !== 'ASSIGN_TELEX_MAN') return -1;
          if (a.action !== 'ASSIGN_TELEX_MAN' && b.action === 'ASSIGN_TELEX_MAN') return 1;
          return 0;
        });
        this.telexPipelinePendingAssignCount = sourceList.filter(s => s.action === 'ASSIGN_TELEX_MAN').length;
        this.telexPipelineInProgressCount = sourceList.filter(s => s.applicationStatus === 'TELEX_INITIATED' || s.applicationStatus === 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY' || s.applicationStatus === 'TELEX_APPLICATION_SUBMITTED_TO_MEA').length;
        this.telexPipelineCompletedCount = sourceList.filter(s => this.isTelexCompleted(s.applicationStatus) || (s.telexNumber && s.telexNumber.trim() !== '')).length;
        break;
      case 'assign-visa':
        sourceList = this.allStudents.filter(s =>
          s.action === 'ASSIGN_TO_VISA_MAN' ||
          s.applicationStatus === 'VISA_FEE_PENDING' ||
          s.applicationStatus === 'VISA_FEE_RECEIVED' ||
          s.applicationStatus === 'VISA_APPLIED' ||
          s.applicationStatus === 'PASSPORT_SUBMITTED_TO_EMBASSY' ||
          this.isVisaCompleted(s.applicationStatus) ||
          (s.visaNumber && s.visaNumber.trim() !== '')
        ).sort((a, b) => {
          if (a.action === 'ASSIGN_TO_VISA_MAN' && b.action !== 'ASSIGN_TO_VISA_MAN') return -1;
          if (a.action !== 'ASSIGN_TO_VISA_MAN' && b.action === 'ASSIGN_TO_VISA_MAN') return 1;
          return 0;
        });
        this.visaPipelinePendingAssignCount = sourceList.filter(s => s.action === 'ASSIGN_TO_VISA_MAN').length;
        this.visaPipelineInProgressCount = sourceList.filter(s =>
          s.applicationStatus === 'VISA_FEE_PENDING' ||
          s.applicationStatus === 'VISA_FEE_RECEIVED' ||
          s.applicationStatus === 'VISA_APPLIED' ||
          s.applicationStatus === 'PASSPORT_SUBMITTED_TO_EMBASSY'
        ).length;
        this.visaPipelineCompletedCount = sourceList.filter(s => this.isVisaCompleted(s.applicationStatus) || (s.visaNumber && s.visaNumber.trim() !== '')).length;
        break;
      case 'pending-university': sourceList = this.pendingUniversityStudents; break;
      case 'processing': sourceList = this.processingStudents; break;
      case 'completed': sourceList = this.allStudents; break;
      case 'travelling': sourceList = this.allStudents.filter(s => s.travelDoj || s.travelAirlines || s.hasRaiseReturnRequest); break;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredList = sourceList.filter(student => {
      // Text search
      if (term && !(
        student.fullName?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.passportNo?.toLowerCase().includes(term)
      )) return false;

      // Agent filter
      if (this.filterAgent && student.agent?.fullName !== this.filterAgent) return false;

      // College filter
      if (this.filterCollege && student.college?.collegeName !== this.filterCollege) return false;

      // Status filter
      if (this.filterStatus && student.applicationStatus !== this.filterStatus) return false;

      // Date range filter (createdAt)
      if (!this.isInDateRange(student.createdAt, this.filterStartDate, this.filterEndDate)) return false;

      return true;
    });
    this.currentPage = 1;
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.filterAgent = '';
    this.filterCollege = '';
    this.filterStatus = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterStudents();
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterAgent || this.filterCollege || this.filterStatus || this.filterStartDate || this.filterEndDate);
  }

  // Shared helper for createdAt date range check
  private isInDateRange(createdAt: string, start: string, end: string): boolean {
    if (!start && !end) return true;
    if (!createdAt) return false;
    const d = new Date(createdAt);
    if (start && d < new Date(start)) return false;
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      if (d > endDate) return false;
    }
    return true;
  }

  // --- Reports ---
  filterReportStudents(): void {
    this.reportList = this.allStudents.filter(s => {
      if (this.reportFilterAgent && s.agent?.fullName !== this.reportFilterAgent) return false;
      if (this.reportFilterCollege && s.college?.collegeName !== this.reportFilterCollege) return false;
      if (this.reportFilterStatus && s.applicationStatus !== this.reportFilterStatus) return false;
      if (!this.isInDateRange(s.createdAt, this.reportFilterStartDate, this.reportFilterEndDate)) return false;
      return true;
    });
  }

  buildTravelHeatmapAndTimeline() {
    this.todayTravelers = [];
    this.tomorrowTravelers = [];
    this.next7DaysTravelers = [];
    this.past7DaysTravelers = [];
    this.heatmapDays = [];

    const now = new Date();
    // Reset to start of day for accurate comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Gather traveling students for the currently active tab
    const allTravelers = this.travelTab === 'travel' ? this.travelStudents : this.docReturnStudents;

    // Build Heatmap for the CURRENT month
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    this.heatmapMonthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Initialize heatmap array with 0 counts
    for (let i = 1; i <= daysInMonth; i++) {
      const monthStr = (today.getMonth() + 1).toString().padStart(2, '0');
      const dayStr = i.toString().padStart(2, '0');
      const dateString = `${today.getFullYear()}-${monthStr}-${dayStr}`;
      this.heatmapDays.push({ date: i, fullDate: dateString, count: 0 });
    }

    // Process travelers
    allTravelers.forEach(s => {
      const dateStr = s.travelDoj || s.documentReturnRequest?.travelDate;
      if (!dateStr) return;

      const travelDate = new Date(dateStr);
      // Ensure we compare midnight to midnight
      const tDateMidnight = new Date(travelDate.getFullYear(), travelDate.getMonth(), travelDate.getDate());

      // Heatmap increment (only if it's the current month and year)
      if (tDateMidnight.getMonth() === today.getMonth() && tDateMidnight.getFullYear() === today.getFullYear()) {
        const dayOfMonth = tDateMidnight.getDate();
        if (dayOfMonth >= 1 && dayOfMonth <= daysInMonth) {
          this.heatmapDays[dayOfMonth - 1].count++;
        }
      }

      // Timeline categorization
      const diffTime = tDateMidnight.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 0) {
        this.todayTravelers.push(s);
      } else if (diffDays === 1) {
        this.tomorrowTravelers.push(s);
      } else if (diffDays > 1 && diffDays <= 7) {
        this.next7DaysTravelers.push(s);
      } else if (diffDays < 0 && diffDays >= -7) {
        this.past7DaysTravelers.push(s);
      }
    });

    // Sort the timeline lists by date
    const sortByDate = (a: Student, b: Student) => {
      const dA = new Date(a.travelDoj || a.documentReturnRequest?.travelDate || 0).getTime();
      const dB = new Date(b.travelDoj || b.documentReturnRequest?.travelDate || 0).getTime();
      return dA - dB;
    };

    this.todayTravelers.sort(sortByDate);
    this.tomorrowTravelers.sort(sortByDate);
    this.next7DaysTravelers.sort(sortByDate);
    this.past7DaysTravelers.sort((a, b) => {
      // Past 7 days sorted descending (most recent first)
      const dA = new Date(a.travelDoj || a.documentReturnRequest?.travelDate || 0).getTime();
      const dB = new Date(b.travelDoj || b.documentReturnRequest?.travelDate || 0).getTime();
      return dB - dA;
    });
  }

  recentActivity: any[] = [];

  loadRecentActivity(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/managers/recent-activity`).subscribe({
      next: (data) => {
        this.recentActivity = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load recent activity', err);
      }
    });
  }
  clearReportFilters(): void {
    this.reportFilterAgent = '';
    this.reportFilterCollege = '';
    this.reportFilterStatus = '';
    this.reportFilterStartDate = '';
    this.reportFilterEndDate = '';
    this.reportList = [];
  }

  get hasReportFilters(): boolean {
    return !!(this.reportFilterAgent || this.reportFilterCollege || this.reportFilterStatus || this.reportFilterStartDate || this.reportFilterEndDate);
  }

  openExportModal(): void {
    if (this.reportList.length === 0) return;
    this.showExportModal = true;
    this.cdr.detectChanges();
  }

  closeExportModal(): void {
    this.showExportModal = false;
    this.cdr.detectChanges();
  }

  exportToExcel(): void {
    if (this.reportList.length === 0) return;

    const selectedKeys = this.exportColumns.filter(c => c.selected).map(c => c.key);
    if (selectedKeys.length === 0) {
      alert('Please select at least one column to export.');
      return;
    }

    const data = this.reportList.map(s => {
      const allCols: any = {
        'Student Name': s.fullName || '',
        'Email': s.email || '',
        'Contact': s.contactNo || '',
        'Agent': s.agent?.fullName || 'Direct',
        'Agent Username': s.agent?.username || s.agent?.userId || '',
        'College': s.college?.collegeName || 'Not Assigned',
        'Intake': s.intake || '',
        'Applied For': s.appliedFor || '',
        'Status': this.getStatusLabel(s.applicationStatus),
        'Passport No': s.passportNo || '',
        'DOB': s.dob || '',
        'Address': s.address || '',
        'Father': s.fathersName || '',
        'Mother': s.mothersName || ''
      };
      const filteredRow: any = {};
      selectedKeys.forEach(k => {
        filteredRow[k] = allCols[k];
      });
      return filteredRow;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Report');

    const colWidths = selectedKeys.map(key => ({
      wch: Math.max(key.length, ...data.map(row => String((row as any)[key] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;

    const fileName = `Student_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    this.closeExportModal();
  }

  // --- Payments ---
  paymentSearchQuery = '';
  paymentFilterAgent = '';
  paymentFilterCollege = '';
  paymentFilterStatus = '';
  paymentFilterAccount = '';
  paymentFilterStartDate = '';
  paymentFilterEndDate = '';

  clearPaymentFilters(): void {
    this.paymentSearchQuery = '';
    this.paymentFilterAgent = '';
    this.paymentFilterCollege = '';
    this.paymentFilterStatus = '';
    this.paymentFilterAccount = '';
    this.paymentFilterStartDate = '';
    this.paymentFilterEndDate = '';
  }

  get hasPaymentFilters(): boolean {
    return !!(this.paymentSearchQuery || this.paymentFilterAgent || this.paymentFilterCollege || this.paymentFilterStatus || this.paymentFilterAccount || this.paymentFilterStartDate || this.paymentFilterEndDate);
  }

  getStudentsWithPayments(): Student[] {
    return this.allStudents.filter(s => {
      const hasPaymentData = s.hasPaid === true ||
        (s.paidAmount && s.paidAmount > 0) ||
        s.paidTo ||
        s.paymentDueDate ||
        s.ttCopyPath ||
        s.paymentConfirmationPath;

      if (!hasPaymentData) return false;

      if (this.paymentSearchQuery) {
        const query = this.paymentSearchQuery.toLowerCase();
        const matchesName = s.fullName?.toLowerCase().includes(query);
        const matchesEmail = s.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      if (this.paymentFilterAgent && s.agent?.fullName !== this.paymentFilterAgent) return false;
      if (this.paymentFilterCollege && s.college?.collegeName !== this.paymentFilterCollege) return false;
      if (this.paymentFilterStatus && s.applicationStatus !== this.paymentFilterStatus) return false;
      if (this.paymentFilterAccount && s.paidTo !== this.paymentFilterAccount) return false;
      if (!this.isInDateRange(s.createdAt, this.paymentFilterStartDate, this.paymentFilterEndDate)) return false;

      return true;
    }).sort((a, b) => b.id - a.id); // Newest first
  }

  getPaymentStats() {
    const students = this.getStudentsWithPayments();
    return {
      totalRecords: students.length,
      paidAmount: students.reduce((sum, s) => sum + (s.paidAmount || 0), 0),
      pendingCount: students.filter(s => !s.hasPaid).length,
      paidCount: students.filter(s => s.hasPaid).length
    };
  }

  // --- Action Handling (Fixing the Modal Bug) ---

  initiateForwardToUniversity(student: Student): void {
    // First validate if college has active coordinator
    if (!student.college || !student.college.id) {
      this.coordinatorValidationError = 'Student is not assigned to any college. Please assign a college first.';
      this.showCoordinatorValidationModal = true;
      this.cdr.detectChanges();
      return;
    }

    this.isValidatingCoordinator = true;
    this.cdr.detectChanges();

    // Check coordinator validation
    this.admissionService.validateCoordinatorBeforeForward(student.college.id)
      .pipe(
        finalize(() => {
          this.isValidatingCoordinator = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (validation) => {
          if (validation.canForward) {
            // Validation passed, proceed with forward action
            this.studentForAction = student;
            this.actionType = 'forward';
            this.showActionModal = true;
            this.cdr.detectChanges();
          } else {
            // Validation failed, show error modal
            this.coordinatorValidationError = validation.message;
            this.showCoordinatorValidationModal = true;
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('Coordinator validation error:', err);
          this.coordinatorValidationError = 'Unable to verify university coordinator status. Please try again or contact administrator.';
          this.showCoordinatorValidationModal = true;
          this.cdr.detectChanges();
        }
      });
  }

  initiateApproveLetter(student: Student): void {
    this.studentForAction = student;
    this.actionType = 'approve';
    this.showActionModal = true;
    this.cdr.detectChanges();
  }

  initiateRejectStudent(student: Student): void {
    this.studentForAction = student;
    this.actionType = 'reject';
    this.rejectionReason = '';
    this.showActionModal = true;
    this.cdr.detectChanges();
  }

  initiateAssignManager(student: Student, type: 'telex' | 'visa'): void {
    this.studentForAction = student;
    this.actionType = type === 'telex' ? 'assign-telex' : 'assign-visa';
    this.selectedManagerUsername = '';
    this.showActionModal = true;
    this.cdr.detectChanges();
  }

  confirmAction(): void {
    if (!this.studentForAction || !this.managerData) return;
    const studentId = this.studentForAction.id;
    const managerUsername = this.managerData.username;

    if ((this.actionType === 'assign-telex' || this.actionType === 'assign-visa') && !this.selectedManagerUsername) {
      alert('Please select a manager from the list.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges(); // Update UI to show spinner on button

    let actionObs;
    if (this.actionType === 'forward') {
      actionObs = this.admissionService.forwardToUniversity(studentId, { admissionManagerUsername: managerUsername });
    } else if (this.actionType === 'approve') {
      actionObs = this.admissionService.approveAdmissionLetter(studentId, { admissionManagerUsername: managerUsername });
    } else if (this.actionType === 'assign-telex') {
      actionObs = this.admissionService.assignTelexManager(studentId, { managerUsername: this.selectedManagerUsername });
    } else if (this.actionType === 'assign-visa') {
      // New payload structure: admissionManagerUsername (current logged in) + visaPersonUsername (selected)
      const payload = {
        admissionManagerUsername: managerUsername,
        visaPersonUsername: this.selectedManagerUsername
      };
      console.log('Assigning Visa Manager - StudentId:', studentId, 'Payload:', payload);
      this.cdr.detectChanges();
      actionObs = this.admissionService.assignVisaManager(studentId, payload);
    } else if (this.actionType === 'reject') {
      if (!this.rejectionReason || this.rejectionReason.trim() === '') {
        alert('Please provide a reason for rejection.');
        this.isSubmitting = false;
        this.cdr.detectChanges();
        return;
      }
      actionObs = this.admissionService.rejectStudent(studentId, { admissionManagerUsername: managerUsername, reason: this.rejectionReason });
    }

    if (actionObs) {
      actionObs.pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: () => {
          let msg = 'Action completed successfully.';
          if (this.actionType === 'forward') msg = 'Student Forwarded Successfully!';
          if (this.actionType === 'approve') msg = 'Admission Letter Approved!';
          if (this.actionType === 'assign-telex') msg = 'Telex Manager Assigned!';
          if (this.actionType === 'assign-visa') msg = 'Visa Manager Assigned Successfully!';
          if (this.actionType === 'reject') msg = 'Student Rejected Successfully!';

          // Fix: Ensure this runs inside Angular's zone and updates the view
          this.finishAction(msg);
        },
        error: (err: any) => this.handleError(err)
      });
    }
  }

  finishAction(message: string): void {
    this.showActionModal = false;
    this.cdr.detectChanges();

    // Use setTimeout to ensure action modal is fully closed before showing success modal
    setTimeout(() => {
      this.successModalMessage = message;
      this.showSuccessModal = true;
      this.cdr.detectChanges();

      // Refresh data in background
      this.refreshData();
    }, 100);
  }

  handleError(err: any): void {
    console.error(err);
    alert('Action failed. Please check console.');
    this.cdr.detectChanges();
  }

  // --- UI Helpers ---

  closeActionModal(): void {
    this.showActionModal = false;
    this.studentForAction = null;
    this.actionType = null;
    this.cdr.detectChanges();
  }

  closeCoordinatorValidationModal(): void {
    this.showCoordinatorValidationModal = false;
    this.coordinatorValidationError = '';
    this.cdr.detectChanges();
  }

  onRecentStudentClick(studentId: number): void {
    const fullStudent = this.allStudents.find(s => s.id === studentId);
    if (fullStudent) {
      this.selectStudent(fullStudent);
    } else {
      console.warn('Student details not found in loaded list for ID:', studentId);
      // Optional: Fetch individual student details if not in the list
    }
  }

  selectStudent(student: Student): void {
    this.selectedStudent = student;
    this.showStudentDetail = true;
    this.cdr.detectChanges();
  }

  closeStudentDetail(): void {
    this.showStudentDetail = false;
    this.isEditingStudent = false;
    setTimeout(() => { this.selectedStudent = null; }, 200);
    this.cdr.detectChanges();
  }

  toggleEditMode(): void {
    this.isEditingStudent = !this.isEditingStudent;
    if (this.isEditingStudent && this.selectedStudent) {
      this.editStudentData = { ...this.selectedStudent };
    }
    this.cdr.detectChanges();
  }

  onFileSelect(event: any, type: string): void {
    if (event.target.files.length > 0) {
      this.editDocuments[type] = event.target.files[0];
    }
  }

  submitStudentUpdate(): void {
    if (!this.selectedStudent) return;
    this.isSubmitting = true;
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('student', JSON.stringify(this.editStudentData));
    if (this.editDocuments.passport) formData.append('passportFile', this.editDocuments.passport);
    if (this.editDocuments.adhaar) formData.append('adhaarFile', this.editDocuments.adhaar);
    if (this.editDocuments.class12thMarksheet) formData.append('marksheetFile', this.editDocuments.class12thMarksheet);
    if (this.editDocuments.photograph) formData.append('profileImage', this.editDocuments.photograph);
    if (this.editDocuments.neetMarksheet) formData.append('neetMarksheetFile', this.editDocuments.neetMarksheet);

    this.http.put(`${environment.apiUrl}/students/update/${this.selectedStudent.id}`, formData).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.isEditingStudent = false;
        this.closeStudentDetail();
        this.refreshData();
        // Option to show success modal instead of alert if wanted
        this.successModalMessage = 'Student details updated successfully.';
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting = false;
        alert('Failed to update student.');
        this.cdr.detectChanges();
      }
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.cdr.detectChanges();
  }

  isLoggingOut = false;

  toggleFullscreen(): void {
    const elem = document.documentElement;

    if (!this.isFullscreen) {
      // Enter fullscreen
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
      this.isFullscreen = true;
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      this.isFullscreen = false;
    }
    this.cdr.detectChanges();
  }

  openLogoutModal(): void {
    this.isLogoutModalOpen = true;
    this.cdr.detectChanges();
  }

  cancelLogout(): void {
    this.isLogoutModalOpen = false;
    this.cdr.detectChanges();
  }

  confirmLogout(): void {
    this.isLogoutModalOpen = false;
    this.currentLogoutMessage = this.getRandomLogoutMessage();
    this.isLoggingOut = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      sessionStorage.clear();
      this.router.navigate(['/AdminLogin']);
    }, 2900);
  }

  logout(): void {
    this.openLogoutModal();
  }

  getRandomLogoutMessage(): string {
    const randomIndex = Math.floor(Math.random() * this.logoutMessages.length);
    return this.logoutMessages[randomIndex];
  }

  getDocUrl(path: string | null): string {
    return this.fileService.getFileUrl(path);
  }

  getStatusLabel(status: string | null): string {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getStatusClass(status: string | null): string {
    if (!status) return 'status-default';

    // Map statuses to color classes
    const statusMap: { [key: string]: string } = {
      'REGISTERED': 'status-info',
      'UNDER_REVIEW': 'status-warning',
      'APPROVED': 'status-success',
      'REJECTED': 'status-danger',
      'CONDITIONAL_OFFER_LETTER_GENERATED': 'status-info',
      'PENDING_ADMISSION_LETTER': 'status-warning',
      'ADMISSION_LETTER_GENERATED': 'status-success',
      'FORWARDED_TO_UNI': 'status-info',
      'TELEX_PAYMENT_DOCS_SUBMITTED': 'status-info',
      'TELEX_INITIATED': 'status-info',
      'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY': 'status-info',
      'TELEX_APPLICATION_SUBMITTED_TO_MEA': 'status-info',
      'TELEX_NUMBER_ISSUED': 'status-success',
      'DOCS_VARIFICATION_COMPLETE': 'status-success',
      'VISA_FEE_PENDING': 'status-warning',
      'VISA_FEE_RECEIVED': 'status-success',
      'VISA_APPLIED': 'status-info',
      'PASSPORT_SUBMITTED_TO_EMBASSY': 'status-info',
      'VISA_STAMPED': 'status-success'
    };

    return statusMap[status] || 'status-default';
  }

  getAvatarColor(name: string): string {
    if (!name) return this.avatarColors[0];
    return this.avatarColors[name.charCodeAt(0) % this.avatarColors.length];
  }

  getStatusColor(status: string): string {
    if (!status) return '#94a3b8';
    if (status.includes('REJECTED')) return '#ef4444';
    if (status.includes('APPROVED') || status.includes('STAMPED') || status.includes('GENERATED') || status.includes('ISSUED') || status.includes('RECEIVED') || status.includes('COMPLETE')) return '#10b981';
    if (status.includes('PENDING') || status.includes('UNDER_REVIEW')) return '#f59e0b';
    if (status.includes('TELEX') || status.includes('FORWARDED') || status.includes('SUBMITTED') || status.includes('APPLIED') || status.includes('INITIATED')) return '#3b82f6';
    return '#64748b';
  }

  // --- News Management Methods ---

  loadMyNews(): void {
    const username = sessionStorage.getItem('userId');
    if (!username) return;

    this.isLoadingNews = true;
    this.cdr.detectChanges();

    this.http.get<NewsDTO[]>(`${this.NEWS_API_URL}/by-user/${username}`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingNews = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (news) => {
          this.newsList = news.sort((a, b) => {
            // Sort by createdAt descending (newest first)
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading news:', err);
          this.newsList = [];
        }
      });
  }

  openCreateNewsModal(): void {
    this.isEditingNews = false;
    this.currentNewsId = null;
    this.resetNewsForm();
    this.showNewsModal = true;
    this.cdr.detectChanges();
  }

  openEditNewsModal(news: NewsDTO): void {
    this.isEditingNews = true;
    this.currentNewsId = news.id || null;
    this.newsForm = {
      heading: news.heading,
      content: news.content,
      tag: news.tag,
      forUser: news.forUser,
      activeFrom: news.activeFrom,
      tillDate: news.tillDate
    };
    this.showNewsModal = true;
    this.cdr.detectChanges();
  }

  saveNews(): void {
    const username = sessionStorage.getItem('userId');
    if (!username) return;

    // Validate form
    if (!this.newsForm.heading || !this.newsForm.content || !this.newsForm.forUser ||
      !this.newsForm.activeFrom || !this.newsForm.tillDate) {
      alert('Please fill in all required fields.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const payload: NewsDTO = {
      heading: this.newsForm.heading,
      content: this.newsForm.content,
      tag: this.newsForm.tag || 'general',
      forUser: this.newsForm.forUser,
      activeFrom: this.newsForm.activeFrom,
      tillDate: this.newsForm.tillDate,
      username: username
    };

    let request$;
    if (this.isEditingNews && this.currentNewsId) {
      request$ = this.http.put<NewsDTO>(`${this.NEWS_API_URL}/${this.currentNewsId}`, payload);
    } else {
      request$ = this.http.post<NewsDTO>(this.NEWS_API_URL, payload);
    }

    request$.pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.closeNewsModal();
        this.loadMyNews();
        this.newsSuccessMessage = this.isEditingNews ? 'Your news has been updated successfully!' : 'Your news has been published successfully!';
        this.showNewsSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error saving news:', err);
        alert('Failed to save news. Please try again.');
      }
    });
  }

  openDeleteConfirmModal(id: number): void {
    this.deleteNewsId = id;
    this.showDeleteConfirmModal = true;
    this.cdr.detectChanges();
  }

  cancelDeleteNews(): void {
    this.showDeleteConfirmModal = false;
    this.deleteNewsId = null;
    this.cdr.detectChanges();
  }

  confirmDeleteNews(): void {
    if (!this.deleteNewsId) return;

    this.showDeleteConfirmModal = false;

    this.http.delete<any>(`${this.NEWS_API_URL}/${this.deleteNewsId}`)
      .subscribe({
        next: () => {
          this.deleteNewsId = null;
          this.loadMyNews();
          this.newsSuccessMessage = 'News has been deleted successfully!';
          this.showNewsSuccessModal = true;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error deleting news:', err);
          this.deleteNewsId = null;
          alert('Failed to delete news. Please try again.');
        }
      });
  }

  closeNewsModal(): void {
    this.showNewsModal = false;
    this.resetNewsForm();
    this.cdr.detectChanges();
  }

  closeNewsSuccessModal(): void {
    this.showNewsSuccessModal = false;
    this.newsSuccessMessage = '';
    this.cdr.detectChanges();
  }

  resetNewsForm(): void {
    this.newsForm = {
      heading: '',
      content: '',
      tag: '',
      forUser: '',
      activeFrom: '',
      tillDate: ''
    };
  }

  getForUserLabel(forUser: string): string {
    const option = this.userTypeOptions.find(o => o.value === forUser);
    return option ? option.label : forUser;
  }

  getForUserClass(forUser: string): string {
    switch (forUser) {
      case 'STUDENT': return 'audience-student';
      case 'AGENT': return 'audience-agent';
      case 'ALL': return 'audience-all';
      default: return '';
    }
  }

  getTagLabel(tagValue: string): string {
    if (!tagValue) return 'General';
    const option = this.tagOptions.find(o => o.value === tagValue);
    return option ? option.label : tagValue;
  }

  isNewsActive(news: NewsDTO): boolean {
    if (!news.active) return false;
    const today = new Date();
    const from = new Date(news.activeFrom);
    const till = new Date(news.tillDate);
    return today >= from && today <= till;
  }

  formatNewsDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getNewsStats(): { total: number; active: number; forAgents: number; forStudents: number } {
    const total = this.newsList.length;
    const active = this.newsList.filter(n => this.isNewsActive(n)).length;
    const forAgents = this.newsList.filter(n => n.forUser === 'AGENT').length;
    const forStudents = this.newsList.filter(n => n.forUser === 'STUDENT').length;
    return { total, active, forAgents, forStudents };
  }

  viewDocReturnDetails(student: Student): void {
    // Basic implementation: open full student profile
    this.selectStudent(student);
  }

  viewDocument(path: string | null): void {
    if (path) {
      window.open(this.getDocUrl(path), '_blank');
    }
  }

  // --- Tasks Module Methods ---

  loadTasksDashboard(): void {
    const role = 'ADMISSION_MANAGER';
    const userId = sessionStorage.getItem('userId') || '';
    this.http.get<any>(`${environment.apiUrl}/api/tasks/dashboard?role=${role}&username=${userId}`).subscribe({
      next: (res) => {
        this.tasksDashboardData = res;
        this.processEnterpriseTaskStats(res);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load tasks', err)
    });

    // Fetch precisely "My Tasks" for the Pending Tasks list, matching the Tasks Board
    this.http.get<any>(`${environment.apiUrl}/api/tasks/dashboard/paginated?username=${userId}&filter=my&page=0&size=5`).subscribe({
      next: (res) => {
        this.entTopPendingTasks = res.content || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load my tasks for dashboard', err)
    });

    // Fetch overdue tasks for the Overdue widget
    this.http.get<any>(`${environment.apiUrl}/api/tasks/dashboard/paginated?username=${userId}&filter=overdue&page=0&size=5`).subscribe({
      next: (res) => {
        this.entFollowUpTasks = res.content || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load overdue tasks', err)
    });
  }

  processEnterpriseTaskStats(data: any): void {
    if (!data) return;

    const allTasks = data.allTasks || [];
    let high = 0;
    let medium = 0;
    let low = 0;
    let completed = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    allTasks.forEach((t: any) => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') {
        completed++;
      } else {
        if (!t.dueDate) {
          low++;
        } else {
          const due = new Date(t.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < today) high++; // Overdue
          else if (due.getTime() === today.getTime()) medium++; // Due today
          else low++;
        }
      }
    });

    const total = allTasks.length;
    const pending = total - completed;
    const overdue = data.overdueTasks ? data.overdueTasks.length : 0;

    this.entTaskStats = {
      total, completed, pending, overdue, high, medium, low,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };

    this.entTaskPriorityChartData.datasets[0].data = [high, medium, low];

    if (this.chart) {
      this.chart.update();
    }
  }

  openCreateTaskModal(type: string = 'TASK'): void {
    this.newTask = {
      title: '',
      description: '',
      department: 'VISA',
      assignedToRole: '',
      type: type,
      dueDate: ''
    };
    this.isTaskModalOpen = true;
    this.cdr.detectChanges();
  }

  closeTaskModal(): void {
    this.isTaskModalOpen = false;
    this.cdr.detectChanges();
  }

  submitNewTask(): void {
    this.newTask.createdBy = this.managerData?.fullName || 'Manager';
    this.http.post(`${environment.apiUrl}/api/tasks`, this.newTask).subscribe({
      next: () => {
        this.closeTaskModal();
        this.loadTasksDashboard();
        this.successModalMessage = 'Task created successfully!';
        this.showSuccessModal = true;
      },
      error: (err) => alert('Failed to create task: ' + (err.error || err.message))
    });
  }

  markTaskComplete(taskId: number): void {
    this.http.put(`${environment.apiUrl}/api/tasks/${taskId}/status?status=COMPLETED`, {}).subscribe({
      next: () => {
        this.loadTasksDashboard();
      },
      error: (err) => alert('Failed to mark complete: ' + (err.error || err.message))
    });
  }

  getTasksForCurrentFilter(): any[] {
    if (!this.tasksDashboardData) return [];
    switch (this.tasksFilter) {
      case 'my': return this.tasksDashboardData.myTasks || [];
      case 'followups': return this.tasksDashboardData.followUps || [];
      case 'escalations': return this.tasksDashboardData.escalations || [];
      case 'overdue': return this.tasksDashboardData.overdueTasks || [];
      default: return this.tasksDashboardData.allTasks || [];
    }
  }

  getGroupedFollowUps(): { name: string, tasks: any[] }[] {
    const followUps = this.tasksDashboardData?.followUps || [];
    if (!followUps.length) return [];

    const uniTasks = followUps.filter((t: any) => ['ADMISSION', 'TELEX', 'UNIVERSITY'].includes(t.department));
    const agentTasks = followUps.filter((t: any) => ['VISA', 'ACCOUNTANT', 'AGENT'].includes(t.department));
    const studentTasks = followUps.filter((t: any) => ['DOCUMENT', 'STUDENT'].includes(t.department));

    return [
      { name: 'University Follow Ups', tasks: uniTasks },
      { name: 'Agent & Finance Follow Ups', tasks: agentTasks },
      { name: 'Student Follow Ups', tasks: studentTasks }
    ].filter(g => g.tasks.length > 0);
  }

  // --- Doc Request Methods ---

  loadDocRequests(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/doc-requests/pending`).subscribe({
      next: (requests) => {
        this.docRequests = requests;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load doc requests', err)
    });
  }

  getPendingDocRequestsCount(): number {
    return this.docRequests.filter(r => r.status === 'PENDING').length;
  }

  getUniqueStudentsDocRequestsCount(): number {
    const uniqueIds = new Set(this.docRequests.filter(r => r.student?.id).map(r => r.student.id));
    return uniqueIds.size;
  }

  getUniqueCollegesDocRequestsCount(): number {
    const uniqueIds = new Set(this.docRequests.filter(r => r.college?.id).map(r => r.college.id));
    return uniqueIds.size;
  }

  viewDocRequestDetails(request: any): void {
    this.selectedDocRequest = request;
  }

  closeDocRequestDetails(): void {
    this.selectedDocRequest = null;
  }

  forwardDocRequest(request: any): void {
    this.isForwardingRequest = true;
    const authUser = sessionStorage.getItem('userId') || '';
    const payload = {
      forwardedBy: authUser,
      forwardedByName: this.managerData?.fullName || authUser
    };

    this.http.put(`${environment.apiUrl}/api/doc-requests/${request.id}/forward`, payload).subscribe({
      next: () => {
        this.successModalMessage = 'Request forwarded to university successfully!';
        this.showSuccessModal = true;
        this.isForwardingRequest = false;
        this.loadDocRequests();
      },
      error: (err) => {
        alert('Failed to forward request: ' + (err.error || err.message));
        this.isForwardingRequest = false;
        this.cdr.detectChanges();
      }
    });
  }

  openRejectDocRequestModal(request: any): void {
    this.selectedRequestForReject = request;
    this.rejectionReason = '';
    this.cdr.detectChanges();
  }

  closeRejectDocRequestModal(): void {
    this.selectedRequestForReject = null;
    this.rejectionReason = '';
    this.cdr.detectChanges();
  }

  submitRejectDocRequest(): void {
    if (!this.rejectionReason.trim()) {
      alert('Please enter a reason for rejection.');
      return;
    }

    this.isRejectingRequest = true;
    const authUser = sessionStorage.getItem('userId') || '';
    const payload = {
      rejectedBy: authUser,
      rejectedByName: this.managerData?.fullName || authUser,
      reason: this.rejectionReason
    };

    this.http.put(`${environment.apiUrl}/api/doc-requests/${this.selectedRequestForReject.id}/reject`, payload).subscribe({
      next: () => {
        this.successModalMessage = 'Request rejected successfully.';
        this.showSuccessModal = true;
        this.isRejectingRequest = false;
        this.closeRejectDocRequestModal();
        this.loadDocRequests();
      },
      error: (err) => {
        alert('Failed to reject request: ' + (err.error || err.message));
        this.isRejectingRequest = false;
        this.cdr.detectChanges();
      }
    });
  }

  getDocTypeLabel(docType: string, customName?: string): string {
    if (docType === 'OTHER' && customName) return customName;
    return docType.replace(/_/g, ' ');
  }

  getDocRequestStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'status-warning';
      case 'FORWARDED': return 'status-info';
      case 'COMPLETED': return 'status-success';
      case 'REJECTED': return 'status-danger';
      default: return 'status-info';
    }
  }
  // =========================================================================
  // Settings & Task Engine Configuration
  // =========================================================================

  loadSettings(): void {
    this.http.get<any>(`${environment.apiUrl}/api/tasks/settings/sync-interval`).subscribe({
      next: (res) => {
        this.currentSyncInterval = res.minutes || 15;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load settings', err)
    });
  }

  updateSyncInterval(): void {
    if (this.currentSyncInterval < 1) {
      this.showToast('Interval must be at least 1 minute', 'error');
      return;
    }
    this.isUpdatingSettings = true;
    this.http.put<any>(`${environment.apiUrl}/api/tasks/settings/sync-interval`, { minutes: this.currentSyncInterval }).subscribe({
      next: (res) => {
        this.isUpdatingSettings = false;
        this.showSettingsModal = false;
        this.showToast(res.message, 'success');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isUpdatingSettings = false;
        this.showToast('Failed to update interval', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    const id = this.toastIdCounter++;
    this.toastQueue.push({ message, type, id });
    this.cdr.markForCheck();

    setTimeout(() => {
      this.toastQueue = this.toastQueue.filter(t => t.id !== id);
      this.cdr.markForCheck();
    }, 3500);
  }

  // --- Admission Plan (Travel UI) ---
  showAdmissionPlanModal: boolean = false;
  selectedAdmissionStudent: Student | null = null;
  admissionPlanStatus: string = '';
  admissionNotes: string = '';
  isSavingAdmissionPlan: boolean = false;

  openAdmissionPlan(student: Student) {
    this.selectedAdmissionStudent = student;
    this.admissionPlanStatus = student.admissionPlanStatus || 'MARK_ARRIVED';
    this.admissionNotes = student.admissionNotes || '';
    this.showAdmissionPlanModal = true;
    this.cdr.markForCheck();
  }

  closeAdmissionPlan() {
    this.showAdmissionPlanModal = false;
    this.selectedAdmissionStudent = null;
    this.admissionPlanStatus = '';
    this.admissionNotes = '';
    this.cdr.markForCheck();
  }

  saveAdmissionPlan() {
    if (!this.selectedAdmissionStudent) return;
    this.isSavingAdmissionPlan = true;
    this.cdr.markForCheck();

    const payload = {
      admissionPlanStatus: this.admissionPlanStatus,
      admissionNotes: this.admissionNotes
    };

    this.http.put<Student>(`${environment.apiUrl}/api/managers/student/${this.selectedAdmissionStudent.id}/admission-plan`, payload).subscribe({
      next: (res) => {
        this.isSavingAdmissionPlan = false;
        this.showToast(`Admission Plan saved for ${res.fullName}`, 'success');

        // Update the local student object
        if (this.selectedAdmissionStudent) {
          this.selectedAdmissionStudent.admissionPlanStatus = res.admissionPlanStatus;
          this.selectedAdmissionStudent.admissionNotes = res.admissionNotes;
        }

        this.closeAdmissionPlan();
      },
      error: (err) => {
        this.isSavingAdmissionPlan = false;
        this.showToast('Failed to save Admission Plan.', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  // Theme Methods
  toggleThemePanel() {
    this.isThemePanelOpen.update(v => !v);
  }

  applyTheme(themeId: string) {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme) return;

    Object.entries(theme.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    this.activeTheme.set(themeId);
    localStorage.setItem('uc_theme', themeId);
    this.isThemePanelOpen.set(false);
  }

  resetTheme() {
    const defaultTheme = this.themes[0];
    Object.entries(defaultTheme.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    this.activeTheme.set('default');
    localStorage.removeItem('uc_theme');
    this.isThemePanelOpen.set(false);
  }

  private loadSavedTheme() {
    const saved = localStorage.getItem('uc_theme');
    if (saved) {
      setTimeout(() => this.applyTheme(saved), 0);
    }
  }
}