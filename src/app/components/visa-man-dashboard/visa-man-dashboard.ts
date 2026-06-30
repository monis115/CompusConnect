import { Component, OnInit, ChangeDetectorRef, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize, catchError } from 'rxjs';
import { of } from 'rxjs';

import { VisaService } from '../../services/visa.service';
import { PaymentRequestService, PaymentRequest } from '../../services/payment-request.service';
import { environment } from '../../../environments/environment';
import { FileService } from '../../services/file.service';
// ... imports

// ...

// Student Interface
interface Student {
  id: number;
  applicationId: string;
  fullName: string;
  email: string;
  contactNo: string;
  passportNo: string;
  passportValidTill: string;
  passportPath: string;
  telexNumber: string;
  action: string;
  actionOnUser: string;
  applicationStatus: string;
  profileImagePath: string;
  visaNumber?: string;
  visaPaymentRequestedAmount?: number;
  visaPaymentRequestedCurrency?: string;
  visaManServiceCharge?: number;
  visaPaymentReceivedAmount?: number;
  accToVisaManPaidAmount?: number;
  accToVisaManMode?: string;
  accToVisaManTxId?: string;
  accToVisaManPaymentDate?: string;
  accToVisaManStatus?: string;
  agent?: any;
  college?: any;
  createdAt?: string;
  updatedAt?: string;
  studentStatusHistory?: any[];
  citizenship?: string;
  intake?: string;
  placeOfVisaIssuance?: string;
  telexIssueDate?: string;
  admissionLetterPath?: string;
  telexDocumentsPath?: string;
}

// VisaMan Profile Interface
interface VisaManProfile {
  id: number;
  visaPersonId: string;
  fullName: string;
  email: string;
  status: string;
  students: Student[];
}

interface News {
  id: number;
  activeFrom: string;
  tillDate: string;
  heading: string;
  content: string;
  tag: string;
  username: string;
  forUser: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

@Component({
  selector: 'app-visa-man-dashboard',
  standalone: false,
  templateUrl: './visa-man-dashboard.html',
  styleUrl: './visa-man-dashboard.css',
})
export class VisaManDashboard implements OnInit, OnDestroy {
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

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  private destroy$ = new Subject<void>();

  activeSection: 'dashboard' | 'visaRequests' | 'collectPassport' | 'applyForVisa' | 'submitToEmbassy' | 'markVisaStamp' | 'returnedToDocPerson' | 'visaStamped' | 'students' | 'accounts' | 'funds' | 'releasedFunds' | 'tasks' = 'dashboard';
  currentUsername: string = 'VM_001';
  students: Student[] = [];
  visaManProfile: VisaManProfile | null = null;


  // Loading States
  isLoading: boolean = true;
  isRefreshing: boolean = false;
  processingId: number | null = null;

  // Modal States
  showLogoutModal: boolean = false;
  showSuccessModal: boolean = false;
  showDetailModal: boolean = false;
  showPaymentModal: boolean = false;
  selectedStudent: Student | null = null;
  paymentStudent: Student | null = null;
  successMessage: string = '';

  // Confirmation Modal
  showConfirmModal: boolean = false;
  confirmTitle: string = '';
  confirmMessage: string = '';
  onConfirm: (() => void) | null = null;




  // Visa Request Modal Variables
  visaFeeAmount: number | null = null;
  visaServiceCharge: number | null = null;
  visaNote: string = "This total amount will be sent to Accountant for collection from agent and fund release process.";

  get visaTotalAmount(): number {
    return (this.visaFeeAmount || 0) + (this.visaServiceCharge || 0);
  }


