import { Component, OnInit, signal, computed, ChangeDetectorRef, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { UniversityService, DashboardStats, StatusBreakdown, AdmittedStudent } from '../../services/university.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { environment } from '../../../environments/environment';
import { FileService } from '../../services/file.service';
import * as XLSX from 'xlsx';

// Interfaces
interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
  logoUrl?: string;
}

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
  id: number;
  applicationId: string;
  fullName: string;
  applicationStatus: string;
  passportNo: string;
  dob: string;
  age: number;
  email: string;
  contactNo: string;
  appliedFor: string;
  intake: string;
  action?: string | null;
  actionOnUser?: string | null;
  createdAt: string;
  passportPath?: string;
  adhaarPath?: string;
  adhaarCardNo?: string;
  markseetPath?: string;
  confirmationPagePath?: string;
  admissionLetterPath?: string;
  conditionalOfferLetterPath?: string;
  profileImagePath?: string;
  class12thMarks?: number;
  maxMarks?: number;
  class12thPassingYear?: string;
  baords?: string;
  neetScore?: number;
  neetYear?: number;
  mothersName?: string;
  fathersName?: string;
  address?: string;
  emergencyContactNo?: string;
  emergencyRelation?: string;
  hasGivenNEET?: boolean;
  visaTalabNumaPath?: string;
  isTelexDocsVerified?: boolean;
  telexMan?: any;
  telexDocumentsPath?: string;
  admissionManager?: any;
  docPerson?: any;
  studentStatusHistory?: StatusHistory[];
  agent?: {
    id: number;
    fullName: string;
    username: string;
  };
  // Fee fields
  hasPaid?: boolean;
  paidAmount?: number;
  paidTo?: string;
  telexPaymentAmount?: number;
  telexPaymentReceivedAmount?: number;
  telexTuitionFee?: boolean;
  telexHostelFee?: boolean;
  telexMessFee?: boolean;
  telexContractFee?: boolean;
  telexRegistrationFee?: boolean;
  telexOneTimeCharge?: boolean;
  telexNumber?: string;
  telexRequestDate?: string;
  visaNumber?: string;
  visaPhotoPath?: string;
  visaPassportCopyPath?: string;
  visaFeePaymentDate?: string;
  visaPaymentTxId?: string;
  travelDoj?: string;
  travelTicketPdfPath?: string;
  citizenship?: string;
}

interface UniversityPerson {
  id: number;
  userName: string;
  role: string;
  status: string;
  college: College;
  students: Student[];
}

@Component({
  selector: 'app-university-person-dashbaord',
  standalone: false,
  templateUrl: './university-person-dashbaord.html',
  styleUrls: ['./university-person-dashbaord.css']
})
export class UniversityPersonDashboard implements OnInit {
  // Data Signals
  universityData = signal<UniversityPerson | null>(null);
  isLoading = signal<boolean>(true);
  isRefreshing = signal<boolean>(false);

  // UI State
  activeSection = signal<string>('dashboard');
  sidebarCollapsed = signal<boolean>(false);
  searchQuery = signal<string>('');

  // Theme System
  isThemePanelOpen = signal<boolean>(false);
  activeTheme = signal<string>('default');

  // Additional Docs State
  additionalDocs = signal<any[]>([]);
  isRequestDocModalOpen = signal<boolean>(false);
  isSubmittingDocRequest = signal<boolean>(false);
  newDocRequestName = signal<string>('');


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

  // Modal States
  isModalOpen = signal<boolean>(false);
  isUploadModalOpen = signal<boolean>(false);
  isSuccessModalOpen = signal<boolean>(false);
  isDocViewModalOpen = signal<boolean>(false);
  isHistoryModalOpen = signal<boolean>(false);

  // Doc Requests State
  docRequests = signal<any[]>([]);
  isUploadingDocRequest = signal<boolean>(false);
  selectedDocRequest = signal<any>(null);
  requestedDocFile = signal<File | null>(null);
  isLoggingOut = signal<boolean>(false);

  selectedStudent = signal<Student | null>(null);
  selectedStudentForUpload = signal<Student | null>(null);
  selectedStudentForDocs = signal<Student | null>(null);
  selectedStudentForHistory = signal<Student | null>(null);
  selectedFile = signal<File | null>(null);
  isUploading = signal<boolean>(false);
  uploadSuccess = signal<boolean>(false);
  uploadMessage = signal<string>('');
  uploadType = signal<'admission' | 'visaTalabNuma'>('admission');

  // Analytics Signals
  dashboardStats = signal<DashboardStats | null>(null);

  statusBreakdown = signal<StatusBreakdown[]>([]);
  admittedStudentsList = signal<AdmittedStudent[]>([]);
  admittedStudentsSearch = signal<string>('');

  // Reports State
  reportStartDate = signal<string>('');
  reportEndDate = signal<string>('');
  reportStatus = signal<string>('ALL');

  // All Students Filters
  allFilterAgent = signal<string>('ALL');
  allFilterStatus = signal<string>('ALL');
  allFilterStartDate = signal<string>('');
  allFilterEndDate = signal<string>('');
  allFilterProgram = signal<string>('ALL');
  allFilterAcademicYear = signal<string>('ALL');

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(25);

  // Side Panel
  selectedStudentForPanel = signal<Student | null>(null);

  uniqueStatuses = computed(() => {
    const students = this.universityData()?.students || [];
    const statuses = new Set(students.map(s => s.applicationStatus).filter(s => s));
    return Array.from(statuses).sort();
  });

  uniquePrograms = computed(() => {
    const students = this.universityData()?.students || [];
    const programs = new Set(students.map(s => s.appliedFor).filter(s => s));
    return Array.from(programs).sort();
  });

  uniqueAcademicYears = computed(() => {
    const students = this.universityData()?.students || [];
    const years = new Set(students.map(s => s.intake).filter(s => s));
    return Array.from(years).sort();
  });

