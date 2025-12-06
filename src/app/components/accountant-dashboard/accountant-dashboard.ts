import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
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
  activeView: 'dashboard' | 'pending' | 'approved' | 'rejected' | 'all-students' | 'profile' = 'dashboard';
  isSidebarCollapsed = false;
  isLoading = true;
  isRefreshing = false;
  isSubmitting = false;
  searchTerm = '';
  isFullscreen = false;

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
    private cdr: ChangeDetectorRef
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

    // Also get accountant profile
    this.accountantService.getAccountantDetails(this.username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.accountantData = data;
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
            paymentConfirmationPath: s.paymentConfirmationPath
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

  switchView(view: typeof this.activeView): void {
    this.activeView = view;
    this.searchTerm = '';
    this.filterStudents();
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
      sourceList = this.students.filter(s => s.hasPaid && s.paymentStatus !== 'Received' && s.paymentStatus !== 'Not Received');
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
    if (!path) return '';
    return `http://localhost:8080/${path}`;
  }

  formatCurrency(amount: number | null): string {
    if (amount === null || amount === undefined) return '$0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string | null): string {
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
    return this.stats?.pendingPayments || 0;
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
  }
}