  // Currency Options
  currencies: { code: string; name: string; symbol: string }[] = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },

    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' }
  ];

  // Search & Filters
  searchQuery: string = '';
  filterAgent: string = '';
  filterCollege: string = '';

  get uniqueColleges(): string[] {
    return [...new Set(this.students.map(s => s.college?.collegeName).filter(Boolean))] as string[];
  }

  get uniqueAgents(): any[] {
    return Array.from(new Map(this.students.filter(s => s.agent).map(s => [s.agent.username, s.agent])).values());
  }

  get hasActiveFilters(): boolean {
    return !!this.filterAgent || !!this.filterCollege || !!this.searchQuery;
  }

  clearFilters(): void {
    this.filterAgent = '';
    this.filterCollege = '';
    this.searchQuery = '';
    this.cdr.detectChanges();
  }

  // Toasts
  toasts: Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string; show: boolean }> = [];

  // Sidebar Mobile Toggle
  sidebarOpen: boolean = false;

  // Stats with animated counters
  stats = {
    pendingApplications: 0,
    awaitingPassport: 0,
    atEmbassy: 0,
    visasIssued: 0
  };

  // Display values for counter animation
  displayStats = {
    pendingApplications: 0,
    awaitingPassport: 0,
    atEmbassy: 0,
    visasIssued: 0
  };

  // API Base URL
  private readonly API_URL = environment.apiUrl + '/api';

  // Fund Releases
  fundReleases: any[] = [];
  selectedFundRelease: any = null;
  showFundReleaseModal: boolean = false;


  // Fund Requests variables
  myFundRequests: any[] = [];
  qrCodePreview: string | ArrayBuffer | null = null;
  isFundSubmitting: boolean = false;

  // Passbooks
  myPassbooks: any[] = [];

  // News / Announcements
  announcements: News[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private fileService: FileService,
    private cdr: ChangeDetectorRef,
    private paymentRequestService: PaymentRequestService,
    private visaService: VisaService
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state && navigation.extras.state['username']) {
      this.currentUsername = navigation.extras.state['username'];
    }
  }

  ngOnInit(): void {
    this.loadSavedTheme();
    // Get username from session
    const storedUsername = sessionStorage.getItem('userId');
    if (storedUsername) {
      this.currentUsername = storedUsername;
    }
    this.loadDashboardData();
    this.loadPassbooks();
    this.fetchFundReleases();
    this.loadMyRequests();
    this.loadNews();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // DATA LOADING
  // ============================================
  loadPassbooks(): void {
    if (!this.currentUsername) return;
    this.visaService.getPassbooks(this.currentUsername)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.myPassbooks = data;
        this.cdr.detectChanges();
      });
  }

  loadNews(): void {
    this.http.get<News[]>(`${this.API_URL}/news/active`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res && res.length > 0) {
          // Filter for VISA_MAN or ALL
          this.announcements = res.filter(n => n.forUser === 'VISA_MAN' || n.forUser === 'ALL');
        }
        this.cdr.detectChanges();
      });
  }

  loadDashboardData(): void {
    this.isLoading = true;

    this.http.get<VisaManProfile>(`${this.API_URL}/visa-man/username/${this.currentUsername}`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        }),
        catchError(err => {
          console.error('Failed to load visa manager data:', err);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.visaManProfile = response;
          this.students = response.students || [];
          this.calculateStats();
          this.animateStats();
        }
        this.cdr.detectChanges();
      });
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.loadDashboardData();
  }

  // ============================================
  // STATS CALCULATION
  // ============================================
  calculateStats(): void {
    this.stats = {
      pendingApplications: this.students.filter(s => s.action === 'NEED_APPLY_VISA').length,
      awaitingPassport: this.students.filter(s => s.action === 'NEED_SUBMIT_PASSPORT_TO_EMBASSY').length,
      atEmbassy: this.students.filter(s => s.applicationStatus === 'PASSPORT_SUBMITTED_TO_EMBASSY').length,
      visasIssued: this.students.filter(s => s.applicationStatus === 'VISA_STAMPED').length
    };
  }

  animateStats(): void {
    this.animateCounter('pendingApplications', this.stats.pendingApplications);
    this.animateCounter('awaitingPassport', this.stats.awaitingPassport);
    this.animateCounter('atEmbassy', this.stats.atEmbassy);
    this.animateCounter('visasIssued', this.stats.visasIssued);
  }

  animateCounter(key: keyof typeof this.displayStats, target: number, duration: number = 1500): void {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      this.displayStats[key] = Math.floor(current);
      this.cdr.detectChanges();
    }, 16);
  }

  // ============================================
  // FILTERING
  // ============================================
  get visaRequestStudents(): Student[] {
    return this.filterBySearch(
      this.students.filter(s => s.action === 'REQUEST_FOR_VISA_PAYMENT_TO_ACCOUNTANT')
    );
  }

  get collectPassportStudents(): Student[] {
    return this.filterBySearch(
      this.students.filter(s => {
        if (s.action === 'COLLECT_PASSPORT_FRM_DOC_PERSON') return true;
        // If funds received but hasn't proceeded to collect passport yet
        if (s.accToVisaManPaidAmount && s.accToVisaManPaidAmount > 0) {
          const status = s.applicationStatus;
          if (status !== 'PASSPORT_COLLECTED' && status !== 'VISA_APPLIED' && status !== 'PASSPORT_SUBMITTED_TO_EMBASSY' && status !== 'VISA_STAMPED' && status !== 'VISA_COMPLETED') {
            return true;
          }
        }
        return false;
      })
    );
  }

  get completedStudents(): Student[] {
    return this.filterBySearch(
      this.students.filter(s => s.action === 'VISA_COMPLETED')
    );
  }

  get returnedToDocPersonStudents(): Student[] {
    return this.filterBySearch(
      this.students.filter(s =>
        s.action === 'NEED_TO_RETURN_VISA' &&
        s.applicationStatus === 'VISA_STAMPED'
      )
    );
  }

  get applyForVisaStudents(): Student[] {
    return this.filterBySearch(
      this.students.filter(s => s.action === 'NEED_APPLY_VISA')
    );
  }

  get submitToEmbassyStudents(): Student[] {
    return this.filterBySearch(
      this.students.filter(s => s.action === 'NEED_SUBMIT_PASSPORT_TO_EMBASSY')
    );
  }

  get markVisaStampStudents(): Student[] {
    return this.filterBySearch(
      this.students.filter(s => s.action === 'NEED_TO_ISSUE_VISA')
    );
  }

  get visaStampedStudents() {
    return this.filterBySearch(
      this.students.filter(s => s.visaNumber != null)
    );
  }

  get allFilteredStudents(): Student[] {
    return this.filterBySearch(this.students);
  }

  filterBySearch(list: Student[]): Student[] {
    let filtered = list;
    if (this.filterAgent) {
      filtered = filtered.filter(s => s.agent?.fullName === this.filterAgent);
    }
    if (this.filterCollege) {
      filtered = filtered.filter(s => s.college?.collegeName === this.filterCollege);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName?.toLowerCase().includes(q) ||
        s.applicationId?.toLowerCase().includes(q) ||
        s.telexNumber?.toLowerCase().includes(q) ||
        s.passportNo?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  get topUniversities() {
    const uniCounts = new Map<string, number>();
    this.allFilteredStudents.forEach(s => {
      const name = s.college?.collegeName || 'Not Assigned';
      uniCounts.set(name, (uniCounts.get(name) || 0) + 1);
    });
    return Array.from(uniCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / (this.allFilteredStudents.length || 1)) * 100) || 0 }));
  }

  get recentActivitiesList() {
    return this.allFilteredStudents.slice(0, 4).map(s => ({
      title: s.action ? this.formatAction(s.action) : 'Application Updated',
      desc: `${s.fullName} - ${s.applicationStatus}`,
      time: 'Recently Updated',
      initials: this.getInitials(s.fullName)
    }));
  }

  get agentBreakdown() {
    const agentCounts = new Map<string, { total: number, stamped: number }>();
    this.allFilteredStudents.forEach(s => {
      const name = s.agent?.fullName || 'Direct';
      const stats = agentCounts.get(name) || { total: 0, stamped: 0 };
      stats.total++;
      if (s.applicationStatus === 'VISA_STAMPED') stats.stamped++;
      agentCounts.set(name, stats);
    });
    return Array.from(agentCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        successRate: Math.round((stats.stamped / (stats.total || 1)) * 100) || 0
      }));
  }

  // ============================================
  // DASHBOARD CHARTS & STATS COMPUTATION
  // ============================================

  get dashboardStatusCounts() {
    const total = this.students.length || 1; // avoid div by 0
    const newRequest = this.feePendingStudents.length;
    const documentCollection = this.collectPassportStudents.length;
    const inProcess = this.visaAppliedStudents.length;
    const submitted = this.submitToEmbassyStudents.length + this.atEmbassyStudents.length;
    const completed = this.visaIssuedStudents.length + this.completedStudents.length;

    return {
      newRequest: { count: newRequest, percent: Math.round((newRequest / total) * 100) },
      documentCollection: { count: documentCollection, percent: Math.round((documentCollection / total) * 100) },
      inProcess: { count: inProcess, percent: Math.round((inProcess / total) * 100) },
      submitted: { count: submitted, percent: Math.round((submitted / total) * 100) },
      completed: { count: completed, percent: Math.round((completed / total) * 100) },
      total: this.students.length
    };
  }

  get dashboardStatusDonutStyle() {
    const counts = this.dashboardStatusCounts;
    const c1 = counts.newRequest.percent;
    const c2 = c1 + counts.documentCollection.percent;
    const c3 = c2 + counts.inProcess.percent;
    const c4 = c3 + counts.submitted.percent;
    // the rest is completed
    if (this.students.length === 0) {
      return 'conic-gradient(#e2e8f0 0% 100%)';
    }
    return `conic-gradient(
      #3b82f6 0% ${c1}%, 
      #f59e0b ${c1}% ${c2}%, 
      #8b5cf6 ${c2}% ${c3}%, 
      #ef4444 ${c3}% ${c4}%, 
      #10b981 ${c4}% 100%
    )`;
  }

  get dashboardIntakeCounts() {
    const intakeCounts = new Map<string, number>();
    this.students.forEach(s => {
      const intake = s.intake || 'Others';
      intakeCounts.set(intake, (intakeCounts.get(intake) || 0) + 1);
    });
    const total = this.students.length || 1;
    const sorted = Array.from(intakeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }));
    return sorted;
  }

  get dashboardIntakeDonutStyle() {
    const counts = this.dashboardIntakeCounts;
    let style = 'conic-gradient(';
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];
    let currentPercent = 0;
    
    if (counts.length === 0) {
      return 'conic-gradient(#e2e8f0 0% 100%)';
    }

    counts.forEach((c, index) => {
      const nextPercent = currentPercent + c.percent;
      style += `${colors[index % colors.length]} ${currentPercent}% ${nextPercent}%, `;
      currentPercent = nextPercent;
    });
    // add remaining if any
    if (currentPercent < 100) {
      style += `#e2e8f0 ${currentPercent}% 100%`;
    } else {
      style = style.slice(0, -2); // remove last comma
    }
    style += ')';
    return style;
  }

  get recentVisaRequests() {
    return [...this.students]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }

  get financeOverview() {
    // "Fund Released" = total visa payment amounts that were requested for visa processing (settled funds)
    const totalVisaFundsRequested = this.students.reduce((sum, s) => sum + (Number(s.visaPaymentRequestedAmount) || 0), 0);
    // Also count confirmed fund releases from company
    const totalFundReleased = this.totalReleasedAmount || 0;
    // "Fund Requests" = expense fund requests made by visa man
    const totalFundRequests = this.myFundRequests.reduce((sum, req) => sum + (Number(req.requestedAmount) || 0), 0);
    const paidFundRequests = this.myFundRequests
      .filter(r => r.status === 'PAID' || r.status === 'PARTIAL')
      .reduce((sum, req) => sum + (Number(req.paidAmount || req.requestedAmount) || 0), 0);
    const pendingFundRequests = this.myFundRequests
      .filter(r => r.status === 'PENDING')
      .reduce((sum, req) => sum + (Number(req.requestedAmount) || 0), 0);
    return {
      visaFunds: totalVisaFundsRequested,
      released: totalFundReleased,
      requests: totalFundRequests,
      requestsPaid: paidFundRequests,
      requestsPending: pendingFundRequests,
      pendingReleases: this.pendingReleasesCount,
      confirmedReleases: this.confirmedReleasesCount,
      totalFundRequestsCount: this.myFundRequests.length,
      paidFundRequestsCount: this.paidFundRequestsCount
    };
  }

  get trendChartData() {
    // Generate trend for the last 7 days based on updatedAt
    const days = 7;
    const counts = new Array(days).fill(0);
    const labels = new Array(days).fill('');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      labels[days - 1 - i] = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }

    this.students.forEach(s => {
      const d = new Date(s.updatedAt || s.createdAt || 0);
      d.setHours(0,0,0,0);
      const diffTime = today.getTime() - d.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < days) {
        counts[days - 1 - diffDays]++;
      }
    });

    const maxVal = Math.max(...counts, 5);
    const points = counts.map((val, idx) => {
      const x = (idx / (days - 1)) * 500;
      const y = 100 - ((val / maxVal) * 80); // padding top
      return `${x},${y}`;
    }).join(' ');

    return { 
      receivedSum: counts.slice(0, 3).reduce((a,b)=>a+b, 0),
      processSum: counts.slice(3, 6).reduce((a,b)=>a+b, 0),
      completedSum: counts[6],
      counts, 
      labels, 
      points 
    };
  }

  // Pipeline Stage Filters
  get feePendingStudents(): Student[] {
    return this.students.filter(s =>
      s.action === 'REQUEST_FOR_VISA_PAYMENT_TO_ACCOUNTANT' ||
      s.applicationStatus === 'VISA_PAYMENT_REQUESTED'
    );
  }

  get visaAppliedStudents(): Student[] {
    return this.students.filter(s =>
      s.applicationStatus === 'VISA_APPLIED' ||
      s.action === 'NEED_SUBMIT_PASSPORT_TO_EMBASSY'
    );
  }

  get atEmbassyStudents(): Student[] {
    return this.students.filter(s =>
      s.applicationStatus === 'PASSPORT_SUBMITTED_TO_EMBASSY'
    );
  }

  get visaIssuedStudents(): Student[] {
    return this.students.filter(s =>
      s.applicationStatus === 'VISA_STAMPED'
    );
  }

  get accountRecords(): Student[] {
    return this.students.filter(s =>
      s.visaPaymentRequestedAmount && s.visaPaymentRequestedAmount > 0
    );
  }

  get totalVisaRequested(): number {
    return this.accountRecords.reduce((sum, s) => sum + (s.visaPaymentRequestedAmount || 0), 0);
  }

  get totalVisaReceived(): number {
    return this.accountRecords.reduce((sum, s) => sum + (s.visaPaymentReceivedAmount || 0), 0);
  }

  get totalServiceChargeRequested(): number {
    return this.accountRecords.reduce((sum, s) => sum + (s.visaManServiceCharge || 0), 0);
  }

  get totalServiceChargeEarned(): number {
    return this.accountRecords.reduce((sum, s) => {
      const received = s.visaPaymentReceivedAmount || 0;
      if (received > 0) {
        return sum + (s.visaManServiceCharge || 0);
      }
      return sum;
    }, 0);
  }

  get disbursedRecordsCount(): number {
    return this.accountRecords.filter(s => s.accToVisaManPaidAmount && s.accToVisaManPaidAmount > 0).length;
  }

  getAvatarColor(name: string): string {
    const colors = ['#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#be185d'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // ============================================
  // NAVIGATION
  // ============================================
  setActiveSection(section: 'dashboard' | 'visaRequests' | 'collectPassport' | 'applyForVisa' | 'submitToEmbassy' | 'markVisaStamp' | 'returnedToDocPerson' | 'visaStamped' | 'students' | 'accounts' | 'funds' | 'releasedFunds' | 'tasks'): void {
    this.activeSection = section;
    this.sidebarOpen = false;
    if (section === 'funds') {
      this.loadMyRequests();
    }
    if (section === 'releasedFunds') {
      this.fetchFundReleases();
    }
    this.cdr.detectChanges();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.cdr.detectChanges();
  }

  // ============================================
  // ACTIONS - API CALLS
  // ============================================


  // 1. Collect Passport
  collectPassport(student: Student): void {
    this.openConfirmModal(
      'Confirm Passport Collection',
      `Have you physically collected the passport from the Doc Person for ${student.fullName}?`,
      () => {
        this.processCollectPassport(student);
      }
    );
  }

  processCollectPassport(student: Student): void {
    this.processingId = student.id;
    this.visaService.collectPassport(student.id, this.currentUsername)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.processingId = null; this.cdr.detectChanges(); }),
        catchError(err => {
          console.error('Failed to collect passport:', err);
          this.showToast('error', 'Failed to collect passport.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.showSuccess(`Passport collected for ${student.fullName}`);
          this.refreshData();
        }
      });
  }

  // 2. Apply for Visa
  applyForVisa(student: Student): void {
    this.openConfirmModal(
      'Apply for Visa',
      `Ready to apply for visa for ${student.fullName}?`,
      () => {
        this.processApplyForVisa(student);
      }
    );
  }

  processApplyForVisa(student: Student): void {
    this.processingId = student.id;
    this.visaService.applyForVisa(student.id, this.currentUsername)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.processingId = null; this.cdr.detectChanges(); }),
        catchError(err => {
          console.error('Failed to apply for visa:', err);
          this.showToast('error', 'Failed to apply for visa.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.showSuccess(`Visa applied for ${student.fullName}`);
          this.refreshData();
        }
      });
  }

  // 3. Submit Passport to Embassy
  submitToEmbassy(student: Student): void {
    this.openConfirmModal(
      'Submit to Embassy',
      `Confirm submission of passport to Embassy for ${student.fullName}?`,
      () => {
        this.processSubmitToEmbassy(student);
      }
    );
  }

  processSubmitToEmbassy(student: Student): void {
    this.processingId = student.id;
    this.visaService.submitToEmbassy(student.id, this.currentUsername)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.processingId = null; this.cdr.detectChanges(); }),
        catchError(err => {
          console.error('Failed to submit passport:', err);
          this.showToast('error', 'Failed to submit passport.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.showSuccess(`Passport submitted to embassy for ${student.fullName}`);
          this.refreshData();
        }
      });
  }

  showVisaNumberModal = false;
  visaNumberInput = '';
  studentForVisaStamp: Student | null = null;
  isVisaSubmitting = false;
  visaSubmitSuccess = false;

  // 4. Mark Visa Stamped
  markVisaStamped(student: Student): void {
    this.studentForVisaStamp = student;
    this.visaNumberInput = '';
    this.showVisaNumberModal = true;
    this.isVisaSubmitting = false;
    this.visaSubmitSuccess = false;
    this.cdr.detectChanges();
  }

  closeVisaNumberModal(): void {
    this.showVisaNumberModal = false;
    this.studentForVisaStamp = null;
    this.visaNumberInput = '';
    this.isVisaSubmitting = false;
    this.visaSubmitSuccess = false;
    this.cdr.detectChanges();
  }

  submitVisaNumber(): void {
    if (!this.visaNumberInput || !this.studentForVisaStamp) return;

    this.isVisaSubmitting = true;
    const student = this.studentForVisaStamp;
    const visaNumber = this.visaNumberInput;

    this.visaService.markVisaStamped(student.id, this.currentUsername, visaNumber)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isVisaSubmitting = false;
          this.cdr.detectChanges();
        }),
        catchError(err => {
          console.error('Failed to mark visa stamped:', err);
          this.showToast('error', 'Failed to mark visa.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.visaSubmitSuccess = true;
          this.refreshData();

          setTimeout(() => {
            this.closeVisaNumberModal();
          }, 2500);
        }
      });
  }

  // 5. Return Documents to Doc Person
  confirmReturnDocs(student: Student): void {
    this.openConfirmModal(
      'Return to Doc Person',
      `Have you physically returned the documents to the Doc Person for ${student.fullName}?`,
      () => {
        this.processReturnDocs(student);
      }
    );
  }

  processReturnDocs(student: Student): void {
    this.processingId = student.id;
    this.visaService.returnDocsToDocPerson(student.id, this.currentUsername)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.processingId = null; this.cdr.detectChanges(); }),
        catchError(err => {
          console.error('Failed to return docs:', err);
          this.showToast('error', 'Failed to return documents.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.showToast('success', `Documents for ${student.fullName} returned successfully.`);
          this.refreshData();
          this.closeDetailModal();
        }
      });
  }



  // Quick Actions
  emailStudent(): void {
    if (this.selectedStudent?.email) {
      window.location.href = `mailto:${this.selectedStudent.email}`;
    }
  }

  callStudent(): void {
    if (this.selectedStudent?.contactNo) {
      window.location.href = `tel:${this.selectedStudent.contactNo}`;
    }
  }

  // ============================================
  // MODALS
  // ============================================
  openDetailModal(student: any): void {
    this.selectedStudent = student;
    this.showAllHistory = false;
    if (student.visaPaymentRequestedAmount) {
      this.visaFeeAmount = student.visaPaymentRequestedAmount;
      this.visaServiceCharge = student.visaManServiceCharge || 0;
    } else {
      this.visaFeeAmount = null;
      this.visaServiceCharge = null;
    }
    this.showDetailModal = true;
    this.cdr.detectChanges();
  }


  submitVisaFeeRequest(): void {
    if (!this.selectedStudent) return;
    if (!this.visaFeeAmount || this.visaFeeAmount <= 0) {
      this.showToast('error', 'Please enter a valid Visa Fee.');
      return;
    }

    const totalAmount = this.visaFeeAmount + (this.visaServiceCharge || 0);
    const studentName = this.selectedStudent.fullName;

    this.openConfirmModal(
      'Confirm Visa Fee Request',
      `Are you sure you want to submit a visa fee request of ₹${totalAmount.toFixed(2)} (Fee: ₹${this.visaFeeAmount} + Service: ₹${this.visaServiceCharge || 0}) for ${studentName}? This will be sent to the Accountant for collection.`,
      () => {
        this.processingId = this.selectedStudent!.id;

        const payload = {
          visaManUsername: this.currentUsername,
          amount: this.visaFeeAmount,
          currency: 'INR',
          visaManServiceCharge: this.visaServiceCharge || 0.0,
          purpose: 'Visa Fee & Service Charges'
        };

        this.http.post(`${this.API_URL}/visa/request-payment/${this.selectedStudent!.id}`, payload)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.processingId = null;
              this.cdr.detectChanges();
            }),
            catchError(err => {
              console.error('Failed to request payment:', err);
              this.showToast('error', 'Failed to submit payment request. Please try again.');
              return of(null);
            })
          )
          .subscribe(response => {
            if (response) {
              this.closeDetailModal();
              this.showSuccess(`Visa Fee request of ₹${this.visaFeeAmount} INR sent for ${studentName}`);
              this.refreshData();
            }
          });
      }
    );
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    setTimeout(() => {
      this.selectedStudent = null;
      this.cdr.detectChanges();
    }, 200);
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  openDocumentByPath(path: string | undefined): void {
    if (!path) {
      this.showToast('warning', 'Document not uploaded yet.');
      return;
    }
    const url = this.fileService.getFileUrl(path);
    window.open(url, '_blank');
  }



  // Confirmation Modal Methods
  openConfirmModal(title: string, message: string, onConfirm: () => void): void {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.onConfirm = onConfirm;
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.onConfirm = null;
    this.cdr.detectChanges();
  }

  confirmAction(): void {
    if (this.onConfirm) {
      this.onConfirm();
    }
    this.closeConfirmModal();
  }

  openLogoutModal(): void {
    this.showLogoutModal = true;
    this.cdr.detectChanges();
  }

  closeLogoutModal(): void {
    this.showLogoutModal = false;
    this.cdr.detectChanges();
  }

  // ============================================
  // LOGOUT
  // ============================================
  confirmLogout(): void {
    sessionStorage.clear();
    this.router.navigate(['/admin-login']);
  }

  // ============================================
  // HELPERS
  // ============================================

  // Toast Notification
  showToast(type: 'success' | 'error' | 'info' | 'warning', message: string): void {
    const id = Date.now().toString();
    this.toasts.push({ id, type, message, show: true });
    setTimeout(() => this.dismissToast(id), 5000);
    this.cdr.detectChanges();
  }

  dismissToast(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.cdr.detectChanges();
  }

  getImageUrl(path: string | undefined): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.API_URL.replace('/api', '')}/${path}`;
  }

  getInitials(name: string): string {
    if (!name) return 'N/A';
    return name.split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  getStatusClass(status: string): string {
    if (!status) return 'pending';

    const statusLower = status.toLowerCase();

    if (statusLower.includes('stamped') || statusLower.includes('approved') || statusLower.includes('completed')) {
      return 'success';
    }
    if (statusLower.includes('submitted') || statusLower.includes('embassy')) {
      return 'gold';
    }
    if (statusLower.includes('applied') || statusLower.includes('processing')) {
      return 'processing';
    }
    return 'pending';
  }

  formatStatus(status: string): string {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  getTimelineProgress(student: any): number {
    if (!student) return 0;
    const status = student.applicationStatus;

    if (status === 'VISA_STAMPED' || status === 'VISA_COMPLETED') return 7;
    if (status === 'PASSPORT_SUBMITTED_TO_EMBASSY') return 6;
    if (status === 'VISA_APPLIED') return 5;
    if (status === 'PASSPORT_COLLECTED') return 4;
    if (status === 'VISA_FEE_RECEIVED') return 3;
    if (student.accToVisaManPaidAmount && student.accToVisaManPaidAmount > 0) return 2;
    if (status === 'VISA_PAYMENT_CONFIRMED' || student.accToVisaManStatus === 'PAID') return 2;
    if (student.visaPaymentRequestedAmount && student.visaPaymentRequestedAmount > 0) return 1;
    if (status === 'VISA_FEE_PENDING') return 1;

    return 0;
  }

  formatAction(action: string): string {
    if (!action) return 'No Action Required';

    const actionMap: { [key: string]: string } = {
      'NEED_APPLY_VISA': 'Apply for Visa',
      'COLLECT_PASSPORT_FRM_DOC_PERSON': 'Collect Passport & Apply Visa',
      'NEED_SUBMIT_PASSPORT_TO_EMBASSY': 'Submit Passport to Embassy',
      'NEED_TO_ISSUE_VISA': 'Mark Visa Stamped',
      'NEED_TO_RETURN_VISA': 'Return Docs to Doc Person',
      'REQUEST_FOR_VISA_PAYMENT_TO_ACCOUNTANT': 'Request Payment'
    };

    return actionMap[action] || action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }



  getActionButton(student: Student): { label: string; action: () => void; icon: string } | null {
    switch (student.action) {
      case 'COLLECT_PASSPORT_FRM_DOC_PERSON':
        // 1. Collect Passport
        return { label: 'Collect Passport', action: () => this.collectPassport(student), icon: 'fas fa-book' };
      case 'NEED_APPLY_VISA':
        // 2. Apply for Visa
        return { label: 'Apply for Visa', action: () => this.applyForVisa(student), icon: 'fas fa-file-signature' };
      case 'NEED_SUBMIT_PASSPORT_TO_EMBASSY':
        // 3. Submit to Embassy
        return { label: 'Submit to Embassy', action: () => this.submitToEmbassy(student), icon: 'fas fa-paper-plane' };
      case 'NEED_TO_ISSUE_VISA':
        // 4. Mark Stamped
        return { label: 'Mark Visa Stamped', action: () => this.markVisaStamped(student), icon: 'fas fa-stamp' };
      case 'NEED_TO_RETURN_VISA':
        // 5. Return Docs
        return { label: 'Return to Doc Person', action: () => this.confirmReturnDocs(student), icon: 'fas fa-undo' };
      default:
        return null;
    }
  }



  // Open passport document in new tab
  openPassportDocument(path: string | undefined): void {
    if (!path) return;
    const url = this.fileService.getFileUrl(path);
    window.open(url, '_blank');
  }

  // Format date for display
  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  // ============================================
  // FUND REQUESTS (Restored)
  // ============================================
  fundRequestForm = {
    amount: null,
    purpose: '',
    paymentMode: 'UPI',
    upiId: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: '',
    bankDetails: '',
    qrCodeBase64: ''
  };

  showHistoryModal: boolean = false;
  selectedHistoryRequest: any = null;
  showAllHistory: boolean = false;

  get displayedHistory(): any[] {
    if (!this.selectedStudent || !this.selectedStudent.studentStatusHistory) return [];
    // Clone and reverse so the latest is first
    const reversed = [...this.selectedStudent.studentStatusHistory].reverse();
    if (this.showAllHistory) {
      return reversed;
    }
    // Show only the latest 2
    return reversed.slice(0, 2);
  }

  toggleHistory(): void {
    this.showAllHistory = !this.showAllHistory;
  }

  openHistoryModal(req: any): void {
    this.selectedHistoryRequest = req;
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.selectedHistoryRequest = null;
  }

  getPendingAmount(req: any): number {
    return (req.remainingAmount !== undefined) ? req.remainingAmount : Math.max(0, (req.requestedAmount || 0) - (req.amountPaid || 0));
  }

  isQrUploading: boolean = false;

  onQrCodeSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Max 5MB allowed.');
        return;
      }

      this.isQrUploading = true;
      this.resizeImage(file, 800, 800).then(
        (resizedBase64: string) => {
          this.qrCodePreview = resizedBase64;
          this.fundRequestForm.qrCodeBase64 = resizedBase64;
          this.isQrUploading = false;
          this.cdr.detectChanges();
        },
        (err) => {
          console.error('Image resize error', err);
          alert('Failed to process image.');
          this.isQrUploading = false;
          this.cdr.detectChanges();
        }
      );
    }
  }

  private resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const elem = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
          elem.width = width;
          elem.height = height;
          const ctx = elem.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(elem.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  }

  submitFundRequest(): void {
    if (!this.fundRequestForm.amount || !this.fundRequestForm.purpose) {
      alert('Please fill in amount and purpose.');
      return;
    }

    let detailsString = '';

    if (this.fundRequestForm.paymentMode === 'UPI') {
      if (!this.fundRequestForm.upiId) {
        alert('Please enter UPI ID.');
        return;
      }
      detailsString = `UPI ID: ${this.fundRequestForm.upiId}`;
    } else {
      if (!this.fundRequestForm.accountNumber || !this.fundRequestForm.accountHolderName || !this.fundRequestForm.ifscCode || !this.fundRequestForm.branchName) {
        alert('Please fill all bank details.');
        return;
      }
      if (this.fundRequestForm.accountNumber !== this.fundRequestForm.confirmAccountNumber) {
        alert('Account numbers do not match.');
        return;
      }
      detailsString = `Bank Transfer