  uniqueAgents = computed(() => {
    const students = this.universityData()?.students || [];
    const agentsMap = new Map<string, string>();
    students.forEach(s => {
      if (s.agent?.fullName) {
        agentsMap.set(s.agent.fullName, s.agent.fullName);
      }
    });
    return Array.from(agentsMap.values()).sort();
  });

  // Dashboard Detail Stats
  paidToUniversityCount = computed(() => {
    const students = this.universityData()?.students || [];
    return students.filter(s => s.paidTo === 'UNIVERSITY').length;
  });

  totalPaidToUniversity = computed(() => {
    const students = this.universityData()?.students || [];
    return students
      .filter(s => s.paidTo === 'UNIVERSITY' && s.paidAmount)
      .reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  });

  agentBreakdown = computed(() => {
    const students = this.universityData()?.students || [];
    const map = new Map<string, number>();
    students.forEach(s => {
      const agentName = s.agent?.fullName || 'Unassigned';
      map.set(agentName, (map.get(agentName) || 0) + 1);
    });
    const total = students.length || 1;
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  });

  filteredReportStudents = computed(() => {
    let students = this.universityData()?.students || [];

    const start = this.reportStartDate();
    const end = this.reportEndDate();
    const status = this.reportStatus();

    if (start) {
      const startDate = new Date(start);
      students = students.filter(s => s.createdAt && new Date(s.createdAt) >= startDate);
    }
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      students = students.filter(s => s.createdAt && new Date(s.createdAt) <= endDate);
    }
    if (status !== 'ALL') {
      students = students.filter(s => s.applicationStatus === status);
    }

    return students;
  });

  stats = computed(() => {
    const students = this.universityData()?.students || [];
    const actionRequiredCount = this.actionRequiredStudents().length;

    const totalStudents = students.length;
    const admittedCount = students.filter(s =>
      s.applicationStatus === 'ADMISSION_LETTER_GENERATED' ||
      s.admissionLetterPath
    ).length;
    const pendingCount = students.filter(s =>
      s.applicationStatus === 'FORWARDED_TO_UNI' ||
      s.applicationStatus === 'CONDITIONAL_OFFER_LETTER_GENERATED' ||
      s.applicationStatus === 'PENDING_ADMISSION_LETTER'
    ).length;
    const visaStamped = students.filter(s => s.applicationStatus === 'VISA_STAMPED').length;

    return {
      totalStudents,
      admittedStudents: admittedCount,
      pendingApplications: pendingCount,
      visaStamped,
      actionRequired: actionRequiredCount
    };
  });

  // Chart Data
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#2c3e50',
          font: { family: 'Inter', size: 12 },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    }
  };

  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [], hoverBackgroundColor: [] }]
  };
  public pieChartType: ChartType = 'pie';

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#546e7a', font: { family: 'Inter', size: 11 } }
      },
      y: {
        min: 0,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#546e7a', font: { family: 'Inter', size: 11 } }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    }
  };

  public barChartData: ChartData<'bar'> = {
    labels: ['Registered', 'Forwarded', 'Admitted', 'Visa Stamped'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        label: 'Student Pipeline',
        backgroundColor: ['#630018', '#8a0f2e', '#c5a059', '#137333'],
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };
  public barChartType: ChartType = 'bar';

  
  // Telex Requests Tracking Logic
  telexRoleFilter = signal('ALL');

  telexStudents = computed(() => {
    // Use raw universityData students — NOT allStudents() which has "All Students" tab filters applied
    const allRaw = this.universityData()?.students || [];
    
    // DEBUG: Log all unique statuses and key fields
    if (allRaw.length > 0) {
      const statuses = [...new Set(allRaw.map((s: any) => s.applicationStatus))];
      console.log('DEBUG TELEX: Total raw students:', allRaw.length);
      console.log('DEBUG TELEX: Unique statuses:', statuses);
      console.log('DEBUG TELEX: With telexPaymentAmount:', allRaw.filter((s: any) => s.telexPaymentAmount).length);
      console.log('DEBUG TELEX: With telexNumber:', allRaw.filter((s: any) => s.telexNumber).length);
      console.log('DEBUG TELEX: With telexTuitionFee:', allRaw.filter((s: any) => s.telexTuitionFee).length);
      console.log('DEBUG TELEX: With isTelexDocsVerified:', allRaw.filter((s: any) => s.isTelexDocsVerified).length);
      console.log('DEBUG TELEX: With TELEX_INITIATED:', allRaw.filter((s: any) => s.applicationStatus === 'TELEX_INITIATED').length);
      console.log('DEBUG TELEX: With ADMISSION_LETTER_GENERATED:', allRaw.filter((s: any) => s.applicationStatus === 'ADMISSION_LETTER_GENERATED').length);
      console.log('DEBUG TELEX: getTelexStatus not Not Started:', allRaw.filter((s: any) => this.getTelexStatus(s) !== 'Not Started').length);
    }

    let students = allRaw.filter((s: any) => 
      // Match the same logic used in report: getTelexStatus !== 'Not Started'
      this.getTelexStatus(s) !== 'Not Started' ||
      s.telexPaymentAmount ||
      s.telexTuitionFee ||
      s.isTelexDocsVerified ||
      s.isTelexDocApproved ||
      // Also include students eligible (admission letter generated)
      s.applicationStatus === 'ADMISSION_LETTER_GENERATED' ||
      s.applicationStatus === 'APPROVED'
    );

    const roleFilter = this.telexRoleFilter();
    if (roleFilter !== 'ALL') {
      students = students.filter((s: any) => {
        const owner = this.getTelexCurrentOwner(s);
        if (roleFilter === 'COMPLETED') return s.telexNumber;
        if (roleFilter === 'AGENT') return owner.role === 'Agent' && !s.telexNumber;
        if (roleFilter === 'DOC_PERSON') return owner.role === 'Doc Person' && !s.telexNumber;
        if (roleFilter === 'ADMISSION_MANAGER') return owner.role === 'Admission Manager' && !s.telexNumber;
        if (roleFilter === 'TELEX_MANAGER') return owner.role === 'Telex Manager' && !s.telexNumber;
        return true;
      });
    }

    return students;
  });

  getTelexCurrentOwner(student: Student) {
    if (student.telexNumber) {
      return {
          name: 'N/A',
          role: 'Completed',
          badge: 'badge-success',
          icon: 'fas fa-check-circle',
          nextAction: student.telexNumber,
          actionIcon: 'fas fa-hashtag',
          actionColor: '#059669'
      };
    }

    if (student.telexMan) {
      return { 
          name: student.telexMan.fullName || 'Telex Manager', 
          role: 'Telex Manager', 
          badge: 'badge-info', 
          icon: 'fas fa-user-tag',
          nextAction: 'Upload Talabnoma & Request Telex',
          actionIcon: 'fas fa-file-upload',
          actionColor: '#1e3a8a'
      };
    }
    
    // STEP 3: Status is TELEX_INITIATED (Doc verified, no telexMan yet) = Admission Manager
    if (student.applicationStatus === 'TELEX_INITIATED' || student.isTelexDocsVerified) {
      return { 
          name: student.admissionManager?.fullName || 'Admission Manager', 
          role: 'Admission Manager', 
          badge: 'badge-primary', 
          icon: 'fas fa-user-cog',
          nextAction: 'Assign Telex Manager',
          actionIcon: 'fas fa-user-plus',
          actionColor: '#6d28d9'
      };
    }
    
    // STEP 2: Agent paid / applied = Doc Person verifies
    if (student.applicationStatus === 'APPLIED_FOR_TELEX' || student.telexPaymentAmount) {
      return { 
          name: student.docPerson?.fullName || 'Doc Person', 
          role: 'Doc Person', 
          badge: 'badge-warning', 
          icon: 'fas fa-user-shield',
          nextAction: 'Verify Telex Documents',
          actionIcon: 'fas fa-check-double',
          actionColor: '#b45309'
      };
    }
    
    return { 
        name: student.agent?.fullName || 'Agent', 
        role: 'Agent', 
        badge: 'badge-secondary', 
        icon: 'fas fa-user-tie',
        nextAction: 'Initiate Telex & Pay Fee',
        actionIcon: 'fas fa-money-check-alt',
        actionColor: '#1e293b'
    };
  }

  telexCurrentPage = signal(1);
  telexItemsPerPage = 10;
  
  telexTotalPages = computed(() => Math.ceil(this.telexStudents().length / this.telexItemsPerPage));
  
  paginatedTelexStudents = computed(() => {
    const startIndex = (this.telexCurrentPage() - 1) * this.telexItemsPerPage;
    return this.telexStudents().slice(startIndex, startIndex + this.telexItemsPerPage);
  });

  getTelexStepStatus(student: Student, step: number): 'completed' | 'in-progress' | 'pending' {
    // Derive the current step from the student's actual state
    // This gives us a number 1-7 representing how far along they are
    let currentStep = 0;

    const status = student.applicationStatus || '';

    // Step 7: Telex Number issued
    if (student.telexNumber) {
      currentStep = 7;
    }
    // Step 5-6: Telex request submitted to MFA, waiting for number
    else if (student.telexRequestDate) {
      currentStep = 6;
    }
    // Step 4: Talabnoma uploaded by telex manager
    else if (student.telexDocumentsPath) {
      currentStep = 5;
    }
    // Step 3: Telex Manager assigned — working on it
    else if (student.telexMan) {
      currentStep = 4;
    }
    // Step 2-3: Docs verified / Status is TELEX_INITIATED — Admission Manager needs to assign
    else if (student.isTelexDocsVerified || status === 'TELEX_INITIATED') {
      currentStep = 3;
    }
    // Step 1-2: Agent applied for telex — Doc Person needs to verify
    else if (status === 'APPLIED_FOR_TELEX' || student.telexPaymentAmount) {
      currentStep = 2;
    }
    // Step 1: Admission letter generated — Agent needs to initiate
    else if (status === 'ADMISSION_LETTER_GENERATED' || status === 'APPROVED') {
      currentStep = 1;
    }

    // Now determine the status for the requested step
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'in-progress';
    return 'pending';
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private universityService: UniversityService,
    private fileService: FileService,
    private el: ElementRef
  ) { }

  ngOnInit() {
    this.loadSavedTheme();
    this.loadData();
  }

  loadData() {
    const username = sessionStorage.getItem('userId');
    if (!username) {
      this.router.navigate(['/admin-login']);
      return;
    }

    this.isLoading.set(true);
    const apiUrl = `${environment.apiUrl}/api/universityPerson/username/${username}`;

    this.http.get<UniversityPerson>(apiUrl)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.universityData.set(data);
          this.updateChartData();
          this.loadAnalytics(username);
        },
        error: (err) => {
          console.error('Error fetching data:', err);
          if (err.status === 401 || err.status === 403) {
            this.router.navigate(['/admin-login']);
          }
        }
      });
  }

  updateChartData() {
    const students = this.universityData()?.students || [];

    // Status breakdown for pie chart
    const statusCounts = new Map<string, number>();
    students.forEach(s => {
      const count = statusCounts.get(s.applicationStatus) || 0;
      statusCounts.set(s.applicationStatus, count + 1);
    });

    const labels: string[] = [];
    const data: number[] = [];
    const colors = ['#630018', '#8a0f2e', '#c5a059', '#137333', '#1967d2', '#b06000'];
    const bgColors: string[] = [];
    const hoverColors: string[] = [];

    let colorIndex = 0;
    statusCounts.forEach((count, status) => {
      labels.push(this.formatStatusLabel(status));
      data.push(count);
      bgColors.push(colors[colorIndex % colors.length]);
      hoverColors.push(this.lightenColor(colors[colorIndex % colors.length]));
      colorIndex++;
    });

    this.pieChartData = {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        hoverBackgroundColor: hoverColors
      }]
    };

    // Pipeline bar chart
    const registered = students.filter(s => s.applicationStatus === 'REGISTERED').length;
    const forwarded = students.filter(s => s.applicationStatus === 'FORWARDED_TO_UNI').length;
    const admitted = students.filter(s => s.applicationStatus === 'ADMISSION_LETTER_GENERATED' || s.admissionLetterPath).length;
    const visaStamped = students.filter(s => s.applicationStatus === 'VISA_STAMPED').length;

    this.barChartData = {
      labels: ['Registered', 'Forwarded', 'Admitted', 'Visa Stamped'],
      datasets: [{
        data: [registered, forwarded, admitted, visaStamped],
        label: 'Student Pipeline',
        backgroundColor: ['#630018', '#8a0f2e', '#c5a059', '#137333'],
        borderRadius: 8,
        borderSkipped: false
      }]
    };
  }

  formatStatusLabel(status: string): string {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  lightenColor(color: string): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  }

  loadAnalytics(username: string) {
    this.universityService.getDashboardStats(username).subscribe(stats => {
      this.dashboardStats.set(stats);
    });

    this.universityService.getStatusBreakdown(username).subscribe(data => {
      this.statusBreakdown.set(data);
    });

    this.universityService.getAdmittedStudents(username).subscribe(students => {
      this.admittedStudentsList.set(students);
    });
  }

  refreshData() {
    this.isRefreshing.set(true);

    setTimeout(() => {
      this.loadData();
      setTimeout(() => {
        this.isRefreshing.set(false);
        this.cdr.detectChanges();
      }, 100);
    }, 1900);
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(collapsed => !collapsed);
  }

  setActiveSection(section: string) {
    this.activeSection.set(section);
    if (section === 'requested-docs') {
      this.loadDocRequests();
    }
  }

  // Computed Lists
  actionRequiredStudents = computed(() => {
    const students = this.universityData()?.students || [];
    const query = this.searchQuery().toLowerCase();
    return students.filter(s =>
      s.action === 'UPLOAD_ADMISSION_LETTER' &&
      (s.actionOnUser === 'UniversityCoordinator' || s.actionOnUser === 'UNIVERSITY_COORDINATOR') &&
      (s.fullName.toLowerCase().includes(query) ||
        s.passportNo.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.appliedFor.toLowerCase().includes(query))
    );
  });

  inPipelineStudents = computed(() => {
    const students = this.universityData()?.students || [];
    const query = this.searchQuery().toLowerCase();
    return students.filter(s =>
      s.applicationStatus !== 'VISA_STAMPED' &&
      s.applicationStatus !== 'REGISTERED' &&
      (s.fullName.toLowerCase().includes(query) ||
        s.passportNo.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.appliedFor.toLowerCase().includes(query))
    );
  });

  admissionLetterGeneratedStudents = computed(() => {
    const students = this.universityData()?.students || [];
    const query = this.searchQuery().toLowerCase();
    return students.filter(s =>
      (s.applicationStatus === 'ADMISSION_LETTER_GENERATED' || s.admissionLetterPath) &&
      (s.fullName.toLowerCase().includes(query) ||
        s.passportNo.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.appliedFor.toLowerCase().includes(query))
    );
  });

  getCombinedAdmissionStudents = computed(() => {
    const actionRequired = this.actionRequiredStudents();
    const generated = this.admissionLetterGeneratedStudents();

    // They both already respect searchQuery(), so we can just combine them
    // but we should avoid duplicates just in case.
    const combined = [...actionRequired];
    for (const s of generated) {
      if (!combined.some(c => c.id === s.id)) {
        combined.push(s);
      }
    }

    // Sort them so pending ones (actionRequired) are on top
    combined.sort((a, b) => {
      const aPending = !a.admissionLetterPath ? 1 : 0;
      const bPending = !b.admissionLetterPath ? 1 : 0;
      return bPending - aPending;
    });

    return combined;
  });

  allStudents = computed(() => {
    let students = this.universityData()?.students || [];
    const query = this.searchQuery().toLowerCase();
    const agentFilter = this.allFilterAgent();
    const statusFilter = this.allFilterStatus();
    const startDate = this.allFilterStartDate();
    const endDate = this.allFilterEndDate();
    const programFilter = this.allFilterProgram();
    const yearFilter = this.allFilterAcademicYear();

    // Text search
    if (query) {
      students = students.filter(s =>
        s.fullName.toLowerCase().includes(query) ||
        s.passportNo.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.agent?.fullName || '').toLowerCase().includes(query) ||
        s.appliedFor.toLowerCase().includes(query)
      );
    }

    // Agent filter
    if (agentFilter !== 'ALL') {
      students = students.filter(s => (s.agent?.fullName || 'Unassigned') === agentFilter);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      students = students.filter(s => s.applicationStatus === statusFilter);
    }

    // Date range
    if (startDate) {
      const sd = new Date(startDate);
      students = students.filter(s => s.createdAt && new Date(s.createdAt) >= sd);
    }
    if (endDate) {
      const ed = new Date(endDate);
      ed.setHours(23, 59, 59, 999);
      students = students.filter(s => s.createdAt && new Date(s.createdAt) <= ed);
    }

    if (programFilter !== 'ALL') {
      students = students.filter(s => s.appliedFor === programFilter);
    }

    if (yearFilter !== 'ALL') {
      students = students.filter(s => s.intake === yearFilter);
    }

    return students;
  });

  paginatedStudents = computed(() => {
    const students = this.allStudents();
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return students.slice(startIndex, startIndex + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.allStudents().length / this.pageSize()) || 1);

  visaTalabNumaUploadedCount = computed(() => this.allStudents().filter(s => s.visaTalabNumaPath).length);
  visaTalabNumaPendingCount = computed(() => this.allStudents().filter(s => !s.visaTalabNumaPath).length);

  // --- Reports Section Computations ---
  reportTotalAdmissionRequests = computed(() => this.universityData()?.students?.length || 0);
  reportAdmissionLettersIssued = computed(() => (this.universityData()?.students || []).filter(s => !!s.admissionLetterPath || s.applicationStatus === 'ADMISSION_LETTER_ISSUED').length);
  reportAdmissionUnderReview = computed(() => (this.universityData()?.students || []).filter(s => !s.admissionLetterPath && s.applicationStatus !== 'REJECTED' && s.applicationStatus !== 'APPLICATION_REJECTED').length);
  reportAdmissionRejected = computed(() => (this.universityData()?.students || []).filter(s => s.applicationStatus === 'REJECTED' || s.applicationStatus === 'APPLICATION_REJECTED').length);

  reportTotalTelexRequests = computed(() => (this.universityData()?.students || []).filter(s => this.getTelexStatus(s) !== 'Not Started' || s.telexPaymentAmount || s.telexTuitionFee).length);
  reportTelexTalabnomaUploaded = computed(() => (this.universityData()?.students || []).filter(s => !!s.visaTalabNumaPath).length);
  reportTelexSubmittedMFA = computed(() => (this.universityData()?.students || []).filter(s => !!s.telexRequestDate).length);
  reportTelexIssued = computed(() => (this.universityData()?.students || []).filter(s => !!s.telexNumber).length);
  reportTelexRejected = computed(() => (this.universityData()?.students || []).filter(s => s.applicationStatus === 'REJECTED' || s.applicationStatus === 'APPLICATION_REJECTED').length);

  currentSessionStudents = computed(() => {
    const students = this.universityData()?.students || [];
    const intakes = students.map(s => parseInt(s.intake)).filter(y => !isNaN(y));
    const currentYear = intakes.length > 0 ? Math.max(...intakes).toString() : new Date().getFullYear().toString();
    return students.filter(s => s.intake === currentYear);
  });

  reportCurrentApplicationsReceived = computed(() => this.currentSessionStudents().length);
  reportCurrentAdmissionLetters = computed(() => this.currentSessionStudents().filter(s => !!s.admissionLetterPath || s.applicationStatus === 'ADMISSION_LETTER_ISSUED').length);
  reportCurrentTelexRequests = computed(() => this.currentSessionStudents().filter(s => this.getTelexStatus(s) !== 'Not Started' || s.telexPaymentAmount || s.telexTuitionFee).length);
  reportCurrentTelexIssued = computed(() => this.currentSessionStudents().filter(s => !!s.telexNumber).length);
  // ------------------------------------

  filteredAdmittedStudents = computed(() => {
    const students = this.admittedStudentsList();
    const query = this.admittedStudentsSearch().toLowerCase();
    return students.filter(s =>
      s.fullName.toLowerCase().includes(query) ||
      s.passportNumber.toLowerCase().includes(query) ||
      s.courseName.toLowerCase().includes(query)
    );
  });

  courseBreakdown = computed(() => {
    const students = this.universityData()?.students || [];
    const counts = new Map<string, number>();
    students.forEach(s => {
      const course = s.appliedFor || 'Unknown';
      counts.set(course, (counts.get(course) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / (students.length || 1)) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  });

  intakeBreakdown = computed(() => {
    const students = this.universityData()?.students || [];
    const counts = new Map<string, number>();
    students.forEach(s => {
      const intake = s.intake || 'Unknown';
      counts.set(intake, (counts.get(intake) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / (students.length || 1)) * 100) }))
      .sort((a, b) => b.count - a.count);
  });

  performanceMetrics = computed(() => {
    const students = this.universityData()?.students || [];
    if (students.length === 0) return { admissionRate: 0, visaRate: 0, thisMonthCount: 0, growth: 0, isPositiveGrowth: true };

    const total = students.length;
    const admitted = students.filter(s =>
      s.applicationStatus === 'ADMISSION_LETTER_GENERATED' ||
      s.applicationStatus === 'VISA_STAMPED' ||
      s.admissionLetterPath
    ).length;
    const admissionRate = Math.round((admitted / total) * 100);

    const visaStamped = students.filter(s => s.applicationStatus === 'VISA_STAMPED').length;
    const visaRate = admitted > 0 ? Math.round((visaStamped / admitted) * 100) : 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let thisMonthCount = 0;
    let lastMonthCount = 0;

    students.forEach(s => {
      if (!s.createdAt) return;
      const date = new Date(s.createdAt);
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        thisMonthCount++;
      } else if (date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear) {
        lastMonthCount++;
      }
    });

    let growth = 0;
    if (lastMonthCount > 0) {
      growth = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
    } else if (thisMonthCount > 0) {
      growth = 100;
    }

    return {
      admissionRate,
      visaRate,
      thisMonthCount,
      growth,
      isPositiveGrowth: growth >= 0
    };
  });

  // Upload Logic
  openUploadModal(student: Student, type: 'admission' | 'visaTalabNuma' = 'admission') {
    this.selectedStudentForUpload.set(student);
    this.uploadType.set(type);
    this.selectedFile.set(null);
    this.uploadSuccess.set(false);
    this.isUploadModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedStudent.set(null);
  }

  closeUploadModal() {
    if (!this.isUploading()) {
      this.isUploadModalOpen.set(false);
      this.selectedStudentForUpload.set(null);
      this.selectedFile.set(null);
      this.uploadSuccess.set(false);
    }
  }

  closeSuccessModal() {
    this.isSuccessModalOpen.set(false);
    this.uploadMessage.set('');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (file.size > maxSize) {
        alert('File size must be less than 5MB');
        return;
      }

      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert('Only PDF, JPG, and PNG files are allowed');
        return;
      }

      this.selectedFile.set(file);
    }
  }

  uploadAdmissionLetter() {
    if (this.uploadType() === 'admission') {
      this.submitAdmissionLetter();
    } else {
      this.submitVisaTalabNuma();
    }
  }

  submitAdmissionLetter() {
    const student = this.selectedStudentForUpload();
    const file = this.selectedFile();
    const username = sessionStorage.getItem('userId');

    if (!student || !file || !username) return;

    this.isUploading.set(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('universityPersonUsername', username);

    const apiUrl = `${environment.apiUrl}/api/universityPerson/upload-admission-letter/${student.id}`;

    this.http.post(apiUrl, formData)
      .pipe(finalize(() => this.isUploading.set(false)))
      .subscribe({
        next: (response) => {
          this.updateLocalDataAfterUpload(student.id);

          // Close upload modal immediately (don't use closeUploadModal as it checks isUploading)
          this.isUploadModalOpen.set(false);
          this.selectedStudentForUpload.set(null);
          this.selectedFile.set(null);
          this.uploadSuccess.set(false);

          // Show success modal
          this.uploadMessage.set(`Admission letter uploaded successfully for ${student.fullName}`);
          this.isSuccessModalOpen.set(true);

          setTimeout(() => {
            this.refreshData();
          }, 2000);
        },
        error: (err) => {
          console.error('Upload failed', err);
          alert('Upload failed. Please try again.');
        }
      });
  }

  private updateLocalDataAfterUpload(studentId: number) {
    this.universityData.update(current => {
      if (!current) return null;
      const updatedStudents = current.students.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            action: null,
            actionOnUser: null,
            applicationStatus: 'ADMISSION_LETTER_GENERATED'
          };
        }
        return s;
      });
      return { ...current, students: updatedStudents };
    });
  }

  submitVisaTalabNuma() {
    const student = this.selectedStudentForUpload();
    const file = this.selectedFile();
    const username = sessionStorage.getItem('userId');

    if (!student || !file || !username) return;

    this.isUploading.set(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('universityPersonUsername', username);

    const apiUrl = `${environment.apiUrl}/api/universityPerson/upload-visa-talab-numa/${student.id}`;

    this.http.post(apiUrl, formData)
      .pipe(finalize(() => this.isUploading.set(false)))
      .subscribe({
        next: (response) => {
          this.isUploadModalOpen.set(false);
          this.selectedStudentForUpload.set(null);
          this.selectedFile.set(null);
          this.uploadSuccess.set(false);

          this.uploadMessage.set(`Visa Talab Numa uploaded successfully for ${student.fullName}`);
          this.isSuccessModalOpen.set(true);

          setTimeout(() => {
            this.refreshData();
          }, 2000);
        },
        error: (err) => {
          console.error('Upload failed', err);
          alert('Upload failed. Please try again.');
        }
      });
  }

  // Document Viewer
  selectStudentForAdmission(student: Student) {
    this.selectedStudentForDocs.set(student);
    this.fetchAdditionalDocs(student.id);
  }

  fetchAdditionalDocs(studentId: number) {
    this.http.get(`${environment.apiUrl}/api/additional-docs/student/${studentId}`)
      .subscribe({
        next: (res: any) => this.additionalDocs.set(res),
        error: (err) => console.error('Error fetching additional docs', err)
      });
  }

  openRequestDocModal() {
    this.newDocRequestName.set('');
    this.isRequestDocModalOpen.set(true);
  }

  closeRequestDocModal() {
    this.isRequestDocModalOpen.set(false);
  }

  onDocNameInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.newDocRequestName.set(target.value);
  }

  submitDocRequest() {
    if (!this.newDocRequestName().trim()) return;

    const student = this.selectedStudentForDocs();
    if (!student) return;

    this.isSubmittingDocRequest.set(true);
    const payload = {
      studentId: student.id,
      documentName: this.newDocRequestName().trim(),
      requestedBy: this.universityData()?.userName || 'University Coordinator'
    };

    this.http.post(`${environment.apiUrl}/api/additional-docs/request`, payload)
      .pipe(finalize(() => this.isSubmittingDocRequest.set(false)))
      .subscribe({
        next: (res) => {
          this.closeRequestDocModal();
          this.fetchAdditionalDocs(student.id);
          this.uploadMessage.set(`Successfully requested ${payload.documentName}`);
          this.isSuccessModalOpen.set(true);
        },
        error: (err) => {
          console.error('Failed to request doc', err);
          alert(err.error || 'Failed to request document.');
        }
      });
  }

  // Document Viewer
  getImageUrl(path: string | undefined): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${environment.apiUrl}/${path}`;
  }

  // Pagination Methods
  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.currentPage.set(1);
  }

  openStudentPanel(student: Student) {
    this.selectedStudentForPanel.set(student);
  }


  handleImageError(event: any, name: string | undefined) {
    const fallbackUrl = 'https://ui-avatars.com/api/?name=' + (name || 'S') + '&background=0D8ABC&color=fff';
    if (event.target.src !== fallbackUrl) {
      event.target.src = fallbackUrl;
    }
  }

  closeStudentPanel() {
    this.selectedStudentForPanel.set(null);
  }

  // Status Helpers
  getOverallStatus(student: Student): string {
    if (!student) return 'Not Started';
    const s = student.applicationStatus;
    if (s === 'COMPLETED' || s === 'VISA_STAMPED' || s === 'PASSPORT_DISPATCHED') return 'Completed';
    if (s === 'REGISTERED' || !s) return 'Not Started';
    if (s === 'REJECTED' || s === 'APPLICATION_REJECTED') return 'Not Started';
    return 'In Progress';
  }

  getTelexStatus(student: Student): string {
    if (student.telexNumber) return 'Telex Issued';
    if (student.telexRequestDate) return 'Submitted to MFA';
    if (student.telexDocumentsPath) return 'Talabnoma Uploaded';
    if (student.applicationStatus === 'TELEX_INITIATED' || student.telexPaymentAmount) return 'Under Review';
    return 'Not Started';
  }

  getVisaStatus(student: Student): string {
    if (student.visaNumber || student.visaPhotoPath) return 'Visa Stamped';
    if (student.visaPassportCopyPath) return 'Passport Submitted';
    if (student.visaFeePaymentDate || student.visaPaymentTxId) return 'Submitted to Embassy';
    if (student.visaTalabNumaPath) return 'Under Review';
    return 'Not Started';
  }

  getArrivalStatus(student: Student): string {
    if (student.applicationStatus === 'JOINED_COLLEGE') return 'Arrived';
    if (student.travelDoj) {
      const doj = new Date(student.travelDoj);
      if (doj < new Date()) return 'Arrived';
      return 'Scheduled';
    }
    return 'Not Arrived';
  }

  
  getStatusIcon(status: string | undefined): string {
    if (!status) return 'fas fa-circle';
    switch (status) {
      // Base application statuses
      case 'REGISTERED': return 'fas fa-user-plus';
      case 'UNDER_REVIEW': return 'fas fa-search';
      case 'APPROVED': return 'fas fa-check-circle';
      case 'ADMISSION_LETTER_GENERATED': return 'fas fa-file-signature';
      case 'TELEX_INITIATED': return 'fas fa-paper-plane';
      case 'TELEX_DOCS_UPLOADED': return 'fas fa-file-upload';
      case 'TELEX_APPROVED': return 'fas fa-check-double';
      case 'VISA_STAMPED': return 'fas fa-passport';
      case 'REJECTED': return 'fas fa-times-circle';
      case 'COMPLETED': return 'fas fa-flag-checkered';
      case 'APPLIED_FOR_TELEX': return 'fas fa-plane-departure';
      case 'FORWARDED_TO_UNI': return 'fas fa-share';
      case 'TRAVELLING': return 'fas fa-plane';
      
      // Overall Status
      case 'Completed': return 'fas fa-flag-checkered';
      case 'In Progress': return 'fas fa-spinner';
      case 'Not Started': return 'fas fa-minus-circle';
      
      // Telex Status
      case 'Telex Issued': return 'fas fa-envelope-open-text';
      case 'Submitted to MFA': return 'fas fa-university';
      case 'Talabnoma Uploaded': return 'fas fa-file-upload';
      case 'Under Review': return 'fas fa-search';
      
      // Visa Status
      case 'Visa Stamped': return 'fas fa-passport';
      case 'Passport Submitted': return 'fas fa-id-card';
      case 'Submitted to Embassy': return 'fas fa-landmark';
      
      // Arrival Status
      case 'Arrived': return 'fas fa-plane-arrival';
      case 'Scheduled': return 'fas fa-calendar-alt';
      case 'Not Arrived': return 'fas fa-plane';
      
      // Other legacy/custom
      case 'Pending': return 'fas fa-clock';
      case 'Generated': return 'fas fa-check';
      case 'Requested': return 'fas fa-paper-plane';
      case 'Approved': return 'fas fa-check-double';
      case 'Stamped': return 'fas fa-passport';
      case 'Uploaded': return 'fas fa-check-circle';
      
      default: return 'fas fa-info-circle';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Completed':
      case 'Telex Issued':
      case 'Visa Stamped':
      case 'Arrived':
      case 'COMPLETED':
      case 'APPROVED':
      case 'TELEX_APPROVED':
      case 'VISA_STAMPED':
      case 'Uploaded':
        return 'badge-success';
      case 'In Progress':
      case 'Submitted to MFA':
      case 'Passport Submitted':
      case 'Submitted to Embassy':
      case 'Scheduled':
      case 'Pending':
      case 'TELEX_INITIATED':
      case 'APPLIED_FOR_TELEX':
      case 'TRAVELLING':
        return 'badge-warning';
      case 'Talabnoma Uploaded':
      case 'Under Review':
      case 'FORWARDED_TO_UNI':
      case 'ADMISSION_LETTER_GENERATED':
      case 'TELEX_DOCS_UPLOADED':
        return 'badge-info';
      case 'REJECTED':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  }

  openDocViewer(student: Student) {
    this.selectedStudentForDocs.set(student);
    this.isDocViewModalOpen.set(true);
  }

  closeDocViewer() {
    this.isDocViewModalOpen.set(false);
    this.selectedStudentForDocs.set(null);
  }

  openHistoryModal(student: Student) {
    this.selectedStudentForHistory.set(student);
    this.isHistoryModalOpen.set(true);
  }

  closeHistoryModal() {
    this.isHistoryModalOpen.set(false);
    this.selectedStudentForHistory.set(null);
  }

  getTelexHistory(student: Student | null): StatusHistory[] {
    if (!student || !student.studentStatusHistory) return [];
    return student.studentStatusHistory.filter(h =>
      h.studentApplicationStatus && h.studentApplicationStatus.toUpperCase().includes('TELEX')
    );
  }

  downloadDocument(path: string, fileName: string) {
    if (!path) return;
    const fullUrl = this.fileService.getFileUrl(path);
    window.open(fullUrl, '_blank');
  }

  getDocumentIcon(path: string): string {
    if (!path) return 'file';
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return 'image';
    return 'file';
  }

  // Logout
  logout() {
    this.isLoggingOut.set(true);

    setTimeout(() => {
      sessionStorage.clear();
      this.router.navigate(['/AdminLogin']);
    }, 2000);
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  getDocumentFileName(path: string): string {
    if (!path) return 'N/A';
    return path.split('/').pop() || 'Document';
  }

  formatPercentage(value: number, total: number): string {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  }

  getCollegeLogo(): string | null {
    const path = this.universityData()?.college?.logoUrl;
    if (path) {
      return this.fileService.getFileUrl(path);
    }
    return null;
  }

  // Reports Actions
  exportToExcel() {
    const data = this.filteredReportStudents().map(s => ({
      'Application ID': s.applicationId || 'N/A',
      'Full Name': s.fullName,
      'Passport No.': s.passportNo,
      'Email': s.email,
      'Applied For': s.appliedFor,
      'Intake': s.intake,
      'Status': s.applicationStatus,
      'Applied Date': s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `University_Report_${new Date().getTime()}.xlsx`);
  }

  exportToPdf() {
    window.print();
  }

  updateFilter(filterName: string, event: Event) {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    if (filterName === 'reportStartDate') this.reportStartDate.set(input.value);
    if (filterName === 'reportEndDate') this.reportEndDate.set(input.value);
    if (filterName === 'reportStatus') this.reportStatus.set(input.value);
  }

  clearFilters() {
    this.reportStartDate.set('');
    this.reportEndDate.set('');
    this.reportStatus.set('ALL');
  }

  updateAllFilter(filterName: string, event: Event) {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    if (filterName === 'agent') this.allFilterAgent.set(input.value);
    if (filterName === 'status') this.allFilterStatus.set(input.value);
    if (filterName === 'startDate') this.allFilterStartDate.set(input.value);
    if (filterName === 'endDate') this.allFilterEndDate.set(input.value);
    if (filterName === 'program') { this.allFilterProgram.set(input.value); this.currentPage.set(1); }
    if (filterName === 'year') { this.allFilterAcademicYear.set(input.value); this.currentPage.set(1); }
  }

  clearAllFilters() {
    this.allFilterAgent.set('ALL');
    this.allFilterStatus.set('ALL');
    this.allFilterStartDate.set('');
    this.allFilterEndDate.set('');
    this.allFilterProgram.set('ALL');
    this.allFilterAcademicYear.set('ALL');
    this.currentPage.set(1);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getCurrentDate(): string {
    return new Date().toLocaleString();
  }

  // Theme Methods
  toggleThemePanel() {
    this.isThemePanelOpen.update(v => !v);
  }

  applyTheme(themeId: string) {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme) return;

    const hostEl = this.el.nativeElement as HTMLElement;
    Object.entries(theme.vars).forEach(([key, value]) => {
      hostEl.style.setProperty(key, value);
    });

    this.activeTheme.set(themeId);
    localStorage.setItem('uc_theme', themeId);
    this.isThemePanelOpen.set(false);
  }

  resetTheme() {
    const hostEl = this.el.nativeElement as HTMLElement;
    const defaultTheme = this.themes[0];
    Object.entries(defaultTheme.vars).forEach(([key, value]) => {
      hostEl.style.setProperty(key, value);
    });

    this.activeTheme.set('default');
    localStorage.removeItem('uc_theme');
    this.isThemePanelOpen.set(false);
  }

  private loadSavedTheme() {
    const saved = localStorage.getItem('uc_theme');
    if (saved && saved !== 'default') {
      // defer to after view init
      setTimeout(() => this.applyTheme(saved), 0);
    }
  }

  // --- Doc Request Methods ---

  loadDocRequests(): void {
    const data = this.universityData();
    if (!data?.college?.id) return;

    this.http.get<any[]>(`${environment.apiUrl}/api/doc-requests/college/${data.college.id}`).subscribe({
      next: (requests) => {
        // UC only sees FORWARDED or COMPLETED requests
        this.docRequests.set(requests.filter(r => r.status === 'FORWARDED' || r.status === 'COMPLETED'));
      },
      error: (err) => console.error('Failed to load doc requests', err)
    });
  }

  getForwardedDocRequestsCount(): number {
    return this.docRequests().filter(r => r.status === 'FORWARDED').length;
  }

  openUploadDocRequestModal(request: any): void {
    this.selectedDocRequest.set(request);
    this.requestedDocFile.set(null);
  }

  onRequestedDocFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.requestedDocFile.set(file);
    }
  }

  uploadRequestedDoc(): void {
    const request = this.selectedDocRequest();
    const file = this.requestedDocFile();
    const data = this.universityData();

    if (!request || !file || !data?.userName) {
      alert('Please select a file to upload.');
      return;
    }

    this.isUploadingDocRequest.set(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', data.userName);

    this.http.post(`${environment.apiUrl}/api/doc-requests/${request.id}/upload`, formData).subscribe({
      next: () => {
        this.uploadMessage.set(`Requested document uploaded successfully for ${request.student?.fullName || 'student'}!`);
        this.isSuccessModalOpen.set(true);
        this.isUploadingDocRequest.set(false);
        this.selectedDocRequest.set(null);
        this.requestedDocFile.set(null);
        this.loadDocRequests();
      },
      error: (err) => {
        alert('Failed to upload document: ' + (err.error || err.message));
        this.isUploadingDocRequest.set(false);
      }
    });
  }

  getDocTypeLabel(docType: string, customName?: string): string {
    if (docType === 'OTHER' && customName) return customName;
    return docType ? docType.replace(/_/g, ' ') : '';
  }

  getDocRequestStatusBadgeClass(status: string): string {
    switch (status) {
      case 'FORWARDED': return 'badge-info';
      case 'COMPLETED': return 'badge-success';
      default: return 'badge-neutral';
    }
  }

  downloadRequestedDoc(path: string | null): void {
    if (!path) return;
    const url = this.fileService.getFileUrl(path);
    window.open(url, '_blank');
  }
}