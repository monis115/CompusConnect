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
  activeTab: 'dashboard' | 'receive' | 'verify' | 'return' | 'pipeline' | 'stamped' | 'reports' | 'profile' | 'funds' | 'all-students' = 'dashboard';
  isLoading: boolean = false;
  isLoggingOut: boolean = false;
  isDarkMode: boolean = false;

  setActiveTab(tab: 'dashboard' | 'receive' | 'verify' | 'return' | 'pipeline' | 'stamped' | 'reports' | 'profile' | 'funds' | 'all-students'): void {
    this.activeTab = tab;
    this.pagination.currentPage = 1; // Reset pagination
    this.applyFilters(); // Re-apply filters based on the new tab
    if (tab === 'funds') {
      this.loadMyRequests();
    }
    this.cdr.detectChanges();
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
  successType: 'approval' | 'rejection' = 'approval';

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
  filteredVerifyList: Student[] = [];
  filteredReturnList: Student[] = [];

  pipelineList: Student[] = [];
  stampedList: Student[] = [];
  filteredStudents: Student[] = [];

  // Search queries for specific tabs
  receiveSearchQuery: string = '';
  verifySearchQuery: string = '';
  returnSearchQuery: string = '';

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

  // ============================================
  // PAGINATION
  // ============================================
  pagination: PaginationConfig = {
    currentPage: 1,
    itemsPerPage: 10,
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

  get hasActiveFilters(): boolean {
    return !!this.filterAgent || !!this.filterCollege || !!this.filters.searchQuery || !!this.receiveSearchQuery || !!this.verifySearchQuery || !!this.returnSearchQuery;
  }
  
  onGlobalFilterChange(): void {
    this.pagination.currentPage = 1;
    this.filterReceiveList();
    this.filterVerifyList();
    this.filterReturnList();
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
    const sourceList = this.filteredStudents?.length > 0 ? this.filteredStudents : this.students;
    return sourceList.slice(0, 4).map(s => ({
      message: `${s.fullName} - ${s.applicationStatus}`,
      type: s.applicationStatus === 'VISA_STAMPED' ? 'success' : 'info',
      time: 'Recently Updated'
    }));
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

  processStudents(): void {
    // 1. Receive List: action 'CONFIRM_DOCS'
    this.receiveList = this.students.filter(s =>
      s.action === 'CONFIRM_DOCS' && (s.setActionOnUser === 'doc_manager' || s.actionOnUser === 'doc_manager')
    );
    this.filteredReceiveList = [...this.receiveList];

    // 2. Verify List: action 'VERIFY_DOCS'
    this.verifyList = this.students.filter(s =>
      s.action === 'VERIFY_DOCS'
    );
    this.filteredVerifyList = [...this.verifyList];

    // 3. Return List: readyForDocReturn === true OR specific action states
    this.returnList = this.students.filter(s =>
      s.readyForDocReturn === true ||
      s.action === 'COLLECT_DOCS' ||
      s.action === 'INITIATE_DOC_RETURN' ||
      s.action === 'NEED_TO_RETURN_VISA'
    );
    this.filteredReturnList = [...this.returnList];

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
      ...this.stampedList.map(s => s.id)
    ]);

    this.pipelineList = this.students.filter(s => !activeIds.has(s.id));

    // Initialize main table
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
    this.filteredReceiveList = this.filterList(this.receiveList, this.receiveSearchQuery);
  }

  filterVerifyList(): void {
    this.filteredVerifyList = this.filterList(this.verifyList, this.verifySearchQuery);
  }

  filterReturnList(): void {
    this.filteredReturnList = this.filterList(this.returnList, this.returnSearchQuery);
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
          this.successType = 'approval';
          this.successMessage = `Documents for ${this.selectedStudent?.fullName} have been processed for return.`;
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

  // --- COLLECTION CONFIRMATION ---
  confirmCollection(student: Student): void {
    if (!student) return;

    const payload = {
      docPersonUsername: this.docPerson?.username || 'doc_person_user'
    };

    this.isSubmitting = true;
    this.docPersonService.confirmCollection(student.id, payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showToast('success', `Documents for ${student.fullName} collected successfully.`);
        this.fetchDashboardData(); // Refresh to update status
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
        if (data && data.ticketPdfPath) {
          this.downloadFile(data.ticketPdfPath); // Reuse download logic
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
      'receive': 'fas fa-inbox',
      'verify': 'fas fa-file-contract',
      'return': 'fas fa-reply',
      'pipeline': 'fas fa-clock',
      'stamped': 'fas fa-stamp',
      'reports': 'fas fa-chart-line',
      'profile': 'fas fa-user'
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