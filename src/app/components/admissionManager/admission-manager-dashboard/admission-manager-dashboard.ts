import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, finalize } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AdmissionManagerService } from '../../../services/admission-manager.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

// --- Interfaces ---
interface User {
  id: number;
  fullName: string;
  email: string;
  username: string;
}

interface StatusHistory {
  id: number;
  studentApplicationStatus: string;
  updatedBy: string;
  updatedAt: string;
  newStatus: string;
}

interface Student {
  action: any;
  actionOnUser: string;
  id: number;
  fullName: string;
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
  college: { id: number; collegeName: string } | null;
  // Docs - Basic
  confirmationPagePath: string | null;
  conditionalOfferLetterPath: string | null;
  admissionLetterPathInternal: string | null;
  profileImagePath: string | null;
  // Docs - Telex
  telexDocumentsPath: string | null;
  telexPaymentScreenshotPath: string | null;
  // Docs - Visa
  visaPhotoPath: string | null;
  visaPassportCopyPath: string | null;
  // Docs - Payment
  ttCopyPath: string | null;
  paymentConfirmationPath: string | null;
  // Workflow
  telexMan: User | null;
  visaMan: User | null;
  telexNumber: string | null;
  telexIssueDate: string | null;
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

  // Dropdown Data
  availableTelexManagers: { username: string; studentCount: number }[] = [];
  availableVisaManagers: { username: string; studentCount: number }[] = [];

  // Views & Lists
  activeView: 'dashboard' | 'actions-required' | 'pending-university' | 'processing' | 'completed' | 'reports' | 'payment' | 'profile' | 'messages' | 'news' = 'dashboard';
  isSidebarCollapsed = false;
  actionRequiredStudents: Student[] = [];
  pendingUniversityStudents: Student[] = [];
  processingStudents: Student[] = [];
  allStudents: Student[] = [];
  filteredList: Student[] = [];

  // State
  isLoading = true;
  isRefreshing = false;
  isSubmitting = false;
  searchTerm = '';
  isFullscreen = false;
  isLoadingMessages = false;

  getMessagesCount(): number {
    return 0; // Placeholder for now
  }

  // Modals
  showStudentDetail = false;
  showActionModal = false;
  showSuccessModal = false;
  successModalMessage = '';

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
  private readonly NEWS_API_URL = 'http://localhost:8080/api/news';

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
  actionType: 'forward' | 'approve' | 'assign-telex' | 'assign-visa' | null = null;
  selectedManagerUsername: string = '';

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
    private http: HttpClient
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
  }

  switchView(view: typeof this.activeView): void {
    this.activeView = view;
    this.searchTerm = '';

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
    } else {
      this.filterStudents();
    }
    this.cdr.detectChanges();
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
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredList = sourceList.filter(student =>
      !term ||
      student.fullName?.toLowerCase().includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.passportNo?.toLowerCase().includes(term)
    );
  }

  // --- Action Handling (Fixing the Modal Bug) ---

  initiateForwardToUniversity(student: Student): void {
    this.studentForAction = student;
    this.actionType = 'forward';
    this.showActionModal = true;
    this.cdr.detectChanges();
  }

  initiateApproveLetter(student: Student): void {
    this.studentForAction = student;
    this.actionType = 'approve';
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
    setTimeout(() => { this.selectedStudent = null; }, 200);
    this.cdr.detectChanges();
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
    if (!path) return '';
    return `http://localhost:8080/${path}`;
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
}