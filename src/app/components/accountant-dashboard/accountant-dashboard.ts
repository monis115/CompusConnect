import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, finalize, interval } from 'rxjs';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import {
  AccountantService,
  Accountant,
  Student,
  ApprovePaymentPayload,
  RejectPaymentPayload,
  DashboardStats,
  CollectionSummary,
  RecentActivity,
  AssignedStudent
} from '../../services/accountant.service';
import { PaymentRequestService, PaymentRequest } from '../../services/payment-request.service';
import { environment } from '../../../environments/environment';
import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-accountant-dashboard',
  standalone: false,
  templateUrl: './accountant-dashboard.html',
  styleUrl: './accountant-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.85)' }),
        animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('350ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
    trigger('staggerIn', [
      transition(':enter', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
  ],
})
export class AccountantDashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private avatarColors = ['#059669', '#0F766E', '#14B8A6', '#3B82F6', '#7C3AED', '#EC4899'];

  // User Data
  accountantData: Accountant | null = null;
  username: string = '';

  // Dashboard Data
  stats: DashboardStats | null = null;
  collections: CollectionSummary[] = [];
  activities: RecentActivity[] = [];
  students: AssignedStudent[] = [];
  filteredStudents: AssignedStudent[] = [];
  selectedStudent: Student | null = null;

  // Animated Counters
  animatedStats = {
    totalStudentsAssigned: 0,
    pendingPayments: 0,
    paymentsReceived: 0,
    paymentsNotReceived: 0,
    totalAmountReceived: 0,
    totalAmountPending: 0
  };

  // UI State
  activeView: 'dashboard' | 'pending' | 'approved' | 'rejected' | 'all-students' | 'profile' | 'funds' = 'dashboard';
  isSidebarCollapsed = false;

  // History Modal State
  showHistoryModal: boolean = false;
  selectedHistoryRequest: any = null;

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
  isLoading = true;
  isRefreshing = false;
  isSubmitting = false;
  searchTerm = '';
  isFullscreen = false;
  activeVerificationTab: 'telex' | 'visa' = 'telex';

  // Modals
  showDetailModal = false;
  showApproveModal = false;
  showRejectModal = false;
  showSuccessModal = false;
  successMessage = '';

  // Approve Form
  approveForm = {
    receivedAmount: null as number | null,
    receivedDate: ''
  };

  // Visa Payment Modal States
  showSendBankDetailsModal = false;
  showConfirmPaymentModal = false;
  processingId: number | null = null;

  // Visa Payment Form Data
  bankDetailsAmount: number = 0;
  bankDetailsCurrency: string = 'USD';
  bankName: string = '';
  accountNumber: string = '';
  swiftCode: string = '';
  beneficiaryName: string = '';
  branchAddress: string = '';
  receivedAmount: number = 0;
  receivedDate: string = '';

  // Logout
  isLogoutModalOpen = false;
  isLoggingOut = false;
  logoutMessages = [
    'Great work verifying payments today!',
    'Financial accuracy matters. Thank you!',
    'Your diligence keeps the process running smoothly!',
    'See you next time. Take care!',
    'Every verification counts. Well done!'
  ];
  currentLogoutMessage = '';

  constructor(
    private accountantService: AccountantService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    @Inject(PaymentRequestService) private paymentRequestService: PaymentRequestService,
    private fileService: FileService
  ) { }

  ngOnInit(): void {
    this.username = sessionStorage.getItem('userId') || '';
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Data Loading ---

  loadDashboardData(): void {
    if (!this.username) {
      this.isLoading = false;
      this.router.navigate(['/AdminLogin']);
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      if (this.isLoading || this.isRefreshing) {
        console.warn('Loading timeout - resetting loading states');
        this.isLoading = false;
        this.isRefreshing = false;
        this.cdr.detectChanges();
      }
    }, 15000);

    // Fetch all dashboard data concurrently
    this.accountantService.getAllDashboardData(this.username)
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
          this.stats = data.stats;
          this.collections = data.collections;
          this.activities = data.activities;
          this.students = data.students;
          this.filteredStudents = [...this.students];

          // Animate counters
          this.animateCounters();

          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          // Fallback to original API if new endpoints don't exist
          this.loadFallbackData();
        }
      });

    // Also get accountant profile with full student data
    this.accountantService.getAccountantDetails(this.username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.accountantData = data;

          // Use the full student data from accountant profile (includes action, actionOnUser, visa fields)
          if (data.students && data.students.length > 0) {
            this.students = data.students.map((s: any) => ({
              studentId: s.id,
              applicationId: s.applicationId || '',
              fullName: s.fullName,
              email: s.email,
              contactNo: s.contactNo,
              applicationStatus: s.applicationStatus,
              paymentStatus: s.paymentStatus || 'Pending',
              hasPaid: s.hasPaid,
              paidAmount: s.paidAmount,
              paidTo: s.paidTo,
              ttCopyPath: s.ttCopyPath,
              paymentConfirmationPath: s.paymentConfirmationPath,
              // Visa payment workflow fields from full student data
              action: s.action,
              actionOnUser: s.actionOnUser,
              visaPaymentRequestedAmount: s.visaPaymentRequestedAmount,
              visaPaymentRequestedCurrency: s.visaPaymentRequestedCurrency,
              visaManServiceCharge: s.visaManServiceCharge,
              visaPaymentTxId: s.visaPaymentTxId,
              visaPaymentConfirmationPath: s.visaPaymentConfirmationPath
            }));
            this.filteredStudents = [...this.students];
          }

          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading accountant profile:', err)
      });
  }

  loadFallbackData(): void {
    // Fallback to original API structure
    this.accountantService.getAccountantDetails(this.username)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.accountantData = data;
          const students = data.students || [];

          // Calculate stats from students
          const pending = students.filter(s => s.hasPaid && s.paymentStatus !== 'Received' && s.paymentStatus !== 'Not Received');
          const received = students.filter(s => s.paymentStatus === 'Received' || s.applicationStatus === 'FEE_RECEIVED');
          const notReceived = students.filter(s => s.paymentStatus === 'Not Received' || s.applicationStatus === 'PAYMENT_NOT_RECEIVED');

          this.stats = {
            totalStudentsAssigned: students.length,
            pendingPayments: pending.length,
            paymentsReceived: received.length,
            paymentsNotReceived: notReceived.length,
            totalAmountReceived: received.reduce((sum, s) => sum + (s.paidAmount || 0), 0),
            totalAmountPending: pending.reduce((sum, s) => sum + (s.paidAmount || 0), 0)
          };

          // Map to AssignedStudent format
          this.students = students.map(s => ({
            studentId: s.id,
            applicationId: s.applicationId,
            fullName: s.fullName,
            email: s.email,
            contactNo: s.contactNo,
            applicationStatus: s.applicationStatus,
            paymentStatus: s.paymentStatus || 'Pending',
            hasPaid: s.hasPaid,
            paidAmount: s.paidAmount,
            paidTo: s.paidTo,
            ttCopyPath: s.ttCopyPath,
            paymentConfirmationPath: s.paymentConfirmationPath,
            // Visa payment workflow fields
            action: (s as any).action,
            actionOnUser: (s as any).actionOnUser,
            visaPaymentRequestedAmount: (s as any).visaPaymentRequestedAmount,
            visaPaymentRequestedCurrency: (s as any).visaPaymentRequestedCurrency,
            visaManServiceCharge: (s as any).visaManServiceCharge,
            visaPaymentTxId: (s as any).visaPaymentTxId,
            visaPaymentConfirmationPath: (s as any).visaPaymentConfirmationPath
          }));
          this.filteredStudents = [...this.students];

          this.animateCounters();
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading fallback data:', err)
      });
  }

  animateCounters(): void {
    if (!this.stats) return;

    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const stepDuration = duration / steps;

    const targets = { ...this.stats };
    const current = { ...this.animatedStats };

    let step = 0;
    const animationInterval = setInterval(() => {
      step++;
      const progress = this.easeOutQuart(step / steps);

      this.animatedStats = {
        totalStudentsAssigned: Math.round(current.totalStudentsAssigned + (targets.totalStudentsAssigned - current.totalStudentsAssigned) * progress),
        pendingPayments: Math.round(current.pendingPayments + (targets.pendingPayments - current.pendingPayments) * progress),
        paymentsReceived: Math.round(current.paymentsReceived + (targets.paymentsReceived - current.paymentsReceived) * progress),
        paymentsNotReceived: Math.round(current.paymentsNotReceived + (targets.paymentsNotReceived - current.paymentsNotReceived) * progress),
        totalAmountReceived: Math.round(current.totalAmountReceived + (targets.totalAmountReceived - current.totalAmountReceived) * progress),
        totalAmountPending: Math.round(current.totalAmountPending + (targets.totalAmountPending - current.totalAmountPending) * progress)
      };

      this.cdr.detectChanges();

      if (step >= steps) {
        clearInterval(animationInterval);
        this.animatedStats = { ...targets };
        this.cdr.detectChanges();
      }
    }, stepDuration);
  }

  easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.cdr.detectChanges();
    setTimeout(() => this.loadDashboardData(), 300);
  }

  // --- Navigation ---

  switchView(view: 'dashboard' | 'pending' | 'approved' | 'rejected' | 'all-students' | 'profile' | 'funds'): void {
    this.activeView = view;
    this.searchTerm = '';
    if (view === 'funds') {
      this.loadFundRequests();
    } else {
      this.filterStudents();
    }
    this.cdr.detectChanges();
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.cdr.detectChanges();
  }

  // --- Filtering ---

  filterStudents(): void {
    const term = this.searchTerm.toLowerCase();

    let sourceList = this.students;

    // Filter by payment status based on view
    if (this.activeView === 'pending') {
      sourceList = this.students.filter(s =>
        s.applicationStatus === 'TELEX_INITIATED' &&
        s.paymentStatus !== 'Received' &&
        s.paymentStatus !== 'Not Received'
      );
    } else if (this.activeView === 'approved') {
      sourceList = this.students.filter(s => s.paymentStatus === 'Received');
    } else if (this.activeView === 'rejected') {
      sourceList = this.students.filter(s => s.paymentStatus === 'Not Received');
    }

    this.filteredStudents = sourceList.filter(student =>
      !term ||
      student.fullName?.toLowerCase().includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.applicationId?.toLowerCase().includes(term)
    );

    this.cdr.detectChanges();
  }

  // --- Collection Summary Helpers ---

  getCollectionByPeriod(period: string): CollectionSummary | null {
    return this.collections.find(c => c.period === period) || null;
  }

  getCollectionProgress(collection: CollectionSummary): number {
    if (!this.stats || this.stats.totalAmountReceived === 0) return 0;
    const maxAmount = Math.max(...this.collections.map(c => c.totalAmount), 1);
    return (collection.totalAmount / maxAmount) * 100;
  }

  getPeriodLabel(period: string): string {
    const labels: { [key: string]: string } = {
      'TODAY': 'Today',
      'THIS_WEEK': 'This Week',
      'THIS_MONTH': 'This Month',
      'THIS_YEAR': 'This Year'
    };
    return labels[period] || period;
  }

  getPeriodIcon(period: string): string {
    const icons: { [key: string]: string } = {
      'TODAY': 'calendar-day',
      'THIS_WEEK': 'calendar-week',
      'THIS_MONTH': 'calendar',
      'THIS_YEAR': 'calendar-alt'
    };
    return icons[period] || 'calendar';
  }

  // --- Activity Helpers ---

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getActivityIcon(action: string): string {
    return action === 'PAYMENT_RECEIVED' ? 'check-circle' : 'x-circle';
  }

  getActivityColor(action: string): string {
    return action === 'PAYMENT_RECEIVED' ? 'success' : 'danger';
  }

  // --- Modal Actions ---

  openDetailModal(student: AssignedStudent): void {
    // Map to full Student interface for modal
    this.selectedStudent = {
      id: student.studentId,
      applicationId: student.applicationId,
      fullName: student.fullName,
      email: student.email,
      contactNo: student.contactNo,
      applicationStatus: student.applicationStatus,
      paymentStatus: student.paymentStatus,
      hasPaid: student.hasPaid,
      paidAmount: student.paidAmount,
      paidTo: student.paidTo,
      ttCopyPath: student.ttCopyPath,
      paymentConfirmationPath: student.paymentConfirmationPath
    } as Student;
    this.showDetailModal = true;
    this.cdr.detectChanges();
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    setTimeout(() => { this.selectedStudent = null; }, 200);
    this.cdr.detectChanges();
  }

  openApproveModal(student: any): void {
    if (this.isActionDisabled(student)) return;

    this.selectedStudent = student;
    this.approveForm = {
      receivedAmount: student.paidAmount,
      receivedDate: this.formatDateForInput(new Date())
    };
    this.showApproveModal = true;
    this.cdr.detectChanges();
  }

  closeApproveModal(): void {
    this.showApproveModal = false;
    this.approveForm = { receivedAmount: null, receivedDate: '' };
    this.cdr.detectChanges();
  }

  openRejectModal(student: any): void {
    if (this.isActionDisabled(student)) return;

    this.selectedStudent = student;
    this.showRejectModal = true;
    this.cdr.detectChanges();
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.cdr.detectChanges();
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.cdr.detectChanges();
  }

  // --- API Actions ---

  confirmApprove(): void {
    if (!this.selectedStudent || !this.accountantData) return;
    if (!this.approveForm.receivedAmount || !this.approveForm.receivedDate) {
      alert('Please fill in all required fields.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const studentId = (this.selectedStudent as any).studentId || this.selectedStudent.id;

    const payload: ApprovePaymentPayload = {
      receivedAmount: this.approveForm.receivedAmount,
      receivedDate: this.approveForm.receivedDate,
      accountantUsername: this.accountantData.username
    };

    this.accountantService.approvePayment(studentId, payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.closeApproveModal();
          this.showSuccess('Payment verified successfully! Status updated to FEE_RECEIVED.');
          this.refreshData();
        },
        error: (err) => {
          console.error('Approve error:', err);
          alert('Failed to approve payment. Please try again.');
        }
      });
  }

  confirmReject(): void {
    if (!this.selectedStudent || !this.accountantData) return;

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const studentId = (this.selectedStudent as any).studentId || this.selectedStudent.id;

    const payload: RejectPaymentPayload = {
      accountantUsername: this.accountantData.username
    };

    this.accountantService.rejectPayment(studentId, payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.closeRejectModal();
          this.showSuccess('Payment marked as NOT RECEIVED.');
          this.refreshData();
        },
        error: (err) => {
          console.error('Reject error:', err);
          alert('Failed to reject payment. Please try again.');
        }
      });
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  // --- Action Validation ---

  isActionDisabled(student: any): boolean {
    return (
      student.paymentStatus === 'Received' ||
      student.paymentStatus === 'Not Received' ||
      student.applicationStatus === 'FEE_RECEIVED' ||
      student.applicationStatus === 'PAYMENT_NOT_RECEIVED'
    );
  }

  canApprove(student: any): boolean {
    return student.hasPaid && !this.isActionDisabled(student);
  }

  canReject(student: any): boolean {
    return student.hasPaid && !this.isActionDisabled(student);
  }

  // --- Helpers ---

  getDocUrl(path: string | null): string {
    return this.fileService.getFileUrl(path);
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '$0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getStatusLabel(status: string | null): string {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getStatusClass(status: string | null): string {
    if (!status) return 'status-default';
    const statusMap: { [key: string]: string } = {
      'FEE_RECEIVED': 'status-success',
      'PAYMENT_NOT_RECEIVED': 'status-danger',
      'TELEX_PAYMENT_DOCS_SUBMITTED': 'status-info',
      'PENDING': 'status-warning'
    };
    return statusMap[status] || 'status-default';
  }

  getPaymentStatusClass(student: any): string {
    if (student.paymentStatus === 'Received' || student.applicationStatus === 'FEE_RECEIVED') {
      return 'badge-success';
    }
    if (student.paymentStatus === 'Not Received' || student.applicationStatus === 'PAYMENT_NOT_RECEIVED') {
      return 'badge-danger';
    }
    if (student.hasPaid) {
      return 'badge-warning';
    }
    return 'badge-default';
  }

  getPaymentStatusLabel(student: any): string {
    if (student.paymentStatus === 'Received' || student.applicationStatus === 'FEE_RECEIVED') {
      return 'Verified ✓';
    }
    if (student.paymentStatus === 'Not Received' || student.applicationStatus === 'PAYMENT_NOT_RECEIVED') {
      return 'Not Received';
    }
    if (student.hasPaid) {
      return 'Pending Verification';
    }
    return 'Not Paid';
  }

  getAvatarColor(name: string): string {
    if (!name) return this.avatarColors[0];
    return this.avatarColors[name.charCodeAt(0) % this.avatarColors.length];
  }

  // --- Counts for Sidebar ---

  get pendingCount(): number {
    // Use actual pending verification counts (telex + visa)
    return this.telexPendingStudents.length + this.visaPendingStudents.length;
  }

  get approvedCount(): number {
    return this.stats?.paymentsReceived || 0;
  }

  get rejectedCount(): number {
    return this.stats?.paymentsNotReceived || 0;
  }

  get totalStudents(): number {
    return this.stats?.totalStudentsAssigned || 0;
  }

  // --- Actions Needed Section Helpers ---

  /**
   * Check if there are pending telex fee verifications
   */
  get hasPendingTelexFees(): boolean {
    return this.students.some(s =>
      s.hasPaid && !this.isActionDisabled(s) && s.actionOnUser !== 'accountant'
    );
  }

  /**
   * Check if there are pending visa payment actions
   */
  get hasPendingVisaActions(): boolean {
    return this.students.some(s =>
      s.actionOnUser === 'accountant' &&
      (s.action === 'SEND_BANK_DETAILS_TO_AGENT' || s.action === 'CONFIRM_VISA_PAYMENT')
    );
  }

  /**
   * Get students pending telex fee verification
   */
  get telexPendingStudents(): AssignedStudent[] {
    return this.students.filter(s =>
      s.applicationStatus === 'TELEX_INITIATED' &&
      !this.isActionDisabled(s) &&
      s.actionOnUser !== 'accountant'
    );
  }

  /**
   * Get students pending visa payment actions
   */
  get visaPendingStudents(): AssignedStudent[] {
    return this.students.filter(s =>
      s.actionOnUser === 'accountant' &&
      (s.action === 'SEND_BANK_DETAILS_TO_AGENT' || s.action === 'CONFIRM_VISA_PAYMENT')
    );
  }

  // --- Fullscreen ---

  toggleFullscreen(): void {
    const elem = document.documentElement;
    if (!this.isFullscreen) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      }
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      this.isFullscreen = false;
    }
    this.cdr.detectChanges();
  }

  // ======================= VISA PAYMENT WORKFLOW =======================

  /**
   * Get action button config for visa payment workflow
   */
  getVisaActionButton(student: any): { label: string, action: string, icon: string } | null {
    if (student.actionOnUser !== 'accountant') return null;

    switch (student.action) {
      case 'SEND_BANK_DETAILS_TO_AGENT':
        return { label: 'Send Bank Details', action: 'sendBankDetails', icon: 'credit-card' };
      case 'CONFIRM_VISA_PAYMENT':
        return { label: 'Confirm Payment', action: 'confirmPayment', icon: 'check-circle' };
      default:
        return null;
    }
  }

  /**
   * Open modal to send bank details to agent
   */
  openSendBankDetailsModal(student: any): void {
    console.log('Sending Bank Details for Student:', student); // DEBUG: Check if visaManServiceCharge is present
    this.selectedStudent = student;
    // Calculate total: Requested Visa Fee + Service Charge
    const visaFee = student.visaPaymentRequestedAmount || 0;
    const serviceCharge = student.visaManServiceCharge || 0;
    this.bankDetailsAmount = visaFee + serviceCharge;

    this.bankDetailsCurrency = student.visaPaymentRequestedCurrency || 'USD';
    // Reset bank details form
    this.bankName = '';
    this.accountNumber = '';
    this.swiftCode = '';
    this.beneficiaryName = '';
    this.branchAddress = '';
    this.showSendBankDetailsModal = true;
    this.cdr.detectChanges();
  }

  /**
   * Close send bank details modal
   */
  closeSendBankDetailsModal(): void {
    this.showSendBankDetailsModal = false;
    this.selectedStudent = null;
    // Reset form fields
    this.bankName = '';
    this.accountNumber = '';
    this.swiftCode = '';
    this.beneficiaryName = '';
    this.branchAddress = '';
    this.cdr.detectChanges();
  }

  /**
   * Open modal to confirm visa payment received
   */
  openConfirmPaymentModal(student: any): void {
    this.selectedStudent = student;
    this.receivedAmount = student.visaPaymentRequestedAmount || 0;
    this.receivedDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    this.showConfirmPaymentModal = true;
    this.cdr.detectChanges();
  }

  /**
   * Close confirm payment modal
   */
  closeConfirmPaymentModal(): void {
    this.showConfirmPaymentModal = false;
    this.selectedStudent = null;
    this.cdr.detectChanges();
  }

  /**
   * Send bank details to Agent for visa payment
   * Called when student.action === 'SEND_BANK_DETAILS_TO_AGENT'
   */
  sendBankDetailsToAgent(studentId: number): void {
    if (!this.bankDetailsAmount || this.bankDetailsAmount <= 0) {
      this.showErrorToast('Please enter a valid amount');
      return;
    }
    if (!this.bankName || this.bankName.trim() === '') {
      this.showErrorToast('Bank Name is required');
      return;
    }
    if (!this.accountNumber || this.accountNumber.trim() === '') {
      this.showErrorToast('Account Number is required');
      return;
    }

    this.processingId = studentId;
    this.cdr.detectChanges();

    const body = {
      accountantUsername: this.username,
      amount: this.bankDetailsAmount,
      currency: this.bankDetailsCurrency,
      bankName: this.bankName.trim(),
      accountNumber: this.accountNumber.trim(),
      swiftCode: this.swiftCode?.trim() || null,
      beneficiaryName: this.beneficiaryName?.trim() || null,
      branchAddress: this.branchAddress?.trim() || null
    };

    this.http.post(`${environment.apiUrl}/api/visa/send-bank-details/${studentId}`, body)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.showSuccess('Bank details sent to Agent successfully!');
          this.refreshData();
          this.closeSendBankDetailsModal();
        },
        error: (err) => {
          console.error('Error sending bank details:', err);
          this.showErrorToast('Failed to send bank details: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
  }

  /**
   * Confirm visa payment received from Agent
   * Called when student.action === 'CONFIRM_VISA_PAYMENT'
   */
  confirmVisaPaymentReceived(studentId: number, receivedAmt: number, receivedDt: string): void {
    if (!receivedAmt || receivedAmt <= 0) {
      this.showErrorToast('Please enter a valid received amount');
      return;
    }
    if (!receivedDt) {
      this.showErrorToast('Please select a received date');
      return;
    }

    this.processingId = studentId;
    this.cdr.detectChanges();

    const body = {
      accountantUsername: this.username,
      receivedAmount: receivedAmt,
      receivedDate: receivedDt
    };

    this.http.post(`${environment.apiUrl}/api/visa/confirm-payment/${studentId}`, body)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.showSuccess('Visa payment confirmed! Student is ready for visa application.');
          this.refreshData();
          this.closeConfirmPaymentModal();
        },
        error: (err) => {
          console.error('Error confirming payment:', err);
          this.showErrorToast('Failed to confirm payment: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
  }

  /**
   * Show error toast message
   */
  showErrorToast(message: string): void {
    // Show error as alert for now - can be replaced with a toast service
    alert(message);
  }

  /**
   * Check if student needs visa action from accountant
   */
  needsVisaAction(student: any): boolean {
    return student.actionOnUser === 'accountant' &&
      (student.action === 'SEND_BANK_DETAILS_TO_AGENT' || student.action === 'CONFIRM_VISA_PAYMENT');
  }

  // --- Logout ---

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
    this.currentLogoutMessage = this.logoutMessages[Math.floor(Math.random() * this.logoutMessages.length)];
    this.isLoggingOut = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      sessionStorage.clear();
      this.router.navigate(['/AdminLogin']);
    }, 2900);
  }

  logout(): void {
    this.openLogoutModal();
    this.showSendBankDetailsModal = false;
    this.cdr.detectChanges();
  }

  // ============================================
  // FUND REQUESTS (REQUESTED MONEY)
  // ============================================
  fundRequests: PaymentRequest[] = [];
  filteredFundRequests: PaymentRequest[] = [];
  selectedFundRequest: PaymentRequest | null = null;
  showFundPaymentModal = false;

  fundPaymentForm = {
    amountPaid: 0,
    transactionId: '',
    paymentMode: 'CASH'
  };
  isFundSubmitting = false;

  loadFundRequests(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.paymentRequestService.getAllRequests().subscribe({
      next: (data) => {
        this.fundRequests = data;
        // Compute stats or remaining amounts if not from backend
        this.fundRequests.forEach(req => {
          if (req.remainingAmount === undefined) {
            req.remainingAmount = (req.requestedAmount || 0) - (req.amountPaid || 0);
          }
        });
        this.filteredFundRequests = [...this.fundRequests];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading fund requests', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getFundRequestById(id: number): void {
    // Refresh specific request details for the modal
    // Ideally backend endpoint /api/request-money/{id} exists, but if not we reload all or use existing
    // For now, let's assume we reload all to be safe or use what we have, 
    // but the "Add Payment" modal needs up-to-date transactions.
    // If no single GET, we might need to rely on the list or reload list.
    // Let's reload list silently if needed, or just trust the list data if it includes transactions now.
    // Assuming getAllRequests returns transactions array now.
  }

  openFundPaymentModal(request: PaymentRequest): void {
    this.selectedFundRequest = request;
    // Default to remaining amount
    const remaining = request.remainingAmount !== undefined ? request.remainingAmount : ((request.requestedAmount || 0) - (request.amountPaid || 0));

    this.fundPaymentForm = {
      amountPaid: remaining > 0 ? remaining : 0,
      transactionId: '',
      paymentMode: 'CASH'
    };
    this.showFundPaymentModal = true;
    this.cdr.detectChanges();
  }

  closeFundPaymentModal(): void {
    this.showFundPaymentModal = false;
    this.selectedFundRequest = null;
    this.cdr.detectChanges();
  }

  submitFundPayment(): void {
    if (!this.selectedFundRequest || !this.selectedFundRequest.id) return;

    // Validation
    if (this.fundPaymentForm.paymentMode === 'ONLINE' && !this.fundPaymentForm.transactionId) {
      alert('Transaction ID is required for online payments.');
      return;
    }
    if (this.fundPaymentForm.amountPaid <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const remaining = this.selectedFundRequest.remainingAmount !== undefined
      ? this.selectedFundRequest.remainingAmount
      : ((this.selectedFundRequest.requestedAmount || 0) - (this.selectedFundRequest.amountPaid || 0));

    if (this.fundPaymentForm.amountPaid > remaining) {
      alert(`Amount cannot exceed the remaining balance of ₹${remaining}`);
      return;
    }

    this.isFundSubmitting = true;
    const payload = {
      amountPaid: this.fundPaymentForm.amountPaid,
      accountantPaymentMode: this.fundPaymentForm.paymentMode, // Mapped to paymentMode in backend Transaction
      transactionId: this.fundPaymentForm.paymentMode === 'CASH' ? null : this.fundPaymentForm.transactionId
    };

    this.paymentRequestService.payRequest(this.selectedFundRequest.id, payload).subscribe({
      next: () => {
        this.showSuccess('Payment recorded successfully');
        this.closeFundPaymentModal();
        this.loadFundRequests();
        this.isFundSubmitting = false;
      },
      error: (err) => {
        console.error('Error processing payment', err);
        this.isFundSubmitting = false;
        alert('Failed to process payment');
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

  // Count of pending/partial fund requests (not fully paid)
  get pendingFundRequestsCount(): number {
    return this.fundRequests.filter(r => r.status === 'PENDING' || r.status === 'PARTIAL').length;
  }
}
