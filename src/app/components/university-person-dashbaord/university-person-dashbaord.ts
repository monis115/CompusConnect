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

  uniqueStatuses = computed(() => {
    const students = this.universityData()?.students || [];
    const statuses = new Set(students.map(s => s.applicationStatus).filter(s => s));
    return Array.from(statuses).sort();
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

  allStudents = computed(() => {
    let students = this.universityData()?.students || [];
    const query = this.searchQuery().toLowerCase();
    const agentFilter = this.allFilterAgent();
    const statusFilter = this.allFilterStatus();
    const startDate = this.allFilterStartDate();
    const endDate = this.allFilterEndDate();

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

    return students;
  });

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
  }

  clearAllFilters() {
    this.allFilterAgent.set('ALL');
    this.allFilterStatus.set('ALL');
    this.allFilterStartDate.set('');
    this.allFilterEndDate.set('');
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