import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
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

@Component({
  selector: 'app-doc-person-dashbaord',
  standalone: false,
  templateUrl: './doc-person-dashbaord.html',
  styleUrls: ['./doc-person-dashbaord.css'],
})
export class DocPersonDashbaord implements OnInit {

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  activeTab: 'dashboard' | 'approval' | 'pipeline' | 'students' | 'reports' | 'profile' = 'dashboard';
  isLoading: boolean = false;
  isLoggingOut: boolean = false;
  showSuccessModal: boolean = false;
  successMessage: string = '';

  // ============================================
  // DATA
  // ============================================
  docPerson: DocPersonProfile | null = null;
  students: Student[] = [];
  approvalList: Student[] = [];
  pipelineList: Student[] = [];
  filteredStudents: Student[] = [];

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
  // ERROR HANDLING
  // ============================================
  errorState: ErrorState = {
    hasError: false,
    message: '',
    type: null
  };

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  toasts: ToastNotification[] = [];

  // ============================================
  // APPROVAL FORM
  // ============================================
  selectedStudent: Student | null = null;
  approvalComment: string = '';

  // ============================================
  // DOCUMENT PREVIEW
  // ============================================
  previewDocument: { url: string; type: 'pdf' | 'image' } | null = null;

  // ============================================
  // CHARTS DATA (for Reports view)
  // ============================================
  approvalTrendsChart: ChartData = {
    labels: [],
    datasets: []
  };

  statusDistributionChart: ChartData = {
    labels: [],
    datasets: []
  };

  // Recent Activity Timeline
  recentActivities: { time: string; message: string; type: string }[] = [];

  // ============================================
  // SORTING
  // ============================================
  sortConfig = {
    column: 'id',
    direction: 'asc' as 'asc' | 'desc'
  };

  private readonly API_BASE = 'http://localhost:8080/api/doc-person';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  // ============================================
  // DATA FETCHING
  // ============================================
  fetchDashboardData(): void {
    this.isLoading = true;
    this.clearError();

    // Get username from localStorage or session
    const username = localStorage.getItem('docPersonUsername') || 'DOC_001';

    this.http.get<DocPersonResponse>(`${this.API_BASE}/username/${username}`)
      .subscribe({
        next: (data) => {
          this.docPerson = data.docPerson;
          this.students = data.students || [];
          this.processStudents();
          this.calculateStats();
          this.prepareChartData();
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

  processStudents(): void {
    // Filter logic: action 'CONFIRM_DOCS' and actionOnUser 'doc_manager'
    this.approvalList = this.students.filter(s =>
      s.action === 'CONFIRM_DOCS' && s.actionOnUser === 'doc_manager'
    );

    // Others are in pipeline
    this.pipelineList = this.students.filter(s =>
      !(s.action === 'CONFIRM_DOCS' && s.actionOnUser === 'doc_manager')
    );

    // Initialize filtered students
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
  applyFilters(): void {
    let results = [...this.students];

    // Search filter
    if (this.filters.searchQuery.trim()) {
      const query = this.filters.searchQuery.toLowerCase();
      results = results.filter(s =>
        s.firstName?.toLowerCase().includes(query) ||
        s.lastName?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.id?.toString().includes(query)
      );
    }

    // Status filter
    if (this.filters.statusFilter !== 'all') {
      results = results.filter(s => s.status === this.filters.statusFilter);
    }

    // Action filter
    if (this.filters.actionFilter !== 'all') {
      results = results.filter(s => s.action === this.filters.actionFilter);
    }

    this.filteredStudents = results;
    this.updatePagination();
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
    this.filters = {
      searchQuery: '',
      statusFilter: 'all',
      actionFilter: 'all'
    };
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

  goToPage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.pagination.currentPage = page;
      this.cdr.detectChanges();
    }
  }

  nextPage(): void {
    this.goToPage(this.pagination.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.pagination.currentPage - 1);
  }

  // ============================================
  // SORTING
  // ============================================
  sortBy(column: string): void {
    if (this.sortConfig.column === column) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.column = column;
      this.sortConfig.direction = 'asc';
    }

    this.filteredStudents.sort((a, b) => {
      const aVal = (a as any)[column];
      const bVal = (b as any)[column];

      if (aVal < bVal) return this.sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    this.cdr.detectChanges();
  }

  // ============================================
  // APPROVAL ACTIONS
  // ============================================
  openApprovalModal(student: Student): void {
    this.selectedStudent = student;
    this.approvalComment = 'All documents verified and approved.';
    this.cdr.detectChanges();
  }

  closeApprovalModal(): void {
    this.selectedStudent = null;
    this.approvalComment = '';
  }

  submitApproval(): void {
    if (!this.selectedStudent) return;

    const payload: VerificationPayload = {
      approved: true,
      comment: this.approvalComment,
      docPersonUsername: this.docPerson?.username || 'doc_person_user'
    };

    this.isLoading = true;
    this.http.post(`${this.API_BASE}/verify-telex-docs/${this.selectedStudent.id}`, payload)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.successMessage = `Successfully verified documents for ${this.selectedStudent?.firstName} ${this.selectedStudent?.lastName}.`;
          this.showSuccessModal = true;
          this.showToast('success', 'Documents approved successfully!');
          this.closeApprovalModal();
          this.fetchDashboardData(); // Refresh list
        },
        error: (err) => {
          console.error('Error submitting approval', err);
          this.handleError(err);
          this.isLoading = false;
          this.showToast('error', 'Failed to approve documents. Please try again.');
          this.cdr.detectChanges();
        }
      });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.cdr.detectChanges();
  }

  // ============================================
  // DOCUMENT PREVIEW
  // ============================================
  openDocumentPreview(url: string, type: 'pdf' | 'image'): void {
    this.previewDocument = { url, type };
    this.cdr.detectChanges();
  }

  closeDocumentPreview(): void {
    this.previewDocument = null;
  }

  // ============================================
  // ERROR HANDLING
  // ============================================
  handleError(error: any): void {
    let errorType: 'network' | 'api' | 'validation' | 'session' = 'api';
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.status === 0) {
      errorType = 'network';
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.status === 401 || error.status === 403) {
      errorType = 'session';
      errorMessage = 'Session expired. Please login again.';
    } else if (error.status === 404) {
      errorMessage = 'Resource not found.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }

    this.errorState = {
      hasError: true,
      message: errorMessage,
      type: errorType
    };

    this.showToast('error', errorMessage);
  }

  clearError(): void {
    this.errorState = {
      hasError: false,
      message: '',
      type: null
    };
  }

  retryLastAction(): void {
    this.fetchDashboardData();
  }

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  showToast(type: 'success' | 'error' | 'warning' | 'info', message: string, duration: number = 5000): void {
    const id = Date.now().toString();
    const toast: ToastNotification = {
      id,
      type,
      message,
      duration,
      show: true
    };

    this.toasts.push(toast);
    this.cdr.detectChanges();

    // Auto-dismiss after duration
    setTimeout(() => {
      this.dismissToast(id);
    }, duration);
  }

  dismissToast(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.cdr.detectChanges();
  }

  // ============================================
  // CHARTS & REPORTS
  // ============================================
  prepareChartData(): void {
    // Approval Trends (Last 7 days example)
    this.approvalTrendsChart = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Approvals',
        data: [12, 19, 8, 15, 22, 13, 17],
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 2
      }]
    };

