import { Component, OnInit, ChangeDetectorRef, HostListener, Renderer2, ElementRef } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  Student,
  DocPersonProfile,
  VerificationPayload,
  PaginationConfig,
  FilterConfig,
  ErrorState,
  ToastNotification,
  ChartData,
  DashboardStats
} from './doc-person.models';
import {
  slideInAnimation,
  fadeInAnimation,
  scaleInAnimation,
  bounceAnimation,
  slideUpAnimation
} from './animations';
import { PaymentRequestService, PaymentRequest } from '../../services/payment-request.service';
import { DocPersonService } from '../../services/doc-person.service';
import { environment } from '../../../environments/environment';
import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-doc-person-dashbaord',
  standalone: false,
  templateUrl: './doc-person-dashbaord.html',
  styleUrls: ['./doc-person-dashbaord.css'],
  animations: [
    slideInAnimation,
    fadeInAnimation,
    scaleInAnimation,
    bounceAnimation,
    slideUpAnimation
  ]
})
export class DocPersonDashbaord implements OnInit {

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  activeTab: 'dashboard' | 'receive' | 'verify' | 'return' | 'pipeline' | 'stamped' | 'reports' | 'profile' | 'funds' | 'all-students' | 'inventory' | 'transfers' | 'passport-requests' | 'travel-info' | 'courier-requests' | 'fund-request' | 'passport-collect' = 'dashboard';
  isLoading: boolean = false;
  isLoggingOut: boolean = false;
  isDarkMode: boolean = false;

  setActiveTab(tab: 'dashboard' | 'receive' | 'verify' | 'return' | 'pipeline' | 'stamped' | 'reports' | 'profile' | 'funds' | 'all-students' | 'inventory' | 'transfers' | 'passport-requests' | 'travel-info' | 'courier-requests' | 'fund-request' | 'passport-collect'): void {
    this.activeTab = tab;
    this.pagination.currentPage = 1; // Reset pagination
    this.applyFilters(); // Re-apply filters based on the new tab
    if (tab === 'funds') {
      this.loadMyRequests();
    }
    this.cdr.detectChanges();
  }

