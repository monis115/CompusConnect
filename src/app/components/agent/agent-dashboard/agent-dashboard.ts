import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AdminAuthService } from '../../../services/admin-auth-service';
import { AgentService, AgentData, Student, College, Location as AgentLocation } from '../../../services/agent.service';
import { HttpClient } from '@angular/common/http';

// --- Updated Enum based on your provided list ---
export enum StudentStatus {
  REGISTERED = 'REGISTERED',
  CONDITIONAL_OFFER_LETTER_GENERATED = 'CONDITIONAL_OFFER_LETTER_GENERATED',
  PENDING_ADMISSION_LETTER = 'PENDING_ADMISSION_LETTER',
  ADMISSION_LETTER_GENERATED = 'ADMISSION_LETTER_GENERATED',
  ADMISSION_LETTER_APPROVED = 'ADMISSION_LETTER_APPROVED',

  APPLIED_FOR_TELEX = 'APPLIED_FOR_TELEX',
  TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY = 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY',
  TELEX_APPLICATION_SUBMITTED_TO_MEA = 'TELEX_APPLICATION_SUBMITTED_TO_MEA',
  TELEX_NUMBER_ISSUED = 'TELEX_NUMBER_ISSUED',

  VISA_FEE_PENDING = 'VISA_FEE_PENDING',
  VISA_FEE_RECEIVED = 'VISA_FEE_RECEIVED',
  VISA_APPLIED = 'VISA_APPLIED',
  PASSPORT_SUBMITTED_TO_EMBASSY = 'PASSPORT_SUBMITTED_TO_EMBASSY',
  VISA_STAMPED = 'VISA_STAMPED',

  READY_FOR_TRAVEL = 'READY_FOR_TRAVEL',
  REJECTED = 'REJECTED'
}

// Telex Form Data Interface
interface TelexFormData {
  passportValidationDate: string;
  telexPaymentAmount: number | null;
  telexPaymentTxId: string;
  passportNumber: string;
}

