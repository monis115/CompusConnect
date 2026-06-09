import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef, Inject, HostListener } from '@angular/core';
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
  AssignedStudent,
  AccountantCredit,
  SubAccount
} from '../../services/accountant.service';
import { BeneficiaryService } from '../../services/beneficiary.service';
import { PaymentRequestService, PaymentRequest } from '../../services/payment-request.service';
import { environment } from '../../../environments/environment';
import { FileService } from '../../services/file.service';
import { ChartConfiguration, ChartOptions, ChartData, ChartType } from 'chart.js';

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
    trigger('slideInRight', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(100%)' })),
      ])
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
  listAgentFilter: string = 'ALL';
  listCollegeFilter: string = 'ALL';
  listDateFrom: string = '';
  listDateTo: string = '';
  selectedStudent: Student | null = null;
  credits: AccountantCredit[] = [];
  includeCreditInBalance: boolean = true;
  allStudentsData: any;

  // Passbooks
  visaManPassbooks: any[] = [];
  agentPassbooks: any[] = [];
  activePassbookTab: 'visaman' | 'agent' = 'visaman';

  // Animated Counters
  animatedStats = {
    totalStudentsAssigned: 0,
    pendingPayments: 0,
    paymentsReceived: 0,
    paymentsNotReceived: 0,
    totalAmountReceived: 0,
    totalAmountPending: 0,
    totalVisaRequestedByVisaMan: 0,
    totalAccToVisaManPaidAmount: 0
  };

  // SubAccounts
  subAccounts: SubAccount[] = [];
  get bankSubAccounts() { return this.subAccounts.filter(a => a.accountType !== 'CASH' && a.bankName !== 'CASH'); }
  get cashSubAccounts() { return this.subAccounts.filter(a => a.accountType === 'CASH' || a.bankName === 'CASH'); }
  get totalBankBalance() { return this.bankSubAccounts.reduce((acc, curr) => acc + (curr.balance || 0), 0); }
  get totalCashBalance() { return this.cashSubAccounts.reduce((acc, curr) => acc + (curr.balance || 0), 0); }
  get totalBalance() { return this.totalBankBalance + this.totalCashBalance; }
  showAddSubAccountModal = false;
  newSubAccount: SubAccount = { bankName: '', accountNumber: '', swiftBic: '', beneficiaryName: '', branchAddress: '', relationshipManager: '', accountType: 'BANK', cashAccountName: '' };

  // --- Transactions Modal ---
  selectedSubAccountForTx: any = null;
  subAccountTransactions: any[] = [];
  isTxLoading = false;
  txFilterType: 'ALL' | 'CREDIT' | 'DEBIT' = 'ALL';
  txFilterStartDate: string = '';
  txFilterEndDate: string = '';

  // --- Payment Collection Redesign State ---
  isSendingReminder: Record<number, boolean> = {};
  recentStatusChange: Record<number, string> = {};
  toastState = {
    show: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info'
  };

  globalOverlay = {
    show: false,
    status: 'loading' as 'loading' | 'success' | 'error',
    message: '',
    icon: ''
  };

  // --- Internal Transfer State ---
  showInternalTransferModal = false;
  internalTransferStep: 'form' | 'processing' | 'success' | 'error' = 'form';
  internalTransferError: string = '';
  transferSourceId: number | null = null;
  transferDestId: number | null = null;
  transferAmount: number | null = null;
  transferDescription: string = '';
  isTransferring = false;

  openInternalTransferModal() {
    this.showInternalTransferModal = true;
    this.internalTransferStep = 'form';
    this.internalTransferError = '';
    this.transferSourceId = null;
    this.transferDestId = null;
    this.transferAmount = null;
    this.transferDescription = '';
  }

  closeInternalTransferModal() {
    this.showInternalTransferModal = false;
  }

  get isInternalTransferValid(): boolean {
    if (!this.transferSourceId || !this.transferDestId || !this.transferAmount || !this.transferDescription) {
      return false;
    }
    if (this.transferSourceId === this.transferDestId) return false;
    if (this.transferAmount <= 0) return false;
    if (this.hasInsufficientBalance()) return false;
    return true;
  }

  hasInsufficientBalance(): boolean {
    if (!this.transferSourceId || !this.transferAmount) return false;
    const sourceAcc = this.bankSubAccounts.find(acc => acc.id === this.transferSourceId);
    if (sourceAcc) {
      const availableBalance = sourceAcc.balance || 0;
      return this.transferAmount > availableBalance;
    }
    return false;
  }

  getSourceBalance(): number {
    if (!this.transferSourceId) return 0;
    const sourceAcc = this.bankSubAccounts.find(acc => acc.id === this.transferSourceId);
    return sourceAcc ? (sourceAcc.balance || 0) : 0;
  }

  submitInternalTransfer() {
    if (!this.transferSourceId || !this.transferDestId || !this.transferAmount || !this.transferDescription) {
      this.showToast('Please fill all required fields.', 'error');
      return;
    }
    if (!this.isInternalTransferValid) {
      return;
    }

    this.isTransferring = true;
    this.internalTransferStep = 'processing';
    this.internalTransferError = '';

    const payload = {
      sourceId: this.transferSourceId,
      destId: this.transferDestId,
      amount: this.transferAmount,
      description: this.transferDescription
    };

    const startTime = Date.now();
    this.http.post('http://localhost:8080/api/accountant/subaccounts/internal-transfer', payload).subscribe({
      next: (res: any) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1900 - elapsed);
        
        setTimeout(() => {
          this.isTransferring = false;
          this.internalTransferStep = 'success';
          this.loadSubAccounts(); // Refresh balances
          this.cdr.detectChanges();
        }, delay);
      },
      error: (err) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1900 - elapsed);
        
        setTimeout(() => {
          this.isTransferring = false;
          this.internalTransferStep = 'error';
          this.internalTransferError = err.error || 'Transaction Declined: Unable to process the transfer at this time.';
          this.cdr.detectChanges();
        }, delay);
      }
    });
  }

  // --- Sidebar Badges ---
  get visaFeeSettlementBadgeCount(): number {
    if (!this.visaPendingStudents) return 0;
    return this.visaPendingStudents.filter((s: any) => this.getFundReleaseStatus(s) === 'FUND_RELEASE_PENDING').length;
  }

  get paymentCollectionBadgeCount(): number {
    if (!this.activePaymentCollectionStudents) return 0;
    return this.activePaymentCollectionStudents.filter((s: any) => this.getCollectionStatus(s) !== 'PAID').length;
  }

  showToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
    this.toastState = { show: true, message, type };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toastState.show = false;
      this.cdr.detectChanges();
    }, 3500);
  }

  // Outstanding Recovery & Fund Release
  fundReleaseForms: { [studentId: number]: any } = {};
  fundReleaseFiles: { [studentId: number]: File } = {};
  showInlineReleaseFund: boolean = false;

  // Partial Payment & Cash Settlement
  showCashSettlementModal: boolean = false;
  cashSettlementData: any = { depositType: 'BANK', amount: 0, date: '', subAccountId: '', remarks: '', file: null };

  // Transaction History Sidebar
  isPaymentSidebarOpen: boolean = false;
  selectedPaymentTransactions: any[] = [];
  selectedStudentForTransactions: any = null;
  isLoadingTransactions: boolean = false;

  Math = Math;
  outstandingRecoveryData: any[] = [];

  get filteredTransactions(): any[] {
    return this.subAccountTransactions.filter(tx => {
      const matchType = this.txFilterType === 'ALL' || tx.transactionType === this.txFilterType;
      const txDate = new Date(tx.transactionDate);
      const matchStart = !this.txFilterStartDate || txDate >= new Date(this.txFilterStartDate);

      // End date should include the whole day
      let matchEnd = true;
      if (this.txFilterEndDate) {
        const endDate = new Date(this.txFilterEndDate);
        endDate.setHours(23, 59, 59, 999);
        matchEnd = txDate <= endDate;
      }

      return matchType && matchStart && matchEnd;
    });
  }

  get totalFilteredCredit(): number {
    return this.filteredTransactions
      .filter(tx => tx.transactionType === 'CREDIT')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  get totalFilteredDebit(): number {
    return this.filteredTransactions
      .filter(tx => tx.transactionType === 'DEBIT')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  // UI State
  selectedSettlementStudent: any = null;
  activeView: 'dashboard' | 'pending' | 'payment-collection' | 'subaccounts' | 'beneficiaries' | 'transactions' | 'recovery' | 'credit-ledger' | 'reports' | 'settings' | 'profile' | 'approved' | 'rejected' | 'funds' | 'visa-accounts' | 'all-students' = 'dashboard';

  // Payment Collection Sub-tab
  activePaymentCollectionTab: 'all' | 'needs-request' | 'pending' | 'partially-paid' | 'paid' | 'excess' = 'all';

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

  // Transaction History Sidebar Methods
  openPaymentHistorySidebar(student: any): void {
    this.selectedStudentForTransactions = student;
    this.isPaymentSidebarOpen = true;
    this.isLoadingTransactions = true;
    this.selectedPaymentTransactions = [];

    // Fetch from backend
    this.http.get<any[]>(`${environment.apiUrl}/api/visa/payment-transactions/${student.id}`).subscribe({
      next: (data) => {
        this.selectedPaymentTransactions = data;
        this.isLoadingTransactions = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching transactions', err);
        this.isLoadingTransactions = false;
        this.cdr.detectChanges();
      }
    });
  }

  closePaymentHistorySidebar(): void {
    this.isPaymentSidebarOpen = false;
    this.selectedStudentForTransactions = null;
    this.selectedPaymentTransactions = [];
  }

  getRoleIconAndColor(role: string): { icon: string, color: string, bg: string } {
    if (!role) return { icon: 'fas fa-user', color: '#6b7280', bg: '#f3f4f6' };
    switch (role.toUpperCase()) {
      case 'ACCOUNTANT': return { icon: 'fas fa-calculator', color: '#4f46e5', bg: '#e0e7ff' };
      case 'AGENT': return { icon: 'fas fa-user-tie', color: '#d97706', bg: '#fef3c7' };
      case 'VISA_MANAGER': return { icon: 'fas fa-id-card', color: '#059669', bg: '#d1fae5' };
      default: return { icon: 'fas fa-user', color: '#6b7280', bg: '#f3f4f6' };
    }
  }

  getTxnTypeColor(type: string): { color: string, bg: string } {
    if (!type) return { color: '#6b7280', bg: '#f3f4f6' };
    if (type.includes('CONFIRMED') || type.includes('RECEIVED') || type === 'AGENT_PAID') return { color: '#059669', bg: '#d1fae5' }; // Emerald
    if (type.includes('REQUESTED') || type.includes('SENT')) return { color: '#ea580c', bg: '#ffedd5' }; // Orange
    if (type.includes('PAID')) return { color: '#0284c7', bg: '#e0f2fe' }; // Blue
    if (type.includes('REJECTED') || type.includes('FAILED')) return { color: '#dc2626', bg: '#fee2e2' }; // Red
    return { color: '#4b5563', bg: '#f3f4f6' }; // Gray
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

  // Rejection Remarks
  rejectionRemarks: string = '';

  // Verification Filters
  verificationFilterPaidTo: string = 'ALL';

  // Accounts Section Filters
  accountsFilterType: string = 'ALL'; // ALL, VISA, AGENT
  reportViewMode: 'agent' | 'college' = 'agent';
  accountsSearchTerm: string = '';

  // Reports Section
  reportAgentFilter: string = 'ALL';
  reportDateFrom: string = '';
  reportDateTo: string = '';
  reportPaidToFilter: string = 'ALL';

  // Modals
  showDetailModal = false;
  showApproveModal = false;
  showRejectModal = false;
  // Success Modal State
  showSuccessModal = false;
  successMessage = '';
  successTitle = 'Payment Verified!';

  // Approve Form
  approveForm = {
    receivedAmount: null as number | null,
    receivedDate: ''
  };

  // --- Beneficiary Accounts State ---
  beneficiaries: any[] = [];
  isBeneficiaryWizardOpen = false;
  beneficiaryWizardStep = 1;
  newBeneficiary: any = {
    beneficiaryType: 'University',
    beneficiaryName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    upiId: '',
    mobileNumber: '',
    emailAddress: '',
    status: 'Active'
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

  // Dropdown state for tables
  activeDropdownId: number | null = null;

  toggleDropdown(id: number, event: Event): void {
    event.stopPropagation();
    if (this.activeDropdownId === id) {
      this.activeDropdownId = null;
    } else {
      this.activeDropdownId = id;
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activeDropdownId = null;
  }
  branchAddress: string = '';

  // New Collections & Fund Release State
  collectionRequests: any[] = [];
  filteredCollectionRequests: any[] = [];
  fundReleases: any[] = [];
  selectedSubAccountId: number | null = null;
  receivedAmount: number = 0;
  receivedDate: string = '';

  // Pay Visa Man Form Data
  showPayVisaManModal = false;
  payVisaManForm = {
    amountToPay: null as number | null,
    mode: 'UPI',
    txId: '',
    paymentDate: '',
    subAccountId: null as number | null
  };

  // Add Funds (Credit) Modal State
  showAddFundsModal = false;
  creditForm: AccountantCredit = {
    amount: 0,
    method: 'FRIEND',
    creditDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    interestRate: 0,
    friendName: '',
    friendPhone: '',
    bankName: '',
    loanTenureMonths: 0,
    cardInfo: '',
    emiDetails: ''
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
    private cdr: ChangeDetectorRef,
    private beneficiaryService: BeneficiaryService,
    private http: HttpClient,
    private paymentRequestService: PaymentRequestService,
    private fileService: FileService
  ) { }

  ngOnInit(): void {
    this.username = sessionStorage.getItem('userId') || '';
    this.loadDashboardData();
    this.loadSubAccounts();
    this.fetchOutstandingRecovery();
    this.loadBeneficiaries();
    this.loadFundReleases();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Data Loading ---

  loadPassbooks(): void {
    this.accountantService.getVisaManPassbooks()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.visaManPassbooks = data;
        this.cdr.detectChanges();
      });

    this.accountantService.getAgentPassbooks()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.agentPassbooks = data;
        this.cdr.detectChanges();
      });

    this.accountantService.getAllCredits(this.username)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.credits = data || [];
        this.cdr.detectChanges();
      });
  }

  loadFundReleases(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/fund-release/all`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.fundReleases = res;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Failed to load fund releases', err)
      });
  }

  loadDashboardData(): void {
    this.loadPassbooks();
    this.loadFundRequests();
    this.loadSubAccounts();
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
        next: (data: any) => {
          this.stats = data.stats;
          this.collections = data.collections;
          this.activities = data.activities;
          this.students = data.students;
          this.filteredStudents = [...this.students];

          // Animate counters
          this.animateCounters();

          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error loading dashboard data:', error);
          // Fallback to original API if new endpoints don't exist
          this.loadFallbackData();
        }
      });

    // Also get accountant profile with full student data
    this.accountantService.getAccountantDetails(this.username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.accountantData = data;

          // Use the full student data from accountant profile (includes action, actionOnUser, visa fields)
          if (data.students && data.students.length > 0) {
            this.students = data.students.map((s: any) => ({
              id: s.id,
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
              visaPaymentConfirmationPath: s.visaPaymentConfirmationPath,
              visaPaymentReceivedAmount: s.visaPaymentReceivedAmount,
              visaPaymentReceivedDate: s.visaPaymentReceivedDate,
              // Accountant -> VisaMan payout tracking (banking ledger)
              accToVisaManPaidAmount: s.accToVisaManPaidAmount,
              accToVisaManPaymentDate: s.accToVisaManPaymentDate,
              accToVisaManTxId: s.accToVisaManTxId,
              accToVisaManMode: s.accToVisaManMode,
              accToVisaManStatus: s.accToVisaManStatus || 'PENDING',
              visaMan: s.visaMan,
              agentFullName: s.agentFullName || s.agent?.fullName,
              collegeName: s.collegeName || s.college?.collegeName,
              appliedFor: s.appliedFor,
              paymentRejectionRemarks: s.paymentRejectionRemarks,
              visaManFullName: s.visaManFullName || s.visaMan?.fullName,
              agentUserFullName: s.agentUserFullName || s.agent?.fullName
            }));
            this.filteredStudents = [...this.students];

            // Update selectedSettlementStudent reference so UI updates automatically
            if (this.selectedSettlementStudent) {
              const updated = this.students.find(s => s.id === this.selectedSettlementStudent.id);
              if (updated) {
                this.selectedSettlementStudent = updated;
              }
            }
          }

          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error loading accountant profile:', err)
      });

    // Fetch Collection Requests
    this.http.get<any[]>(`${environment.apiUrl}/api/collections/all`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.collectionRequests = data;
          this.filteredCollectionRequests = [...data];
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading collections', err)
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
        next: (data: any) => {
          this.accountantData = data;
          const students = data.students || [];

          // Calculate stats from students
          const pending = students.filter((s: { hasPaid: any; paymentStatus: string; }) => s.hasPaid && s.paymentStatus !== 'Received' && s.paymentStatus !== 'Not Received');
          const received = students.filter((s: { paymentStatus: string; applicationStatus: string; }) => s.paymentStatus === 'Received' || s.applicationStatus === 'FEE_RECEIVED');
          const notReceived = students.filter((s: { paymentStatus: string; applicationStatus: string; }) => s.paymentStatus === 'Not Received' || s.applicationStatus === 'PAYMENT_NOT_RECEIVED');

          // Compute visa totals from student data (banking ledger consistency)
          const totalVisaReq = students.reduce((sum: any, s: any) => {
            return sum + ((s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0));
          }, 0);
          const totalVisaPaid = students.reduce((sum: any, s: any) => {
            return sum + (s.accToVisaManPaidAmount || 0);
          }, 0);

          this.stats = {
            totalStudentsAssigned: students.length,
            pendingPayments: pending.length,
            paymentsReceived: received.length,
            paymentsNotReceived: notReceived.length,
            totalAmountReceived: received.reduce((sum: any, s: { paidAmount: any; }) => sum + (s.paidAmount || 0), 0),
            totalAmountPending: pending.reduce((sum: any, s: { paidAmount: any; }) => sum + (s.paidAmount || 0), 0),
            totalVisaRequestedByVisaMan: totalVisaReq,
            totalAccToVisaManPaidAmount: totalVisaPaid
          };

          // Map to AssignedStudent format
          this.students = students.map((s: { id: any; applicationId: any; fullName: any; email: any; contactNo: any; applicationStatus: any; paymentStatus: any; hasPaid: any; paidAmount: any; paidTo: any; ttCopyPath: any; paymentConfirmationPath: any; }) => ({
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
            visaPaymentConfirmationPath: (s as any).visaPaymentConfirmationPath,
            visaPaymentReceivedAmount: (s as any).visaPaymentReceivedAmount,
            visaPaymentReceivedDate: (s as any).visaPaymentReceivedDate,
            // Accountant -> VisaMan payout tracking (banking ledger)
            accToVisaManPaidAmount: (s as any).accToVisaManPaidAmount,
            accToVisaManPaymentDate: (s as any).accToVisaManPaymentDate,
            accToVisaManTxId: (s as any).accToVisaManTxId,
            accToVisaManMode: (s as any).accToVisaManMode,
            accToVisaManStatus: (s as any).accToVisaManStatus || 'PENDING',
            visaMan: (s as any).visaMan,
            agentFullName: (s as any).agentFullName || (s as any).agent?.fullName,
            collegeName: (s as any).collegeName || (s as any).college?.collegeName,
            appliedFor: (s as any).appliedFor,
            paymentRejectionRemarks: (s as any).paymentRejectionRemarks,
            visaManFullName: (s as any).visaManFullName || (s as any).visaMan?.fullName,
            agentUserFullName: (s as any).agentUserFullName || (s as any).agent?.fullName
          }));
          this.filteredStudents = [...this.students];

          this.animateCounters();
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error loading fallback data:', err)
      });
  }

  loadSubAccounts(): void {
    this.accountantService.getSubAccounts().subscribe({
      next: (data: SubAccount[]) => {
        this.subAccounts = data;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching SubAccounts', err);
      }
    });
  }

  // Add/Update SubAccount
  openAddSubAccountModal(): void {
    this.newSubAccount = { bankName: '', accountNumber: '', swiftBic: '', beneficiaryName: '', branchAddress: '', relationshipManager: '', accountType: 'BANK', cashAccountName: '' };
    this.showAddSubAccountModal = true;
  }

  isSubAccountFormValid(): boolean {
    if (this.newSubAccount.accountType === 'BANK') {
      return !!this.newSubAccount.bankName && !!this.newSubAccount.accountNumber;
    } else {
      return !!this.newSubAccount.cashAccountName;
    }
  }

  closeAddSubAccountModal(): void {
    this.showAddSubAccountModal = false;
  }

  submitSubAccount(): void {
    if (this.newSubAccount.accountType === 'BANK') {
      if (!this.newSubAccount.bankName || !this.newSubAccount.accountNumber) return;
    } else {
      if (!this.newSubAccount.cashAccountName) return;
      // Provide dummy values for DB non-null constraints if necessary
      this.newSubAccount.bankName = 'CASH';
      this.newSubAccount.accountNumber = 'CASH-' + Date.now();
    }
    this.isSubmitting = true;
    this.cdr.detectChanges();

    this.accountantService.createSubAccount(this.newSubAccount)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (saved: SubAccount) => {
          this.subAccounts.push(saved);
          this.closeAddSubAccountModal();
          this.showSuccess('Bank account has been added successfully!', 'Bank Account Added!');
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error saving subaccount', err);
          this.showErrorToast('Failed to create Bank Account. Please try again.');
        }
      });
  }

  // --- Transactions Modal ---
  viewTransactions(acc: any): void {
    this.selectedSubAccountForTx = acc;
    this.subAccountTransactions = [];
    this.isTxLoading = true;
    this.cdr.detectChanges();

    this.http.get<any[]>(`http://localhost:8080/api/accountant/subaccounts/${acc.id}/transactions`)
      .pipe(finalize(() => { this.isTxLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res: any) => {
          this.subAccountTransactions = res;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to fetch transactions', err);
          this.showErrorToast('Failed to load transaction history');
        }
      });
  }

  closeTransactionsModal(): void {
    this.selectedSubAccountForTx = null;
    this.subAccountTransactions = [];
    this.txFilterType = 'ALL';
    this.txFilterStartDate = '';
    this.txFilterEndDate = '';
    this.cdr.detectChanges();
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
        totalAmountPending: Math.round(current.totalAmountPending + (targets.totalAmountPending - current.totalAmountPending) * progress),
        totalVisaRequestedByVisaMan: Math.round(current.totalVisaRequestedByVisaMan + (targets.totalVisaRequestedByVisaMan - current.totalVisaRequestedByVisaMan) * progress),
        totalAccToVisaManPaidAmount: Math.round(current.totalAccToVisaManPaidAmount + (targets.totalAccToVisaManPaidAmount - current.totalAccToVisaManPaidAmount) * progress)
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
    this.loadDashboardData();
    this.loadPassbooks();
  }

  // --- Navigation & View Switching ---
  switchView(view: 'dashboard' | 'pending' | 'payment-collection' | 'subaccounts' | 'beneficiaries' | 'transactions' | 'recovery' | 'credit-ledger' | 'reports' | 'settings' | 'profile' | 'approved' | 'rejected' | 'funds' | 'visa-accounts' | 'all-students'): void {
    this.activeView = view;

    // Clear modals when switching views
    this.showAddSubAccountModal = false;
    this.showSendBankDetailsModal = false;
    this.showConfirmPaymentModal = false;

    // reset payment collection tab if navigating away/to it
    if (view === 'payment-collection') {
      this.activePaymentCollectionTab = 'all';
    }

    if (view === 'reports') {
      this.refreshData();
      this.loadPassbooks(); // Trigger full refresh to ensure all agent/college data is loaded for accurate reports
    }

    // Load data based on view
    if (view === 'subaccounts') {
      this.loadSubAccounts();
    } else if (view === 'beneficiaries') {
      this.loadBeneficiaries();
    } else if (view === 'credit-ledger') {
      this.loadPassbooks();
    }

    this.searchTerm = '';
    if (view === 'funds') {
      this.loadFundRequests();
    } else {
      this.filterStudents();
    }
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  setPaymentCollectionTab(tab: 'all' | 'needs-request' | 'pending' | 'partially-paid' | 'paid' | 'excess'): void {
    this.activePaymentCollectionTab = tab;
    this.cdr.markForCheck();
  }

  // --- Outstanding Tracking Dashboard Properties ---
  paymentCollectionSearchTerm: string = '';
  collectionFilterAgent: string = 'all';
  collectionFilterCollege: string = 'all';
  collectionFilterStatuses: string[] = ['all'];
  collectionMinAmount: number | null = null;
  collectionMaxAmount: number | null = null;

  // Metrics
  totalCollectionRequested: number = 0;
  totalCollectionConfirmed: number = 0;
  totalCollectionOutstanding: number = 0;
  amountPartiallyPaid: number = 0;
  amountPendingCollection: number = 0;

  // Charts Options
  donutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, boxWidth: 8, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.formattedValue} INR`
        }
      }
    }
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 10, boxWidth: 8, font: { size: 10 } } }
    }
  };

  // Charts Data
  collectionPercentChartData: ChartData<'doughnut'> = {
    labels: ['Collected', 'Outstanding'],
    datasets: [{ data: [0, 0], backgroundColor: ['#059669', '#f43f5e'], borderWidth: 0 }]
  };

  agentPerformanceChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Paid', backgroundColor: '#0ea5e9', borderRadius: 4, barPercentage: 0.6 },
      { data: [], label: 'Outstanding', backgroundColor: '#f43f5e', borderRadius: 4, barPercentage: 0.6 }
    ]
  };

  collegeOutstandingChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], label: 'Outstanding Amount', backgroundColor: '#f43f5e', borderRadius: 4, barPercentage: 0.5 }]
  };

  statusDistributionChartData: ChartData<'pie'> = {
    labels: ['Paid', 'Partially Paid', 'Pending Collection', 'Verification Pending'],
    datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#059669', '#d97706', '#f43f5e', '#6366f1'], borderWidth: 0 }]
  };

  get activePaymentCollectionStudents(): any[] {
    return this.visaPendingStudents;
  }

  get uniqueCollectionAgents(): string[] {
    const agents = this.activePaymentCollectionStudents.map(s => s.agentFullName || 'Unknown').filter(Boolean);
    return Array.from(new Set(agents)).sort();
  }

  get uniqueCollectionColleges(): string[] {
    const colleges = this.activePaymentCollectionStudents.map(s => s.collegeName || s.universityName || 'Unknown').filter(Boolean);
    return Array.from(new Set(colleges)).sort();
  }

  toggleCollectionStatusFilter(status: string): void {
    const idx = this.collectionFilterStatuses.indexOf(status);
    if (idx > -1) {
      this.collectionFilterStatuses.splice(idx, 1);
      if (this.collectionFilterStatuses.length === 0) this.collectionFilterStatuses = ['all'];
    } else {
      // Remove 'all' if a specific status is clicked
      const allIdx = this.collectionFilterStatuses.indexOf('all');
      if (allIdx > -1) this.collectionFilterStatuses.splice(allIdx, 1);
      this.collectionFilterStatuses.push(status);
    }
  }

  calculatePaymentCollectionMetrics(students: any[]): void {
    let req = 0;
    let conf = 0;
    let part = 0;
    let pend = 0;

    const agentMap: Record<string, { paid: number, out: number }> = {};
    const collegeMap: Record<string, number> = {};
    const statusCount = { paid: 0, partial: 0, pending: 0, verification: 0 };

    students.forEach(s => {
      const sReq = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
      const sRec = s.visaPaymentReceivedAmount || 0;
      const sOut = Math.max(0, sReq - sRec);

      req += sReq;
      conf += sRec;

      const st = this.getCollectionStatus(s);
      if (st === 'PARTIALLY_PAID') part += sOut;
      if (st === 'PENDING_COLLECTION' || st === 'PENDING_AGENT_PAYMENT') pend += sOut;

      // Status Chart
      if (st === 'PAID') statusCount.paid++;
      else if (st === 'PARTIALLY_PAID') statusCount.partial++;
      else if (st === 'VERIFICATION_PENDING') statusCount.verification++;
      else statusCount.pending++;

      // Agent Chart
      const agent = s.agentFullName || 'Unknown';
      if (!agentMap[agent]) agentMap[agent] = { paid: 0, out: 0 };
      agentMap[agent].paid += sRec;
      agentMap[agent].out += sOut;

      // College Chart
      if (sOut > 0) {
        const college = s.collegeName || s.universityName || 'Unknown';
        collegeMap[college] = (collegeMap[college] || 0) + sOut;
      }
    });

    this.totalCollectionRequested = req;
    this.totalCollectionConfirmed = conf;
    this.totalCollectionOutstanding = Math.max(0, req - conf);
    this.amountPartiallyPaid = part;
    this.amountPendingCollection = pend;

    // Update Charts
    this.collectionPercentChartData = {
      labels: ['Collected', 'Outstanding'],
      datasets: [{ data: [conf, this.totalCollectionOutstanding], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0 }]
    };

    const agents = Object.keys(agentMap).slice(0, 10); // Top 10
    this.agentPerformanceChartData = {
      labels: agents,
      datasets: [
        { data: agents.map(a => agentMap[a].paid), label: 'Paid', backgroundColor: '#3b82f6', borderRadius: 4 },
        { data: agents.map(a => agentMap[a].out), label: 'Outstanding', backgroundColor: '#ef4444', borderRadius: 4 }
      ]
    };

    const colleges = Object.keys(collegeMap).sort((a, b) => collegeMap[b] - collegeMap[a]).slice(0, 8); // Top 8 by debt
    this.collegeOutstandingChartData = {
      labels: colleges.map(c => c.length > 15 ? c.substring(0, 15) + '...' : c),
      datasets: [{ data: colleges.map(c => collegeMap[c]), label: 'Outstanding Amount', backgroundColor: '#f43f5e', borderRadius: 4 }]
    };

    this.statusDistributionChartData = {
      labels: ['Paid', 'Partially Paid', 'Pending Collection', 'Verification Pending'],
      datasets: [{ data: [statusCount.paid, statusCount.partial, statusCount.pending, statusCount.verification], backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#6366f1'], borderWidth: 0 }]
    };
  }

  get filteredPaymentCollectionStudents(): any[] {
    let filtered = this.activePaymentCollectionStudents;

    // Apply Search
    if (this.paymentCollectionSearchTerm && this.paymentCollectionSearchTerm.trim() !== '') {
      const term = this.paymentCollectionSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(s => {
        const nameMatch = s.fullName?.toLowerCase().includes(term);
        const emailMatch = s.email?.toLowerCase().includes(term);
        const appIdMatch = s.applicationId?.toLowerCase().includes(term);
        return nameMatch || emailMatch || appIdMatch;
      });
    }

    // Apply Agent Filter
    if (this.collectionFilterAgent !== 'all') {
      filtered = filtered.filter(s => (s.agentFullName || 'Unknown') === this.collectionFilterAgent);
    }

    // Apply College Filter
    if (this.collectionFilterCollege !== 'all') {
      filtered = filtered.filter(s => (s.collegeName || s.universityName || 'Unknown') === this.collectionFilterCollege);
    }

    // Apply Status Filter
    if (!this.collectionFilterStatuses.includes('all')) {
      filtered = filtered.filter(s => this.collectionFilterStatuses.includes(this.getCollectionStatus(s)));
    }

    // Apply Amount Range
    filtered = filtered.filter(s => {
      const req = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
      const rec = s.visaPaymentReceivedAmount || 0;
      const out = Math.max(0, req - rec);

      if (this.collectionMinAmount !== null && out < this.collectionMinAmount) return false;
      if (this.collectionMaxAmount !== null && out > this.collectionMaxAmount) return false;
      return true;
    });

    // We must call calculatePaymentCollectionMetrics to update charts based on *current filtered data*
    // However, calling it inside a getter can cause ExpressionChangedAfterItHasBeenCheckedError if it mutates bound properties.
    // So we use a setTimeout or compute charts independently. 
    // To be safe in angular, we just return the filtered list, and rely on an explicit filter button or change event to update metrics.
    // Wait, since we are doing data binding, we can just compute it directly here if we use pure objects.
    // But mutating `this.totalCollectionRequested` in a getter is bad. 
    // Instead, I'll update metrics directly. Angular allows it in OnPush if careful, but setTimeout is safer.
    setTimeout(() => this.calculatePaymentCollectionMetrics(filtered), 0);

    return filtered.sort((a, b) => this.getLatestUpdateTimestamp(b) - this.getLatestUpdateTimestamp(a));
  }

  private getLatestUpdateTimestamp(student: any): number {
    let maxTime = new Date(student.createdAt || 0).getTime();

    // Check all possible date fields that could indicate an update
    const dateFields = [
      'updatedAt',
      'visaFeePaymentDate',
      'visaPaymentReceivedDate',
      'visaBankDetailsSentDate',
      'accToVisaManPaymentDate',
      'paymentReceivedDate',
      'telexPaymentReceivedDate',
      'docReceivedDate',
      'docTentativeReachDate',
      'docReturnedDate'
    ];

    for (const field of dateFields) {
      if (student[field]) {
        const time = new Date(student[field]).getTime();
        if (time > maxTime) maxTime = time;
      }
    }

    // Check history if available
    if (student.studentStatusHistory && Array.isArray(student.studentStatusHistory)) {
      for (const history of student.studentStatusHistory) {
        if (history.updatedAt) {
          const time = new Date(history.updatedAt).getTime();
          if (time > maxTime) maxTime = time;
        }
      }
    }

    // As a final fallback to differentiate same-time entries, add id
    return maxTime + (student.id ? student.id / 1000000 : 0);
  }

  get paymentCollectionCounts() {
    const all = this.activePaymentCollectionStudents;
    return {
      all: all.length,
      needsRequest: all.filter((s: any) => s.action === 'SEND_BANK_DETAILS_TO_AGENT').length,
      pending: all.filter((s: any) => {
        const received = s.visaPaymentReceivedAmount || 0;
        return s.action !== 'SEND_BANK_DETAILS_TO_AGENT' && received === 0;
      }).length,
      partiallyPaid: all.filter((s: any) => {
        const requested = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
        const received = s.visaPaymentReceivedAmount || 0;
        return s.action !== 'SEND_BANK_DETAILS_TO_AGENT' && received > 0 && received < requested;
      }).length,
      paid: all.filter((s: any) => {
        const requested = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
        const received = s.visaPaymentReceivedAmount || 0;
        return s.action !== 'SEND_BANK_DETAILS_TO_AGENT' && requested > 0 && received === requested;
      }).length,
      excess: all.filter((s: any) => {
        const requested = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
        const received = s.visaPaymentReceivedAmount || 0;
        return s.action !== 'SEND_BANK_DETAILS_TO_AGENT' && requested > 0 && received > requested;
      }).length
    };
  }

  // --- Payment Collection Actions ---
  openPaymentCollectionAction(student: any, actionType: 'generate_request' | 'verify_payment' | 'record_payment' | 'request_remaining' | 'cash_settlement'): void {
    if (!student) return;

    const requested = (student.visaPaymentRequestedAmount || 0) + (student.visaManServiceCharge || 0);
    const received = student.visaPaymentReceivedAmount || 0;
    const pendingAmount = requested - received;

    if (actionType === 'generate_request' || actionType === 'request_remaining') {
      this.openSendBankDetailsModal(student);
    } else if (actionType === 'verify_payment') {
      this.openConfirmPaymentModal(student);
    } else if (actionType === 'cash_settlement' || actionType === 'record_payment') {
      this.selectedSettlementStudent = student;
      this.showCashSettlementModal = true;
      this.cashSettlementData = {
        depositType: 'BANK',
        amount: pendingAmount,
        date: new Date().toISOString().split('T')[0],
        remarks: '',
        file: null,
        subAccountId: ''
      };
    }
  }

  closeCashSettlementModal(): void {
    this.showCashSettlementModal = false;
    this.selectedSettlementStudent = null;
  }

  onCashSettlementFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.cashSettlementData.file = event.target.files[0];
    }
  }

  submitCashSettlement(): void {
    if (!this.selectedSettlementStudent || !this.cashSettlementData.amount || !this.cashSettlementData.subAccountId) return;

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('accountantUsername', this.username);
    formData.append('amount', this.cashSettlementData.amount.toString());
    formData.append('date', this.cashSettlementData.date);
    formData.append('subAccountId', this.cashSettlementData.subAccountId.toString());

    if (this.cashSettlementData.remarks) {
      formData.append('remarks', this.cashSettlementData.remarks);
    }
    if (this.cashSettlementData.file) {
      formData.append('file', this.cashSettlementData.file);
    }
    formData.append('settlementType', 'CASH');

    this.http.post(`${environment.apiUrl}/api/visa/cash-settlement/${this.selectedSettlementStudent.id}`, formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          this.recentStatusChange[this.selectedSettlementStudent.id] = 'updated';
          this.showGlobalSuccess('Cash settlement recorded successfully!');
          this.closeCashSettlementModal();
          this.refreshData();
          setTimeout(() => {
            delete this.recentStatusChange[res.id || this.selectedSettlementStudent.id];
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (err: any) => {
          console.error('Error submitting cash settlement', err);
          this.showToast('Failed to record cash settlement', 'error');
        }
      });
  }

  get isAnyActionLoading(): boolean {
    return this.globalOverlay.show;
  }

  showGlobalLoading(message: string, icon: string = '') {
    this.globalOverlay = { show: true, status: 'loading', message, icon };
    this.cdr.detectChanges();
  }

  showGlobalSuccess(message: string) {
    this.globalOverlay.status = 'success';
    this.globalOverlay.message = message;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.globalOverlay.show = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  showGlobalError(message: string) {
    this.globalOverlay.status = 'error';
    this.globalOverlay.message = message;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.globalOverlay.show = false;
      this.cdr.detectChanges();
    }, 2500);
  }

  sendCollectionReminder(student: any): void {
    if (!student.id) return;
    this.isSendingReminder[student.id] = true;
    this.showGlobalLoading('Hang tight! Sending reminder...', 'email');
    this.cdr.detectChanges();

    this.http.post(`${environment.apiUrl}/api/visa/send-reminder/${student.id}`, { accountantUsername: this.username }, { responseType: 'text' })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSendingReminder[student.id] = false;
          // don't close overlay here, let success/error handle it
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.showGlobalSuccess('Reminder sent successfully!');
          this.refreshData();
        },
        error: (err) => {
          console.error('Error sending reminder', err);
          this.showGlobalError('Failed to send reminder');
        }
      });
  }

  selectSettlementStudent(student: any): void {
    this.selectedSettlementStudent = student;
    if (student) {
      this.initFundReleaseForm(student);
    }
  }

  // --- Modals ---
  get visaAccountsStudents(): any[] {
    return this.students.filter((s: any) => !!s.visaPaymentRequestedAmount && s.visaPaymentRequestedAmount > 0);
  }

  get totalVisaRequested(): number {
    return this.visaAccountsStudents.reduce((sum, s) => sum + (s.visaPaymentRequestedAmount || 0), 0);
  }

  get totalVisaReceived(): number {
    return this.visaAccountsStudents.reduce((sum, s) => sum + (s.visaPaymentReceivedAmount || 0), 0);
  }

  get totalServiceChargeRequested(): number {
    return this.visaAccountsStudents.reduce((sum, s) => sum + (s.visaManServiceCharge || 0), 0);
  }

  get totalServiceChargeEarned(): number {
    return this.visaAccountsStudents.reduce((sum, s) => {
      const received = s.visaPaymentReceivedAmount || 0;
      if (received > 0) {
        return sum + (s.visaManServiceCharge || 0);
      }
      return sum;
    }, 0);
  }

  get disbursedRecordsCount(): number {
    return this.visaAccountsStudents.filter(s => s.accToVisaManPaidAmount && s.accToVisaManPaidAmount > 0).length;
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

    this.filteredStudents = sourceList.filter(student => {
      const matchSearch = !term ||
        student.fullName?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.applicationId?.toLowerCase().includes(term);

      const matchAgent = this.listAgentFilter === 'ALL' || student.agentFullName === this.listAgentFilter;
      const matchCollege = this.listCollegeFilter === 'ALL' || student.collegeName === this.listCollegeFilter;

      const dateStr = (student as any).paymentReceivedDate || (student as any).visaPaymentReceivedDate;
      const dateVal = dateStr ? new Date(dateStr) : null;
      const matchDateFrom = !this.listDateFrom || !dateVal || dateVal >= new Date(this.listDateFrom);
      const matchDateTo = !this.listDateTo || !dateVal || dateVal <= new Date(this.listDateTo);

      return matchSearch && matchAgent && matchCollege && matchDateFrom && matchDateTo;
    });

    this.cdr.detectChanges();
  }

  // --- Reports Logic (Agent×College Aggregate Tracking) ---

  /** Only fee-payment students (hasPaid or paymentStatus set) filtered by controls */
  get reportBaseStudents(): any[] {
    return this.students.filter(s => {
      if (!s.paidAmount || s.paidAmount <= 0) return false;
      const matchAgent = this.reportAgentFilter === 'ALL' || s.agentFullName === this.reportAgentFilter;
      const matchPaidTo = this.reportPaidToFilter === 'ALL' || s.paidTo === this.reportPaidToFilter;
      // Use a generic date field — try payment received or fallback
      const dateStr = (s as any).paymentReceivedDate || (s as any).visaPaymentReceivedDate;
      const dateVal = dateStr ? new Date(dateStr) : null;
      const matchDateFrom = !this.reportDateFrom || !dateVal || dateVal >= new Date(this.reportDateFrom);
      const matchDateTo = !this.reportDateTo || !dateVal || dateVal <= new Date(this.reportDateTo);
      return matchAgent && matchPaidTo && matchDateFrom && matchDateTo;
    });
  }

  get uniqueAgents(): string[] {
    return [...new Set(this.students.map(s => s.agentFullName).filter(Boolean))] as string[];
  }

  get uniqueColleges(): string[] {
    return [...new Set(this.students.map(s => s.collegeName).filter(Boolean))] as string[];
  }

  /** Agent-wise aggregate rows */
  get reportAgentRows(): { agent: string, students: number, toCompany: number, toUniversity: number, total: number, colleges: { name: string, students: number, amount: number }[] }[] {
    const map = new Map<string, { students: number, toCompany: number, toUniversity: number, total: number, collegeMap: Map<string, { students: number, amount: number }> }>();

    for (const s of this.reportBaseStudents) {
      const agentName = s.agentFullName || 'Unknown Agent';
      if (!map.has(agentName)) {
        map.set(agentName, { students: 0, toCompany: 0, toUniversity: 0, total: 0, collegeMap: new Map() });
      }
      const row = map.get(agentName)!;
      row.students++;
      row.total += (s.paidAmount || 0);
      if (s.paidTo === 'COMPANY') row.toCompany += (s.paidAmount || 0);
      if (s.paidTo === 'UNIVERSITY') row.toUniversity += (s.paidAmount || 0);

      const collegeName = s.collegeName || 'Unassigned';
      if (!row.collegeMap.has(collegeName)) {
        row.collegeMap.set(collegeName, { students: 0, amount: 0 });
      }
      const cRow = row.collegeMap.get(collegeName)!;
      cRow.students++;
      cRow.amount += (s.paidAmount || 0);
    }

    return Array.from(map.entries()).map(([agent, data]) => ({
      agent,
      students: data.students,
      toCompany: data.toCompany,
      toUniversity: data.toUniversity,
      total: data.total,
      colleges: Array.from(data.collegeMap.entries())
        .map(([name, c]) => ({ name, students: c.students, amount: c.amount }))
        .sort((a, b) => b.amount - a.amount)
    })).sort((a, b) => b.total - a.total);
  }

  /** College-wise aggregate rows */
  get reportCollegeRows(): { college: string, students: number, toCompany: number, toUniversity: number, total: number }[] {
    const map = new Map<string, { students: number, toCompany: number, toUniversity: number, total: number }>();

    for (const s of this.reportBaseStudents) {
      const collegeName = s.collegeName || 'Unassigned';
      if (!map.has(collegeName)) {
        map.set(collegeName, { students: 0, toCompany: 0, toUniversity: 0, total: 0 });
      }
      const row = map.get(collegeName)!;
      row.students++;
      row.total += (s.paidAmount || 0);
      if (s.paidTo === 'COMPANY') row.toCompany += (s.paidAmount || 0);
      if (s.paidTo === 'UNIVERSITY') row.toUniversity += (s.paidAmount || 0);
    }

    return Array.from(map.entries()).map(([college, data]) => ({
      college,
      ...data
    })).sort((a, b) => b.total - a.total);
  }

  /** Grand totals for the report */
  get reportGrandTotal(): number {
    return this.reportBaseStudents.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }
  get reportTotalToCompany(): number {
    return this.reportBaseStudents.filter(s => s.paidTo === 'COMPANY').reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }
  get reportTotalToUniversity(): number {
    return this.reportBaseStudents.filter(s => s.paidTo === 'UNIVERSITY').reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }
  get reportTotalStudents(): number {
    return this.reportBaseStudents.length;
  }

  // Track expanded agent rows in the report
  expandedReportAgents: Set<string> = new Set();
  toggleReportAgent(agent: string): void {
    if (this.expandedReportAgents.has(agent)) {
      this.expandedReportAgents.delete(agent);
    } else {
      this.expandedReportAgents.add(agent);
    }
    this.cdr.detectChanges();
  }

  // --- Dashboard Detailed Summaries ---
  get dashboardTotalToCompany(): number {
    return this.students.filter(s => s.paidTo === 'COMPANY' && s.paymentStatus === 'Received')
      .reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }

  get dashboardTotalToUniversity(): number {
    return this.students.filter(s => s.paidTo === 'UNIVERSITY' && s.paymentStatus === 'Received')
      .reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }

  get dashboardTopAgents(): { name: string, amount: number }[] {
    const agentMap = new Map<string, number>();
    this.students.filter(s => s.paymentStatus === 'Received' && s.agentFullName).forEach(s => {
      agentMap.set(s.agentFullName!, (agentMap.get(s.agentFullName!) || 0) + (s.paidAmount || 0));
    });
    return Array.from(agentMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5
  }

  get dashboardTopColleges(): { name: string, amount: number }[] {
    const collegeMap = new Map<string, number>();
    this.students.filter(s => s.paymentStatus === 'Received' && s.collegeName).forEach(s => {
      collegeMap.set(s.collegeName!, (collegeMap.get(s.collegeName!) || 0) + (s.paidAmount || 0));
    });
    return Array.from(collegeMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5
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
    this.rejectionRemarks = '';
    this.showRejectModal = true;
    this.cdr.detectChanges();
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectionRemarks = '';
    this.cdr.detectChanges();
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.cdr.detectChanges();
  }

  openPayVisaManModal(student: any): void {
    this.selectedStudent = student;
    const requested = student.visaPaymentRequestedAmount || 0;
    const serviceCharge = student.visaManServiceCharge || 0;
    const alreadyPaid = student.accToVisaManPaidAmount || 0;
    const remaining = (requested + serviceCharge) - alreadyPaid;

    this.payVisaManForm = {
      amountToPay: remaining > 0 ? remaining : null,
      mode: 'UPI',
      txId: '',
      paymentDate: this.formatDateForInput(new Date()),
      subAccountId: null
    };
    this.showPayVisaManModal = true;
    this.cdr.detectChanges();
  }

  closePayVisaManModal(): void {
    this.showPayVisaManModal = false;
    this.cdr.detectChanges();
  }

  /**
   * Open the Pay VisaMan modal from a passbook record.
   * Maps the passbook record fields to a student-like object so the existing modal logic works.
   */
  openPayVisaManFromPassbook(record: any): void {
    // Find matching student from loaded students by applicationId
    const matchingStudent = this.students.find(s => s.applicationId === record.applicationId);

    // Build a student-like object for the modal
    const studentLike: any = {
      id: matchingStudent ? matchingStudent.studentId : null,
      studentId: matchingStudent ? matchingStudent.studentId : null,
      fullName: record.studentName,
      applicationId: record.applicationId,
      visaPaymentRequestedAmount: record.visaAmountRequest || 0,
      visaManServiceCharge: record.serviceChargeRequested || 0,
      accToVisaManPaidAmount: record.totalAmountPaidByAccountant || 0,
      visaPaymentRequestedCurrency: 'USD',
      visaMan: { username: record.requesterName }
    };

    if (!studentLike.id) {
      this.showErrorToast('Cannot find the matching student record. Please ensure the student data is loaded.');
      return;
    }

    this.openPayVisaManModal(studentLike);
  }

  // --- API Actions ---

  confirmApprove(): void {
    if (!this.selectedStudent || !this.accountantData) return;
    if (!this.approveForm.receivedAmount || !this.approveForm.receivedDate) {
      this.showErrorToast('Please fill in all required fields.');
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
        error: (err: any) => {
          console.error('Approve error:', err);
          this.showErrorToast('Failed to approve payment. Please try again.');
        }
      });
  }

  confirmReject(): void {
    if (!this.selectedStudent || !this.accountantData) return;

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const studentId = (this.selectedStudent as any).studentId || this.selectedStudent.id;

    const payload: RejectPaymentPayload = {
      accountantUsername: this.accountantData.username,
      rejectionRemarks: this.rejectionRemarks
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
        error: (err: any) => {
          console.error('Reject error:', err);
          this.showErrorToast('Failed to reject payment. Please try again.');
        }
      });
  }

  confirmPayVisaMan(): void {
    if (!this.selectedStudent || !this.accountantData) return;
    if (!this.payVisaManForm.amountToPay || !this.payVisaManForm.paymentDate || !this.payVisaManForm.mode) {
      this.showErrorToast('Please fill in all required fields.');
      return;
    }
    if (!this.payVisaManForm.subAccountId) {
      this.showErrorToast('Please select a Bank Account to debit from.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const studentId = (this.selectedStudent as any).studentId || this.selectedStudent.id;

    const payload = {
      amountToPay: this.payVisaManForm.amountToPay,
      paymentDate: this.payVisaManForm.paymentDate,
      mode: this.payVisaManForm.mode,
      txId: this.payVisaManForm.txId,
      subAccountId: this.payVisaManForm.subAccountId,
      accountantUsername: this.accountantData.username
    };

    this.accountantService.payVisaMan(studentId, payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.closePayVisaManModal();
          this.showSuccess('Payment accurately recorded and subtracted from pending Visa Man payout!');
          this.refreshData();
        },
        error: (err: any) => {
          console.error('Pay Visa Man error:', err);
          const errorMsg = typeof err.error === 'string' ? err.error : (err.error?.message || 'Failed to pay Visa Man.');
          this.showErrorToast(errorMsg);
        }
      });
  }

  showSuccess(message: string, title: string = 'Payment Verified!'): void {
    this.successTitle = title;
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
    return this.students.filter(s => {
      // Must have a visa payment request to be in this section
      if (!s.visaPaymentRequestedAmount || s.visaPaymentRequestedAmount <= 0) return false;

      const requested = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
      const received = s.visaPaymentReceivedAmount || 0;
      const released = s.accToVisaManPaidAmount || 0;

      const isFullyCollected = received >= requested;
      const isFullyReleased = released >= requested;

      // If both collection and release are completely done, only show if there's a pending manual action
      if (isFullyCollected && isFullyReleased) {
        return s.action === 'SEND_BANK_DETAILS_TO_AGENT' ||
          s.action === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT' ||
          s.action === 'CONFIRM_VISA_PAYMENT';
      }

      // Otherwise, the workflow is still ongoing, keep it visible!
      return true;
    });
  }

  hasCollectionRequest(studentId: any): boolean {
    return this.collectionRequests.some(r => r.studentId == studentId);
  }

  // Visa Settlement Filters
  settlementSearchTerm: string = '';
  settlementStatusFilter: string = 'ALL';
  settlementAgentFilter: string = 'ALL';
  settlementCollegeFilter: string = 'ALL';

  // --- Visa Settlement KPI Getters ---

  get vsKpiSettledCount(): number {
    return this.visaPendingStudents.filter(s => this.getFundReleaseStatus(s) === 'SETTLED').length;
  }
  get vsKpiConfirmPendingCount(): number {
    return this.visaPendingStudents.filter(s => this.getFundReleaseStatus(s) === 'CONFIRMATION_PENDING').length;
  }
  get vsKpiReleasePendingCount(): number {
    return this.visaPendingStudents.filter(s => this.getFundReleaseStatus(s) === 'FUND_RELEASE_PENDING').length;
  }
  get vsKpiCollectionPendingCount(): number {
    return this.visaPendingStudents.filter(s => this.getFundReleaseStatus(s) === 'COLLECTION_PENDING').length;
  }
  get vsKpiTotalFeeAmount(): number {
    return this.visaPendingStudents.reduce((sum, s) => sum + (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0), 0);
  }
  get vsKpiTotalReleasedAmount(): number {
    return this.visaPendingStudents.reduce((sum, s) => {
      // If it's already settled or confirmation pending, the accountant has released it
      const status = this.getFundReleaseStatus(s);
      if (status === 'SETTLED' || status === 'CONFIRMATION_PENDING' || (s.accToVisaManPaidAmount || 0) > 0) {
        return sum + (s.accToVisaManPaidAmount || ((s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0)));
      }
      return sum;
    }, 0);
  }

  // --- Visa Settlement Unique Agents & Colleges (for filter dropdowns) ---
  get vsUniqueAgents(): string[] {
    const agents = this.visaPendingStudents
      .map(s => s.agentFullName || '')
      .filter(a => a.length > 0);
    return [...new Set(agents)].sort();
  }

  get vsUniqueColleges(): string[] {
    const colleges = this.visaPendingStudents
      .map(s => s.collegeName || '')
      .filter(c => c.length > 0);
    return [...new Set(colleges)].sort();
  }

  // --- Visa Settlement Chart Data ---
  get vsStatusChartData(): ChartConfiguration<'doughnut'>['data'] {
    return {
      labels: ['Settled', 'Confirm Pending', 'Release Pending', 'Collection Pending'],
      datasets: [{
        data: [
          this.vsKpiSettledCount,
          this.vsKpiConfirmPendingCount,
          this.vsKpiReleasePendingCount,
          this.vsKpiCollectionPendingCount
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 6
      }]
    };
  }

  vsStatusChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4
      }
    }
  };

  get vsAgentChartData(): ChartConfiguration<'bar'>['data'] {
    const agentMap = new Map<string, number>();
    this.visaPendingStudents.forEach(s => {
      const agent = s.agentFullName || 'Unknown';
      const fee = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
      agentMap.set(agent, (agentMap.get(agent) || 0) + fee);
    });
    const sorted = [...agentMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      labels: sorted.map(e => e[0].length > 14 ? e[0].substring(0, 14) + '…' : e[0]),
      datasets: [{
        data: sorted.map(e => e[1]),
        backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 28
      }]
    };
  }

  vsAgentChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => ` Fee: ${ctx.parsed.x?.toLocaleString() || 0}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: "'Inter', sans-serif", size: 11 } },
        border: { display: false }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#475569', font: { family: "'Inter', sans-serif", size: 12, weight: 600 as any } },
        border: { display: false }
      }
    }
  };

  get filteredVisaPendingStudents(): AssignedStudent[] {
    let filtered = this.visaPendingStudents;

    if (this.settlementStatusFilter !== 'ALL') {
      filtered = filtered.filter(s => this.getFundReleaseStatus(s) === this.settlementStatusFilter);
    }

    if (this.settlementAgentFilter !== 'ALL') {
      filtered = filtered.filter(s => (s.agentFullName || '') === this.settlementAgentFilter);
    }

    if (this.settlementCollegeFilter !== 'ALL') {
      filtered = filtered.filter(s => (s.collegeName || '') === this.settlementCollegeFilter);
    }

    if (this.settlementSearchTerm) {
      const term = this.settlementSearchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        (s.fullName && s.fullName.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.applicationId && s.applicationId.toLowerCase().includes(term))
      );
    }

    return filtered.sort((a, b) => this.getLatestUpdateTimestamp(b) - this.getLatestUpdateTimestamp(a));
  }

  resetVisaSettlementFilters(): void {
    this.settlementSearchTerm = '';
    this.settlementStatusFilter = 'ALL';
    this.settlementAgentFilter = 'ALL';
    this.settlementCollegeFilter = 'ALL';
    this.visaSettlementCurrentPage = 1;
  }

  // --- Visa Settlement Pagination ---
  visaSettlementCurrentPage: number = 1;
  visaSettlementPageSize: number = 10;

  get paginatedVisaPendingStudents(): AssignedStudent[] {
    const startIndex = (this.visaSettlementCurrentPage - 1) * this.visaSettlementPageSize;
    return this.filteredVisaPendingStudents.slice(startIndex, startIndex + this.visaSettlementPageSize);
  }

  get visaSettlementTotalPages(): number {
    return Math.ceil(this.filteredVisaPendingStudents.length / this.visaSettlementPageSize) || 1;
  }

  nextVisaSettlementPage(): void {
    if (this.visaSettlementCurrentPage < this.visaSettlementTotalPages) {
      this.visaSettlementCurrentPage++;
    }
  }

  prevVisaSettlementPage(): void {
    if (this.visaSettlementCurrentPage > 1) {
      this.visaSettlementCurrentPage--;
    }
  }

  get visaSettlementStartIndex(): number {
    if (this.filteredVisaPendingStudents.length === 0) return 0;
    return (this.visaSettlementCurrentPage - 1) * this.visaSettlementPageSize + 1;
  }

  get visaSettlementEndIndex(): number {
    return Math.min(this.visaSettlementCurrentPage * this.visaSettlementPageSize, this.filteredVisaPendingStudents.length);
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

  getCollectionStatus(student: any): string {
    const requested = (student.visaPaymentRequestedAmount || 0) + (student.visaManServiceCharge || 0);
    const received = student.visaPaymentReceivedAmount || 0;

    // 1. VERIFICATION_PENDING: Agent submitted a payment that needs accountant confirmation.
    //    Backend ONLY sets this action when agent submits a new payment.
    //    Backend changes it away as soon as accountant confirms.
    if (student.action === 'CONFIRM_VISA_PAYMENT') {
      return 'VERIFICATION_PENDING';
    }

    // 2. PAID: All money collected
    if (received > 0 && received >= requested) {
      return 'PAID';
    }

    // 3. PENDING_AGENT_PAYMENT: Request sent to agent, waiting for their payment
    if (student.action === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT') {
      return 'PENDING_AGENT_PAYMENT';
    }

    // 4. PARTIALLY_PAID or PENDING_COLLECTION: Accountant needs to act
    if (student.action === 'SEND_BANK_DETAILS_TO_AGENT') {
      if (received > 0 && received < requested) return 'PARTIALLY_PAID';
      return 'PENDING_COLLECTION';
    }

    // Fallback
    return 'PENDING_COLLECTION';
  }

  /**
   * Open modal to send bank details to agent
   */
  openSendBankDetailsModal(student: any): void {
    console.log('Sending Bank Details for Student:', student); // DEBUG: Check if visaManServiceCharge is present
    this.selectedStudent = student;
    // Calculate total: Requested Visa Fee + Service Charge - Received Amount
    const visaFee = student.visaPaymentRequestedAmount || 0;
    const serviceCharge = student.visaManServiceCharge || 0;
    const received = student.visaPaymentReceivedAmount || 0;
    this.bankDetailsAmount = (visaFee + serviceCharge) - received;

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
  disbursedAmount: number | null = null;
  disbursementMode: string = 'CASH';
  disbursementTxId: string = '';
  disbursementDate: string = '';

  openConfirmPaymentModal(student: any): void {
    this.selectedStudent = student;
    // Pre-fill with outstanding amount: (base visa fee + service charge) - already received
    const baseFee = student.visaPaymentRequestedAmount || 0;
    const serviceCharge = student.visaManServiceCharge || 0;
    const alreadyReceived = student.visaPaymentReceivedAmount || 0;
    this.receivedAmount = (baseFee + serviceCharge) - alreadyReceived;
    this.receivedDate = new Date().toISOString().split('T')[0];

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
    if (!this.selectedSubAccountId) {
      this.showErrorToast('Please select a SubAccount');
      return;
    }

    this.processingId = studentId;
    this.cdr.detectChanges();

    const body = {
      accountantUsername: this.username,
      amount: this.bankDetailsAmount,
      currency: this.bankDetailsCurrency,
      subAccountId: this.selectedSubAccountId
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
          this.showSuccess('Bank details sent to agent successfully!');
          this.refreshData();
          this.closeSendBankDetailsModal();
        },
        error: (err: any) => {
          console.error('Error sending bank details:', err);
          this.showErrorToast('Failed to send bank details: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
  }

  /**
   * Send Reminder email to Agent
   */
  sendReminderEmail(student: any): void {
    if (!student || !student.id) return;

    this.processingId = student.id;
    this.cdr.detectChanges();

    const body = {
      accountantUsername: this.username
    };

    this.http.post(`${environment.apiUrl}/api/visa/send-reminder/${student.id}`, body)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.showSuccess('Reminder sent successfully!');
          this.refreshData();
        },
        error: (err: any) => {
          console.error('Error sending reminder:', err);
          this.showErrorToast('Failed to send reminder: ' + (err.error?.message || err.message || 'Unknown error'));
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
          this.showSuccess('Visa payment confirmed!');
          this.closeConfirmPaymentModal();
          // Reload both students and passbooks fresh — no delay
          this.refreshData();
        },
        error: (err: any) => {
          console.error('Error confirming payment:', err);
          this.showErrorToast('Failed to confirm payment: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
  }

  /**
   * Show error modal message
   */
  showErrorModal = false;
  errorMessage = '';

  showErrorToast(message: string): void {
    this.errorMessage = message;
    this.showErrorModal = true;
    this.cdr.detectChanges();
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
    this.cdr.detectChanges();
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
    paymentMode: 'CASH',
    subAccountId: null as number | null
  };
  isFundSubmitting = false;

  loadFundRequests(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.paymentRequestService.getAllRequests().subscribe({
      next: (data: any) => {
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
      error: (err: any) => {
        console.error('Error loading fund requests', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openFundPaymentModal(request: PaymentRequest): void {
    this.selectedFundRequest = request;
    // Default to remaining amount
    const remaining = request.remainingAmount !== undefined ? request.remainingAmount : ((request.requestedAmount || 0) - (request.amountPaid || 0));

    this.fundPaymentForm = {
      amountPaid: remaining > 0 ? remaining : 0,
      transactionId: '',
      paymentMode: 'CASH',
      subAccountId: null
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
      this.showErrorToast('Transaction ID is required for online payments.');
      return;
    }
    if (this.fundPaymentForm.amountPaid <= 0) {
      this.showErrorToast('Please enter a valid amount.');
      return;
    }

    const remaining = this.selectedFundRequest.remainingAmount !== undefined
      ? this.selectedFundRequest.remainingAmount
      : ((this.selectedFundRequest.requestedAmount || 0) - (this.selectedFundRequest.amountPaid || 0));

    if (this.fundPaymentForm.amountPaid > remaining) {
      this.showErrorToast(`Amount cannot exceed the remaining balance of ₹${remaining}`);
      return;
    }

    // SubAccount balance validation
    if (!this.fundPaymentForm.subAccountId) {
      this.showErrorToast('Please select a Bank Account to pay from.');
      return;
    }
    const selectedAcc = this.subAccounts.find(a => a.id === this.fundPaymentForm.subAccountId);
    if (selectedAcc && (selectedAcc.balance || 0) < this.fundPaymentForm.amountPaid) {
      this.showErrorToast(`Insufficient balance in ${selectedAcc.bankName}. Available: ₹${selectedAcc.balance?.toFixed(2)}, Required: ₹${this.fundPaymentForm.amountPaid}`);
      return;
    }

    this.isFundSubmitting = true;
    const payload = {
      amountPaid: this.fundPaymentForm.amountPaid,
      accountantPaymentMode: this.fundPaymentForm.paymentMode,
      transactionId: this.fundPaymentForm.paymentMode === 'CASH' ? null : this.fundPaymentForm.transactionId,
      subAccountId: this.fundPaymentForm.subAccountId
    };

    this.paymentRequestService.payRequest(this.selectedFundRequest.id, payload).subscribe({
      next: () => {
        this.showSuccess('Payment recorded successfully');
        this.closeFundPaymentModal();
        this.loadFundRequests();
        this.isFundSubmitting = false;
      },
      error: (err: any) => {
        console.error('Error processing payment', err);
        this.isFundSubmitting = false;
        this.showErrorToast('Failed to process payment');
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

  // Format DateTime for passbook
  formatDateTime(dateStr: string): string {
    if (!dateStr) return '-';
    // dateStr might be an array if LocalDateTime is serialized as array by Jackson, but usually it's string.
    // Let's assume standard ISO string from backend since it's typically configured so in modern Spring Boot
    if (Array.isArray(dateStr)) {
      // [year, month, day, hour, minute]
      dateStr = `${dateStr[0]}-${String(dateStr[1]).padStart(2, '0')}-${String(dateStr[2]).padStart(2, '0')}T${String(dateStr[3]).padStart(2, '0')}:${String(dateStr[4]).padStart(2, '0')}`;
    }
    const date = new Date(dateStr);
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

  // ═══════════ FINANCIAL SUMMARY COMPUTATIONS ═══════════

  // --- Agent Transactions (Money IN) ---
  getTotalRequestedFromAgents(): number {
    return this.agentPassbooks.reduce((sum: number, p: any) => sum + (p.requestedAmountByAccountantToAgent || 0), 0);
  }

  getTotalReceivedFromAgents(): number {
    return this.agentPassbooks.reduce((sum: number, p: any) => sum + (p.amountPaidByAgent || 0), 0);
  }

  getTotalConfirmedFromAgents(): number {
    return this.agentPassbooks.reduce((sum: number, p: any) => sum + (p.amountConfirmedByAccountant || 0), 0);
  }

  getPendingFromAgents(): number {
    const requested = this.getTotalRequestedFromAgents();
    const confirmed = this.getTotalConfirmedFromAgents();
    return Math.max(0, requested - confirmed);
  }

  getAgentCollectionRate(): number {
    const requested = this.getTotalRequestedFromAgents();
    if (requested === 0) return 0;
    return Math.min(100, (this.getTotalConfirmedFromAgents() / requested) * 100);
  }

  // --- VisaMan Payouts (Money OUT) ---
  getTotalVisaFeeRequested(): number {
    return this.visaManPassbooks.reduce((sum: number, p: any) => sum + (p.visaAmountRequest || 0), 0);
  }

  getTotalServiceCharge(): number {
    return this.visaManPassbooks.reduce((sum: number, p: any) => sum + (p.serviceChargeRequested || 0), 0);
  }

  getTotalOwedToVisaMan(): number {
    return this.getTotalVisaFeeRequested() + this.getTotalServiceCharge();
  }

  getTotalPaidToVisaMan(): number {
    return this.visaManPassbooks.reduce((sum: number, p: any) => sum + (p.totalAmountPaidByAccountant || 0), 0);
  }

  getPendingToVisaMan(): number {
    return Math.max(0, this.getTotalOwedToVisaMan() - this.getTotalPaidToVisaMan());
  }

  getVisaManPayoutRate(): number {
    const owed = this.getTotalOwedToVisaMan();
    if (owed === 0) return 0;
    return Math.min(100, (this.getTotalPaidToVisaMan() / owed) * 100);
  }

  // --- Fund Requests (Money OUT) ---
  getTotalPaidToFundRequests(): number {
    return this.fundRequests.reduce((sum: number, req: any) => sum + (req.amountPaid || 0), 0);
  }

  // --- Net Balance ---
  getTotalBorrowedFunds(): number {
    return this.credits.reduce((sum, credit) => sum + (credit.amount || 0), 0);
  }

  getNetCashBalance(): number {
    let balance = this.getTotalConfirmedFromAgents() - this.getTotalPaidToVisaMan() - this.getTotalPaidToFundRequests();
    if (this.includeCreditInBalance) {
      balance += this.getTotalBorrowedFunds();
    }
    return balance;
  }

  toggleCreditInclusion(): void {
    this.includeCreditInBalance = !this.includeCreditInBalance;
  }

  // --- Add Funds Modal Logic ---
  openAddFundsModal(): void {
    this.creditForm = {
      amount: 0,
      method: 'FRIEND',
      creditDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      interestRate: 0,
      friendName: '',
      friendPhone: '',
      bankName: '',
      loanTenureMonths: 0,
      cardInfo: '',
      emiDetails: '',
      subAccountId: null
    };
    this.showAddFundsModal = true;
    this.cdr.detectChanges();
  }

  closeAddFundsModal(): void {
    this.showAddFundsModal = false;
    this.cdr.detectChanges();
  }

  submitCredit(): void {
    if (!this.creditForm.amount || this.creditForm.amount <= 0) {
      this.showErrorToast('Amount must be greater than 0.');
      return;
    }
    if (!this.creditForm.subAccountId) {
      this.showErrorToast('Please select a Bank Account to credit to.');
      return;
    }

    // Set basic validation based on method
    if (this.creditForm.method === 'FRIEND' && (!this.creditForm.friendName || !this.creditForm.friendPhone)) {
      this.showErrorToast('Please fill out Friend Name and Phone.');
      return;
    }
    if (this.creditForm.method === 'LOAN' && !this.creditForm.bankName) {
      this.showErrorToast('Please provide the Bank Name for the loan.');
      return;
    }
    if (this.creditForm.method === 'CREDIT_CARD' && !this.creditForm.cardInfo) {
      this.showErrorToast('Please provide the Credit Card info.');
      return;
    }

    this.isSubmitting = true;
    this.accountantService.addCredit(this.creditForm, this.username)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.isSubmitting = false; this.cdr.detectChanges(); })
      )
      .subscribe({
        next: (res: any) => {
          this.credits.unshift(res);
          this.closeAddFundsModal();
          this.showSuccess(`Successfully added ₹${res.amount} via ${res.method}!`, 'Credit Added!');
        },
        error: (err: any) => {
          console.error('Failed to add credit', err);
          this.showErrorToast('Failed to add funds. Please check your inputs.');
        }
      });
  }

  // ======================= FUND RELEASE =======================
  showReleaseFundModal: boolean = false;
  selectedReleaseStudent: any = null;

  openReleaseFundModal(student: any) {
    if (student.action === 'SEND_BANK_DETAILS_TO_AGENT') {
      this.showErrorToast("Cannot release funds. A Request must be generated first.");
      return;
    }
    this.selectedReleaseStudent = student;
    this.initFundReleaseForm(student);
    this.showInlineReleaseFund = true;
  }

  closeReleaseFundModal() {
    this.showInlineReleaseFund = false;
    this.showReleaseFundModal = false;
    this.selectedReleaseStudent = null;
  }

  initFundReleaseForm(student: any) {
    const studentId = student.id;
    if (!this.fundReleaseForms[studentId]) {
      const totalAmount = (student.visaPaymentRequestedAmount || 0) + (student.visaManServiceCharge || 0);
      this.fundReleaseForms[studentId] = {
        visaFee: null,
        serviceCharge: null,
        totalReleasedAmount: totalAmount,
        sourceAccountId: null,
        beneficiaryAccountId: null,
        transactionReference: '',
        transferDate: '',
        remarks: ''
      };
    }
  }

  getSelectedBeneficiary(studentId: number): any {
    const form = this.fundReleaseForms[studentId];
    if (!form || !form.beneficiaryAccountId) return null;
    return this.beneficiaries.find((b: any) => b.id == form.beneficiaryAccountId) || null;
  }

  onFundReleaseFileSelected(event: any, studentId: number) {
    const file = event.target.files[0];
    if (file) {
      this.fundReleaseFiles[studentId] = file;
    }
  }

  showConfirmReleaseFundModal = false;
  selectedStudentForRelease: any = null;

  releaseFundsToVM(student: any) {
    const form = this.fundReleaseForms[student.id];

    if (!form || !form.totalReleasedAmount || !form.transactionReference) {
      this.showErrorToast('Please fill in all required fields (Total Amount, Ref).');
      return;
    }

    this.selectedStudentForRelease = student;
    this.showConfirmReleaseFundModal = true;
  }

  closeConfirmReleaseModal() {
    this.showConfirmReleaseFundModal = false;
    this.selectedStudentForRelease = null;
  }

  executeReleaseFunds() {
    if (!this.selectedStudentForRelease) return;
    const student = this.selectedStudentForRelease;
    const form = this.fundReleaseForms[student.id];
    const visaFee = student.visaPaymentRequestedAmount || 0;
    const serviceCharge = student.visaManServiceCharge || 0;

    const formData = new FormData();
    formData.append('accountantUsername', this.username);
    formData.append('sourceAccountId', form.sourceAccountId ? form.sourceAccountId.toString() : '');
    formData.append('beneficiaryAccountId', form.beneficiaryAccountId ? form.beneficiaryAccountId.toString() : '');
    formData.append('visaFee', visaFee.toString());
    formData.append('serviceCharge', serviceCharge.toString());
    formData.append('transferDate', form.transferDate);
    formData.append('transactionReference', form.transactionReference);

    if (form.remarks) {
      formData.append('remarks', form.remarks);
    }

    if (this.fundReleaseFiles[student.id]) {
      formData.append('receipt', this.fundReleaseFiles[student.id]);
    }

    this.isSubmitting = true;
    this.http.post(`${environment.apiUrl}/api/fund-release/release/${student.id}`, formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showSuccess('Funds released to Visa Manager successfully!');
        this.closeConfirmReleaseModal();
        this.closeReleaseFundModal();

        // Eagerly update UI state so button disappears immediately
        if (this.selectedSettlementStudent) {
          this.selectedSettlementStudent.accToVisaManPaidAmount = visaFee + serviceCharge;
          this.selectedSettlementStudent.accToVisaManStatus = 'RELEASED_PENDING_CONFIRMATION';
          this.cdr.detectChanges();
        }

        // Refresh data
        this.refreshData();
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error releasing funds:', error);
        this.showErrorToast('Failed to release funds. ' + (error.error?.message || error.message));
      }
    });
  }

  fetchOutstandingRecovery() {
    this.http.get<any[]>(`${environment.apiUrl}/api/accountant/outstanding-recovery?username=${this.username}`).subscribe({
      next: (res: any) => {
        this.outstandingRecoveryData = res;
      },
      error: (err: any) => {
        console.error('Failed to fetch outstanding recovery', err);
      }
    });
  }

  // Calculate Visa Settlement Status
  getFundReleaseStatus(student: any): string {
    if (student.accToVisaManStatus === 'CONFIRMED' || student.accToVisaManStatus === 'FUNDS_CONFIRMED' || student.accToVisaManStatus === 'FULLY_PAID' || student.accToVisaManStatus === 'SETTLED' || student.accToVisaManStatus === 'FEE_RECEIVED') {
      return 'SETTLED';
    }
    if (student.accToVisaManPaidAmount > 0 || student.accToVisaManStatus === 'RELEASED_PENDING_CONFIRMATION') {
      return 'CONFIRMATION_PENDING';
    }
    if (student.action !== 'SEND_BANK_DETAILS_TO_AGENT' || student.visaPaymentReceivedAmount > 0) {
      return 'FUND_RELEASE_PENDING';
    }
    return 'COLLECTION_PENDING';
  }

  // --- Beneficiary Accounts Methods ---
  loadBeneficiaries(): void {
    this.beneficiaryService.getAllBeneficiaries().subscribe({
      next: (data: any) => {
        this.beneficiaries = data;
      },
      error: (err: any) => console.error('Error loading beneficiaries:', err)
    });
  }

  getActiveBeneficiaries() {
    return this.beneficiaries.filter(b => b.status === 'Active');
  }

  hasReleasedFunds(studentId: number): boolean {
    return this.fundReleases.some(r => r.student?.id === studentId);
  }

  openBeneficiaryWizard(): void {
    this.isBeneficiaryWizardOpen = true;
    this.beneficiaryWizardStep = 1;
    this.newBeneficiary = {
      beneficiaryType: 'University',
      beneficiaryName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
      upiId: '',
      mobileNumber: '',
      emailAddress: '',
      status: 'Active'
    };
  }

  closeBeneficiaryWizard(): void {
    this.isBeneficiaryWizardOpen = false;
  }

  nextBeneficiaryStep(): void {
    if (this.beneficiaryWizardStep < 3) {
      this.beneficiaryWizardStep++;
    }
  }

  prevBeneficiaryStep(): void {
    if (this.beneficiaryWizardStep > 1) {
      this.beneficiaryWizardStep--;
    }
  }

  submitBeneficiary(): void {
    this.beneficiaryService.createBeneficiary(this.newBeneficiary).subscribe({
      next: (res: any) => {
        this.loadBeneficiaries();
        this.showSuccess('Beneficiary Created Successfully!', `${res.beneficiaryName} has been added.`);
        this.closeBeneficiaryWizard();
      },
      error: (err: any) => {
        console.error('Error creating beneficiary:', err);
      }
    });
  }
}