    // Status Distribution
    this.statusDistributionChart = {
      labels: ['Pending', 'Approved', 'Rejected', 'In Pipeline'],
      datasets: [{
        label: 'Students',
        data: [
          this.stats.pendingApproval,
          this.stats.approved,
          this.stats.rejected,
          this.stats.inPipeline
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(251, 146, 60, 0.7)',
          'rgba(59, 130, 246, 0.7)'
        ],
        borderWidth: 0
      }]
    };
  }

  generateRecentActivities(): void {
    this.recentActivities = [
      { time: '2 hours ago', message: 'Document verification completed for John Doe', type: 'success' },
      { time: '5 hours ago', message: 'New document submitted by Jane Smith', type: 'info' },
      { time: '1 day ago', message: 'Approval pending for 3 students', type: 'warning' },
      { time: '2 days ago', message: 'System maintenance completed', type: 'info' }
    ];
  }

  // ============================================
  // EXPORT FUNCTIONALITY
  // ============================================
  exportToCSV(): void {
    const headers = ['ID', 'Name', 'Email', 'Status', 'Action'];
    const rows = this.filteredStudents.map(s => [
      s.id,
      `${s.firstName} ${s.lastName}`,
      s.email,
      s.status,
      s.action
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.showToast('success', 'Export completed successfully!');
  }

  // ============================================
  // LOGOUT
  // ============================================
  logout(): void {
    this.isLoggingOut = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.isLoggingOut = false;
      localStorage.removeItem('docPersonUsername');
      localStorage.removeItem('authToken');
      this.router.navigate(['/admin-login']);
      this.cdr.detectChanges();
    }, 2000);
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  getTabIcon(): string {
    const iconMap: { [key: string]: string } = {
      'dashboard': 'fas fa-th-large',
      'approval': 'fas fa-check-circle',
      'pipeline': 'fas fa-clock',
      'students': 'fas fa-users',
      'reports': 'fas fa-chart-line',
      'profile': 'fas fa-user'
    };
    return iconMap[this.activeTab] || 'fas fa-home';
  }

  getInitials(first?: string, last?: string): string {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'status-pending',
      'APPROVED': 'status-approved',
      'REJECTED': 'status-rejected',
      'IN_PROGRESS': 'status-progress'
    };
    return statusMap[status] || 'status-default';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}