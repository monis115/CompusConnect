import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef, ViewChild } from '@angular/core';
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
  activeView: 'dashboard' | 'actions-required' | 'pending-university' | 'processing' | 'completed' | 'reports' | 'payment' | 'profile' | 'messages' | 'news' | 'sessions' | 'travel' | 'travelling' = 'dashboard';
  isSidebarCollapsed = false;
  actionRequiredStudents: Student[] = [];
  pendingUniversityStudents: Student[] = [];
  processingStudents: Student[] = [];
  allStudents: Student[] = [];
  filteredList: Student[] = [];

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

  travelFilterAgent = '';
  travelFilterCollege = '';
  travelFilterStartDate = '';
  travelFilterEndDate = '';

  get filteredTravelStudents(): Student[] {
    return this.travelStudents.filter(s => {
      if (this.travelFilterAgent && s.agent?.fullName !== this.travelFilterAgent) return false;
      if (this.travelFilterCollege && s.college?.collegeName !== this.travelFilterCollege) return false;
      if (this.travelFilterStartDate && s.travelDoj) {
        if (new Date(s.travelDoj) < new Date(this.travelFilterStartDate)) return false;
      }
      if (this.travelFilterEndDate && s.travelDoj) {
        if (new Date(s.travelDoj) > new Date(this.travelFilterEndDate)) return false;
      }
      return true;
    });
  }

  get filteredDocReturnStudents(): Student[] {
    return this.docReturnStudents.filter(s => {
      if (this.travelFilterAgent && s.agent?.fullName !== this.travelFilterAgent) return false;
      if (this.travelFilterCollege && s.college?.collegeName !== this.travelFilterCollege) return false;
      if (this.travelFilterStartDate && s.documentReturnRequest?.travelDate) {
        if (new Date(s.documentReturnRequest.travelDate) < new Date(this.travelFilterStartDate)) return false;
      }
      if (this.travelFilterEndDate && s.documentReturnRequest?.travelDate) {
        if (new Date(s.documentReturnRequest.travelDate) > new Date(this.travelFilterEndDate)) return false;
      }
      return true;
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

  constructor(
    private admissionService: AdmissionManagerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private fileService: FileService
  ) { }

  ngOnInit(): void {
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
    console.log('Total aggregated students:', this.allStudents.length);

    this.actionRequiredStudents = this.allStudents.filter(s => s.actionOnUser === 'admission_manager');
    this.pendingUniversityStudents = this.allStudents.filter(s => s.actionOnUser === 'UniversityCoordinator');
    this.processingStudents = this.allStudents.filter(s =>
      s.actionOnUser !== 'admission_manager' &&
      s.actionOnUser !== 'UniversityCoordinator' &&
      s.actionOnUser !== null
    );

    this.travelStudents = this.allStudents.filter(s => (s.travelDoj || s.travelAirlines) && !s.hasRaiseReturnRequest);
    this.docReturnStudents = this.allStudents.filter(s => !!s.hasRaiseReturnRequest);

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
    if (view === 'actions-required' || view === 'pending-university' || view === 'processing' || view === 'completed' || view === 'travelling') {
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

  filterStudents(): void {
    let sourceList: Student[] = [];
    switch (this.activeView) {
      case 'actions-required': sourceList = this.actionRequiredStudents; break;
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
}