// --- Animations ---
const listAnimation = trigger('listAnimation', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(15px)' }),
      stagger('50ms', [
        animate('300ms 150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

@Component({
  selector: 'app-agent-dashboard',
  standalone: false,
  templateUrl: './agent-dashboard.html',
  styleUrls: ['./agent-dashboard.css'],
  animations: [listAnimation]
})
export class AgentDashboard implements OnInit {
  public readonly StudentStatus = StudentStatus;

  // --- View State ---
  currentView: 'dashboard' | 'students' | 'register' | 'profile' | 'student-detail' = 'dashboard';
  isLoading = true;
  isRefreshing = false;
  isSidebarCollapsed = false;
  error: string | null = null;

  // --- Data ---
  agentData: AgentData | null = null;
  students: Student[] = [];
  selectedStudent: Student | null = null;

  // --- Stats & Widgets ---
  stats = { totalStudents: 0, pending: 0, approved: 0, completed: 0, rejected: 0 };
  dashboardTasks: any[] = [];
  collegeDistribution: any[] = [];

  // --- Filters ---
  searchQuery: string = '';
  statusFilter: string = 'all';

  // --- Modals ---
  isHistoryModalOpen = false;
  selectedStudentForHistory: any | null = null;

  // --- Telex Modal State ---
  isTelexModalOpen = false;
  isSubmittingTelex = false;
  isSuccessModalOpen = false;
  studentForTelex: Student | null = null;

  telexForm: TelexFormData = {
    passportValidationDate: '',
    telexPaymentAmount: null,
    telexPaymentTxId: '',
    passportNumber: ''
  };

  telexFiles: { passport: File | null, screenshot: File | null } = {
    passport: null,
    screenshot: null
  };

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private authService: AdminAuthService,
    private agentService: AgentService,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAgentData();
  }

  // --- Core Data Loading ---
  loadAgentData(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    const authUser = this.authService.getUserData();

    if (authUser && authUser.username) {
      this.agentService.getAgentProfile(authUser.username).subscribe({
        next: (data: AgentData) => {
          this.agentData = data;
          this.students = data.student || [];

          this.calculateStats();
          this.generateDashboardTasks();
          this.generateCollegeDistribution();

          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to fetch agent profile:', err);
          this.error = 'Failed to load data.';
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.error = 'Not authenticated.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  refreshDashboard(): void {
    this.isRefreshing = true;
    this.loadAgentData();
  }

  // --- Logic ---
  calculateStats(): void {
    if (!this.students) return;
    this.stats.totalStudents = this.students.length;
    this.stats.pending = this.students.filter(s =>
      ['REGISTERED', 'PENDING_ADMISSION_LETTER'].includes(s.applicationStatus)
    ).length;
    this.stats.approved = this.students.filter(s =>
      ['VISA_STAMPED', 'ADMISSION_LETTER_APPROVED', 'TELEX_NUMBER_ISSUED'].includes(s.applicationStatus)
    ).length;
    this.stats.completed = this.students.filter(s => s.applicationStatus === 'READY_FOR_TRAVEL').length;
    this.stats.rejected = this.students.filter(s => s.applicationStatus === 'REJECTED').length;
  }

  generateDashboardTasks(): void {
    // Show students where Action is required by Agent or those with ADMISSION_LETTER_APPROVED status
    this.dashboardTasks = this.students
      .filter(s =>
        s['actionOnUser'] === 'AGENT' ||
        s['actionOnUser'] === 'agent' ||
        s.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED ||
        (s['action'] === 'INITIATE_TELEX' && s['actionOnUser'] === 'agent')
      )
      .slice(0, 10); // Show top 10 action items
  }

  generateCollegeDistribution(): void {
    if (!this.students) return;
    const countMap = new Map<string, number>();
    this.students.forEach(s => {
      if (s.college) {
        const name = s.college.collegeName;
        countMap.set(name, (countMap.get(name) || 0) + 1);
      }
    });

    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    let idx = 0;
    this.collegeDistribution = Array.from(countMap.entries()).map(([name, count]) => ({
      collegeName: name,
      count: count,
      color: colors[idx++ % colors.length]
    }));
  }

  // --- Navigation & Views ---
  navigateTo(view: any): void {
    this.currentView = view;
    if (view !== 'student-detail') this.selectedStudent = null;
    this.cdr.detectChanges();
  }

  viewStudentDetails(student: Student): void {
    this.selectedStudent = student;
    this.currentView = 'student-detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  // --- Helper Methods ---
  getStatusColor(status: string): string {
    if (!status) return '#64748B';
    if (status.includes('APPROVED') || status.includes('STAMPED') || status === 'READY_FOR_TRAVEL') return '#10B981';
    if (status.includes('PENDING') || status.includes('REGISTERED')) return '#F59E0B';
    if (status.includes('REJECTED')) return '#EF4444';
    if (status.includes('TELEX') || status.includes('VISA')) return '#6366F1';
    return '#64748B';
  }

  formatStatus(status: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  }

  getCurrentDate(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date().toLocaleDateString('en-US', options);
  }

  // --- Additional Stats Methods ---
  getVisaStampedCount(): number {
    return this.students.filter(s => s.applicationStatus === 'VISA_STAMPED').length;
  }

  getTelexPendingCount(): number {
    return this.students.filter(s =>
      s.applicationStatus === 'ADMISSION_LETTER_APPROVED' ||
      s.applicationStatus === 'APPLIED_FOR_TELEX'
    ).length;
  }

  getDocsPendingCount(): number {
    return this.students.filter(s =>
      s.applicationStatus === 'REGISTERED' ||
      s.applicationStatus === 'PENDING_ADMISSION_LETTER'
    ).length;
  }

  getRejectedStudents(): Student[] {
    return this.students.filter(s => s.applicationStatus === 'REJECTED');
  }

  // --- TELEX OPERATIONS ---
  showInitiateTelexButton(student: any): boolean {
    // Check if action field indicates INITIATE_TELEX
    if (student.action === 'INITIATE_TELEX' && student.actionOnUser === 'agent') return true;
    // Fallback to status check
    if (student.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED) return true;
    return false;
  }

  openTelexModal(student: Student): void {
    this.studentForTelex = student;
    this.telexForm = {
      passportValidationDate: '',
      telexPaymentAmount: null,
      telexPaymentTxId: '',
      passportNumber: student.passportNo || ''
    };
    this.telexFiles = { passport: null, screenshot: null };
    this.isTelexModalOpen = true;
    this.cdr.detectChanges();
  }

  onFileSelected(event: any, type: 'passport' | 'screenshot'): void {
    if (event.target.files && event.target.files.length > 0) {
      this.telexFiles[type] = event.target.files[0];
    }
  }

  submitTelexApplication(): void {
    if (!this.studentForTelex || !this.agentData) return;

    // Validate
    if (!this.telexForm.passportValidationDate || !this.telexForm.telexPaymentAmount ||
      !this.telexForm.telexPaymentTxId || !this.telexForm.passportNumber ||
      !this.telexFiles.passport || !this.telexFiles.screenshot) {
      alert('Please complete all fields and upload both documents.');
      return;
    }

    this.isSubmittingTelex = true;
    this.cdr.detectChanges();

    // 1. Create JSON Details Object
    const detailsObj = {
      passportValidationDate: this.telexForm.passportValidationDate,
      telexPaymentAmount: this.telexForm.telexPaymentAmount,
      telexPaymentTxId: this.telexForm.telexPaymentTxId,
      passportNumber: this.telexForm.passportNumber,
      agentUsername: this.agentData.userId
    };

    // 2. Create FormData
    const formData = new FormData();
    formData.append('details', JSON.stringify(detailsObj));
    formData.append('passport', this.telexFiles.passport);
    formData.append('screenshot', this.telexFiles.screenshot);

    // 3. Send Request
    const url = `http://localhost:8080/api/agents/apply-for-telex/${this.studentForTelex.id}`;

    this.http.post(url, formData).subscribe({
      next: (res) => {
        this.isSubmittingTelex = false;
        this.isTelexModalOpen = false;
        this.isSuccessModalOpen = true;
        this.refreshDashboard();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Telex Application Error', err);
        alert('Failed to submit application.');
        this.isSubmittingTelex = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeTelexModal(): void {
    this.isTelexModalOpen = false;
    this.studentForTelex = null;
  }

  // --- History & Docs ---
  openHistoryModal(student: any): void {
    this.selectedStudentForHistory = student;
    this.isHistoryModalOpen = true;
    this.cdr.detectChanges();
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen = false;
    this.selectedStudentForHistory = null;
  }

  downloadFile(path: string | undefined): void {
    if (!path) {
      alert('File not found');
      return;
    }
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = `http://localhost:8080/${cleanPath}`;
    window.open(url, '_blank');
  }

  isLoggingOut = false;

  logout(): void {
    this.isLoggingOut = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.authService.logout();
      this.router.navigate(['/AdminLogin']);
    }, 1900);
  }
}