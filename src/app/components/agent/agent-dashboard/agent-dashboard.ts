import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AdminAuthService } from '../../../services/admin-auth-service';
import { AgentService, AgentData, Student, College, Location as AgentLocation, DashboardStats, StatusBreakdown, DashboardActivity } from '../../../services/agent.service';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TelexApplicationService } from '../../../services/telex-application.service';
import { TelexApplicationDTO } from '../../../models/telex-application.model';

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
  currentView: 'dashboard' | 'students' | 'register' | 'profile' | 'student-detail' | 'action' | 'in-process' | 'visa-stamped' | 'reports' | 'payments' | 'messages' = 'dashboard';
  isLoading = true;
  isRefreshing = false;
  isReloadingData = false; // For floating button
  isSidebarCollapsed = false;
  error: string | null = null;

  // --- Data ---
  agentData: AgentData | null = null;
  students: Student[] = [];
  selectedStudent: Student | null = null;

  // --- Stats & Widgets ---
  stats = { totalStudents: 0, pending: 0, approved: 0, completed: 0, rejected: 0 };

  // --- New Dashboard Data ---
  dashboardStats: DashboardStats | null = null;
  statusBreakdown: StatusBreakdown[] = [];
  recentActivities: DashboardActivity[] = [];

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

  isSuccessModalOpen = false;
  studentForTelex: Student | null = null;

  // --- Logout Confirmation Modal ---
  isLogoutModalOpen = false;

  // --- Logout Messages ---
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

  // --- Telex Form State ---
  telexForm!: FormGroup;
  currentStep = 1;
  totalSteps = 3;
  isSubmittingTelex = false;

  // File storage
  visaPhotoFile: File | null = null;
  visaPassportCopyFile: File | null = null;
  ttCopyFile: File | null = null;
  paymentConfirmationFile: File | null = null;

  // --- Validation Modal State ---
  isValidationModalOpen = false;
  validationMessage = '';

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private authService: AdminAuthService,
    private agentService: AgentService,
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private telexService: TelexApplicationService
  ) { }

  ngOnInit(): void {
    this.loadAgentData();
  }

  // --- Core Data Loading ---


  refreshDashboard(): void {
    this.isReloadingData = true;
    this.cdr.detectChanges();

    // 1.9 second delay as requested
    setTimeout(() => {
      this.loadAgentData();
    }, 1900);
  }

  // --- Data Loading Internal ---
  private loadDataInternal(username: string): void {
    this.agentService.getAgentProfile(username).subscribe({
      next: (data: AgentData) => {
        this.agentData = data;
        this.students = data.student || [];

        this.calculateStats();
        this.generateDashboardTasks();
        this.generateCollegeDistribution();

        // Fetch new dashboard data
        this.fetchDashboardData(username);

        this.isLoading = false;
        this.isRefreshing = false;
        this.isReloadingData = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch agent profile:', err);
        this.error = 'Failed to load data.';
        this.isLoading = false;
        this.isRefreshing = false;
        this.isReloadingData = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadAgentData(): void {
    // If it's a full reload (not refresh), show main loader
    if (!this.isReloadingData && !this.isRefreshing) {
      this.isLoading = true;
    }
    this.cdr.detectChanges();

    const authUser = this.authService.getUserData();

    if (authUser && authUser.username) {
      this.loadDataInternal(authUser.username);
    } else {
      this.error = 'Not authenticated.';
      this.isLoading = false;
      this.isReloadingData = false;
      this.cdr.detectChanges();
    }
  }

  fetchDashboardData(username: string): void {
    this.agentService.getDashboardStats(username).subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch dashboard stats', err)
    });

    this.agentService.getStatusBreakdown(username).subscribe({
      next: (breakdown) => {
        this.statusBreakdown = breakdown;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch status breakdown', err)
    });

    this.agentService.getRecentActivities(username).subscribe({
      next: (activities) => {
        this.recentActivities = activities;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch recent activities', err)
    });
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
      .sort((a, b) => {
        // Sort by registration date (latest first)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      })
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

  get filteredStudents(): Student[] {
    let filtered = this.students;

    // 1. View Filtering
    if (this.currentView === 'visa-stamped') {
      filtered = filtered.filter(s => s.applicationStatus === 'VISA_STAMPED');
    } else if (this.currentView === 'action') {
      // Show students where Action is required by Agent or those with ADMISSION_LETTER_APPROVED status
      filtered = filtered.filter(s =>
        s['actionOnUser'] === 'AGENT' ||
        s['actionOnUser'] === 'agent' ||
        s.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED ||
        (s['action'] === 'INITIATE_TELEX' && s['actionOnUser'] === 'agent')
      );
    } else if (this.currentView === 'in-process') {
      // "put all student in m process section" - User Request
      // We will show all students here as requested, but EXCLUDE VISA_STAMPED
      filtered = this.students.filter(s => s.applicationStatus !== 'VISA_STAMPED');
    }

    // 2. Search Filtering
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.college?.collegeName || '').toLowerCase().includes(query)
      );
    }

    // 3. Sort by registration date (createdAt) - Latest first
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (latest first)
    });

    return filtered;
  }

  getViewTitle(): string {
    switch (this.currentView) {
      case 'dashboard': return 'Dashboard';
      case 'students': return 'All Students';
      case 'in-process': return 'In Process';
      case 'visa-stamped': return 'Visa Stamped';
      case 'action': return 'Action Required';
      case 'reports': return 'Reports';
      case 'payments': return 'Payments';
      case 'register': return 'Register New';
      case 'profile': return 'My Profile';
      case 'messages': return 'Messages';
      default: return 'Dashboard';
    }
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
  getAllStudentsCount(): number {
    return this.students ? this.students.length : 0;
  }

  getActionRequiredCount(): number {
    return this.dashboardTasks ? this.dashboardTasks.length : 0;
  }

  getMessagesCount(): number {
    return 0; // Placeholder
  }

  getInProcessCount(): number {
    return this.students ? this.students.filter(s => s.applicationStatus !== 'VISA_STAMPED').length : 0;
  }

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





  // --- History & Docs ---
  openTelexModal(student: Student): void {
    this.studentForTelex = student;
    this.currentStep = 1;
    this.initTelexForm();
    this.prefillData(student);
    this.isTelexModalOpen = true;
    this.cdr.detectChanges();
  }

  initTelexForm(): void {
    this.telexForm = this.fb.group({
      // Step 1: Document Dispatch Confirmation
      originalDocsSent: [null, Validators.required],
      docDeliveryMethod: [null],
      courierPartner: [''], // New field
      courierTrackingNumber: [''], // New field
      courierTrackingId: [''], // Combined field for backend
      selfPersonContact: [''],
      docTentativeReachDate: [null],

      // Step 2: Payment Status
      hasPaid: [null, Validators.required],
      paidAmount: [null],
      paidTo: [null],
      paymentType: [null],
      paymentDueDate: [null],

      // Step 2: Personal Details (Mandatory)
      surname: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      sex: ['', Validators.required],
      countryOfBirth: ['India', Validators.required],
      dateOfBirth: ['', Validators.required],
      placeOfBirth: ['', Validators.required],
      maritalStatus: ['SINGLE', Validators.required],
      citizenship: ['Indian', Validators.required],
      previousCitizenship: [''],
      passportType: ['ORDINARY', Validators.required],
      passportNumber: ['', Validators.required],
      passportIssueDate: ['', Validators.required],
      passportExpirationDate: ['', Validators.required],
      passportIssuedBy: ['', Validators.required],
    });
    this.setupConditionalValidation();
  }

  setupConditionalValidation(): void {
    // Document Tracking Logic
    // Document Tracking Logic
    this.telexForm.get('originalDocsSent')?.valueChanges.subscribe(sent => {
      const methodControl = this.telexForm.get('docDeliveryMethod');
      const dateControl = this.telexForm.get('docTentativeReachDate');
      const partnerControl = this.telexForm.get('courierPartner');
      const trackingNumControl = this.telexForm.get('courierTrackingNumber');
      const contactControl = this.telexForm.get('selfPersonContact');

      if (sent === true || sent === 'true') {
        methodControl?.setValidators(Validators.required);
        dateControl?.setValidators(Validators.required);
      } else {
        methodControl?.clearValidators();
        methodControl?.setValue(null);

        // Also clear children of method
        partnerControl?.clearValidators();
        trackingNumControl?.clearValidators();
        contactControl?.clearValidators();
        partnerControl?.setValue('');
        trackingNumControl?.setValue('');
        contactControl?.setValue('');

        dateControl?.clearValidators(); // Changed from setValidators(Validators.required)
        dateControl?.setValue(null); // Added
      }
      methodControl?.updateValueAndValidity();
      dateControl?.updateValueAndValidity();
      partnerControl?.updateValueAndValidity();
      trackingNumControl?.updateValueAndValidity();
      contactControl?.updateValueAndValidity();
    });

    this.telexForm.get('docDeliveryMethod')?.valueChanges.subscribe(method => {
      const partnerControl = this.telexForm.get('courierPartner');
      const trackingNumControl = this.telexForm.get('courierTrackingNumber');
      const contactControl = this.telexForm.get('selfPersonContact');

      if (method === 'COURIER') {
        partnerControl?.setValidators(Validators.required);
        trackingNumControl?.setValidators(Validators.required);
        contactControl?.clearValidators();
        contactControl?.setValue('');
      } else if (method === 'SELF_PERSON') {
        contactControl?.setValidators(Validators.required);
        partnerControl?.clearValidators();
        trackingNumControl?.clearValidators();
        partnerControl?.setValue('');
        trackingNumControl?.setValue('');
      } else {
        partnerControl?.clearValidators();
        trackingNumControl?.clearValidators();
        contactControl?.clearValidators();
        partnerControl?.setValue('');
        trackingNumControl?.setValue('');
        contactControl?.setValue('');
      }
      partnerControl?.updateValueAndValidity();
      trackingNumControl?.updateValueAndValidity();
      contactControl?.updateValueAndValidity();
    });

    // Payment Logic
    this.telexForm.get('hasPaid')?.valueChanges.subscribe(paid => {
      const amountControl = this.telexForm.get('paidAmount');
      const paidToControl = this.telexForm.get('paidTo');
      const typeControl = this.telexForm.get('paymentType');
      const dueDateControl = this.telexForm.get('paymentDueDate');

      if (paid === true || paid === 'true') {
        amountControl?.setValidators(Validators.required);
        paidToControl?.setValidators(Validators.required);
        typeControl?.clearValidators();
        dueDateControl?.clearValidators();

        typeControl?.setValue(null);
        dueDateControl?.setValue(null);
      } else {
        amountControl?.clearValidators();
        paidToControl?.clearValidators();
        amountControl?.setValue(null);
        paidToControl?.setValue(null);

        typeControl?.setValidators(Validators.required);
        dueDateControl?.setValidators(Validators.required);
      }
      amountControl?.updateValueAndValidity();
      paidToControl?.updateValueAndValidity();
      typeControl?.updateValueAndValidity();
      dueDateControl?.updateValueAndValidity();
    });
  }

  prefillData(student: Student): void {
    if (!student) return;

    this.telexForm.patchValue({
      firstName: student.fullName.split(' ')[0] || '',
      surname: student.fullName.split(' ').slice(1).join(' ') || '',
      passportNumber: student.passportNo || '',
      // Add other mappings as needed
    });
  }

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
      this.authService.logout();
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

  // --- Navigation ---
  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep++;
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  validateCurrentStep(): boolean {
    const controls = this.telexForm.controls;
    let isValid = true;
    let fieldsToValidate: string[] = [];

    if (this.currentStep === 1) {
      fieldsToValidate = ['originalDocsSent'];
      if (controls['originalDocsSent'].value === true) {
        fieldsToValidate.push('docDeliveryMethod', 'docTentativeReachDate');
        if (controls['docDeliveryMethod'].value === 'COURIER') {
          fieldsToValidate.push('courierPartner', 'courierTrackingNumber');
        } else if (controls['docDeliveryMethod'].value === 'SELF_PERSON') {
          fieldsToValidate.push('selfPersonContact');
        }
      } else {
        fieldsToValidate.push('docTentativeReachDate');
      }
    } else if (this.currentStep === 2) {
      fieldsToValidate = [
        'hasPaid', 'surname', 'firstName', 'sex', 'countryOfBirth',
        'dateOfBirth', 'placeOfBirth', 'maritalStatus', 'citizenship',
        'passportType', 'passportNumber', 'passportIssueDate',
        'passportExpirationDate', 'passportIssuedBy'
      ];

      if (controls['hasPaid'].value === true) {
        fieldsToValidate.push('paidAmount', 'paidTo');
      } else {
        fieldsToValidate.push('paymentType', 'paymentDueDate');
      }
    }

    for (const field of fieldsToValidate) {
      const control = controls[field];
      if (control && control.invalid) {
        control.markAsTouched();
        isValid = false;
      }
    }

    // File validation for Step 2
    if (this.currentStep === 2) {
      if (!this.visaPhotoFile) {
        this.validationMessage = 'Visa Photo is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      } else if (!this.visaPassportCopyFile) {
        this.validationMessage = 'Passport Copy is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      } else if (controls['hasPaid'].value === true && controls['paidTo'].value === 'UNIVERSITY' && !this.ttCopyFile) {
        this.validationMessage = 'TT Copy is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      } else if (controls['hasPaid'].value === true && controls['paidTo'].value === 'COMPANY' && !this.paymentConfirmationFile) {
        this.validationMessage = 'Payment Confirmation is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      }
    }

    return isValid;
  }

  goToStep(step: number): void {
    // Allow going back or to next immediate step
    if (step <= this.currentStep + 1) {
      this.currentStep = step;
    }
  }

  // --- File Handling ---
  onFileSelected(event: any, type: string): void {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const fileSizeKB = file.size / 1024;
      const fileSizeMB = fileSizeKB / 1024;

      let isValid = true;
      let errorMessage = '';

      switch (type) {
        case 'visaPhoto':
          if (fileSizeKB > 128) {
            isValid = false;
            errorMessage = 'Photo must be less than 128KB.';
          } else {
            this.visaPhotoFile = file;
          }
          break;
        case 'visaPassportCopy':
          if (fileSizeKB > 256) {
            isValid = false;
            errorMessage = 'Passport copy must be less than 256KB.';
          } else {
            this.visaPassportCopyFile = file;
          }
          break;
        case 'ttCopy':
          if (fileSizeMB > 5) {
            isValid = false;
            errorMessage = 'File must be less than 5MB.';
          } else {
            this.ttCopyFile = file;
          }
          break;
        case 'paymentConfirmation':
          if (fileSizeMB > 5) {
            isValid = false;
            errorMessage = 'File must be less than 5MB.';
          } else {
            this.paymentConfirmationFile = file;
          }
          break;
      }

      if (!isValid) {
        this.validationMessage = errorMessage;
        this.isValidationModalOpen = true;
        this.cdr.detectChanges();
        event.target.value = ''; // Clear the input
      }
    }
  }

  closeValidationModal(): void {
    this.isValidationModalOpen = false;
    this.validationMessage = '';
    this.cdr.detectChanges();
  }

  closeTelexModal(): void {
    this.isTelexModalOpen = false;
    this.studentForTelex = null;
    this.currentStep = 1;
    this.telexForm.reset();
    this.visaPhotoFile = null;
    this.visaPassportCopyFile = null;
    this.ttCopyFile = null;
    this.paymentConfirmationFile = null;
  }

  // --- Submission ---
  submitTelexApplication(): void {
    if (!this.studentForTelex || !this.agentData) return;

    // Final Validation Check
    // Final Validation Check
    if (this.telexForm.invalid) {
      this.telexForm.markAllAsTouched();

      // Identify invalid fields for better feedback
      const invalidFields: string[] = [];
      const controls = this.telexForm.controls;
      for (const name in controls) {
        if (controls[name].invalid) {
          // Convert camelCase to Title Case for display
          const display = name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          invalidFields.push(display);
        }
      }

      this.validationMessage = `Please fill the following required fields: ${invalidFields.join(', ')}`;
      this.isValidationModalOpen = true;
      return;
    }

    this.isSubmittingTelex = true;
    this.cdr.detectChanges();

    const formValues = this.telexForm.value;

    // Construct DTO
    const telexData: TelexApplicationDTO = {
      ...formValues,
      // Map form control 'courierTrackingNumber' to DTO 'courierTrackingId'
      courierTrackingId: formValues.courierTrackingNumber,
      agentUsername: this.agentData.userId
    };

    this.telexService.submitTelexApplication(
      this.studentForTelex.id,
      telexData,
      {
        visaPhoto: this.visaPhotoFile || undefined,
        visaPassportCopy: this.visaPassportCopyFile || undefined,
        ttCopy: this.ttCopyFile || undefined,
        paymentConfirmation: this.paymentConfirmationFile || undefined
      }
    ).subscribe({
      next: (res) => {
        this.isSubmittingTelex = false;
        this.onTelexSuccess();
      },
      error: (err) => {
        console.error('Submission Error', err);
        this.isSubmittingTelex = false;
        alert('Failed to submit application. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  onTelexSuccess(): void {
    this.isTelexModalOpen = false;
    this.studentForTelex = null;
    this.isSuccessModalOpen = true;
    this.refreshDashboard();
    this.cdr.detectChanges();
  }
}