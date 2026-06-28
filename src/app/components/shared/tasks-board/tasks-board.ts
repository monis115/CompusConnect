import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-tasks-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks-board.html',
  styleUrls: ['./tasks-board.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class TasksBoardComponent implements OnInit {
  @Input() role: string = '';
  @Input() isAdmissionManager: boolean = false;
  @Input() username: string = '';
  @Output() openTaskEngineSettings = new EventEmitter<void>();

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // ─── State ──────────────────────────────────
  dashboardCounts: any = { all: 0, my: 0, pendingApproval: 0, overdue: 0 };
  paginatedTasks: any[] = [];
  currentPage: number = 0;
  totalPages: number = 0;
  isLoadingMore: boolean = false;
  
  tasksFilter: string = 'my';
  activeView: string = 'tasks'; // 'tasks' | 'insights' | 'assistant'
  isLoading: boolean = true;

  // Task Creation
  isTaskModalOpen: boolean = false;
  isSubmitting: boolean = false;
  createStep: number = 1; // 1: student, 2: category, 3: details
  newTask: any = { title: '', department: '', priority: 'MEDIUM', dueDate: '', description: '', type: 'TASK', student: null, studentName: '', requiresApproval: true };

  // Details Panel
  isDetailsModalOpen: boolean = false;
  selectedTask: any = null;
  newFollowUpMessage: string = '';
  selectedCommType: string = 'INTERNAL_NOTE';

  // Prompt Modal
  showPromptModal: boolean = false;
  promptModalTitle: string = '';
  promptModalMessage: string = '';
  promptModalValue: string = '';
  promptModalCallback: ((value: string | null) => void) | null = null;
  // History
  taskHistory: any[] = [];
  isLoadingHistory: boolean = false;
  showHistoryPanel: boolean = false;

  // Insights
  analytics: any = {};
  isLoadingAnalytics: boolean = false;
  smartInsights: string[] = [];

  // Assistant Settings
  assistantSettings: any[] = [];
  isLoadingAssistant: boolean = false;
  
  // Enterprise Config & Bulk Actions
  taskRules: any[] = [];
  selectedTaskIds = new Set<number>();
  isBulkActionLoading: boolean = false;
  bulkReturnReason: string = '';
  showBulkReturnModal: boolean = false;

  // Student Search
  searchQuery: string = '';
  searchResults: any[] = [];
  isSearching: boolean = false;
  showStudentSearch: boolean = false;
  private searchSubject = new Subject<string>();

  // Users for Assignment
  allUsers: any[] = [];
  selectedAssignee: any = null;

  // Enterprise Data Grid
  globalSearchQuery: string = '';
  assignedByFilter: string = '';
  assignedToFilter: string = '';
  departmentFilter: string = '';
  densityMode: 'comfortable' | 'compact' | 'ultra-compact' = 'comfortable';
  showDensityDropdown: boolean = false;
  columnVisibility = {
    checkbox: true, priority: true, title: true, student: true, appId: true,
    department: true, assignedUser: true, assignedBy: true, timeline: true,
    status: true, approval: true, actions: true
  };
  showColumnDropdown: boolean = false;
  showSlideOverPanel: boolean = false;

  // Toast
  successModalMessage: string = '';
  successType: 'success' | 'error' = 'success';

  // ─── Business-Friendly Mappings ──────────────
  private ruleDescriptions: Record<string, { title: string; description: string }> = {
    'ADMISSION_LETTER_MISSING': {
      title: 'Automatically remind the assigned University Coordinator when an admission letter is pending',
      description: 'The system will create a task when a student\'s admission letter has not been uploaded.'
    },
    'TELEX_PENDING_7_DAYS': {
      title: 'Automatically remind the assigned University Coordinator when Universities have not replied',
      description: 'The system will follow up when a university telex has been pending for more than 7 days.'
    },
    'VISA_PAYMENT_PENDING': {
      title: 'Automatically remind the assigned Accountant when Visa Payments are overdue',
      description: 'The system will notify when a student\'s visa payment has not been received.'
    },
    'PASSPORT_TRANSFER': {
      title: 'Automatically remind the assigned Document Manager about pending Passport Transfers',
      description: 'The system will create a task when a passport is ready to be returned to the student.'
    },
    'FLIGHT_BOOKING_MISSING': {
      title: 'Automatically remind the assigned Travel Manager about students without Flight Tickets',
      description: 'The system will notify when a student has a visa but no flight has been booked yet.'
    },
    'ARRIVAL_CONFIRMATION': {
      title: 'Notify me when Student Arrival needs confirmation',
      description: 'The system will create a task after a student\'s travel date to confirm their arrival.'
    },
    'ASSIGN_UNIVERSITY_COORDINATOR': {
      title: 'Automatically assign students to a University Coordinator',
      description: 'The system will create a task to assign a coordinator when a student is registered.'
    },
    'REVIEW_ADMISSION_LETTER': {
      title: 'Automatically remind the assigned Admission Manager to review Admission Letters',
      description: 'The system will notify you when an admission letter has been uploaded and needs approval.'
    },
    'ASSIGN_TELEX_MANAGER': {
      title: 'Automatically assign Telex Managers',
      description: 'The system will create a task to assign a Telex Manager after the admission letter is approved.'
    },
    'ASSIGN_VISA_MANAGER': {
      title: 'Automatically assign Visa Managers',
      description: 'The system will create a task to assign a Visa Manager after the telex is completed.'
    },
    'REVIEW_AGENT_REQUEST': {
      title: 'Notify me of Agent Document Requests',
      description: 'The system will alert you when an agent requests additional documents.'
    },
    'FLIGHT_MISSING': {
      title: 'Automatically remind Agents to book flights',
      description: 'The system will notify the Agent to book flights when a student has a visa but no flight ticket yet.'
    },
    'AGENT_SUBMIT_VISA_PAYMENT': {
      title: 'Automatically remind Agents to submit visa payment receipts',
      description: 'The system will notify the Agent to upload the transaction receipt when visa fees are requested.'
    },
    'AGENT_REQUEST_DOCUMENT_RETURN': {
      title: 'Automatically remind Agents to request document return',
      description: 'The system will notify the Agent to request passport return after the visa is stamped.'
    },
    'AGENT_CONFIRM_DOCUMENT_RECEIPT': {
      title: 'Automatically remind Agents to confirm physical document receipt',
      description: 'The system will notify the Agent to mark documents as received once dispatched.'
    },
    'AGENT_INITIATE_TELEX': {
      title: 'Automatically remind Agents to initiate Telex processing',
      description: 'The system will notify the Agent to submit telex documents when the admission letter is approved.'
    },
    'AGENT_REQUEST_VISA': {
      title: 'Automatically remind Agents to request Visa processing',
      description: 'The system will notify the Agent to request visa processing once the telex number is issued.'
    }
  };

  private taskReasons: Record<string, string> = {
    'ADMISSION_LETTER_MISSING': 'Admission letter has not been uploaded yet.',
    'TELEX_PENDING_7_DAYS': 'The university has not responded to the telex request for over 7 days.',
    'VISA_PAYMENT_PENDING': 'Visa payment has not been received yet.',
    'PASSPORT_TRANSFER': 'Passport is ready and needs to be returned to the student.',
    'FLIGHT_BOOKING_MISSING': 'Visa has been issued but no flight ticket has been booked.',
    'ARRIVAL_CONFIRMATION': 'Student\'s travel date has passed. Arrival needs to be confirmed.',
    'ASSIGN_UNIVERSITY_COORDINATOR': 'Student is registered but no University Coordinator is assigned.',
    'REVIEW_ADMISSION_LETTER': 'Admission letter has been uploaded and is pending approval.',
    'ASSIGN_TELEX_MANAGER': 'Admission letter is approved but no Telex Manager is assigned.',
    'ASSIGN_VISA_MANAGER': 'Telex is complete but no Visa Manager is assigned.',
    'REVIEW_AGENT_REQUEST': 'Agent has requested additional documents for the student.'
  };

  private roleFriendlyNames: Record<string, string> = {
    'VISA_MANAGER': 'Visa Team', 'TELEX_MANAGER': 'Telex Team', 'DOCUMENT_MANAGER': 'Documents Team',
    'ACCOUNTANT': 'Finance Team', 'UNIVERSITY_COORDINATOR': 'University Team', 'ADMISSION_MANAGER': 'Admission Manager', 'AGENT': 'Agent'
  };

  private deptFriendlyNames: Record<string, string> = {
    'VISA': 'Visa', 'TELEX': 'Telex', 'DOCUMENT': 'Documents', 'ACCOUNTANT': 'Finance',
    'UNIVERSITY': 'University', 'AGENT': 'Agent', 'TRAVEL': 'Travel'
  };

  communicationTypes = [
    { value: 'INTERNAL_NOTE', label: 'Internal Note' },
    { value: 'PHONE_CALL', label: 'Phone Call' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'MEETING', label: 'Meeting' },
    { value: 'EXTERNAL_NOTE', label: 'External Note' },
  ];

  taskCategories = [
    { value: 'ADMISSION', label: 'Admission (Admission Manager)', dept: 'ADMISSION' },
    { value: 'UNIVERSITY', label: 'University (University Coordinator)', dept: 'UNIVERSITY' },
    { value: 'TELEX', label: 'Telex (Telex Man)', dept: 'TELEX' },
    { value: 'VISA', label: 'Visa (Visa Man)', dept: 'VISA' },
    { value: 'PAYMENT', label: 'Finance (Accountant)', dept: 'ACCOUNTANT' },
    { value: 'AGENT', label: 'Agent', dept: 'AGENT' },
    { value: 'DOCUMENT', label: 'Documentation', dept: 'DOCUMENT' }
  ];

  assignableRoles = [
    { value: '', label: 'All Teams' },
    { value: 'VISA_MANAGER', label: 'Visa Team' },
    { value: 'TELEX_MANAGER', label: 'Telex Team' },
    { value: 'DOCUMENT_MANAGER', label: 'Documents Team' },
    { value: 'ACCOUNTANT', label: 'Finance Team' },
    { value: 'UNIVERSITY_COORDINATOR', label: 'University Team' },
    { value: 'ADMISSION_MANAGER', label: 'Admission Manager' },
    { value: 'AGENT', label: 'Agent' }
  ];

  assignerRoles = [
    { value: '', label: 'All Users/System' },
    { value: 'SYSTEM', label: 'System (Auto)' },
    { value: 'ADMISSION_MANAGER', label: 'Admission Manager' },
    { value: 'VISA_MANAGER', label: 'Visa Team' },
    { value: 'TELEX_MANAGER', label: 'Telex Team' },
    { value: 'DOCUMENT_MANAGER', label: 'Documents Team' },
    { value: 'ACCOUNTANT', label: 'Finance Team' },
    { value: 'UNIVERSITY_COORDINATOR', label: 'University Team' }
  ];

  // ─── Lifecycle ──────────────────────────────
  ngOnInit() {
    if (this.isAdmissionManager && !this.role) {
      this.role = 'ADMISSION_MANAGER';
    }
    this.fetchAllUsers();
    this.loadTasksDashboard();
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(query => {
      if (!query.trim()) { this.searchResults = []; this.isSearching = false; this.cdr.markForCheck(); return; }
      this.executeStudentSearch(query);
    });
  }

  // ─── User Fetching ──────────────────────────
  fetchAllUsers() {
    this.http.get<any[]>(`${environment.apiUrl}/api/auth`).subscribe({
      next: (data) => {
        this.allUsers = data;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load users:', err);
      }
    });
  }

  get departmentUsers(): any[] {
    if (!this.newTask.department) return [];
    
    let targetRole = '';
    switch (this.newTask.department) {
      case 'DOCUMENT': targetRole = 'doc_manager'; break;
      case 'PAYMENT': targetRole = 'accountant'; break;
      case 'VISA': targetRole = 'visa_manager'; break;
      case 'TRAVEL': targetRole = 'visa_manager'; break;
      case 'UNIVERSITY': targetRole = 'UniversityCoordinator'; break;
      case 'TELEX': targetRole = 'telex_manager'; break;
      case 'ADMISSION': targetRole = 'admission_manager'; break;
      case 'AGENT': targetRole = 'agent'; break;
      default: return this.allUsers; // If OTHER, show all
    }

    const normalizedTarget = targetRole.toLowerCase();
    return this.allUsers.filter(u => u.role && u.role.toLowerCase() === normalizedTarget);
  }

  onDepartmentChange() {
    this.selectedAssignee = null;
  }

  // ─── Label Helpers ──────────────────────────
  getRoleLabel(role: string): string { return this.roleFriendlyNames[role] || role || ''; }
  getDeptLabel(dept: string): string { return this.deptFriendlyNames[dept] || dept || ''; }

  getTaskReason(task: any): string {
    if (task.ruleCode && this.taskReasons[task.ruleCode]) return this.taskReasons[task.ruleCode];
    if (task.description) return task.description;
    return '';
  }

  getTaskOriginLabel(task: any): string {
    if (task.ruleCode || task.systemGenerated) return 'Created automatically by the system';
    if (task.createdBy) return 'Created by ' + task.createdBy;
    return '';
  }

  getCommTypeLabel(value: string): string {
    const found = this.communicationTypes.find(c => c.value === value);
    return found ? found.label : 'Note';
  }

  getCommTypeColor(value: string): string {
    const colors: Record<string, string> = {
      'PHONE_CALL': '#059669', 'EMAIL': '#2563eb', 'WHATSAPP': '#16a34a',
      'MEETING': '#7c3aed', 'INTERNAL_NOTE': '#64748b', 'EXTERNAL_NOTE': '#d97706', 'SYSTEM': '#94a3b8'
    };
    return colors[value] || '#64748b';
  }

  getStatusLabel(status: string, task: any = null): string {
    const isOwner = task && task.assignedToUser === (this.username || sessionStorage.getItem('userId') || this.role);
    const isSupervisor = this.role === 'ADMISSION_MANAGER' && !isOwner;

    if (isSupervisor) {
      const labels: Record<string, string> = {
        'PENDING': 'Assigned',
        'IN_PROGRESS': 'In Progress',
        'COMPLETED_BY_TEAM': 'Waiting Review',
        'AWAITING_APPROVAL': 'Waiting Review',
        'CLOSED': 'Approved',
        'REWORK_REQUIRED': 'Returned',
        'VERIFIED': 'Verified',
        'BLOCKED': 'Blocked',
        'ARCHIVED': 'Archived'
      };
      if (task?.dueDate && new Date(task.dueDate) < new Date() && status !== 'CLOSED') {
         return 'Overdue';
      }
      return labels[status] || status;
    } else {
      const requiresApproval = task ? task.requiresApproval : false;
      const labels: Record<string, string> = {
        'PENDING': 'To Do', 'IN_PROGRESS': 'In Progress', 'COMPLETED_BY_TEAM': 'Done — Waiting for Review', 'AWAITING_APPROVAL': 'Pending Approval',
        'CLOSED': requiresApproval ? 'Approved' : 'Completed', 'REWORK_REQUIRED': 'Returned for Revision', 'VERIFIED': 'Verified', 'BLOCKED': 'Blocked', 'ARCHIVED': 'Archived'
      };
      return labels[status] || status;
    }
  }

  getStatusColor(status: string): string {
    const c: Record<string, string> = {
      'PENDING': '#d97706', 'IN_PROGRESS': '#2563eb', 'COMPLETED_BY_TEAM': '#7c3aed', 'AWAITING_APPROVAL': '#7c3aed',
      'CLOSED': '#059669', 'REWORK_REQUIRED': '#dc2626', 'VERIFIED': '#059669', 'BLOCKED': '#dc2626'
    };
    return c[status] || '#64748b';
  }

  getStatusBg(status: string): string {
    const b: Record<string, string> = {
      'PENDING': '#fef3c7', 'IN_PROGRESS': '#dbeafe', 'COMPLETED_BY_TEAM': '#f3e8ff', 'AWAITING_APPROVAL': '#f3e8ff',
      'CLOSED': '#dcfce7', 'REWORK_REQUIRED': '#fee2e2', 'VERIFIED': '#dcfce7', 'BLOCKED': '#fee2e2'
    };
    return b[status] || '#f1f5f9';
  }

  getDaysOverdue(task: any): number {
    if (!task.dueDate) return 0;
    const diff = Math.floor((new Date().getTime() - new Date(task.dueDate).getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  }

  getDueDateLabel(task: any): string {
    if (!task.dueDate) return '';
    const days = this.getDaysOverdue(task);
    if (days > 1) return days + ' days overdue';
    if (days === 1) return 'Overdue since yesterday';
    const diff = Math.floor((new Date(task.dueDate).getTime() - new Date().getTime()) / 86400000);
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    return 'Due in ' + diff + ' days';
  }

  // ─── Dashboard ──────────────────────────────
  loadTasksDashboard(): void {
    this.isLoading = true;
    this.currentPage = 0;
    this.paginatedTasks = [];
    const u = this.username || sessionStorage.getItem('userId') || this.role;
    let countsUrl = `${environment.apiUrl}/api/tasks/dashboard/counts?username=${u}`;
    if (this.role) countsUrl += `&role=${this.role}`;
    if (this.assignedByFilter) countsUrl += `&assignedBy=${encodeURIComponent(this.assignedByFilter)}`;
    if (this.assignedToFilter) countsUrl += `&assignedTo=${encodeURIComponent(this.assignedToFilter)}`;
    if (this.departmentFilter) countsUrl += `&department=${encodeURIComponent(this.departmentFilter)}`;
    this.http.get<any>(countsUrl).subscribe({
      next: (counts) => { this.dashboardCounts = counts; this.cdr.markForCheck(); },
      error: () => {}
    });
    this.fetchTasksPage(this.currentPage);
  }

  fetchTasksPage(page: number): void {
    this.isLoading = true;
    this.currentPage = page;

    const u = this.username || sessionStorage.getItem('userId') || this.role;
    let url = `${environment.apiUrl}/api/tasks/dashboard/paginated?username=${u}&filter=${this.tasksFilter}&page=${page}&size=5`;
    if (this.role) url += `&role=${this.role}`;
    if (this.assignedByFilter) url += `&assignedBy=${encodeURIComponent(this.assignedByFilter)}`;
    if (this.assignedToFilter) url += `&assignedTo=${encodeURIComponent(this.assignedToFilter)}`;
    if (this.departmentFilter) url += `&department=${encodeURIComponent(this.departmentFilter)}`;
    
    this.http.get<any>(url).subscribe({
      next: (pageData) => {
        this.paginatedTasks = pageData.content || [];
        this.totalPages = pageData.page?.totalPages ?? pageData.totalPages ?? 0;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.fetchTasksPage(page);
    }
  }

  getPaginationArray(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 1;
    
    if (total <= 5) {
      const pages: number[] = [];
      for (let i = 0; i < total; i++) pages.push(i);
      return pages;
    }
    
    const pages: (number | string)[] = [];
    pages.push(0);
    
    let left = Math.max(1, current - delta);
    let right = Math.min(total - 2, current + delta);
    
    if (left > 1) pages.push('...1');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 2) pages.push('...2');
    
    pages.push(total - 1);
    
    return pages;
  }

  setTasksFilter(filter: string): void {
    this.tasksFilter = filter;
    this.loadTasksDashboard();
  }
  
  applyAdvancedFilters(): void {
    this.loadTasksDashboard();
  }
  
  clearAdvancedFilters(): void {
    this.assignedByFilter = '';
    this.assignedToFilter = '';
    this.departmentFilter = '';
    this.loadTasksDashboard();
  }

  getTasksForCurrentFilter(): any[] {
    let tasks: any[] = this.paginatedTasks || [];

    if (!this.globalSearchQuery || this.globalSearchQuery.trim() === '') {
      return tasks;
    }

    const q = this.globalSearchQuery.toLowerCase();
    return tasks.filter(t => 
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.student?.fullName && t.student.fullName.toLowerCase().includes(q)) ||
      (t.student?.applicationId && t.student.applicationId.toLowerCase().includes(q)) ||
      (t.assignedToUser && t.assignedToUser.toLowerCase().includes(q)) ||
      (t.department && t.department.toLowerCase().includes(q)) ||
      (t.status && t.status.toLowerCase().includes(q)) ||
      (t.priority && t.priority.toLowerCase().includes(q))
    );
  }

  bulkApprove(): void {
    if (this.selectedTaskIds.size === 0) return;
    this.isBulkActionLoading = true;
    const u = this.username || sessionStorage.getItem('username') || sessionStorage.getItem('userId') || 'System';
    this.http.post(`${environment.apiUrl}/api/tasks/bulk-approve?username=${u}`, Array.from(this.selectedTaskIds)).subscribe({
      next: () => { this.isBulkActionLoading = false; this.selectedTaskIds.clear(); this.loadTasksDashboard(); this.showToast('Tasks approved', 'success'); },
      error: () => { this.isBulkActionLoading = false; this.showToast('Bulk approval failed', 'error'); }
    });
  }

  openBulkReturnModal(): void {
    if (this.selectedTaskIds.size === 0) return;
    this.bulkReturnReason = '';
    this.showBulkReturnModal = true;
  }

  bulkReturn(): void {
    if (this.selectedTaskIds.size === 0 || !this.bulkReturnReason) return;
    this.isBulkActionLoading = true;
    const u = this.username || sessionStorage.getItem('username') || sessionStorage.getItem('userId') || 'System';
    this.http.post(`${environment.apiUrl}/api/tasks/bulk-return?username=${u}`, { taskIds: Array.from(this.selectedTaskIds), reason: this.bulkReturnReason }).subscribe({
      next: () => { this.isBulkActionLoading = false; this.selectedTaskIds.clear(); this.showBulkReturnModal = false; this.loadTasksDashboard(); this.showToast('Tasks returned for rework', 'success'); },
      error: () => { this.isBulkActionLoading = false; this.showToast('Bulk return failed', 'error'); }
    });
  }

  toggleTaskSelection(taskId: number): void {
    if (this.selectedTaskIds.has(taskId)) {
      this.selectedTaskIds.delete(taskId);
    } else {
      this.selectedTaskIds.add(taskId);
    }
  }

  toggleAllSelection(tasks: any[]): void {
    if (this.selectedTaskIds.size === tasks.length && tasks.length > 0) {
      this.selectedTaskIds.clear();
    } else {
      tasks.forEach(t => this.selectedTaskIds.add(t.id));
    }
  }

  toggleRuleApproval(rule: any): void {
    const newValue = !rule.requiresApproval;
    this.http.patch(`${environment.apiUrl}/api/tasks/rules/${rule.id}/approval`, { requiresApproval: newValue }).subscribe({
      next: () => { rule.requiresApproval = newValue; this.showToast('Approval setting updated', 'success'); this.cdr.markForCheck(); },
      error: () => { this.showToast('Failed to update setting', 'error'); }
    });
  }

  loadRules(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/tasks/rules`).subscribe({
      next: (rules) => { this.taskRules = rules; this.cdr.markForCheck(); },
      error: () => console.error('Failed to load rules')
    });
  }

  switchToConfig(): void {
    this.activeView = 'config';
    this.loadRules();
  }

  // ─── Smart Insights ─────────────────────────
  loadInsights(): void {
    this.activeView = 'insights';
    this.isLoadingAnalytics = true; this.cdr.markForCheck();
    this.http.get<any>(`${environment.apiUrl}/api/tasks/analytics/reports`).subscribe({
      next: (data) => { this.analytics = data; this.buildSmartInsights(data); this.isLoadingAnalytics = false; this.cdr.markForCheck(); },
      error: () => { this.isLoadingAnalytics = false; this.cdr.markForCheck(); }
    });
  }

  private buildSmartInsights(data: any): void {
    this.smartInsights = [];
    if (data.overdueCount > 0) this.smartInsights.push(`${data.overdueCount} task${data.overdueCount > 1 ? 's are' : ' is'} overdue and need${data.overdueCount === 1 ? 's' : ''} immediate attention.`);
    if (data.openTasksByDepartment) {
      for (const [dept, count] of Object.entries(data.openTasksByDepartment)) {
        if ((count as number) > 0) this.smartInsights.push(`${this.getDeptLabel(dept)} has ${count} pending task${(count as number) > 1 ? 's' : ''}.`);
      }
    }
    if (data.workloadDistribution) {
      const entries = Object.entries(data.workloadDistribution);
      const max = entries.reduce((a, b) => ((a[1] as number) > (b[1] as number) ? a : b), ['', 0]);
      if ((max[1] as number) > 3) this.smartInsights.push(`${max[0]} has the most work right now with ${max[1]} active tasks.`);
    }
    if (this.smartInsights.length === 0) this.smartInsights.push('Everything looks good. No pending issues at the moment.');
  }

  getWorkloadEntries(): any[] {
    if (!this.analytics.workloadDistribution) return [];
    return Object.entries(this.analytics.workloadDistribution).map(([user, count]) => ({ user, count }));
  }
  getMaxWorkload(): number { const e = this.getWorkloadEntries(); return e.length === 0 ? 1 : Math.max(...e.map(x => x.count as number), 1); }
  getWorkloadColor(count: number): string { const r = count / this.getMaxWorkload(); return r > 0.8 ? '#dc2626' : r > 0.5 ? '#f59e0b' : '#059669'; }

  // ─── Smart Assistant ────────────────────────
  loadAssistant(): void {
    this.activeView = 'assistant';
    this.isLoadingAssistant = true; this.cdr.markForCheck();
    this.http.get<any[]>(`${environment.apiUrl}/api/tasks/rules`).subscribe({
      next: (rules) => {
        this.assistantSettings = rules.map(rule => ({
          ...rule,
          friendlyTitle: this.ruleDescriptions[rule.ruleCode]?.title || rule.taskTitle,
          friendlyDesc: this.ruleDescriptions[rule.ruleCode]?.description || rule.description || '',
        }));
        this.isLoadingAssistant = false; this.cdr.markForCheck();
      },
      error: () => { this.isLoadingAssistant = false; this.cdr.markForCheck(); }
    });
  }

  toggleAssistantSetting(ruleId: number): void {
    this.http.put(`${environment.apiUrl}/api/tasks/rules/${ruleId}/toggle`, {}).subscribe({
      next: (rule: any) => {
        const idx = this.assistantSettings.findIndex(r => r.id === ruleId);
        if (idx >= 0) {
          this.assistantSettings[idx] = { ...rule,
            friendlyTitle: this.ruleDescriptions[rule.ruleCode]?.title || rule.taskTitle,
            friendlyDesc: this.ruleDescriptions[rule.ruleCode]?.description || rule.description || '',
          };
        }
        this.showToast(rule.enabled ? 'Turned on' : 'Turned off', 'success'); this.cdr.markForCheck();
      },
      error: () => { this.showToast('Something went wrong', 'error'); }
    });
  }

  formatMinutes(mins: number): string {
    if (mins === undefined || mins === null) return '';
    if (mins >= 43200 && mins % 43200 === 0) return `${mins / 43200} month${mins / 43200 > 1 ? 's' : ''}`;
    if (mins >= 1440 && mins % 1440 === 0) return `${mins / 1440} day${mins / 1440 > 1 ? 's' : ''}`;
    if (mins >= 60 && mins % 60 === 0) return `${mins / 60} hour${mins / 60 > 1 ? 's' : ''}`;
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  }

  minutesToValueUnit(mins: number): { val: number, unit: string } {
    if (mins >= 43200 && mins % 43200 === 0) return { val: mins / 43200, unit: 'months' };
    if (mins >= 1440 && mins % 1440 === 0) return { val: mins / 1440, unit: 'days' };
    if (mins >= 60 && mins % 60 === 0) return { val: mins / 60, unit: 'hours' };
    return { val: mins, unit: 'minutes' };
  }

  valueUnitToMinutes(val: number, unit: string): number {
    if (unit === 'months') return val * 43200;
    if (unit === 'days') return val * 1440;
    if (unit === 'hours') return val * 60;
    return val;
  }

  editTiming(rule: any): void {
    rule.isEditingTiming = true;
    const c = this.minutesToValueUnit(rule.creationDelayMinutes || 0);
    rule.cVal = c.val; rule.cUnit = c.unit;
    
    const d = this.minutesToValueUnit(rule.dueDelayMinutes || 0);
    rule.dVal = d.val; rule.dUnit = d.unit;
  }

  saveTiming(rule: any): void {
    const payload = {
      creationDelayMinutes: this.valueUnitToMinutes(rule.cVal, rule.cUnit),
      dueDelayMinutes: this.valueUnitToMinutes(rule.dVal, rule.dUnit)
    };
    this.http.patch(`${environment.apiUrl}/api/tasks/rules/${rule.id}/timing`, payload).subscribe({
      next: (res: any) => {
        rule.creationDelayMinutes = payload.creationDelayMinutes;
        rule.dueDelayMinutes = payload.dueDelayMinutes;
        this.showToast('Timing updated successfully', 'success');
        rule.isEditingTiming = false;
        this.cdr.markForCheck();
      },
      error: () => { this.showToast('Failed to update timing', 'error'); }
    });
  }

  switchToTasks(): void { this.activeView = 'tasks'; this.loadTasksDashboard(); }

  // ─── Create Task (Stepped) ──────────────────
  openCreateTaskModal(): void {
    this.newTask = { title: '', department: '', category: '', priority: 'MEDIUM', dueDate: '', description: '', type: 'TASK', student: null, studentName: '' };
    this.createStep = 1; this.showStudentSearch = false; this.searchQuery = ''; this.searchResults = [];
    this.isTaskModalOpen = true; this.cdr.markForCheck();
  }

  closeTaskModal(): void { this.isTaskModalOpen = false; this.isSubmitting = false; this.showStudentSearch = false; this.cdr.markForCheck(); }

  selectCategory(cat: any): void {
    this.newTask.category = cat.value;
    this.newTask.department = cat.dept;
    this.createStep = 3; this.cdr.markForCheck();
  }

  goToStep(step: number): void { this.createStep = step; this.cdr.markForCheck(); }

  submitNewTask(): void {
    if (!this.newTask.title.trim() || !this.newTask.department || !this.selectedAssignee) { 
      this.showToast('Please fill all required fields.', 'error'); 
      return; 
    }
    
    const u = this.username || sessionStorage.getItem('userId') || this.role;
    
    let taskRole = '';
    switch (this.newTask.department) {
      case 'DOCUMENT': taskRole = 'DOCUMENT_MANAGER'; break;
      case 'PAYMENT': taskRole = 'ACCOUNTANT'; break;
      case 'VISA': 
      case 'TRAVEL': taskRole = 'VISA_MANAGER'; break;
      case 'UNIVERSITY': taskRole = 'UNIVERSITY_COORDINATOR'; break;
      case 'TELEX': taskRole = 'TELEX_MANAGER'; break;
      case 'ADMISSION': taskRole = 'ADMISSION_MANAGER'; break;
      case 'AGENT': taskRole = 'AGENT'; break;
    }

    const payload = {
      title: this.newTask.title,
      description: this.newTask.description,
      department: this.newTask.department,
      priority: this.newTask.priority,
      dueDate: this.newTask.dueDate ? new Date(this.newTask.dueDate).toISOString() : null,
      type: 'TASK',
      student: this.newTask.student ? { id: this.newTask.student.id } : null,
      ruleCode: 'MANUAL',
      assignedToUser: this.selectedAssignee.username,
      assignedToRole: taskRole,
      createdBy: u,
      requiresApproval: this.newTask.requiresApproval
    };
    
    this.isSubmitting = true; this.cdr.markForCheck();
    this.http.post(`${environment.apiUrl}/api/tasks`, payload).subscribe({
      next: () => { 
        this.isSubmitting = false; 
        this.closeTaskModal(); 
        this.loadTasksDashboard(); 
        this.showToast('Task created and assigned successfully.', 'success'); 
      },
      error: () => { 
        this.isSubmitting = false; 
        this.showToast('Something went wrong. Please try again.', 'error'); 
      }
    });
  }

  private getDeptToRole(dept: string): string {
    const map: Record<string, string> = { 'VISA': 'VISA_MANAGER', 'TELEX': 'TELEX_MANAGER', 'DOCUMENT': 'DOCUMENT_MANAGER', 'ACCOUNTANT': 'ACCOUNTANT', 'UNIVERSITY': 'UNIVERSITY_COORDINATOR', 'AGENT': 'AGENT' };
    return map[dept] || 'ADMISSION_MANAGER';
  }

  // ─── Student Search ─────────────────────────
  toggleStudentSearch(): void { this.showStudentSearch = !this.showStudentSearch; if (!this.showStudentSearch) { this.searchQuery = ''; this.searchResults = []; } this.cdr.markForCheck(); }
  onSearchInput(): void { this.isSearching = true; this.cdr.markForCheck(); this.searchSubject.next(this.searchQuery); }
  executeStudentSearch(query: string): void {
    const r = this.isAdmissionManager ? 'ADMISSION_MANAGER' : this.role;
    const u = this.username || sessionStorage.getItem('userId') || r;
    this.http.get<any[]>(`${environment.apiUrl}/api/tasks/search-students?query=${query}&role=${r}&username=${u}`).subscribe({
      next: (res) => { this.searchResults = res; this.isSearching = false; this.cdr.markForCheck(); },
      error: () => { this.isSearching = false; this.cdr.markForCheck(); }
    });
  }
  selectStudent(student: any): void {
    this.newTask.student = { id: student.id };
    this.newTask.studentName = student.fullName + ' (' + student.applicationId + ')';
    this.searchQuery = ''; this.searchResults = []; this.showStudentSearch = false;
    this.createStep = 2; this.cdr.markForCheck();
  }
  removeSelectedStudent(): void { this.newTask.student = null; this.newTask.studentName = ''; this.createStep = 1; this.cdr.markForCheck(); }

  // ─── Task Details ───────────────────────────
  openTaskDetails(task: any): void {
    this.selectedTask = task; 
    this.newFollowUpMessage = ''; 
    this.selectedCommType = 'INTERNAL_NOTE';
    this.taskHistory = [];
    this.showSlideOverPanel = true; 
    this.isLoadingHistory = true;
    
    this.http.get<any[]>(`${environment.apiUrl}/api/tasks/${task.id}/history`).subscribe({
      next: (history) => {
        this.taskHistory = history;
        this.isLoadingHistory = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingHistory = false;
        this.cdr.markForCheck();
      }
    });
  }
  closeDetailsModal(): void { this.showSlideOverPanel = false; this.selectedTask = null; this.cdr.markForCheck(); }

  // ─── Follow-up ──────────────────────────────
  addFollowUp(): void {
    if (!this.newFollowUpMessage.trim() || !this.selectedTask) return;
    const u = this.username || sessionStorage.getItem('userId') || this.role;
    const params = `message=${encodeURIComponent(this.newFollowUpMessage)}&username=${u}&communicationType=${this.selectedCommType}&isInternal=true`;
    this.http.post(`${environment.apiUrl}/api/tasks/${this.selectedTask.id}/rich-follow-up?${params}`, {}).subscribe({
      next: (fu: any) => { if (!this.selectedTask.followUps) this.selectedTask.followUps = []; this.selectedTask.followUps.push(fu); this.newFollowUpMessage = ''; this.showToast('Update added', 'success'); this.cdr.markForCheck(); },
      error: () => { this.showToast('Could not add update', 'error'); }
    });
  }

  // ─── Task History ───────────────────────────
  getHistoryLabel(action: string): string {
    const l: Record<string, string> = {
      'CREATED': 'Task was created', 'ASSIGNED': 'Assigned to team member', 'STARTED': 'Work started',
      'FOLLOW_UP': 'Update added', 'ESCALATED': 'Manager has been informed', 'REMINDER_SENT': 'Reminder was sent',
      'COMPLETED': 'Marked as done', 'VERIFIED': 'Verified by manager', 'APPROVAL_APPROVED': 'Approved',
      'APPROVAL_REJECTED': 'Returned for revision', 'ARCHIVED': 'Archived'
    };
    return l[action] || action;
  }

  // ─── Task Actions ───────────────────────────
  escalateTask(): void {
    if (!this.selectedTask) return;
    this.http.patch(`${environment.apiUrl}/api/tasks/${this.selectedTask.id}/escalate?target=ADMISSION_MANAGER`, {}).subscribe({
      next: () => { this.showToast('Your manager has been informed.', 'success'); this.selectedTask.escalatedTo = 'ADMISSION_MANAGER'; this.cdr.markForCheck(); },
      error: () => { this.showToast('Something went wrong', 'error'); }
    });
  }

  informAssignedUser(task: any): void {
    this.newFollowUpMessage = 'Manager is requesting an update on this task.';
    this.addFollowUp();
  }

  isAssignedUser(task: any): boolean {
    const r = this.isAdmissionManager ? 'ADMISSION_MANAGER' : this.role;
    if (r && task.assignedToRole) {
      return task.assignedToRole === r;
    }
    const u = this.username || sessionStorage.getItem('userId');
    if (u && task.assignedToUser) {
      return task.assignedToUser === u;
    }
    return true;
  }

  markAsDone(taskId: number): void {
    const u = this.username || sessionStorage.getItem('userId') || this.role;
    this.http.patch(`${environment.apiUrl}/api/tasks/${taskId}/complete?username=${u}`, {}).subscribe({
      next: () => { this.loadTasksDashboard(); this.showToast('Marked as done.', 'success'); if (this.selectedTask?.id === taskId) this.closeDetailsModal(); },
      error: () => { this.showToast('Something went wrong', 'error'); }
    });
  }

  approveTask(taskId: number): void {
    this.http.patch(`${environment.apiUrl}/api/tasks/${taskId}/approve`, {}).subscribe({
      next: () => { this.loadTasksDashboard(); this.showToast('Approved.', 'success'); if (this.selectedTask?.id === taskId) this.closeDetailsModal(); },
      error: () => { this.showToast('Something went wrong', 'error'); }
    });
  }

  rejectTask(taskId: number): void {
    this.http.patch(`${environment.apiUrl}/api/tasks/${taskId}/reject`, {}).subscribe({
      next: () => { this.loadTasksDashboard(); this.showToast('Returned to To Do.', 'success'); if (this.selectedTask?.id === taskId) this.closeDetailsModal(); },
      error: () => { this.showToast('Something went wrong', 'error'); }
    });
  }
  
  returnForRework(taskId: number): void {
    const u = this.username || sessionStorage.getItem('userId') || this.role;
    this.openPrompt("Return Task", "Please provide a reason for returning this task for revision:", (comment) => {
      if (!comment) return;
    
      this.http.patch(`${environment.apiUrl}/api/tasks/${taskId}/return?username=${u}&comment=${encodeURIComponent(comment)}`, {}).subscribe({
        next: () => { this.loadTasksDashboard(); this.showToast('Returned for revision.', 'success'); if (this.selectedTask?.id === taskId) this.closeDetailsModal(); },
        error: () => { this.showToast('Something went wrong', 'error'); }
      });
    });
  }
  
  requestClarification(taskId: number): void {
    const u = this.username || sessionStorage.getItem('userId') || this.role;
    this.openPrompt("Request Clarification", "What clarification do you need?", (message) => {
      if (!message) return;
    
      this.http.patch(`${environment.apiUrl}/api/tasks/${taskId}/request-clarification?username=${u}&message=${encodeURIComponent(message)}`, {}).subscribe({
        next: (t: any) => { this.selectedTask = t; this.loadTasksDashboard(); this.showToast('Clarification requested.', 'success'); this.cdr.markForCheck(); },
        error: () => { this.showToast('Something went wrong', 'error'); }
      });
    });
  }

  verifyTask(): void {
    if (!this.selectedTask) return;
    const u = this.username || sessionStorage.getItem('userId') || this.role;
    this.http.post(`${environment.apiUrl}/api/tasks/${this.selectedTask.id}/verify?username=${u}`, {}).subscribe({
      next: (task: any) => { this.selectedTask = task; this.loadTasksDashboard(); this.showToast('Verified.', 'success'); this.cdr.markForCheck(); },
      error: (err) => { this.showToast(err.error?.message || 'Could not verify', 'error'); }
    });
  }

  canApprove(task: any): boolean {
    if (this.isAdmissionManager) return true;
    const u = this.username || sessionStorage.getItem('userId') || this.role;
    return task.createdBy === u;
  }

  // ─── Prompt Modal ───────────────────────────
  openPrompt(title: string, message: string, callback: (value: string | null) => void) {
    this.promptModalTitle = title;
    this.promptModalMessage = message;
    this.promptModalValue = '';
    this.promptModalCallback = callback;
    this.showPromptModal = true;
    this.cdr.markForCheck();
  }

  submitPrompt() {
    if (this.promptModalCallback) {
      this.promptModalCallback(this.promptModalValue);
    }
    this.closePrompt();
  }

  closePrompt() {
    this.showPromptModal = false;
    this.promptModalCallback = null;
    this.promptModalValue = '';
    this.cdr.markForCheck();
  }

  // ─── Toast ──────────────────────────────────
  private showToast(message: string, type: 'success' | 'error'): void {
    this.successModalMessage = message; this.successType = type; this.cdr.markForCheck();
    setTimeout(() => { this.successModalMessage = ''; this.cdr.markForCheck(); }, 3500);
  }
}