  getTabTitle(): string {
    const titles: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'receive': 'Incoming Documents',
      'verify': 'Active Custody',
      'return': 'Return Requests',
      'pipeline': 'In Pipeline',
      'stamped': 'Visa Stamped',
      'reports': 'Reports',
      'profile': 'My Profile',
      'funds': 'Fund Requests',
      'all-students': 'All Students',
      'inventory': 'Document Inventory',
      'transfers': 'Document Transfers',
      'passport-requests': 'Passport Requests',
      'travel-info': 'Travel Information',
      'courier-requests': 'Courier Requests',
      'fund-request': 'Fund Request'
    };
    return titles[this.activeTab] || 'Dashboard';
  }

  // ALL STUDENTS & DETAILS MODAL
  showStudentDetailsModal: boolean = false;
  selectedStudentForDetails: Student | null = null;
  studentDetailsTab: 'info' | 'docs' | 'timeline' = 'info';

  openStudentDetails(student: Student): void {
    this.selectedStudentForDetails = student;
    this.studentDetailsTab = 'info'; // Default tab
    this.showStudentDetailsModal = true;
    this.cdr.detectChanges();
  }

  closeStudentDetails(): void {
    this.showStudentDetailsModal = false;
    this.selectedStudentForDetails = null;
    this.cdr.detectChanges();
  }

  setDetailsTab(tab: 'info' | 'docs' | 'timeline'): void {
    this.studentDetailsTab = tab;
    this.cdr.detectChanges();
  }

  // Interactive Features
  bulkSelectedIds: Set<number> = new Set();
  showCommandPalette: boolean = false;
  showProfileBanner: boolean = false; // New Profile Banner State
  commandPaletteQuery: string = '';
  showConfetti: boolean = false;

  toggleProfileBanner(): void {
    this.showProfileBanner = !this.showProfileBanner;
    this.cdr.detectChanges();
  }

  // Close banner when clicking outside (handled in HTML via backdrop or directive)
  closeProfileBanner(): void {
    this.showProfileBanner = false;
    this.cdr.detectChanges();
  }

  // Modal States
  showSuccessModal: boolean = false;
  successMessage: string = '';
  receiveStatusMessage: string = '';
  successType: 'approval' | 'rejection' | 'receive' | 'dispatch' = 'approval';

  // ============================================
  // DATA
  // ============================================
  docPerson: DocPersonProfile | null = null;
  students: Student[] = [];

  // New Workflow Lists
  receiveList: Student[] = [];
  verifyList: Student[] = [];
  returnList: Student[] = [];

  // Filtered lists for search within tabs
  filteredReceiveList: Student[] = [];

  // Pagination for Incoming Requests
  receiveCurrentPage: number = 1;
  receiveItemsPerPage: number = 10;

  get paginatedReceiveList(): Student[] {
    const startIndex = (this.receiveCurrentPage - 1) * this.receiveItemsPerPage;
    return this.filteredReceiveList.slice(startIndex, startIndex + this.receiveItemsPerPage);
  }

  get receiveEndIndex(): number {
    return Math.min(this.receiveCurrentPage * this.receiveItemsPerPage, this.filteredReceiveList.length);
  }

  get receiveTotalPages(): number {
    return Math.ceil(this.filteredReceiveList.length / this.receiveItemsPerPage);
  }

  changeReceivePage(page: number): void {
    if (page >= 1 && page <= this.receiveTotalPages) {
      this.receiveCurrentPage = page;
    }
  }

  // Pagination for Active Custody (Verify)
  verifyCurrentPage: number = 1;
  verifyItemsPerPage: number = 10;
  verifyStatusFilter: string = 'ALL';

  get paginatedVerifyList(): Student[] {
    const startIndex = (this.verifyCurrentPage - 1) * this.verifyItemsPerPage;
    return this.filteredVerifyList.slice(startIndex, startIndex + this.verifyItemsPerPage);
  }

  get verifyTotalPages(): number {
    return Math.ceil(this.filteredVerifyList.length / this.verifyItemsPerPage);
  }

  get verifyEndIndex(): number {
    return Math.min(this.verifyCurrentPage * this.verifyItemsPerPage, this.filteredVerifyList.length);
  }

  changeVerifyPage(page: number): void {
    if (page >= 1 && page <= this.verifyTotalPages) {
      this.verifyCurrentPage = page;
    }
  }

  // Inventory Tab State
  inventoryList: Student[] = [];
  filteredInventoryList: Student[] = [];
  inventorySearchQuery: string = '';
  inventoryAgentFilter: string = 'ALL';
  inventoryHolderFilter: string = 'ALL';
  inventoryStatusFilter: string = 'ALL';
  inventoryUniqueAgents: any[] = [];
  inventoryCurrentPage: number = 1;
  inventoryItemsPerPage: number = 10;
  inventoryTotalPages: number = 1;

  inventoryStats: any = {
    withDocManager: 0,
    withVisaManager: 0,
    returned: 0,
    missing: 0,
    total: 0,
    inCustody: 0
  };

  selectedInventoryStudent: any = null;
  isInventorySidebarOpen: boolean = false;

  get paginatedInventoryList(): Student[] {
    const startIndex = (this.inventoryCurrentPage - 1) * this.inventoryItemsPerPage;
    return this.filteredInventoryList.slice(startIndex, startIndex + this.inventoryItemsPerPage);
  }

  get inventoryEndIndex(): number {
    return Math.min(this.inventoryCurrentPage * this.inventoryItemsPerPage, this.filteredInventoryList.length);
  }

  changeInventoryPage(page: number): void {
    if (page >= 1 && page <= this.inventoryTotalPages) {
      this.inventoryCurrentPage = page;
    }
  }

  // Transfers Tab State
  transferList: any[] = [];
  filteredTransferList: any[] = [];
  transferSearchQuery: string = '';
  transferUniversityFilter: string = 'ALL';
  transferAgentFilter: string = 'ALL';
  transferTypeFilter: string = 'ALL';
  transferStatusFilter: string = 'ALL';

  transferCurrentPage: number = 1;
  transferItemsPerPage: number = 10;
  transferTotalPages: number = 1;

  transferStats = {
    toVisaManager: 0,
    fromVisaManager: 0,
    returnedToAgent: 0,
    pendingRequests: 0,
    overdueTransfers: 0
  };

  selectedTransferStudent: any = null;
  isTransferSidebarOpen: boolean = false;

  get paginatedTransferList(): any[] {
    const startIndex = (this.transferCurrentPage - 1) * this.transferItemsPerPage;
    return this.filteredTransferList.slice(startIndex, startIndex + this.transferItemsPerPage);
  }

  get transferEndIndex(): number {
    return Math.min(this.transferCurrentPage * this.transferItemsPerPage, this.filteredTransferList.length);
  }

  changeTransferPage(page: number): void {
    if (page >= 1 && page <= this.transferTotalPages) {
      this.transferCurrentPage = page;
    }
  }

  filteredVerifyList: Student[] = [];
  filteredReturnList: Student[] = [];

  // Pagination for Return Requests
  returnCurrentPage: number = 1;
  returnItemsPerPage: number = 5;

  get paginatedReturnList(): Student[] {
    const startIndex = (this.returnCurrentPage - 1) * this.returnItemsPerPage;
    return this.filteredReturnList.slice(startIndex, startIndex + this.returnItemsPerPage);
  }

  get returnTotalPages(): number {
    return Math.ceil(this.filteredReturnList.length / this.returnItemsPerPage);
  }

  changeReturnPage(page: number): void {
    if (page >= 1 && page <= this.returnTotalPages) {
      this.returnCurrentPage = page;
    }
  }

  // Pagination for Passport Collect
  passportCollectCurrentPage: number = 1;
  passportCollectItemsPerPage: number = 5;

  get paginatedPassportCollectList(): Student[] {
    const startIndex = (this.passportCollectCurrentPage - 1) * this.passportCollectItemsPerPage;
    return this.filteredPassportCollectList.slice(startIndex, startIndex + this.passportCollectItemsPerPage);
  }

  get passportCollectTotalPages(): number {
    return Math.ceil(this.filteredPassportCollectList.length / this.passportCollectItemsPerPage);
  }

  changePassportCollectPage(page: number): void {
    if (page >= 1 && page <= this.passportCollectTotalPages) {
      this.passportCollectCurrentPage = page;
    }
  }

  pipelineList: Student[] = [];
  stampedList: Student[] = [];
  filteredStudents: Student[] = [];

  // Search queries for specific tabs
  receiveSearchQuery: string = '';
  incomingStatusFilter: string = 'ALL';
  selectedIncomingStudent: Student | null = null;
  selectedFollowUpStudent: Student | null = null;
  isSubmittingFollowUp: boolean = false;
  followUpSuccess: boolean = false;
  incomingVerificationForm: any = {
    physicalStatus: 'NOT_RECEIVED',
    receivedPassport: false,
    passportRemarks: '',
    received10thMarksheet: false,
    marksheet10Remarks: '',
    received12thMarksheet: false,
    marksheet12Remarks: '',
    receivedNeetScorecard: false,
    neetRemarks: '',
    receivedAadharCard: false,
    aadharRemarks: '',
    receivedMedicalReport: false,
    medicalRemarks: '',
    receivedOtherDocuments: false,
    receivedOtherDocumentsRemarks: '',
    internalRemarks: '',
    setStatus: 'WAITING'
  };
  isSubmittingVerification: boolean = false;
  verifySearchQuery: string = '';
  returnSearchQuery: string = '';
  returnStatusFilter: string = 'ALL';

  // Return Dashboard Stats
  recentReturnTransactions: Student[] = [];
  returnSummaryStats = {
    totalReturns: 0,
    courierReturns: 0,
    selfReturns: 0,
    completionRate: 0
  };

  // Courier Requests
  courierRequestsList: Student[] = [];
  filteredCourierRequestsList: Student[] = [];
  paginatedCourierRequestsList: Student[] = [];
  courierSearchQuery: string = '';
  courierStatusFilter: string = 'ALL';
  courierCurrentPage: number = 1;
  courierTotalPages: number = 1;
  courierItemsPerPage: number = 5;
  isCourierSidePanelOpen: boolean = false;
  selectedCourierStudent: Student | null = null;

  // Passport Collect variables
  passportCollectList: Student[] = [];
  filteredPassportCollectList: Student[] = [];
  passportCollectSearchQuery: string = '';

  showCollectConfirmModal: boolean = false;
  showCollectSuccessModal: boolean = false;
  selectedCollectStudent: Student | null = null;

  // ============================================
  // DASHBOARD STATISTICS
  // ============================================
  stats: DashboardStats = {
    totalStudents: 0,
    pendingApproval: 0, // We can map this to Verify or Receive count, or sum
    inPipeline: 0,
    approved: 0,
    rejected: 0
  };

  // New Stats helpers
  get receiveCount(): number { return this.receiveList.length; }
  get verifyCount(): number { return this.verifyList.length; }
  get returnCount(): number { return this.returnList.length; }
  get passportCollectCount(): number { return this.passportCollectList.length; }

  // ============================================
  // PAGINATION
  // ============================================
  pagination: PaginationConfig = {
    currentPage: 1,
    itemsPerPage: 15,
    totalItems: 0,
    totalPages: 0
  };

  // ============================================
  // FILTERS & SEARCH
  // ============================================
  filters: FilterConfig = {
    searchQuery: '',
    statusFilter: 'all',
    actionFilter: 'all'
  };

  filterAgent: string = '';
  filterCollege: string = '';

  get uniqueColleges(): string[] {
    return [...new Set(this.students.map(s => s.college?.collegeName).filter(Boolean))] as string[];
  }

  get uniqueAgents(): any[] {
    return Array.from(new Map(this.students.filter(s => s.agent).map(s => [s.agent.username, s.agent])).values());
  }

  get uniqueStatuses(): string[] {
    return [...new Set(this.students.map(s => s.applicationStatus).filter(Boolean))] as string[];
  }

  get hasActiveFilters(): boolean {
    return !!this.filterAgent || !!this.filterCollege || !!this.filters.searchQuery || !!this.receiveSearchQuery || !!this.verifySearchQuery || !!this.returnSearchQuery || !!this.passportCollectSearchQuery || !!this.courierSearchQuery;
  }

  onGlobalFilterChange(): void {
    this.passportCollectSearchQuery = '';
    this.courierSearchQuery = '';
    this.filterReceiveList();
    this.filterVerifyList();
    this.filterReturnList();
    this.filterInventoryList();
    this.filterCourierList();
    this.filterPassportCollectList();
    this.applyFilters();
  }

  get topUniversities() {
    const uniCounts = new Map<string, number>();
    const sourceList = this.filteredStudents?.length > 0 ? this.filteredStudents : this.students;
    sourceList.forEach(s => {
      const name = s.college?.collegeName || 'Not Assigned';
      uniCounts.set(name, (uniCounts.get(name) || 0) + 1);
    });
    return Array.from(uniCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / (sourceList.length || 1)) * 100) || 0 }));
  }

  get agentBreakdown() {
    const agentCounts = new Map<string, { total: number, stamped: number }>();
    const sourceList = this.filteredStudents?.length > 0 ? this.filteredStudents : this.students;
    sourceList.forEach(s => {
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
  // ERROR HANDLING & NOTIFICATIONS
  // ============================================
  errorState: ErrorState = { hasError: false, message: '', type: null };
  toasts: ToastNotification[] = [];

  // ============================================
  // APPROVAL / DETAILS FORM
  // ============================================
  selectedStudent: Student | null = null;
  approvalComment: string = '';
  modalActiveTab: 'details' | 'documents' | 'timeline' = 'details';

  // Receive Modal State
  showReceiveModal: boolean = false;
  receiveDate: string = new Date().toISOString().split('T')[0];

  // Document received checkboxes
  receivedDocs = {
    received12thMarksheet: false,
    received10thMarksheet: false,
    receivedNeetScorecard: false,
    receivedPassport: false
  };

  // Return Modal State
  showReturnModal: boolean = false;
  returnDetails = {
    method: 'COURIER',
    deliveryPartner: 'Blue Dart',
    courierTrackingId: '',
    selfPersonName: '',
    selfPersonContact: '',
    trackingId: '',
    returnedDate: new Date().toISOString().split('T')[0]
  };
  showDetailsModal: boolean = false; // New state for details modal

  // Fund Request Modal State
  showFundRequestModal: boolean = false;
  fundModalTab: 'new' | 'history' = 'new'; // 'new' or 'history'
  isFundSubmitting: boolean = false;
  isQrUploading: boolean = false;
  qrCodePreview: string | null = null;

  fundRequestForm = {
    amount: null,
    purpose: '',
    paymentMode: 'UPI', // UPI or BANK_TRANSFER
    upiId: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: '',
    bankDetails: '',
    qrCodeBase64: ''
  };

  // Fund Requests List
  myFundRequests: any[] = [];
  selectedHistoryRequest: any = null;
  showHistoryModal: boolean = false;

  // ============================================
  // DOCUMENT PREVIEW
  // ============================================
  previewDocument: { url: string; type: 'pdf' | 'image' } | null = null;

  // ============================================
  // CHARTS & ACTIVITY
  // ============================================
  approvalTrendsChart: ChartData = { labels: [], datasets: [] };
  statusDistributionChart: ChartData = { labels: [], datasets: [] };

  get recentActivities() {
    const sourceList = this.students && this.students.length > 0 ? [...this.students] : [];
    return sourceList
      .filter(s => s.updatedAt || s.createdAt)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
      .slice(0, 6)
      .map(s => {
        let message = `${s.fullName}`;
        let type = 'info';
        let icon = 'fas fa-info-circle';
        if (s.action === 'CONFIRM_DOCS') {
          message += ' — Documents pending receipt';
          type = 'warning'; icon = 'fas fa-inbox';
        } else if (s.action === 'VERIFY_DOCS') {
          message += ' — Awaiting verification';
          type = 'primary'; icon = 'fas fa-search';
        } else if (s.isTelexDocApproved === true && s.action !== 'DOCS_RETURNED') {
          message += ' — Approved & sent to Visa Manager';
          type = 'success'; icon = 'fas fa-check-circle';
        } else if (s.action === 'DOCS_RETURNED') {
          message += ' — Documents returned';
          type = 'success'; icon = 'fas fa-shipping-fast';
        } else if (s.isTelexDocApproved === false && s.docPersonComment) {
          message += ' — Rejected';
          type = 'danger'; icon = 'fas fa-times-circle';
        } else if (s.applicationStatus === 'VISA_STAMPED') {
          message += ' — Visa stamped';
          type = 'success'; icon = 'fas fa-stamp';
        } else {
          message += ` — ${s.applicationStatus || 'Processing'}`;
          icon = 'fas fa-circle';
        }
        const dateObj = new Date(s.updatedAt || s.createdAt || Date.now());
        const now = new Date();
        const diffMs = now.getTime() - dateObj.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        let time = '';
        if (diffMins < 1) time = 'Just now';
        else if (diffMins < 60) time = `${diffMins}m ago`;
        else if (diffMins < 1440) time = `${Math.floor(diffMins / 60)}h ago`;
        else time = `${Math.floor(diffMins / 1440)}d ago`;
        return { message, type, time, icon };
      });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  getTodayDate(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  isOverdue(dateStr: string | Date | undefined | null, daysThreshold: number = 5): boolean {
    if (!dateStr) return false;
    const dateObj = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > daysThreshold;
  }


  // ============================================
  // SORTING
  // ============================================
  sortConfig = {
    column: 'id',
    direction: 'asc' as 'asc' | 'desc'
  };

  // ============================================
  // API CONFIGURATION
  // ============================================
  private readonly API_BASE_URL = environment.apiUrl + '/api';
  private readonly doc_url = environment.apiUrl + '';
  private readonly API_ENDPOINT = environment.apiUrl + '/api/doc-person';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private paymentRequestService: PaymentRequestService,
    private docPersonService: DocPersonService,
    private fileService: FileService
  ) { }

  ngOnInit(): void {
    this.fetchDashboardData();
    this.loadDarkModePreference();
    this.initializeKeyboardShortcuts();
    if (this.activeTab === 'funds') {
      this.loadMyRequests();
    }
  }

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Command Palette: Cmd+K or Ctrl+K
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.toggleCommandPalette();
      return;
    }

    // Quick actions (only when not in input)
    if (!this.isInputFocused()) {
      switch (event.key.toLowerCase()) {
        case 'a':
          if (this.selectedStudent && !this.showCommandPalette) {
            event.preventDefault();
            // Approve shortcut
          }
          break;
        case 'r':
          if (this.selectedStudent && !this.showCommandPalette) {
            event.preventDefault();
            // Reject shortcut
          }
          break;
        case 'd':
          event.preventDefault();
          this.activeTab = 'dashboard';
          break;
      }
    }
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA';
  }

  initializeKeyboardShortcuts(): void {
    // Additional keyboard shortcut setup if needed
  }

  // ============================================
  // DATA FETCHING & PROCESSING
  // ============================================
  fetchDashboardData(): void {
    this.isLoading = true;
    this.clearError();

    const username = sessionStorage.getItem('username') || 'DOC_001';

    this.http.get<DocPersonProfile>(`${this.API_ENDPOINT}/username/${username}`)
      .subscribe({
        next: (data) => {
          this.docPerson = data;
          this.students = this.normalizeStudentData(data.students || []);
          this.processStudents();
          this.calculateStats();
          this.generateRecentActivities();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching dashboard data', err);
          this.handleError(err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }
  clearError(): void {
    this.errorState = { hasError: false, message: '', type: null };
  }

  handleError(error: any): void {
    console.error('An error occurred:', error);
    let message = 'An unexpected error occurred. Please try again.';
    let type: ErrorState['type'] = 'api';

    if (error.status === 0) {
      message = 'Network error. Please check your internet connection.';
      type = 'network';
    } else if (error.status === 401 || error.status === 403) {
      message = 'Session expired or unauthorized. Please login again.';
      type = 'session';
      // Optionally redirect to login
      if (error.status === 401) {
        this.router.navigate(['/admin-login']);
      }
    } else if (error.error && error.error.message) {
      message = error.error.message;
    }

    this.errorState = { hasError: true, message, type };
    this.showToast('error', message);
  }

  // Helper to ensure names are correctly populated
  normalizeStudentData(students: any[]): Student[] {
    return students.map(s => {
      // If fullName exists but first/last don't, populate them
      if (s.fullName && (!s.firstName || !s.lastName)) {
        const parts = s.fullName.split(' ');
        s.firstName = parts[0];
        s.lastName = parts.slice(1).join(' ') || '';
      }
      // If first/last exist but fullName doesn't
      if (!s.fullName && s.firstName) {
        s.fullName = `${s.firstName} ${s.lastName || ''}`.trim();
      }
      // Ensure applicationStatus fallback
      if (!s.applicationStatus && s.status) {
        s.applicationStatus = s.status;
      }
      return s;
    });
  }

  // ============================================
  // FOLLOW UP NOTIFICATION MODAL
  // ============================================
  openFollowUpModal(student: Student): void {
    this.selectedFollowUpStudent = student;
  }

  closeFollowUpModal(): void {
    this.selectedFollowUpStudent = null;
    this.isSubmittingFollowUp = false;
    this.followUpSuccess = false;
  }

  confirmFollowUp(): void {
    if (!this.selectedFollowUpStudent || !this.docPerson) return;
    this.isSubmittingFollowUp = true;

    const student = this.selectedFollowUpStudent;
    const notificationPayload = {
      heading: `Urgent: Physical Documents Pending for ${student.fullName}`,
      content: `Dear Agent, we have not yet received the physical documents for student ${student.fullName} (App ID: ${student.applicationId || student.id}). Please send them immediately as this is required to proceed with verification.`,
      type: 'DOCUMENT_FOLLOW_UP',
      senderUsername: this.docPerson.username,
      targetUsername: student.agent?.userId || student.agent?.username || student.agent?.email || 'AGENT'
    };

    this.http.post(this.API_BASE_URL + '/notifications', notificationPayload).subscribe({
      next: (res) => {
        this.isSubmittingFollowUp = false;
        this.followUpSuccess = true;
      },
      error: (err) => {
        console.error('Failed to send follow up:', err);
        this.isSubmittingFollowUp = false;
        this.showToast('Failed to send follow up notification.', 'error');
      }
    });
  }

  processStudents(): void {
    // 1. Receive List: action 'CONFIRM_DOCS'
    this.receiveList = this.students.filter(s =>
      s.action === 'CONFIRM_DOCS' && (s.setActionOnUser === 'doc_manager' || s.actionOnUser === 'doc_manager')
    );
    this.filteredReceiveList = [...this.receiveList];

    // 2. Verify List: action 'VERIFY_DOCS' or already verified/rejected
    this.verifyList = this.students.filter(s =>
      s.action === 'VERIFY_DOCS' ||
      s.isTelexDocApproved === true ||
      (s.isTelexDocApproved === false && s.docPersonComment != null && s.docPersonComment.trim() !== '')
    );
    this.filteredVerifyList = [...this.verifyList];

    // 3. Return List: readyForDocReturn === true OR specific action states
    this.returnList = this.students.filter(s =>
      s.hasRaiseReturnRequest && (s.action === 'INITIATE_DOC_RETURN' || s.action === 'NEED_TO_RETURN_VISA' || s.action === 'DOCS_RETURNED')
    );
    this.filterReturnList();

    // Courier Requests List: Everything that is dispatched (DOCS_RETURNED)
    this.courierRequestsList = this.students.filter(s => s.action === 'DOCS_RETURNED');
    this.filterCourierList();

    // Passport Collect List
    this.passportCollectList = this.students.filter(s =>
      s.readyForDocReturn === true && s.action === 'COLLECT_DOCS'
    );
    this.filteredPassportCollectList = [...this.passportCollectList];

    // 4. Inventory List: All students handled by Doc Person
    this.inventoryList = [...this.students];

    // Extract unique agents
    const agentMap = new Map();
    this.inventoryList.forEach(s => {
      if (s.agent && s.agent.fullName) {
        agentMap.set(s.agent.fullName, s.agent);
      }
    });
    this.inventoryUniqueAgents = Array.from(agentMap.values());

    this.filteredInventoryList = [...this.inventoryList];
    this.processInventoryStats();

    // 4. Stamped List
    this.stampedList = this.students.filter(s =>
      s.applicationStatus === 'VISA_STAMPED'
    );

    // 5. Pipeline List: Remaining students
    // Exclude those in receive, verify, return, or stamped lists to avoid duplication if needed, 
    // or just general pipeline. Usually pipeline implies active but not finished.
    // For now, we'll exclude the specific action items to keep lists distinct.
    const activeIds = new Set([
      ...this.receiveList.map(s => s.id),
      ...this.verifyList.map(s => s.id),
      ...this.returnList.map(s => s.id),
      ...this.passportCollectList.map(s => s.id),
      ...this.stampedList.map(s => s.id)
    ]);

    this.pipelineList = this.students.filter(s => !activeIds.has(s.id));

    // Initialize main table
    this.processTransfers();
    this.applyFilters();
  }

  calculateStats(): void {
    this.stats = {
      totalStudents: this.students.length,
      pendingApproval: this.verifyList.length, // Mapping "Pending Approval" to Verify List
      inPipeline: this.pipelineList.length,
      approved: this.stampedList.length,
      rejected: this.students.filter(s => s.isTelexDocApproved === false).length
    };
  }

  processTransfers(): void {
    this.transferList = [];
    this.transferStats = { toVisaManager: 0, fromVisaManager: 0, returnedToAgent: 0, pendingRequests: 0, overdueTransfers: 0 };

    this.students.forEach(student => {
      let from = '';
      let to = '';
      let purpose = '';
      let transferDate: string | Date = student.updatedAt || student.createdAt || new Date();
      let status = '';
      let expectedReturn: string | Date = '';

      if (!student.docReceivedDate) {
        from = 'Agent'; to = 'Document Manager'; purpose = 'Original Documents';
        status = 'In Transit'; transferDate = student.createdAt || new Date();
        this.transferStats.pendingRequests++;
      } else if (student.action === 'VERIFY_DOCS') {
        from = 'Agent'; to = 'Document Manager'; purpose = 'Original Documents';
        status = 'Completed'; transferDate = student.docReceivedDate;
      } else if (student.isTelexDocApproved === true && student.action !== 'INITIATE_DOC_RETURN' && student.action !== 'DOCS_RETURNED' && student.action !== 'COLLECT_DOCS') {
        from = 'Document Manager'; to = 'Visa Manager'; purpose = 'Visa Stamping';
        status = 'Completed'; transferDate = student.updatedAt || new Date(); // Assuming handed over
        this.transferStats.toVisaManager++;
      } else if (student.action === 'COLLECT_DOCS') {
        from = 'Visa Manager'; to = 'Document Manager'; purpose = 'Passport Returned';
        status = 'Awaiting Receipt'; transferDate = student.updatedAt || new Date();
        this.transferStats.pendingRequests++;
      } else if (student.action === 'INITIATE_DOC_RETURN' || student.readyForDocReturn === true) {
        from = 'Visa Manager'; to = 'Document Manager'; purpose = 'Passport Returned';
        status = 'Completed'; transferDate = student.updatedAt || new Date();
        this.transferStats.fromVisaManager++;
      } else if (student.action === 'DOCS_RETURNED') {
        from = 'Document Manager'; to = 'Agent'; purpose = 'Final Return';
        transferDate = student.docReturnedDate || new Date();
        if (student.passportReturnReceivedDate) {
          status = 'Completed';
        } else {
          status = 'In Transit';
        }
        this.transferStats.returnedToAgent++;
      } else if (student.isTelexDocApproved === false) {
        from = 'Document Manager'; to = 'Agent'; purpose = 'Rejected Docs Return';
        status = 'In Transit'; transferDate = student.updatedAt || new Date();
      } else {
        // Fallback for students in custody but no active transfer
        return;
      }

      this.transferList.push({ student, from, to, purpose, transferDate, status, expectedReturn });
    });

    this.filterTransferList();
  }

  filterTransferList(): void {
    this.transferCurrentPage = 1;
    let filtered = this.transferList;

    if (this.transferSearchQuery) {
      const q = this.transferSearchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.student.fullName && t.student.fullName.toLowerCase().includes(q)) ||
        (t.student.passportNo && t.student.passportNo.toLowerCase().includes(q)) ||
        (t.student.applicationId && t.student.applicationId.toLowerCase().includes(q))
      );
    }

    if (this.transferUniversityFilter !== 'ALL') {
      filtered = filtered.filter(t => t.student.college?.collegeName === this.transferUniversityFilter);
    }

    if (this.transferAgentFilter !== 'ALL') {
      if (this.transferAgentFilter === 'DIRECT') {
        filtered = filtered.filter(t => !t.student.agent);
      } else {
        filtered = filtered.filter(t => t.student.agent && t.student.agent.fullName === this.transferAgentFilter);
      }
    }

    if (this.transferTypeFilter !== 'ALL') {
      filtered = filtered.filter(t => t.purpose === this.transferTypeFilter);
    }

    if (this.transferStatusFilter !== 'ALL') {
      filtered = filtered.filter(t => t.status === this.transferStatusFilter);
    }

    this.filteredTransferList = filtered;
    this.transferTotalPages = Math.ceil(this.filteredTransferList.length / this.transferItemsPerPage) || 1;
  }

  openTransferSidebar(transfer: any): void {
    this.selectedTransferStudent = transfer;
    this.isTransferSidebarOpen = true;
  }

  closeTransferSidebar(): void {
    this.isTransferSidebarOpen = false;
    this.selectedTransferStudent = null;
  }

  exportTransfersToExcel(): void {
    if (!this.filteredTransferList || this.filteredTransferList.length === 0) {
      alert('No transfer data available to export.');
      return;
    }

    const csvRows = [];
    const headers = ['Student Name', 'Passport No', 'From', 'To', 'Purpose', 'Transfer Date', 'Status'];
    csvRows.push(headers.join(','));

    this.filteredTransferList.forEach(trf => {
      const dateStr = trf.transferDate ? new Date(trf.transferDate).toLocaleDateString() : '';
      const row = [
        `"${trf.student.fullName || ''}"`,
        `"${trf.student.passportNo || ''}"`,
        `"${trf.from || ''}"`,
        `"${trf.to || ''}"`,
        `"${trf.purpose || ''}"`,
        `"${dateStr}"`,
        `"${trf.status || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Document_Transfers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ============================================
  // SEARCH & FILTER
  // ============================================

  // 1. Main Student List Filter (Handles both Stamped and Pipeline tabs)
  applyFilters(): void {
    let sourceList: Student[] = [];

    // Determine source list based on active tab
    if (this.activeTab === 'stamped') {
      sourceList = [...this.stampedList];
    } else if (this.activeTab === 'pipeline') {
      sourceList = [...this.pipelineList];
    } else {
      // Fallback or for other tabs if needed
      sourceList = [...this.students];
    }

    let results = sourceList;

    // Search filter
    if (this.filters.searchQuery.trim()) {
      results = results.filter(s => this.matchesSearch(s, this.filters.searchQuery));
    }

    // Status filter
    if (this.filters.statusFilter !== 'all') {
      // Check both fields for flexibility
      results = results.filter(s =>
        s.status === this.filters.statusFilter ||
        s.applicationStatus === this.filters.statusFilter
      );
    }

    if (this.filterAgent) {
      results = results.filter(s => s.agent?.fullName === this.filterAgent);
    }
    if (this.filterCollege) {
      results = results.filter(s => s.college?.collegeName === this.filterCollege);
    }

    this.filteredStudents = results;
    this.updatePagination();
  }

  // 2. Specific Tab Search Helpers
  filterReceiveList(): void {
    this.filterIncomingDocs();
  }

  filterVerifyList(): void {
    this.verifyCurrentPage = 1;
    let filtered = this.filterList(this.verifyList, this.verifySearchQuery);

    if (this.verifyStatusFilter !== 'ALL') {
      filtered = filtered.filter(s => {
        if (this.verifyStatusFilter === 'PENDING') {
          return s.action === 'VERIFY_DOCS';
        } else if (this.verifyStatusFilter === 'VERIFIED') {
          return s.isTelexDocApproved === true;
        } else if (this.verifyStatusFilter === 'REJECTED') {
          return s.action !== 'VERIFY_DOCS' && s.isTelexDocApproved !== true;
        }
        return true;
      });
    }

    this.filteredVerifyList = filtered;
  }

  filterReturnList(): void {
    let filtered = this.filterList(this.returnList, this.returnSearchQuery);

    if (this.filterAgent) {
      filtered = filtered.filter(s => s.agent?.fullName === this.filterAgent || s.agent?.username === this.filterAgent);
    }
    if (this.filterCollege) {
      filtered = filtered.filter(s => s.college?.collegeName === this.filterCollege);
    }

    if (this.returnStatusFilter !== 'ALL') {
      filtered = filtered.filter(s => {
        if (this.returnStatusFilter === 'PENDING') {
          return s.action === 'INITIATE_DOC_RETURN' || s.readyForDocReturn === true;
        } else if (this.returnStatusFilter === 'RETURNED') {
          return s.action === 'DOCS_RETURNED';
        }
        return true;
      });
    }

    this.filteredReturnList = filtered;
    this.updateReturnDashboardStats();
  }

  updateReturnDashboardStats(): void {
    const returnedDocs = this.returnList.filter(s => s.action === 'DOCS_RETURNED');

    // Sort by updated time or docReturnedDate descending
    this.recentReturnTransactions = [...returnedDocs]
      .sort((a, b) => new Date(b.docReturnedDate || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.docReturnedDate || a.updatedAt || a.createdAt || 0).getTime())
      .slice(0, 5);

    this.returnSummaryStats.totalReturns = returnedDocs.length;

    // Count methods based on whether the tracking ID has the ' - ' separator (Courier pattern)
    this.returnSummaryStats.courierReturns = returnedDocs.filter((s: any) =>
      s.docReturnTrackingId && s.docReturnTrackingId.includes(' - ')
    ).length;

    this.returnSummaryStats.selfReturns = this.returnSummaryStats.totalReturns - this.returnSummaryStats.courierReturns;

    const totalRequests = this.returnList.length;
    this.returnSummaryStats.completionRate = totalRequests > 0 ? Math.round((returnedDocs.length / totalRequests) * 100) : 0;
  }

  filterPassportCollectList(): void {
    this.filteredPassportCollectList = this.filterList(this.passportCollectList, this.passportCollectSearchQuery);
  }

  filterInventoryList(): void {
    this.inventoryCurrentPage = 1;
    let filtered = this.filterList(this.inventoryList, this.inventorySearchQuery);

    if (this.inventoryAgentFilter !== 'ALL') {
      if (this.inventoryAgentFilter === 'DIRECT') {
        filtered = filtered.filter(s => !s.agent);
      } else {
        filtered = filtered.filter(s => s.agent && s.agent.fullName === this.inventoryAgentFilter);
      }
    }

    if (this.inventoryHolderFilter !== 'ALL' || this.inventoryStatusFilter !== 'ALL') {
      filtered = filtered.filter(s => {
        const state = this.getDocInventoryState(s);
        let match = true;
        if (this.inventoryHolderFilter !== 'ALL' && state.holder !== this.inventoryHolderFilter && !state.holder.includes(this.inventoryHolderFilter)) {
          match = false;
        }
        if (this.inventoryStatusFilter !== 'ALL' && state.status !== this.inventoryStatusFilter) {
          match = false;
        }
        return match;
      });
    }

    this.filteredInventoryList = filtered;
  }

  exportCourierToExcel(): void {
    if (!this.filteredCourierRequestsList || this.filteredCourierRequestsList.length === 0) {
      alert('No data available to export.');
      return;
    }

    const csvRows = [];
    const headers = ['Student Name', 'Application ID', 'Agent', 'University', 'Status', 'Dispatch Details'];
    csvRows.push(headers.join(','));

    this.filteredCourierRequestsList.forEach(student => {
      const agentName = student.agent ? (student.agent.fullName || student.agent.username) : 'Direct';
      const university = student.college?.collegeName || 'N/A';
      const status = (student as any).passportReturnReceivedDate ? 'Agent Received' : 'In Transit';

      let dispatchDetails = 'Returned directly';
      if ((student as any).docReturnTrackingId && (student as any).docReturnTrackingId.includes(' - ')) {
        dispatchDetails = `Courier: ${(student as any).docReturnTrackingId.split(' - ')[1]}`;
      } else if ((student as any).docReturnTrackingId) {
        dispatchDetails = `Self / In-Person: ${(student as any).docReturnTrackingId}`;
      }

      const row = [
        `"${student.fullName || ''}"`,
        `"${student.applicationId || student.id}"`,
        `"${agentName}"`,
        `"${university}"`,
        `"${status}"`,
        `"${dispatchDetails}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Courier_Requests_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  filterCourierList(): void {
    let filtered = this.filterList(this.courierRequestsList, this.courierSearchQuery);

    if (this.filterAgent) {
      filtered = filtered.filter(s => s.agent?.fullName === this.filterAgent || s.agent?.username === this.filterAgent);
    }
    if (this.filterCollege) {
      filtered = filtered.filter(s => s.college?.collegeName === this.filterCollege);
    }

    if (this.courierStatusFilter !== 'ALL') {
      if (this.courierStatusFilter === 'AGENT_RECEIVED') {
        filtered = filtered.filter(s => !!(s as any).passportReturnReceivedDate);
      } else if (this.courierStatusFilter === 'IN_TRANSIT') {
        filtered = filtered.filter(s => !(s as any).passportReturnReceivedDate);
      }
    }

    this.filteredCourierRequestsList = filtered;
    this.updateCourierPagination();
  }

  updateCourierPagination(): void {
    this.courierTotalPages = Math.ceil(this.filteredCourierRequestsList.length / this.courierItemsPerPage) || 1;
    this.courierCurrentPage = 1;
    this.updatePaginatedCourierList();
  }

  updatePaginatedCourierList(): void {
    const start = (this.courierCurrentPage - 1) * this.courierItemsPerPage;
    this.paginatedCourierRequestsList = this.filteredCourierRequestsList.slice(start, start + this.courierItemsPerPage);
  }

  changeCourierPage(page: number): void {
    if (page >= 1 && page <= this.courierTotalPages) {
      this.courierCurrentPage = page;
      this.updatePaginatedCourierList();
    }
  }

  openCourierSidePanel(student: Student): void {
    this.selectedCourierStudent = student;
    this.isCourierSidePanelOpen = true;
  }

  closeCourierSidePanel(): void {
    this.isCourierSidePanelOpen = false;
    setTimeout(() => {
      this.selectedCourierStudent = null;
    }, 300);
  }

  exportVerifyToExcel(): void {
    if (!this.filteredVerifyList || this.filteredVerifyList.length === 0) {
      alert('No data available to export.');
      return;
    }

    const csvRows = [];
    const headers = ['Student Name', 'Application ID', 'Passport No', 'Agent', 'Docs Received Status', 'Verification Status', 'Remarks', 'Received Date', 'Last Update'];
    csvRows.push(headers.join(','));

    this.filteredVerifyList.forEach(student => {
      const agentName = student.agent ? (student.agent.fullName || student.agent.username) : 'Direct';
      let verifyStatus = 'Pending';
      if (student.action === 'VERIFIED_OK') verifyStatus = 'Verified';
      else if (student.action === 'REJECTED_AT_VERIFICATION') verifyStatus = 'Rejected';

      const row = [
        `"${student.fullName || ''}"`,
        `"${student.applicationId || student.id}"`,
        `"${student.passportNo || ''}"`,
        `"${agentName}"`,
        `"Received"`,
        `"${verifyStatus}"`,
        `"N/A"`,
        `"${this.formatDate(student.docReceivedDate as string)}"`,
        `"${this.formatDate((student.updatedAt || student.docReceivedDate) as string)}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Verify_Documents_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  exportReturnToExcel(): void {
    if (!this.filteredReturnList || this.filteredReturnList.length === 0) {
      alert('No data available to export.');
      return;
    }

    const csvRows = [];
    const headers = ['Student Name', 'Application ID', 'Agent', 'University', 'Status', 'Last Update'];
    csvRows.push(headers.join(','));

    this.filteredReturnList.forEach(student => {
      const agentName = student.agent ? (student.agent.fullName || student.agent.username) : 'Direct';
      const university = student.college?.collegeName || 'N/A';
      let returnStatus = 'Pending';
      if (student.action === 'DOCS_RETURNED') returnStatus = 'Returned';

      const row = [
        `"${student.fullName || ''}"`,
        `"${student.applicationId || student.id}"`,
        `"${agentName}"`,
        `"${university}"`,
        `"${returnStatus}"`,
        `"${this.formatDate((student.updatedAt || student.createdAt) as string)}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Return_Requests_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  exportIncomingToExcel(): void {
    if (!this.filteredReceiveList || this.filteredReceiveList.length === 0) {
      alert('No data available to export.');
      return;
    }

    const csvRows = [];
    const headers = ['Student Name', 'Application ID', 'Passport No', 'Agent', 'University', 'Status', 'Request Date'];
    csvRows.push(headers.join(','));

    this.filteredReceiveList.forEach(student => {
      const agentName = student.agent ? (student.agent.fullName || student.agent.username) : 'Direct';
      const uniName = student.college ? student.college.collegeName : 'Not Assigned';
      let statusStr = '';
      if (student.action === 'RECEIVED_DOCS_VERIFICATION_PENDING') statusStr = 'Pending Verification';
      else if (student.action === 'DOCS_RECEIVED_BY_MANAGER' || student.action === 'VERIFIED_OK') statusStr = 'Verified';
      else statusStr = 'Waiting for Documents';

      const row = [
        `"${student.fullName || ''}"`,
        `"${student.applicationId || student.id}"`,
        `"${student.passportNo || ''}"`,
        `"${agentName}"`,
        `"${uniName}"`,
        `"${statusStr}"`,
        `"${this.formatDate(student.telexRequestDate)}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Incoming_Documents_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  exportInventoryToExcel(): void {
    if (!this.filteredInventoryList || this.filteredInventoryList.length === 0) {
      alert('No data available to export.');
      return;
    }

    const csvRows = [];
    const headers = ['Student Name', 'Application ID', 'Passport No', 'Agent', 'Current Holder', 'Status'];
    csvRows.push(headers.join(','));

    this.filteredInventoryList.forEach(student => {
      const state = this.getDocInventoryState(student);
      const agentName = student.agent ? (student.agent.fullName || student.agent.username) : 'Direct';
      const row = [
        `"${student.fullName || ''}"`,
        `"${student.applicationId || ''}"`,
        `"${student.passportNo || ''}"`,
        `"${agentName || ''}"`,
        `"${state.holder || ''}"`,
        `"${state.status || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Document_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Active Custody & University Inventory Stats
  activeCustodyCards = {
    totalDocsReceived: 0,
    passportsWithDocManager: 0,
    passportsWithVisaManager: 0,
    passportsWithAgent: 0
  };
  universityWiseInventory: any[] = [];
  universityWiseTotals = { totalDocs: 0, inCustody: 0, withVmgr: 0, returned: 0 };

  detailedDocInventory = {
    passport: 0,
    marksheet10th: 0,
    marksheet12th: 0,
    neetScorecard: 0,
    aadharCard: 0,
    medicalReport: 0,
    otherDocuments: 0
  };
  agentWiseDocInventory: any[] = [];
  processInventoryStats(): void {
    this.inventoryStats = { total: 0, inCustody: 0, withVisaManager: 0, returned: 0, missing: 0 };
    this.inventoryStats.total = this.inventoryList.length;

    this.activeCustodyCards = {
      totalDocsReceived: 0,
      passportsWithDocManager: 0,
      passportsWithVisaManager: 0,
      passportsWithAgent: 0
    };

    this.detailedDocInventory = {
      passport: 0,
      marksheet10th: 0,
      marksheet12th: 0,
      neetScorecard: 0,
      aadharCard: 0,
      medicalReport: 0,
      otherDocuments: 0
    };

    const univMap = new Map<string, any>();
    const agentDocMap = new Map<string, any>();

    this.inventoryList.forEach(s => {
      const state = this.getDocInventoryState(s);
      let holderCategory = '';

      if (state.holder === 'Document Manager') {
        this.inventoryStats.inCustody++;
        this.activeCustodyCards.passportsWithDocManager++;
        holderCategory = 'inCustody';
      } else if (state.holder === 'Visa Manager') {
        this.inventoryStats.withVisaManager++;
        this.activeCustodyCards.passportsWithVisaManager++;
        holderCategory = 'withVmgr';
      } else if (state.holder === 'Agent' && (state.status === 'Received by Agent' || state.status === 'In Transit to Agent' || state.status === 'Returned' || state.status === 'Dispatched')) {
        this.inventoryStats.returned++;
        this.activeCustodyCards.passportsWithAgent++;
        holderCategory = 'returned';
      } else if (state.status === 'Rejected / Under Investigation') {
        this.inventoryStats.missing++;
      }

      // Agent grouping for Document Breakdown
      const agentName = s.agent?.fullName || s.agent?.username || 'Direct Student';
      if (!agentDocMap.has(agentName)) {
        agentDocMap.set(agentName, {
          agentName: agentName,
          passport: 0,
          marksheet10th: 0,
          marksheet12th: 0,
          neetScorecard: 0,
          aadharCard: 0,
          medicalReport: 0,
          otherDocuments: 0,
          totalDocs: 0
        });
      }
      const aStats = agentDocMap.get(agentName);

      // Count individual physical documents checked off
      if (s.receivedPassport) {
        this.activeCustodyCards.totalDocsReceived++;
        this.detailedDocInventory.passport++;
        aStats.passport++;
        aStats.totalDocs++;
      }
      if (s.received10thMarksheet) {
        this.activeCustodyCards.totalDocsReceived++;
        this.detailedDocInventory.marksheet10th++;
        aStats.marksheet10th++;
        aStats.totalDocs++;
      }
      if (s.received12thMarksheet) {
        this.activeCustodyCards.totalDocsReceived++;
        this.detailedDocInventory.marksheet12th++;
        aStats.marksheet12th++;
        aStats.totalDocs++;
      }
      if (s.receivedNeetScorecard) {
        this.activeCustodyCards.totalDocsReceived++;
        this.detailedDocInventory.neetScorecard++;
        aStats.neetScorecard++;
        aStats.totalDocs++;
      }
      if (s.receivedAadharCard) {
        this.activeCustodyCards.totalDocsReceived++;
        this.detailedDocInventory.aadharCard++;
        aStats.aadharCard++;
        aStats.totalDocs++;
      }
      if (s.receivedMedicalReport) {
        this.activeCustodyCards.totalDocsReceived++;
        this.detailedDocInventory.medicalReport++;
        aStats.medicalReport++;
        aStats.totalDocs++;
      }
      if (s.receivedOtherDocuments) {
        this.activeCustodyCards.totalDocsReceived++;
        this.detailedDocInventory.otherDocuments++;
        aStats.otherDocuments++;
        aStats.totalDocs++;
      }

      // University grouping
      const univName = s.college?.collegeName || 'Not Assigned';
      if (!univMap.has(univName)) {
        univMap.set(univName, { university: univName, totalDocs: 0, inCustody: 0, withVmgr: 0, returned: 0 });
      }
      const uStats = univMap.get(univName);
      uStats.totalDocs++;
      if (holderCategory) {
        uStats[holderCategory]++;
      }
    });

    this.universityWiseInventory = Array.from(univMap.values()).sort((a, b) => b.totalDocs - a.totalDocs);
    this.agentWiseDocInventory = Array.from(agentDocMap.values()).sort((a: any, b: any) => b.totalDocs - a.totalDocs);
    this.universityWiseTotals = this.universityWiseInventory.reduce((acc, curr) => ({
      totalDocs: acc.totalDocs + curr.totalDocs,
      inCustody: acc.inCustody + curr.inCustody,
      withVmgr: acc.withVmgr + curr.withVmgr,
      returned: acc.returned + curr.returned
    }), { totalDocs: 0, inCustody: 0, withVmgr: 0, returned: 0 });
  }

  getDocInventoryState(student: Student) {
    const styles = {
      yellow: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
      green: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
      blue: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
      purple: { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.2)' },
      red: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
      gray: { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b', border: 'rgba(100, 116, 139, 0.2)' },
      teal: { bg: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6', border: 'rgba(20, 184, 166, 0.2)' }
    };

    let holder = '';
    let status = '';
    let holderStyle = styles.gray;
    let statusStyle = styles.gray;
    let holderIcon = 'fas fa-user-circle';
    let statusIcon = 'fas fa-info-circle';

    if (!student.docReceivedDate) {
      holder = 'Agent'; status = 'In Transit to Doc Manager';
      holderStyle = styles.purple; statusStyle = styles.yellow;
      holderIcon = 'fas fa-user-tie'; statusIcon = 'fas fa-truck';
    } else if (student.action === 'VERIFY_DOCS') {
      holder = 'Document Manager'; status = 'On Going Verification';
      holderStyle = styles.teal; statusStyle = styles.yellow;
      holderIcon = 'fas fa-id-badge'; statusIcon = 'fas fa-search';
    } else if (student.isTelexDocApproved === true && student.action !== 'INITIATE_DOC_RETURN' && student.action !== 'DOCS_RETURNED' && student.action !== 'COLLECT_DOCS') {
      holder = 'Visa Manager'; status = 'Visa Processing';
      holderStyle = styles.blue; statusStyle = styles.blue;
      holderIcon = 'fas fa-passport'; statusIcon = 'fas fa-spinner fa-spin';
    } else if (student.action === 'COLLECT_DOCS') {
      holder = 'Visa Manager'; status = 'Visa Processing Completed';
      holderStyle = styles.blue; statusStyle = styles.green;
      holderIcon = 'fas fa-passport'; statusIcon = 'fas fa-check-circle';
    } else if (student.action === 'INITIATE_DOC_RETURN' || student.readyForDocReturn === true) {
      holder = 'Document Manager'; status = 'In Custody (Ready to Return)';
      holderStyle = styles.teal; statusStyle = styles.green;
      holderIcon = 'fas fa-id-badge'; statusIcon = 'fas fa-box';
    } else if (student.action === 'DOCS_RETURNED') {
      holder = 'Agent';
      holderStyle = styles.purple;
      holderIcon = 'fas fa-user-tie';
      if (student.passportReturnReceivedDate) {
        status = 'Received by Agent'; statusStyle = styles.green; statusIcon = 'fas fa-check-double';
      } else {
        status = 'In Transit to Agent'; statusStyle = styles.yellow; statusIcon = 'fas fa-truck';
      }
    } else if (student.isTelexDocApproved === false && student.docPersonComment) {
      holder = 'Agent / Doc Manager'; status = 'Rejected / Under Investigation';
      holderStyle = styles.red; statusStyle = styles.red;
      holderIcon = 'fas fa-exclamation-triangle'; statusIcon = 'fas fa-times-circle';
    } else {
      holder = 'Document Manager'; status = 'In Custody';
      holderStyle = styles.teal; statusStyle = styles.green;
      holderIcon = 'fas fa-id-badge'; statusIcon = 'fas fa-archive';
    }

    return { holder, status, holderStyle, statusStyle, holderIcon, statusIcon };
  }

  getDocumentFlowSteps(student: Student) {
    const steps = [
      {
        id: 'agent_dispatch',
        title: 'Dispatched by Agent',
        holder: 'Agent',
        icon: 'fas fa-paper-plane',
        status: 'pending',
        date: student.telexRequestDate || student.createdAt || null
      },
      {
        id: 'doc_received',
        title: 'Received by Doc Manager',
        holder: 'Doc Manager',
        icon: 'fas fa-inbox',
        status: 'pending',
        date: student.docReceivedDate || null
      },
      {
        id: 'verification',
        title: 'Document Verification',
        holder: 'Doc Manager',
        icon: 'fas fa-user-check',
        status: 'pending',
        date: null
      },
      {
        id: 'visa_processing',
        title: 'Visa Processing',
        holder: 'Visa Manager',
        icon: 'fas fa-passport',
        status: 'pending',
        date: null
      },
      {
        id: 'visa_completed',
        title: 'Returned to Doc Manager',
        holder: 'Doc Manager',
        icon: 'fas fa-clipboard-check',
        status: 'pending',
        date: null
      },
      {
        id: 'returned_to_agent',
        title: 'Dispatched to Agent',
        holder: 'Doc Manager',
        icon: 'fas fa-shipping-fast',
        status: 'pending',
        date: student.docReturnedDate || null
      },
      {
        id: 'agent_received',
        title: 'Received by Agent',
        holder: 'Agent',
        icon: 'fas fa-check-double',
        status: 'pending',
        date: student.passportReturnReceivedDate || null
      }
    ];

    // Determine Logic
    steps[0].status = 'completed'; // Always dispatched if it's in doc manager's view

    if (student.docReceivedDate) {
      steps[1].status = 'completed';

      if (student.isTelexDocApproved === true) {
        steps[2].status = 'completed';

        if (student.action === 'COLLECT_DOCS' || student.action === 'INITIATE_DOC_RETURN' || student.readyForDocReturn === true || student.action === 'DOCS_RETURNED') {
          steps[3].status = 'completed';

          if (student.action === 'INITIATE_DOC_RETURN' || student.readyForDocReturn === true || student.action === 'DOCS_RETURNED') {
            steps[4].status = 'completed';

            if (student.action === 'DOCS_RETURNED') {
              steps[5].status = 'completed';

              if (student.passportReturnReceivedDate) {
                steps[6].status = 'completed';
              } else {
                steps[6].status = 'current';
              }
            } else {
              steps[5].status = 'current';
            }
          } else {
            steps[4].status = 'current';
          }
        } else {
          steps[3].status = 'current';
        }
      } else if (student.isTelexDocApproved === false && student.docPersonComment) {
        steps[2].status = 'error'; // Rejected
      } else {
        steps[2].status = 'current';
      }
    } else {
      steps[1].status = 'current';
    }

    return steps;
  }

  openInventorySidebar(student: Student): void {
    this.selectedInventoryStudent = student;
    this.isInventorySidebarOpen = true;
  }

  closeInventorySidebar(): void {
    this.isInventorySidebarOpen = false;
    setTimeout(() => {
      this.selectedInventoryStudent = null;
    }, 300); // wait for animation
  }

  private filterList(list: Student[], query: string): Student[] {
    let results = list;
    if (this.filterAgent) {
      results = results.filter(s => s.agent?.fullName === this.filterAgent);
    }
    if (this.filterCollege) {
      results = results.filter(s => s.college?.collegeName === this.filterCollege);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(s =>
        (s.applicationId && s.applicationId.toString().toLowerCase().includes(q)) ||
        (s.id && s.id.toString().toLowerCase().includes(q)) ||
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.passportNo && s.passportNo.toLowerCase().includes(q))
      );
    }
    return results;
  }

  onSearchChange(): void {
    this.pagination.currentPage = 1;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.pagination.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters.searchQuery = '';
    this.filters.statusFilter = 'all';
    this.filterAgent = '';
    this.filterCollege = '';
    this.receiveSearchQuery = '';
    this.incomingStatusFilter = 'ALL';
    this.verifySearchQuery = '';
    this.returnSearchQuery = '';
    this.onGlobalFilterChange();
  }

  // ============================================
  // PAGINATION
  // ============================================
  updatePagination(): void {
    this.pagination.totalItems = this.filteredStudents.length;
    this.pagination.totalPages = Math.ceil(this.pagination.totalItems / this.pagination.itemsPerPage);
  }

  getPaginatedStudents(): Student[] {
    const start = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
    const end = start + this.pagination.itemsPerPage;
    return this.filteredStudents.slice(start, end);
  }

  nextPage(): void {
    if (this.pagination.currentPage < this.pagination.totalPages) {
      this.pagination.currentPage++;
    }
  }

  previousPage(): void {
    if (this.pagination.currentPage > 1) {
      this.pagination.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.pagination.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const total = this.pagination.totalPages;
    const current = this.pagination.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  sortBy(column: string): void {
    this.sortConfig.column = column;
    this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    // Simple sort logic implementation...
  }

  // ============================================
  // APPROVAL & VERIFICATION LOGIC
  // ============================================
  // ============================================
  // ACTION WORKFLOWS
  // ============================================

  // --- INCOMING DOCUMENTS METHODS ---
  getIncomingMetrics() {
    let newRequests = 0;
    let inTransit = 0;
    let received = 0;
    let waiting = 0;
    let followUp = 0;

    this.receiveList.forEach(s => {
      if (!s.originalDocsSent) {
        followUp++;
      } else {
        newRequests++;
        if (s.docDeliveryMethod === 'COURIER') {
          inTransit++;
        }
      }

      const dmStatus = this.getDMReceivedStatus(s);
      if (dmStatus === 'Pending Verification' || dmStatus === 'Waiting for Documents') {
        waiting++;
      } else if (dmStatus === 'Documents Received' || dmStatus === 'Partially Received') {
        received++;
      }
    });

    return { total: this.receiveList.length, newRequests, inTransit, received, waiting, followUp };
  }

  getDMReceivedStatus(student: Student): string {
    if (student.receivedPassport && student.received10thMarksheet && student.received12thMarksheet && student.receivedNeetScorecard) {
      return 'All Received';
    }
    if (student.receivedPassport || student.received10thMarksheet || student.received12thMarksheet || student.receivedNeetScorecard || student.receivedAadharCard || student.receivedMedicalReport || student.receivedOtherDocuments) {
      return 'Partially Received';
    }
    if (student.originalDocsSent) {
      return 'Pending Verification';
    }
    return 'Waiting for Documents';
  }

  filterIncomingDocs(): void {
    let filtered = this.receiveList;

    // Status filter
    if (this.incomingStatusFilter !== 'ALL') {
      filtered = filtered.filter(s => {
        const dmStatus = this.getDMReceivedStatus(s);
        if (this.incomingStatusFilter === 'PENDING') return dmStatus === 'Pending Verification';
        if (this.incomingStatusFilter === 'WAITING') return dmStatus === 'Waiting for Documents';
        if (this.incomingStatusFilter === 'IN_TRANSIT') return s.docDeliveryMethod === 'COURIER' && s.originalDocsSent;
        return true;
      });
    }

    // Search query filter
    if (this.receiveSearchQuery) {
      const q = this.receiveSearchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.applicationId && s.applicationId.toLowerCase().includes(q)) ||
        (s.id && s.id.toString().includes(q)) ||
        (s.agent && s.agent.fullName && s.agent.fullName.toLowerCase().includes(q))
      );
    }

    this.filteredReceiveList = filtered;
  }

  openIncomingVerification(student: Student): void {
    this.selectedIncomingStudent = student;
    this.incomingVerificationForm = {
      physicalStatus: (student.receivedPassport && student.received10thMarksheet && student.received12thMarksheet && student.receivedNeetScorecard) ? 'ALL' :
        (student.receivedPassport || student.received10thMarksheet || student.received12thMarksheet || student.receivedNeetScorecard) ? 'PARTIAL' : 'NOT_RECEIVED',
      receivedPassport: student.receivedPassport || false,
      passportRemarks: '',
      received10thMarksheet: student.received10thMarksheet || false,
      marksheet10Remarks: '',
      received12thMarksheet: student.received12thMarksheet || false,
      marksheet12Remarks: '',
      receivedNeetScorecard: student.receivedNeetScorecard || false,
      neetRemarks: '',
      receivedAadharCard: student.receivedAadharCard || false,
      aadharRemarks: '',
      receivedMedicalReport: student.receivedMedicalReport || false,
      medicalRemarks: '',
      receivedOtherDocuments: student.receivedOtherDocuments || false,
      receivedOtherDocumentsRemarks: student.receivedOtherDocumentsRemarks || '',
      internalRemarks: '',
      setStatus: student.originalDocsSent ? 'PENDING' : 'WAITING'
    };
  }

  onPhysicalStatusChange(): void {
    if (this.incomingVerificationForm.physicalStatus === 'ALL') {
      this.incomingVerificationForm.receivedPassport = true;
      this.incomingVerificationForm.received10thMarksheet = true;
      this.incomingVerificationForm.received12thMarksheet = true;
      this.incomingVerificationForm.receivedNeetScorecard = true;
      this.incomingVerificationForm.receivedAadharCard = true;
      this.incomingVerificationForm.receivedMedicalReport = true;
      this.incomingVerificationForm.receivedOtherDocuments = true;
    } else if (this.incomingVerificationForm.physicalStatus === 'NOT_RECEIVED') {
      this.incomingVerificationForm.receivedPassport = false;
      this.incomingVerificationForm.received10thMarksheet = false;
      this.incomingVerificationForm.received12thMarksheet = false;
      this.incomingVerificationForm.receivedNeetScorecard = false;
      this.incomingVerificationForm.receivedAadharCard = false;
      this.incomingVerificationForm.receivedMedicalReport = false;
      this.incomingVerificationForm.receivedOtherDocuments = false;
    }
  }

  closeIncomingVerification(): void {
    this.selectedIncomingStudent = null;
  }

  saveIncomingVerification(): void {
    if (!this.selectedIncomingStudent) return;

    this.isSubmittingVerification = true;
    const payload = {
      receivedDate: new Date().toISOString().split('T')[0],
      docPersonUsername: this.docPerson?.username || 'doc_person_user',
      received12thMarksheet: this.incomingVerificationForm.received12thMarksheet,
      received10thMarksheet: this.incomingVerificationForm.received10thMarksheet,
      receivedNeetScorecard: this.incomingVerificationForm.receivedNeetScorecard,
      receivedPassport: this.incomingVerificationForm.receivedPassport,
      receivedAadharCard: this.incomingVerificationForm.receivedAadharCard,
      receivedMedicalReport: this.incomingVerificationForm.receivedMedicalReport,
      receivedOtherDocuments: this.incomingVerificationForm.receivedOtherDocuments,
      receivedOtherDocumentsRemarks: this.incomingVerificationForm.receivedOtherDocumentsRemarks,
      physicalStatus: this.incomingVerificationForm.physicalStatus
    };

    // We use the existing receive-docs endpoint.
    this.http.post(`${this.API_ENDPOINT}/receive-docs/${this.selectedIncomingStudent.id}`, payload)
      .subscribe({
        next: () => {
          this.isSubmittingVerification = false;
          this.successType = 'receive';
          if (this.incomingVerificationForm.physicalStatus === 'ALL') {
            this.receiveStatusMessage = 'Marked as All Received';
          } else if (this.incomingVerificationForm.physicalStatus === 'PARTIAL') {
            this.receiveStatusMessage = 'Marked as Partially Received';
          } else {
            this.receiveStatusMessage = 'Marked as Not Received';
          }
          this.successMessage = `Receive details saved for ${this.selectedIncomingStudent?.fullName}.`;
          this.showSuccessModal = true;
          this.closeIncomingVerification();
          this.fetchDashboardData();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmittingVerification = false;
          this.handleError(err);
          this.cdr.detectChanges();
        }
      });
  }

  // --- RECEIVE ACTION ---
  openReceiveModal(student: Student): void {
    this.selectedStudent = student;
    this.receiveDate = new Date().toISOString().split('T')[0];
    // Reset document checkboxes
    this.receivedDocs = {
      received12thMarksheet: false,
      received10thMarksheet: false,
      receivedNeetScorecard: false,
      receivedPassport: false
    };
    this.showReceiveModal = true;
    this.cdr.detectChanges();
  }

  closeReceiveModal(): void {
    this.showReceiveModal = false;
    this.selectedStudent = null;
    // Reset document checkboxes
    this.receivedDocs = {
      received12thMarksheet: false,
      received10thMarksheet: false,
      receivedNeetScorecard: false,
      receivedPassport: false
    };
  }

  // Check if at least one document is selected
  hasSelectedDocuments(): boolean {
    return this.receivedDocs.received12thMarksheet ||
      this.receivedDocs.received10thMarksheet ||
      this.receivedDocs.receivedNeetScorecard ||
      this.receivedDocs.receivedPassport;
  }

  submitReceive(): void {
    if (!this.selectedStudent) return;

    // Validate at least one document is selected
    if (!this.hasSelectedDocuments()) {
      this.showToast('error', 'Please select at least one document that was received.');
      return;
    }

    this.isSubmitting = true;
    const payload = {
      receivedDate: this.receiveDate,
      docPersonUsername: this.docPerson?.username || 'doc_person_user',
      received12thMarksheet: this.receivedDocs.received12thMarksheet,
      received10thMarksheet: this.receivedDocs.received10thMarksheet,
      receivedNeetScorecard: this.receivedDocs.receivedNeetScorecard,
      receivedPassport: this.receivedDocs.receivedPassport
    };

    this.http.post(`${this.API_ENDPOINT}/receive-docs/${this.selectedStudent.id}`, payload)
      .subscribe({
        next: () => {
          this.isSubmitting = false;

          // Show Success Modal
          this.successType = 'approval';
          this.successMessage = `Documents for ${this.selectedStudent?.fullName} have been marked as Received.`;
          this.showSuccessModal = true;

          this.closeReceiveModal();
          this.fetchDashboardData();
          this.cdr.detectChanges(); // Ensure UI updates immediately
        },
        error: (err) => {
          this.isSubmitting = false;
          this.handleError(err);
          this.cdr.detectChanges();
        }
      });
  }

  // --- VERIFY ACTION ---
  openVerifyModal(student: Student): void {
    this.selectedStudent = student;
    this.approvalComment = '';
    this.modalActiveTab = 'details';
    this.cdr.detectChanges();
  }

  closeVerifyModal(): void {
    this.selectedStudent = null;
    this.approvalComment = '';
  }

  // --- RETURN ACTION ---
  openReturnModal(student: Student): void {
    if (!student.hasRaiseReturnRequest) {
      this.showToast('warning', 'Student has not raised a request for the return of documents.');
      return;
    }

    this.selectedStudent = student;
    this.returnDetails = {
      method: 'COURIER',
      deliveryPartner: 'Blue Dart',
      courierTrackingId: '',
      selfPersonName: '',
      selfPersonContact: '',
      trackingId: '',
      returnedDate: new Date().toISOString().split('T')[0]
    };
    this.showReturnModal = true;
    this.cdr.detectChanges();
  }

  closeReturnModal(): void {
    this.showReturnModal = false;
    this.selectedStudent = null;
  }

  submitReturn(): void {
    if (!this.selectedStudent) return;

    this.isSubmitting = true;

    // Construct the single trackingId string based on method for backend
    if (this.returnDetails.method === 'COURIER') {
      this.returnDetails.trackingId = `${this.returnDetails.deliveryPartner} - ${this.returnDetails.courierTrackingId}`;
    } else {
      this.returnDetails.trackingId = `${this.returnDetails.selfPersonName} - ${this.returnDetails.selfPersonContact}`;
    }

    const payload = {
      method: this.returnDetails.method,
      trackingId: this.returnDetails.trackingId,
      returnedDate: this.returnDetails.returnedDate,
      docPersonUsername: this.docPerson?.username || 'doc_person_user'
    };

    this.docPersonService.returnDocsToStudent(this.selectedStudent.id, payload)
      .subscribe({
        next: () => {
          this.isSubmitting = false;

          // Show Success Modal
          this.successType = 'dispatch';
          this.successMessage = `Document dispatch for ${this.selectedStudent?.fullName} has been successfully updated.`;
          this.showSuccessModal = true;

          this.closeReturnModal();
          this.fetchDashboardData();
          this.cdr.detectChanges(); // Ensure UI updates immediately
        },
        error: (err) => {
          this.isSubmitting = false;
          this.handleError(err);
          this.cdr.detectChanges();
        }
      });
  }

  // --- PASSPORT COLLECTION FLOW ---
  openCollectConfirmModal(student: Student): void {
    this.selectedCollectStudent = student;
    this.showCollectConfirmModal = true;
  }

  closeCollectConfirmModal(): void {
    this.showCollectConfirmModal = false;
    this.selectedCollectStudent = null;
  }

  closeCollectSuccessModal(): void {
    this.showCollectSuccessModal = false;
  }

  confirmCollectPassport(): void {
    if (!this.selectedCollectStudent) return;
    this.isSubmitting = true;

    const payload = {
      docPersonUsername: this.docPerson?.username || 'doc_person_user'
    };

    this.docPersonService.confirmCollection(this.selectedCollectStudent.id, payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showCollectConfirmModal = false;
        this.showCollectSuccessModal = true;
        this.fetchDashboardData();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.handleError(err);
      }
    });
  }

  // --- VIEW REQUEST DETAILS ---
  requestDetails: any = null;
  showRequestDetailsModal: boolean = false;

  viewRequestDetails(student: Student): void {
    // Set the modal flag FIRST to prevent Verify Documents modal from flashing
    this.showRequestDetailsModal = true;
    this.selectedStudent = student;
    this.isLoading = true;

    this.docPersonService.getRequestDetails(student.id).subscribe({
      next: (data: any) => {
        // Handle potential nested JSON string for requestDetails
        let parsedDetails = data;

        if (data && typeof data.requestDetails === 'string') {
          try {
            const innerDetails = JSON.parse(data.requestDetails);
            // Merge inner details with the main object (which might contain ticketPdfPath)
            parsedDetails = { ...data, ...innerDetails };
          } catch (e) {
            console.error('Failed to parse requestDetails JSON', e);
          }
        }

        this.requestDetails = parsedDetails;
        this.showRequestDetailsModal = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (err.status === 404) {
          // Expected behavior if no details exist yet
          this.requestDetails = {
            error: 'No return request details found for this student.'
          };
          this.showRequestDetailsModal = true;
        } else {
          console.error('Error fetching request details', err);
          this.requestDetails = {
            error: 'Could not fetch detailed request info. Please try again later.'
          };
          this.showToast('error', 'Could not fetch request details.');
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- VIEW TICKET (SEPARATE BUTTON) ---
  viewTicket(student: Student): void {
    this.isLoading = true;
    this.docPersonService.getRequestDetails(student.id).subscribe({
      next: (data: any) => {
        this.isLoading = false;
        if (data && (data.ticketPdfPath || data.travelTicketPdfPath)) {
          const ticketPath = data.ticketPdfPath || data.travelTicketPdfPath;
          this.downloadFile(ticketPath); // Reuse download logic
        } else {
          this.showToast('error', 'No ticket uploaded for this request.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        if (err.status === 404) {
          this.showToast('error', 'No request details found.');
        } else {
          this.showToast('error', 'Could not check for ticket. Please try again.');
        }
        this.cdr.detectChanges();
      }
    });
  }
  downloadFile(ticketPdfPath: any) {
    if (!ticketPdfPath) {
      this.showToast('error', 'File path is missing.');
      return;
    }
    const url = this.getDocumentUrl(ticketPdfPath);
    window.open(url, '_blank');
  }

  closeRequestDetailsModal(): void {
    this.showRequestDetailsModal = false;
    this.requestDetails = null;
    this.selectedStudent = null;
  }

  // DETAILS MODAL
  openDetailsModal(student: Student) {
    this.selectedStudent = student;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedStudent = null;
  }

  getDocumentUrl(path: string | undefined): string {
    return this.fileService.getFileUrl(path);
  }

  isSubmitting: boolean = false;

  submitVerification(isApproved: boolean): void {
    if (!this.selectedStudent) return;

    // Construct Payload
    const payload: VerificationPayload = {
      approved: isApproved, // true or false
      comment: this.approvalComment,
      docPersonUsername: this.docPerson?.username || 'doc_person_user',
      // Optional fields depending on backend requirement
      action: isApproved ? 'APPROVE_TELEX_DOCS' : 'REJECT_TELEX_DOCS'
    };

    this.isSubmitting = true; // Use specific submitting state for spinner

    // Using the same endpoint, backend handles true/false
    this.http.post(`${this.API_ENDPOINT}/verify-telex-docs/${this.selectedStudent.id}`, payload)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.successType = isApproved ? 'approval' : 'rejection';
          this.successMessage = isApproved
            ? `Documents successfully verified for ${this.selectedStudent?.fullName}.`
            : `Documents rejected for ${this.selectedStudent?.fullName}. Sent back for review.`;

          // Close approval modal FIRST
          this.closeVerifyModal();

          // Then show success modal
          this.showSuccessModal = true;

          this.showToast(isApproved ? 'success' : 'warning', this.successMessage);

          // Trigger confetti celebration on approval
          if (isApproved) {
            this.triggerConfetti();
          }

          this.fetchDashboardData(); // Refresh to remove from list
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error submitting verification', err);
          this.handleError(err);
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.cdr.detectChanges();
  }

  // ============================================
  // LOGOUT (PREMIUM SPINNER)
  // ============================================
  logout(): void {
    this.isLoggingOut = true;
    this.cdr.detectChanges();

    // Simulate secure logout delay
    setTimeout(() => {
      this.isLoggingOut = false;
      localStorage.removeItem('docPersonUsername');
      localStorage.removeItem('authToken');
      this.router.navigate(['/admin-login']);
      this.cdr.detectChanges();
    }, 2500);
  }

  // ============================================
  // UTILITIES (Helpers)
  // ============================================
  getTabIcon(): string {
    const iconMap: any = {
      'dashboard': 'fas fa-th-large',
      'receive': 'fas fa-download',
      'verify': 'fas fa-user-shield',
      'return': 'fas fa-undo',
      'pipeline': 'fas fa-clock',
      'stamped': 'fas fa-stamp',
      'reports': 'fas fa-chart-line',
      'profile': 'fas fa-user',
      'funds': 'fas fa-money-bill-wave',
      'all-students': 'fas fa-users',
      'inventory': 'far fa-folder',
      'transfers': 'fas fa-exchange-alt',
      'passport-requests': 'fas fa-passport',
      'travel-info': 'fas fa-plane',
      'courier-requests': 'fas fa-truck',
      'fund-request': 'fas fa-money-bill-wave'
    };
    return iconMap[this.activeTab] || 'fas fa-home';
  }

  getInitials(name?: string, lastName?: string): string {
    if (!name) return 'DP';
    if (lastName) return (name.charAt(0) + lastName.charAt(0)).toUpperCase();
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return name.charAt(0).toUpperCase();
  }

  getStatusClass(status: string | undefined | null): string {
    if (!status) return 'status-default';
    const s = status.toUpperCase();
    if (s.includes('APPROVE') || s.includes('STAMPED')) return 'status-approved';
    if (s.includes('REJECT')) return 'status-rejected';
    if (s.includes('PENDING') || s.includes('WAIT')) return 'status-pending';
    return 'status-progress';
  }

  getTimelineClass(status: string | undefined | null): string { return this.getStatusClass(status).replace('status-', 'timeline-'); }
  getStatusIcon(status: string | undefined | null): string { return 'fas fa-circle'; } // Simplified
  formatStatusText(status: string | undefined | null): string { return status ? status.replace(/_/g, ' ') : ''; }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatDateTime(dateString: string | Date): string {
    return this.formatDate(dateString as string);
  }

  formatTime(dateString?: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  getAvatarColor(index: number): string {
    const colors = [
      'linear-gradient(135deg, #6366f1, #818cf8)',
      'linear-gradient(135deg, #f59e0b, #fbbf24)',
      'linear-gradient(135deg, #10b981, #34d399)',
      'linear-gradient(135deg, #ef4444, #f87171)',
      'linear-gradient(135deg, #8b5cf6, #a78bfa)',
      'linear-gradient(135deg, #ec4899, #f472b6)',
      'linear-gradient(135deg, #06b6d4, #22d3ee)',
      'linear-gradient(135deg, #f97316, #fb923c)',
      'linear-gradient(135deg, #14b8a6, #2dd4bf)',
      'linear-gradient(135deg, #3b82f6, #60a5fa)'
    ];
    return colors[index % colors.length];
  }

  isInTransitStatus(status: string | undefined | null): boolean {
    if (!status) return false;
    const s = status.toUpperCase();
    return s.includes('TRANSIT') || s.includes('PENDING') || s.includes('WAIT') || s.includes('PROGRESS');
  }

  isCompletedStatus(status: string | undefined | null): boolean {
    if (!status) return false;
    const s = status.toUpperCase();
    return s.includes('APPROVE') || s.includes('COMPLETE') || s.includes('STAMPED') || s.includes('DONE');
  }

  isRejectedStatus(status: string | undefined | null): boolean {
    if (!status) return false;
    return status.toUpperCase().includes('REJECT');
  }

  clearAllStudentFilters(): void {
    this.filters.searchQuery = '';
    this.filters.statusFilter = 'all';
    this.filterAgent = '';
    this.filterCollege = '';
    this.pagination.currentPage = 1;
    this.onGlobalFilterChange();
  }

  exportStudentsToExcel(): void {
    const list = this.filteredStudents;
    if (!list || list.length === 0) {
      this.showToast('warning', 'No data available to export.');
      return;
    }

    const csvRows: string[] = [];
    const headers = ['#', 'Student Name', 'Passport No', 'Agent', 'Application ID', 'University', 'Status', 'Date'];
    csvRows.push(headers.join(','));

    list.forEach((student, i) => {
      const row = [
        `"${i + 1}"`,
        `"${student.fullName || ''}"`,
        `"${student.passportNo || ''}"`,
        `"${student.agent?.fullName || 'Direct'}"`,
        `"${student.applicationId || student.id}"`,
        `"${student.college?.collegeName || 'Not Assigned'}"`,
        `"${this.formatCompactStatus(student.applicationStatus)}"`,
        `"${this.formatDate(student.updatedAt || student.createdAt)}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `All_Students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('success', `Exported ${list.length} students to CSV.`);
  }

  formatCompactStatus(status: string | undefined | null): string {
    if (!status) return 'Pending';
    const s = status.toUpperCase();
    if (s.includes('APPROVE') || s.includes('COMPLETE') || s.includes('STAMPED') || s.includes('DONE')) return 'Completed';
    if (s.includes('TRANSIT') || s.includes('PROGRESS')) return 'In Transit';
    if (s.includes('REJECT')) return 'Rejected';
    if (s.includes('PENDING') || s.includes('WAIT')) return 'In Transit';
    return status.replace(/_/g, ' ');
  }

  // ============================================
  // COURIER TRACKING URL HELPER
  // ============================================
  getCourierTrackingUrl(courierPartner: string | undefined, trackingId: string | undefined): string | null {
    if (!courierPartner) return null;

    const partner = courierPartner.toUpperCase().trim();

    // Direct tracking page URLs (user copies ID and pastes on the page)
    const trackingUrls: { [key: string]: string } = {
      // International Couriers (5)
      'DHL EXPRESS': 'https://www.dhl.com/in-en/home/tracking.html',
      'DHL': 'https://www.dhl.com/in-en/home/tracking.html',
      'FEDEX': 'https://www.fedex.com/en-in/tracking.html',
      'UPS': 'https://www.ups.com/track',
      'ARAMEX': 'https://www.aramex.com/track/shipments',
      'USPS': 'https://tools.usps.com/go/TrackConfirmAction',

      // Indian Domestic Couriers (8)
      'BLUE DART': 'https://www.bluedart.com/track-trace',
      'BLUEDART': 'https://www.bluedart.com/track-trace',
      'DELHIVERY': 'https://www.delhivery.com',
      'DTDC': 'https://www.dtdc.in/tracking/shipment-tracking.html',
      'GATI': 'https://www.gatikwe.com',
      'XPRESSBEES': 'https://www.xpressbees.com/shipment/tracking',
      'ECOM EXPRESS': 'https://ecomexpress.in/tracking',
      'SHADOWFAX': 'https://tracker.shadowfax.in',
      'INDIA POST': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
      'INDIAPOST': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',

      // Aggregators (4)
      'SHIPROCKET': 'https://www.shiprocket.in/shipment-tracking',
      'NIMBUSPOST': 'https://nimbuspost.com/tracking',
      'PICKRR': 'https://www.pickrr.com/tracking',
      'CLICKPOST': 'https://www.clickpost.in/track'
    };

    // Search for matching partner
    for (const [key, url] of Object.entries(trackingUrls)) {
      if (partner.includes(key) || key.includes(partner)) {
        return url;
      }
    }

    // Default fallback - return null if no match
    return null;
  }

  // Get courier-specific icon
  getCourierIcon(courierPartner: string | undefined): string {
    if (!courierPartner) return 'fas fa-shipping-fast';
    const partner = courierPartner.toUpperCase().trim();

    const iconMap: { [key: string]: string } = {
      'DHL': 'fas fa-truck',
      'FEDEX': 'fas fa-box',
      'UPS': 'fas fa-dolly',
      'ARAMEX': 'fas fa-globe',
      'USPS': 'fas fa-flag-usa',
      'BLUE DART': 'fas fa-plane',
      'BLUEDART': 'fas fa-plane',
      'DELHIVERY': 'fas fa-motorcycle',
      'DTDC': 'fas fa-truck-moving',
      'GATI': 'fas fa-truck-loading',
      'XPRESSBEES': 'fas fa-shipping-fast',
      'ECOM EXPRESS': 'fas fa-boxes',
      'SHADOWFAX': 'fas fa-bolt',
      'INDIA POST': 'fas fa-mail-bulk',
      'INDIAPOST': 'fas fa-mail-bulk',
      'SHIPROCKET': 'fas fa-rocket',
      'NIMBUSPOST': 'fas fa-cloud',
      'CLICKPOST': 'fas fa-mouse-pointer',
      'PICKRR': 'fas fa-map-marker-alt'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (partner.includes(key)) return icon;
    }
    return 'fas fa-shipping-fast';
  }

  // Get courier brand color for premium UI
  getCourierBrandColor(courierPartner: string | undefined): string {
    if (!courierPartner) return '#059669';
    const partner = courierPartner.toUpperCase().trim();

    const colorMap: { [key: string]: string } = {
      'DHL': '#FFCC00',      // DHL Yellow
      'FEDEX': '#4D148C',    // FedEx Purple
      'UPS': '#351C15',      // UPS Brown
      'ARAMEX': '#E31837',   // Aramex Red
      'USPS': '#004B87',     // USPS Blue
      'BLUE DART': '#003399', // Blue Dart Blue
      'BLUEDART': '#003399',
      'DELHIVERY': '#E53935', // Delhivery Red
      'DTDC': '#FF6600',     // DTDC Orange
      'GATI': '#1E88E5',     // Gati Blue
      'XPRESSBEES': '#FFB300', // Xpressbees Yellow
      'ECOM EXPRESS': '#43A047', // Ecom Green
      'SHADOWFAX': '#7B1FA2', // Shadowfax Purple
      'INDIA POST': '#D32F2F', // India Post Red
      'INDIAPOST': '#D32F2F',
      'SHIPROCKET': '#5C6BC0', // Shiprocket Indigo
      'NIMBUSPOST': '#00ACC1', // NimbusPost Cyan
      'CLICKPOST': '#FF5722', // ClickPost Orange
      'PICKRR': '#8BC34A'    // Pickrr Green
    };

    for (const [key, color] of Object.entries(colorMap)) {
      if (partner.includes(key)) return color;
    }
    return '#059669';
  }

  // Copy tracking ID to clipboard
  copyTrackingId(trackingId: string | undefined): void {
    if (!trackingId) return;

    navigator.clipboard.writeText(trackingId).then(() => {
      this.showToast('success', `Tracking ID copied: ${trackingId}`);
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = trackingId;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showToast('success', `Tracking ID copied: ${trackingId}`);
    });
  }



  // Toast helpers
  showToast(type: any, message: string) {
    const id = Date.now().toString();
    this.toasts.push({ id, type, message, show: true });
    setTimeout(() => this.dismissToast(id), 5000);
  }
  dismissToast(id: string) { this.toasts = this.toasts.filter(t => t.id !== id); }
  retryLastAction() { this.fetchDashboardData(); }
  exportToCSV() { this.showToast('info', 'Exporting data...'); }
  closeDocumentPreview() { this.previewDocument = null; }
  generateRecentActivities() { /* ... */ }

  // ============================================
  // DARK MODE
  // ============================================
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    const theme = this.isDarkMode ? 'dark' : 'light';
    this.renderer.setAttribute(this.elementRef.nativeElement, 'data-theme', theme);
    localStorage.setItem('theme', theme);
    this.cdr.detectChanges();
  }

  loadDarkModePreference(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      this.renderer.setAttribute(this.elementRef.nativeElement, 'data-theme', 'dark');
    }
  }

  // ============================================
  // COMMAND PALETTE
  // ============================================
  toggleCommandPalette(): void {
    this.showCommandPalette = !this.showCommandPalette;
    if (this.showCommandPalette) {
      setTimeout(() => {
        const input = document.querySelector('.command-palette-input') as HTMLInputElement;
        input?.focus();
      }, 100);
    }
    this.cdr.detectChanges();
  }

  executeCommand(command: string): void {
    this.showCommandPalette = false;
    switch (command) {
      case 'dashboard':
        this.activeTab = 'dashboard';
        break;
      case 'all-students':
        this.setActiveTab('all-students');
        break;
      case 'receive':
        this.activeTab = 'receive';
        break;
      case 'verify':
        this.activeTab = 'verify';
        break;
      case 'return':
        this.activeTab = 'return';
        break;
      case 'stamped':
        this.activeTab = 'stamped';
        break;
      case 'dark-mode':
        this.toggleDarkMode();
        break;
      case 'export':
        this.exportToCSV();
        break;
    }
  }

  // ============================================
  // CONFETTI CELEBRATION
  // ============================================
  triggerConfetti(): void {
    this.showConfetti = true;
    const colors = ['var(--primary-500)', 'var(--success-500)', 'var(--warning-500)', 'var(--info-500)'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = this.renderer.createElement('div');
        this.renderer.addClass(confetti, 'confetti');
        this.renderer.setStyle(confetti, 'left', `${Math.random() * 100}%`);
        this.renderer.setStyle(confetti, 'background', colors[Math.floor(Math.random() * colors.length)]);
        this.renderer.setStyle(confetti, 'animation-delay', `${Math.random() * 0.5}s`);
        this.renderer.appendChild(document.body, confetti);

        setTimeout(() => {
          this.renderer.removeChild(document.body, confetti);
        }, 3000);
      }, i * 30);
    }

    setTimeout(() => {
      this.showConfetti = false;
    }, 3000);
  }

  // ============================================
  // BULK ACTIONS
  // ============================================
  toggleBulkSelection(studentId: number): void {
    if (this.bulkSelectedIds.has(studentId)) {
      this.bulkSelectedIds.delete(studentId);
    } else {
      this.bulkSelectedIds.add(studentId);
    }
    this.cdr.detectChanges();
  }

  selectAllVisible(): void {
    this.getPaginatedStudents().forEach(s => {
      if (s.id) this.bulkSelectedIds.add(s.id);
    });
    this.cdr.detectChanges();
  }

  clearBulkSelection(): void {
    this.bulkSelectedIds.clear();
    this.cdr.detectChanges();
  }

  bulkApprove(): void {
    if (this.bulkSelectedIds.size === 0) return;
    this.showToast('info', `Approving ${this.bulkSelectedIds.size} students...`);
    // Implement bulk approval logic
  }

  // ============================================
  // DEBOUNCED SEARCH
  // ============================================
  private searchTimeout: any;

  onSearchInput(query: string): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.filters.searchQuery = query;
      this.onSearchChange();
    }, 300); // 300ms debounce
  }

  // ============================================
  // COUNT-UP ANIMATION
  // ============================================
  animateCount(element: HTMLElement, target: number, duration: number = 1000): void {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        element.textContent = target.toString();
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current).toString();
      }
    }, 16);
  }

  // ============================================
  // FILTER CHIPS
  // ============================================
  getActiveFilters(): Array<{ key: string; label: string; value: string }> {
    const filters: Array<{ key: string; label: string; value: string }> = [];

    if (this.filters.searchQuery) {
      filters.push({ key: 'search', label: 'Search', value: this.filters.searchQuery });
    }

    if (this.filters.statusFilter && this.filters.statusFilter !== 'all') {
      filters.push({ key: 'status', label: 'Status', value: this.filters.statusFilter });
    }

    return filters;
  }

  removeFilter(key: string): void {
    if (key === 'search') {
      this.filters.searchQuery = '';
    } else if (key === 'status') {
      this.filters.statusFilter = 'all';
    }
    this.applyFilters();
  }

  // ============================================
  // FUND REQUESTS
  // ============================================


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

  // Handle QR Code Selection
  // Handle QR Code Selection with Resizing
  onQrCodeSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        this.showToast('error', 'Image size should be less than 5MB');
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
          this.showToast('error', 'Failed to process image');
          this.isQrUploading = false;
          this.cdr.detectChanges();
        }
      );
    }
  }

  // Helper: Resize Image
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

          // Calculate new dimensions
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

          // Compress to JPEG with 0.7 quality
          resolve(elem.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  }

  submitFundRequest(): void {
    if (!this.fundRequestForm.amount || !this.fundRequestForm.purpose) {
      this.showToast('error', 'Please fill in amount and purpose.');
      return;
    }

    // Validate based on mode
    let detailsString = '';

    if (this.fundRequestForm.paymentMode === 'UPI') {
      if (!this.fundRequestForm.upiId) {
        this.showToast('error', 'Please enter UPI ID.');
        return;
      }
      detailsString = `UPI ID: ${this.fundRequestForm.upiId}`;
    } else {
      // Bank Transfer
      if (!this.fundRequestForm.accountNumber ||
        !this.fundRequestForm.accountHolderName ||
        !this.fundRequestForm.ifscCode) {
        this.showToast('error', 'Please fill all bank details.');
        return;
      }
      if (this.fundRequestForm.accountNumber !== this.fundRequestForm.confirmAccountNumber) {
        this.showToast('error', 'Account numbers do not match.');
        return;
      }
      detailsString = `Bank: ${this.fundRequestForm.branchName || 'N/A'}, Acc: ${this.fundRequestForm.accountNumber}, IFSC: ${this.fundRequestForm.ifscCode}, Holder: ${this.fundRequestForm.accountHolderName}`;
    }

    const request: any = {
      requesterUsername: this.docPerson?.username || sessionStorage.getItem('username') || sessionStorage.getItem('userId') || 'DOC_001',
      requesterFullName: this.docPerson?.fullName || sessionStorage.getItem('username') || 'Doc Person',
      requesterRole: 'DocManager',
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
          this.showToast('success', 'Fund request submitted successfully!');
          this.resetFundForm();
          this.loadMyRequests();
          // Auto-switch to history tab
          this.fundModalTab = 'history';
          // Close modal on success
          this.showFundRequestModal = false;
        },
        error: (err) => {
          this.isFundSubmitting = false;
          console.error('Error submitting fund request', err);
          this.showToast('error', 'Failed to submit request. Please try again.');
        }
      });
  }

  loadMyRequests(): void {
    const username = sessionStorage.getItem('username') || 'DOC_001'; // Ensure fallback for dev
    this.isLoading = true;
    this.paymentRequestService.getRequestsByUsername(username)
      .subscribe({
        next: (requests) => {
          this.myFundRequests = requests;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading fund requests', err);
          this.isLoading = false;
          // Don't show critical error for empty list on dev
          this.cdr.detectChanges();
        }
      });
  }

  getFundStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'PAID': return 'status-approved';
      case 'PARTIAL': return 'status-warning';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  }

  // Count of paid or partially paid fund requests
  get paidFundRequestsCount(): number {
    if (!this.myFundRequests) return 0;
    return this.myFundRequests.filter(r => r.status === 'PAID' || r.status === 'PARTIAL').length;
  }

  // Helper for search filtering
  matchesSearch(student: Student, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    return !!(
      (student.fullName && student.fullName.toLowerCase().includes(q)) ||
      (student.email && student.email.toLowerCase().includes(q)) ||
      (student.passportNo && student.passportNo.toLowerCase().includes(q)) ||
      (student.applicationId && student.applicationId.toLowerCase().includes(q)) ||
      (student.appliedFor && student.appliedFor.toLowerCase().includes(q))
    );
  }


  previewFile(path: string | undefined, type: string): void {
    if (!path) {
      this.showToast('error', 'Document not available');
      return;
    }
    // Use getDocumentUrl to format the path correctly for localhost:8080
    const fullUrl = this.getDocumentUrl(path);
    window.open(fullUrl, '_blank');
  }

  // ============================================
  // PREMIUM TIMELINE HELPERS
  // ============================================

  getPhaseForStatus(status: string): string {
    if (!status) return 'default';
    const s = status.toUpperCase();

    if (s.includes('REGISTER')) return 'registration';
    if (s.includes('FORWARD') || s.includes('ADMISSION') || s.includes('OFFER') || s.includes('LETTER')) return 'admission';
    if (s.includes('TELEX')) return 'telex';
    if (s.includes('FEE') || s.includes('PAYMENT') || s.includes('PAID')) return 'payment';
    if (s.includes('VISA') || s.includes('PASSPORT') || s.includes('EMBASSY') || s.includes('STAMP')) return 'visa';
    if (s.includes('DOC') || s.includes('COLLECT') || s.includes('RETURN')) return 'completion';

    return 'default';
  }

  getPhaseName(status: string): string {
    const phase = this.getPhaseForStatus(status);
    const phases: { [key: string]: string } = {
      registration: 'Registration',
      admission: 'Admission Process',
      telex: 'Telex Processing',
      payment: 'Payment',
      visa: 'Visa Journey',
      completion: 'Document Return',
      default: 'General'
    };
    return phases[phase] || 'General';
  }

  getTimelinePhaseClass(status: string): string {
    return `phase-dot-${this.getPhaseForStatus(status)}`;
  }

  getCardPhaseClass(status: string): string {
    return `phase-card-${this.getPhaseForStatus(status)}`;
  }

  getStatusBadgeClass(status: string): string {
    return `badge-${this.getPhaseForStatus(status)}`;
  }

  getPhaseIcon(status: string): string {
    const phase = this.getPhaseForStatus(status);
    const icons: { [key: string]: string } = {
      registration: 'fas fa-user-plus',
      admission: 'fas fa-graduation-cap',
      telex: 'fas fa-file-signature',
      payment: 'fas fa-dollar-sign',
      visa: 'fas fa-passport',
      completion: 'fas fa-check-circle',
      default: 'fas fa-circle'
    };
    return icons[phase] || 'fas fa-circle';
  }

  getRelativeTime(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  getActorRole(updatedBy: string): string {
    if (!updatedBy) return '';

    const lower = updatedBy.toLowerCase();
    if (lower.includes('doc') || lower.includes('DOC_')) return 'Document Manager';
    if (lower.includes('visa') || lower.includes('VM_')) return 'Visa Manager';
    if (lower.includes('telex') || lower.includes('TM_')) return 'Telex Manager';
    if (lower.includes('account') || lower.includes('ACC_')) return 'Accountant';
    if (lower.includes('manager') || lower.includes('M25')) return 'Admission Manager';
    if (lower.includes('university') || lower.includes('UE')) return 'University Coordinator';
    if (lower.includes('agent') || lower.includes('R11')) return 'Agent';
    if (lower.includes('system')) return 'System';

    return 'Team Member';
  }

  getDaysSinceCreation(student: any): number {
    if (!student.createdAt) return 0;
    const created = new Date(student.createdAt);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    return Math.floor(diff / 86400000);
  }

  getUniqueActors(history: any[]): string[] {
    if (!history) return [];
    const actors = new Set<string>();
    history.forEach(h => {
      if (h.updatedBy) actors.add(h.updatedBy);
    });
    return Array.from(actors);
  }
}