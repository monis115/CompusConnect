import { Component, OnInit, ChangeDetectorRef, HostListener, Renderer2, ElementRef } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  Student,
  DocPersonProfile,
  DocPersonResponse,
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
  activeTab: 'dashboard' | 'approval' | 'pipeline' | 'students' | 'reports' | 'profile' = 'dashboard';
  isLoading: boolean = false;
  isLoggingOut: boolean = false;
  isDarkMode: boolean = false;

  // Interactive Features
  bulkSelectedIds: Set<number> = new Set();
  showCommandPalette: boolean = false;
  commandPaletteQuery: string = '';
  showConfetti: boolean = false;

  // Modal States
  showSuccessModal: boolean = false;
  successMessage: string = '';
  successType: 'approval' | 'rejection' = 'approval';

  // ============================================
  // DATA
  // ============================================
  docPerson: DocPersonProfile | null = null;
  students: Student[] = [];
  approvalList: Student[] = [];
  filteredApprovalList: Student[] = []; // For approval tab search
  pipelineList: Student[] = [];
  filteredStudents: Student[] = [];

  // Search for Approval Tab specifically
  approvalSearchQuery: string = '';

  // ============================================
  // DASHBOARD STATISTICS
  // ============================================
  stats: DashboardStats = {
    totalStudents: 0,
    pendingApproval: 0,
    inPipeline: 0,
    approved: 0,
    rejected: 0
  };

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

  // ============================================
  // DOCUMENT PREVIEW
  // ============================================
  previewDocument: { url: string; type: 'pdf' | 'image' } | null = null;

  // ============================================
  // CHARTS & ACTIVITY
  // ============================================
  approvalTrendsChart: ChartData = { labels: [], datasets: [] };
  statusDistributionChart: ChartData = { labels: [], datasets: [] };
  recentActivities: { time: string; message: string; type: string }[] = [];

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
  private readonly API_BASE_URL = 'http://localhost:8080/api';
  private readonly doc_url = 'http://localhost:8080';
  private readonly API_ENDPOINT = 'http://localhost:8080/api/doc-person';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private renderer: Renderer2,
    private elementRef: ElementRef
  ) { }

  ngOnInit(): void {
    this.fetchDashboardData();
    this.loadDarkModePreference();
    this.initializeKeyboardShortcuts();
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

    this.http.get<DocPersonResponse>(`${this.API_ENDPOINT}/username/${username}`)
      .subscribe({
        next: (data) => {
          this.docPerson = data.docPerson;
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
    // Filter logic: action 'CONFIRM_DOCS' and setActionOnUser 'doc_manager'
    // Using setActionOnUser as per user requirement, falling back to actionOnUser if needed
    this.approvalList = this.students.filter(s =>
      s.action === 'CONFIRM_DOCS' && (s.setActionOnUser === 'doc_manager' || s.actionOnUser === 'doc_manager')
    );

    // Initialize filtered list for approval tab
    this.filteredApprovalList = [...this.approvalList];

    // Pipeline: All students MINUS those in approvalList AND MINUS those with VISA_STAMPED
    this.pipelineList = this.students.filter(s =>
      !this.approvalList.includes(s) &&
      s.applicationStatus !== 'VISA_STAMPED'
    );

    // Initialize main table
    this.applyFilters();
  }

  calculateStats(): void {
    this.stats = {
      totalStudents: this.students.length,
      pendingApproval: this.approvalList.length,
      inPipeline: this.pipelineList.length,
      approved: this.students.filter(s => s.isTelexDocApproved === true).length,
      rejected: this.students.filter(s => s.isTelexDocApproved === false).length
    };
  }

  // ============================================
  // SEARCH & FILTER
  // ============================================

  // 1. Main Student List Filter
  applyFilters(): void {
    let results = [...this.students];

    // Search filter
    if (this.filters.searchQuery.trim()) {
      const query = this.filters.searchQuery.toLowerCase();
      results = results.filter(s =>
        s.fullName?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.id?.toString().includes(query) ||
        s.applicationId?.toString().includes(query)
      );
    }

    // Status filter
    if (this.filters.statusFilter !== 'all') {
      // Check both fields for flexibility
      results = results.filter(s =>
        s.status === this.filters.statusFilter ||
        s.applicationStatus === this.filters.statusFilter
      );
    }

    this.filteredStudents = results;
    this.updatePagination();
  }

  // 2. Specific Approval Tab Search (By Application ID)
  filterApprovalList(): void {
    if (!this.approvalSearchQuery.trim()) {
      this.filteredApprovalList = [...this.approvalList];
    } else {
      const query = this.approvalSearchQuery.toLowerCase();
      this.filteredApprovalList = this.approvalList.filter(s =>
        (s.applicationId && s.applicationId.toString().toLowerCase().includes(query)) ||
        (s.id && s.id.toString().toLowerCase().includes(query)) ||
        (s.fullName && s.fullName.toLowerCase().includes(query))
      );
    }
    this.cdr.detectChanges();
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
    this.applyFilters();
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
  openApprovalModal(student: Student): void {
    this.selectedStudent = student;
    this.approvalComment = '';
    this.modalActiveTab = 'details';
    this.cdr.detectChanges();
  }

  closeApprovalModal(): void {
    this.selectedStudent = null;
    this.approvalComment = '';
  }

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

    this.isLoading = true;

    // Using the same endpoint, backend handles true/false
    this.http.post(`${this.API_ENDPOINT}/verify-telex-docs/${this.selectedStudent.id}`, payload)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.successType = isApproved ? 'approval' : 'rejection';
          this.successMessage = isApproved
            ? `Documents successfully verified for ${this.selectedStudent?.fullName}.`
            : `Documents rejected for ${this.selectedStudent?.fullName}. Sent back for review.`;

          this.showSuccessModal = true;
          this.showToast(isApproved ? 'success' : 'warning', this.successMessage);

          // Trigger confetti celebration on approval
          if (isApproved) {
            this.triggerConfetti();
          }

          this.closeApprovalModal();
          this.fetchDashboardData(); // Refresh to remove from list
        },
        error: (err) => {
          console.error('Error submitting verification', err);
          this.handleError(err);
          this.isLoading = false;
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
      'approval': 'fas fa-check-circle',
      'pipeline': 'fas fa-clock',
      'students': 'fas fa-users',
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

  getDocumentUrl(path?: string): string {
    if (!path) return '';
    // If path already includes http, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Otherwise prepend base URL
    return `${this.doc_url}/${path.startsWith('/') ? path.substring(1) : path}`;
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
      case 'approval':
        this.activeTab = 'approval';
        break;
      case 'students':
        this.activeTab = 'students';
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
}