Account Holder: ${this.fundRequestForm.accountHolderName}
Account No: ${this.fundRequestForm.accountNumber}
IFSC: ${this.fundRequestForm.ifscCode}
Branch: ${this.fundRequestForm.branchName}`;
    }

    const request: any = {
      requesterUsername: this.currentUsername,
      requesterFullName: this.visaManProfile?.fullName || this.currentUsername || 'Visa Man',
      requesterRole: 'VisaManager',
      purpose: this.fundRequestForm.purpose,
      requestedAmount: this.fundRequestForm.amount,
      requesterPaymentMode: this.fundRequestForm.paymentMode,
      bankDetails: detailsString,
      qrCode: this.fundRequestForm.qrCodeBase64
    };

    this.isFundSubmitting = true;
    this.paymentRequestService.createRequest(request)
      .subscribe({
        next: (res) => {
          this.isFundSubmitting = false;
          this.showSuccess('Fund request submitted successfully!');
          this.resetFundForm();
          this.loadMyRequests();
        },
        error: (err) => {
          this.isFundSubmitting = false;
          console.error('Error submitting fund request', err);
          this.showToast('error', 'Failed to submit request.');
        }
      });
  }

  resetFundForm(): void {
    this.fundRequestForm = {
      amount: null,
      purpose: '',
      paymentMode: 'UPI',
      upiId: '',
      accountNumber: '',
      confirmAccountNumber: '',
      accountHolderName: '',
      ifscCode: '',
      branchName: '',
      bankDetails: '',
      qrCodeBase64: ''
    };
    this.qrCodePreview = null;
  }

  loadMyRequests(): void {
    this.isRefreshing = true;
    this.paymentRequestService.getRequestsByUsername(this.currentUsername)
      .subscribe({
        next: (requests: any) => {
          this.myFundRequests = requests;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading fund requests', err);
          this.isRefreshing = false;
          this.cdr.detectChanges();
        }
      });
  }

  getFundStatusClass(status: string | undefined): string {
    if (!status) return 'status-default';
    switch (status) {
      case 'PENDING': return 'status-warning';
      case 'PAID': return 'status-success';
      case 'PARTIAL': return 'status-info';
      case 'REJECTED': return 'status-danger';
      default: return 'status-default';
    }
  }

  // Count of paid or partially paid fund requests
  get paidFundRequestsCount(): number {
    return this.myFundRequests.filter(r => r.status === 'PAID' || r.status === 'PARTIAL').length;
  }

  // Format DateTime for passbook
  formatDateTime(dateStr: string): string {
    if (!dateStr) return '-';
    let formattedStr = dateStr;
    if (Array.isArray(dateStr)) {
      formattedStr = `${dateStr[0]}-${String(dateStr[1]).padStart(2, '0')}-${String(dateStr[2]).padStart(2, '0')}T${String(dateStr[3]).padStart(2, '0')}:${String(dateStr[4]).padStart(2, '0')}`;
    }
    const date = new Date(formattedStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPassbookStatusClass(status: string): string {
    if (!status) return 'pb-status-pending';
    switch (status) {
      case 'INITIATED': return 'pb-status-initiated';
      case 'SENT_TO_AGENT': return 'pb-status-warning';
      case 'ACCOUNTANT_CONFIRMED': return 'pb-status-info';
      case 'PAID_TO_VISAMAN': return 'pb-status-success';
      case 'COMPLETED': return 'pb-status-completed';
      default: return 'pb-status-pending';
    }
  }

  // ==================== COMPANY FUND RELEASES ====================
  fetchFundReleases() {
    this.isRefreshing = true;
    this.http.get<any[]>(`${this.API_URL}/visa-man/fund-releases?username=${this.currentUsername}`).subscribe({
      next: (res) => {
        this.fundReleases = res;
        this.isRefreshing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch fund releases', err);
        this.isRefreshing = false;
      }
    });
  }

  viewFundReleaseDetails(release: any) {
    this.selectedFundRelease = release;
    this.showFundReleaseModal = true;
  }

  closeFundReleaseModal() {
    this.showFundReleaseModal = false;
    this.selectedFundRelease = null;
  }

  confirmRemarks: string = '';

  confirmFundRelease(releaseId: number) {
    this.openConfirmModal(
      'Confirm Funds Received',
      'Are you sure you have received these funds in your account?',
      () => {
        const payload = { remarks: this.confirmRemarks || 'Confirmed Receipt' };
        this.http.post(`${this.API_URL}/visa-man/fund-releases/${releaseId}/confirm?username=${this.currentUsername}`, payload).subscribe({
          next: () => {
            this.showSuccess('Funds receipt confirmed successfully.');
            this.fetchFundReleases();
            this.closeFundReleaseModal();
          },
          error: (err: any) => {
            console.error(err);
            this.showToast('error', 'Failed to confirm receipt');
          }
        });
      }
    );
  }

  rejectReason: string = '';
  rejectRemarks: string = '';
  showRejectForm: boolean = false;

  toggleRejectForm() {
    this.showRejectForm = !this.showRejectForm;
  }

  rejectFundRelease(releaseId: number) {
    if (!this.rejectReason) {
      this.showToast('error', 'Reason is required for rejection');
      return;
    }
    this.openConfirmModal(
      'Reject Fund Release',
      'Are you sure you want to reject this fund release?',
      () => {
        const payload = { reason: this.rejectReason, remarks: this.rejectRemarks };
        this.http.post(`${this.API_URL}/visa-man/fund-releases/${releaseId}/reject?username=${this.currentUsername}`, payload).subscribe({
          next: () => {
            this.showSuccess('Fund release has been rejected.');
            this.fetchFundReleases();
            this.closeFundReleaseModal();
            this.showRejectForm = false;
            this.rejectReason = '';
            this.rejectRemarks = '';
          },
          error: (err: any) => {
            console.error(err);
            this.showToast('error', 'Failed to reject release');
          }
        });
      }
    );
  }

  get pendingReleasesCount() {
    return this.fundReleases.filter(r => r.releaseStatus === 'PENDING_CONFIRMATION' || r.releaseStatus === 'RELEASED_PENDING_CONFIRMATION').length;
  }

  get confirmedReleasesCount() {
    return this.fundReleases.filter(r => r.releaseStatus === 'FUNDS_CONFIRMED' || r.releaseStatus === 'CONFIRMED').length;
  }

  get rejectedReleasesCount() {
    return this.fundReleases.filter(r => r.releaseStatus === 'REJECTED').length;
  }

  get totalReleasedAmount() {
    return this.fundReleases.reduce((sum, r) => sum + (r.totalReleasedAmount || 0), 0);
  }

  get currentMonthReleasedAmount() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return this.fundReleases
      .filter(r => {
        if (!r.releasedDate) return false;
        const date = new Date(r.releasedDate);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, r) => sum + (r.totalReleasedAmount || 0), 0);
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