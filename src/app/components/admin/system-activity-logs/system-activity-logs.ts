import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { Subject, interval, takeUntil, switchMap, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';
import { trigger, transition, style, animate, query, stagger, state } from '@angular/animations';
import { ActivityLogsService } from '../../../services/activity-logs.service';
import {
  ActivityLog,
  PagedActivityLogs,
  ActivityLogFilter,
  LogStatistics,
  ColumnConfig,
  SortConfig,
  ExportFormat,
  DateRangePreset,
  ACTION_TYPES,
  ROLE_TYPES
} from '../../../models/activity-log.model';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-system-activity-logs',
  standalone: false,
  templateUrl: './system-activity-logs.html',
  styleUrl: './system-activity-logs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('staggeredFadeIn', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('60ms', [
            animate('400ms cubic-bezier(0.35, 0, 0.25, 1)',
              style({ opacity: 1, transform: 'translateY(0)' })
            )
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('expandRow', [
      state('collapsed', style({ height: '0', opacity: 0, overflow: 'hidden' })),
      state('expanded', style({ height: '*', opacity: 1 })),
      transition('collapsed <=> expanded', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, height: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, height: '*', transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, height: 0, transform: 'translateY(-20px)' }))
      ])
    ]),
    trigger('fadeScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ])
  ]
})
export class SystemActivityLogs implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  // State
  logs: ActivityLog[] = [];
  allLogs: ActivityLog[] = []; // For client-side filtering
  isLoading = true;
  isRefreshing = false;
  error: string | null = null;

  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;

  // Live stream mode
  isLiveMode = false;
  private liveInterval = 5000;

  // Copy feedback
  copiedField: string | null = null;

  // === NEW FEATURES ===

  // Search & Filters
  searchQuery = '';
  showFilters = false;
  dateRangePreset: DateRangePreset = 'custom';
  startDate: string = '';
  endDate: string = '';
  selectedActions: string[] = [];
  selectedRoles: string[] = [];
  actionTypes = ACTION_TYPES;
  roleTypes = ROLE_TYPES;
  activeFiltersCount = 0;

  // Sorting
  sortConfig: SortConfig = { column: null, direction: 'asc' };

  // Column Visibility
  showColumnMenu = false;
  columns: ColumnConfig[] = [
    { key: 'action', label: 'Action', visible: true, sortable: true, width: '180px' },
    { key: 'username', label: 'User', visible: true, sortable: true, width: '140px' },
    { key: 'role', label: 'Role', visible: true, sortable: true, width: '100px' },
    { key: 'entityName', label: 'Entity', visible: true, sortable: true, width: '140px' },
    { key: 'details', label: 'Details', visible: true, sortable: false, width: '1fr' },
    { key: 'ipAddress', label: 'IP Address', visible: true, sortable: true, width: '140px' },
    { key: 'timestamp', label: 'Timestamp', visible: true, sortable: true, width: '160px' }
  ];

  // Expandable Rows
  expandedRowId: number | null = null;

  // Row Selection
  selectedRows: Set<number> = new Set();
  selectAllChecked = false;

  // Charts
  showCharts = true;
  statistics: LogStatistics | null = null;

  // Line Chart Configuration
  lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Activity',
      fill: true,
      tension: 0.4,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#3b82f6'
    }]
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(13, 19, 33, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(100, 140, 200, 0.2)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(100, 140, 200, 0.1)' },
        ticks: { color: '#64748b' }
      },
      y: {
        grid: { color: 'rgba(100, 140, 200, 0.1)' },
        ticks: { color: '#64748b' },
        beginAtZero: true
      }
    }
  };

  // Doughnut Chart Configuration
  doughnutChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderColor: 'rgba(13, 19, 33, 0.8)',
      borderWidth: 2,
      hoverOffset: 8
    }]
  };

  doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#94a3b8',
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(13, 19, 33, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(100, 140, 200, 0.2)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    }
  };

  // Theme & Density
  isDarkTheme = true;
  viewDensity: 'compact' | 'comfortable' = 'comfortable';

  // Export Modal
  showExportModal = false;
  exportFormat: ExportFormat = 'csv';
  isExporting = false;

  // Keyboard Navigation
  focusedRowIndex = -1;

  constructor(
    private logsService: ActivityLogsService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadLogs();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup debounced search
   */
  private setupSearchDebounce(): void {
    this.searchSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery = query;
      this.applyFilters();
    });
  }

  /**
   * Load activity logs from API
   */
  loadLogs(): void {
    this.isLoading = true;
    this.error = null;

    this.logsService.getAllLogs(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (logs: ActivityLog[]) => {
          this.allLogs = logs;
          this.applyFiltersAndSort();
          this.calculateStatistics();
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err.message || 'Failed to load activity logs';
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Apply filters and sort, then paginate
   */
  private applyFiltersAndSort(): void {
    let filteredLogs = [...this.allLogs];

    // Apply filters
    const filter: ActivityLogFilter = {
      searchQuery: this.searchQuery,
      startDate: this.startDate,
      endDate: this.endDate,
      actions: this.selectedActions,
      roles: this.selectedRoles
    };

    filteredLogs = this.filterLogs(filteredLogs, filter);

    // Apply sorting
    if (this.sortConfig.column) {
      filteredLogs = this.sortLogs(filteredLogs);
    }

    // Calculate pagination
    this.totalElements = filteredLogs.length;
    this.totalPages = Math.ceil(this.totalElements / this.pageSize);

    // Ensure current page is valid
    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
    }

    // Paginate
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.logs = filteredLogs.slice(start, end);

    // Update active filters count
    this.updateActiveFiltersCount();
  }

  /**
   * Filter logs based on criteria
   */
  private filterLogs(logs: ActivityLog[], filter: ActivityLogFilter): ActivityLog[] {
    return logs.filter(log => {
      // Search query
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matchesSearch =
          log.username?.toLowerCase().includes(query) ||
          log.action?.toLowerCase().includes(query) ||
          log.details?.toLowerCase().includes(query) ||
          log.entityName?.toLowerCase().includes(query) ||
          log.ipAddress?.toLowerCase().includes(query) ||
          log.role?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Date range
      if (filter.startDate) {
        const logDate = new Date(log.timestamp);
        const startDate = new Date(filter.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (logDate < startDate) return false;
      }

      if (filter.endDate) {
        const logDate = new Date(log.timestamp);
        const endDate = new Date(filter.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (logDate > endDate) return false;
      }

      // Action filter
      if (filter.actions && filter.actions.length > 0) {
        const matchesAction = filter.actions.some(action =>
          log.action.toUpperCase().includes(action.toUpperCase())
        );
        if (!matchesAction) return false;
      }

      // Role filter
      if (filter.roles && filter.roles.length > 0) {
        const matchesRole = filter.roles.some(role =>
          log.role.toUpperCase() === role.toUpperCase()
        );
        if (!matchesRole) return false;
      }

      return true;
    });
  }

  /**
   * Sort logs
   */
  private sortLogs(logs: ActivityLog[]): ActivityLog[] {
    const column = this.sortConfig.column!;
    const direction = this.sortConfig.direction;

    return logs.sort((a, b) => {
      let aVal = (a as any)[column];
      let bVal = (b as any)[column];

      // Handle dates
      if (column === 'timestamp') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle strings
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Calculate statistics for charts
   */
  private calculateStatistics(): void {
    this.statistics = this.logsService.calculateStatistics(this.allLogs);

    // Update line chart
    this.lineChartData = {
      ...this.lineChartData,
      labels: this.statistics.activityTimeline.labels,
      datasets: [{
        ...this.lineChartData.datasets[0],
        data: this.statistics.activityTimeline.data
      }]
    };

    // Update doughnut chart
    this.doughnutChartData = {
      ...this.doughnutChartData,
      labels: this.statistics.actionDistribution.labels,
      datasets: [{
        ...this.doughnutChartData.datasets[0],
        data: this.statistics.actionDistribution.data,
        backgroundColor: this.statistics.actionDistribution.colors
      }]
    };
  }

  /**
   * Update active filters count
   */
  private updateActiveFiltersCount(): void {
    let count = 0;
    if (this.searchQuery) count++;
    if (this.startDate || this.endDate) count++;
    if (this.selectedActions.length > 0) count++;
    if (this.selectedRoles.length > 0) count++;
    this.activeFiltersCount = count;
  }

  // === SEARCH & FILTER METHODS ===

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchSubject$.next(query);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.applyFiltersAndSort();
    this.cdr.markForCheck();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedActions = [];
    this.selectedRoles = [];
    this.dateRangePreset = 'custom';
    this.currentPage = 0;
    this.applyFiltersAndSort();
    this.cdr.markForCheck();
  }

  setDatePreset(preset: DateRangePreset): void {
    this.dateRangePreset = preset;
    const today = new Date();

    switch (preset) {
      case 'today':
        this.startDate = this.formatDateForInput(today);
        this.endDate = this.formatDateForInput(today);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        this.startDate = this.formatDateForInput(yesterday);
        this.endDate = this.formatDateForInput(yesterday);
        break;
      case '7days':
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        this.startDate = this.formatDateForInput(week);
        this.endDate = this.formatDateForInput(today);
        break;
      case '30days':
        const month = new Date(today);
        month.setDate(month.getDate() - 30);
        this.startDate = this.formatDateForInput(month);
        this.endDate = this.formatDateForInput(today);
        break;
      case 'custom':
        // Don't change dates
        break;
    }

    this.applyFilters();
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  toggleAction(action: string): void {
    const index = this.selectedActions.indexOf(action);
    if (index === -1) {
      this.selectedActions.push(action);
    } else {
      this.selectedActions.splice(index, 1);
    }
    this.applyFilters();
  }

  isActionSelected(action: string): boolean {
    return this.selectedActions.includes(action);
  }

  toggleRole(role: string): void {
    const index = this.selectedRoles.indexOf(role);
    if (index === -1) {
      this.selectedRoles.push(role);
    } else {
      this.selectedRoles.splice(index, 1);
    }
    this.applyFilters();
  }

  isRoleSelected(role: string): boolean {
    return this.selectedRoles.includes(role);
  }

  // === SORTING METHODS ===

  toggleSort(column: string): void {
    if (this.sortConfig.column === column) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.column = column;
      this.sortConfig.direction = 'asc';
    }
    this.applyFiltersAndSort();
    this.cdr.markForCheck();
  }

  getSortIcon(column: string): string {
    if (this.sortConfig.column !== column) return 'arrow-up-down';
    return this.sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  isSorted(column: string): boolean {
    return this.sortConfig.column === column;
  }

  // === COLUMN VISIBILITY ===

  toggleColumnMenu(): void {
    this.showColumnMenu = !this.showColumnMenu;
  }

  toggleColumn(key: string): void {
    const column = this.columns.find(c => c.key === key);
    if (column) {
      column.visible = !column.visible;
    }
  }

  isColumnVisible(key: string): boolean {
    return this.columns.find(c => c.key === key)?.visible ?? true;
  }

  getGridTemplateColumns(): string {
    const visibleColumns = this.columns.filter(c => c.visible);
    return visibleColumns.map(c => c.width || '1fr').join(' ');
  }

  // === ROW EXPANSION ===

  toggleRowExpand(id: number): void {
    this.expandedRowId = this.expandedRowId === id ? null : id;
  }

  isRowExpanded(id: number): boolean {
    return this.expandedRowId === id;
  }

  // === ROW SELECTION ===

  toggleRowSelection(id: number): void {
    if (this.selectedRows.has(id)) {
      this.selectedRows.delete(id);
    } else {
      this.selectedRows.add(id);
    }
    this.updateSelectAllState();
    this.cdr.markForCheck();
  }

  isRowSelected(id: number): boolean {
    return this.selectedRows.has(id);
  }

  toggleSelectAll(): void {
    if (this.selectAllChecked) {
      this.selectedRows.clear();
    } else {
      this.logs.forEach(log => this.selectedRows.add(log.id));
    }
    this.selectAllChecked = !this.selectAllChecked;
    this.cdr.markForCheck();
  }

  private updateSelectAllState(): void {
    this.selectAllChecked = this.logs.length > 0 &&
      this.logs.every(log => this.selectedRows.has(log.id));
  }

  clearSelection(): void {
    this.selectedRows.clear();
    this.selectAllChecked = false;
    this.cdr.markForCheck();
  }

  getSelectedLogs(): ActivityLog[] {
    return this.allLogs.filter(log => this.selectedRows.has(log.id));
  }

  // === EXPORT ===

  openExportModal(): void {
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  exportLogs(): void {
    this.isExporting = true;
    const logsToExport = this.selectedRows.size > 0
      ? this.getSelectedLogs()
      : this.allLogs;

    setTimeout(() => {
      this.logsService.exportLogs(logsToExport, this.exportFormat);
      this.isExporting = false;
      this.showExportModal = false;
      this.cdr.markForCheck();
    }, 500);
  }

  // === THEME & VIEW ===

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
  }

  toggleDensity(): void {
    this.viewDensity = this.viewDensity === 'comfortable' ? 'compact' : 'comfortable';
  }

  toggleCharts(): void {
    this.showCharts = !this.showCharts;
  }

  // === KEYBOARD NAVIGATION ===

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    // Ignore if typing in input
    if ((event.target as HTMLElement).tagName === 'INPUT') {
      if (event.key === 'Escape') {
        (event.target as HTMLElement).blur();
      }
      return;
    }

    switch (event.key) {
      case '/':
        event.preventDefault();
        document.getElementById('search-input')?.focus();
        break;
      case 'j':
        this.navigateRow(1);
        break;
      case 'k':
        this.navigateRow(-1);
        break;
      case 'Enter':
        if (this.focusedRowIndex >= 0 && this.logs[this.focusedRowIndex]) {
          this.toggleRowExpand(this.logs[this.focusedRowIndex].id);
        }
        break;
      case 'x':
        if (this.focusedRowIndex >= 0 && this.logs[this.focusedRowIndex]) {
          this.toggleRowSelection(this.logs[this.focusedRowIndex].id);
        }
        break;
      case 'Escape':
        this.expandedRowId = null;
        this.showColumnMenu = false;
        this.showFilters = false;
        this.showExportModal = false;
        this.cdr.markForCheck();
        break;
    }
  }

  private navigateRow(direction: number): void {
    const newIndex = this.focusedRowIndex + direction;
    if (newIndex >= 0 && newIndex < this.logs.length) {
      this.focusedRowIndex = newIndex;
      this.cdr.markForCheck();
    }
  }

  isFocusedRow(index: number): boolean {
    return this.focusedRowIndex === index;
  }

  // === EXISTING METHODS (UPDATED) ===

  refreshLogs(): void {
    this.isRefreshing = true;
    this.loadLogs();
  }

  toggleLiveMode(): void {
    this.isLiveMode = !this.isLiveMode;

    if (this.isLiveMode) {
      this.startLiveStream();
    } else {
      this.stopLiveStream();
    }
  }

  private startLiveStream(): void {
    interval(this.liveInterval)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (!this.isLiveMode) return of(null);
          return this.logsService.getAllLogs(1000).pipe(
            catchError(() => of(null))
          );
        })
      )
      .subscribe((logs) => {
        if (logs && this.isLiveMode) {
          this.allLogs = logs;
          this.applyFiltersAndSort();
          this.calculateStatistics();
          this.cdr.markForCheck();
        }
      });
  }

  private stopLiveStream(): void {
    // Live stream stops when isLiveMode becomes false
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.applyFiltersAndSort();
      this.cdr.markForCheck();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.applyFiltersAndSort();
      this.cdr.markForCheck();
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.applyFiltersAndSort();
      this.cdr.markForCheck();
    }
  }

  copyToClipboard(text: string, fieldId: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedField = fieldId;
      setTimeout(() => {
        this.copiedField = null;
        this.cdr.markForCheck();
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  getActionBadgeClass(action: string): string {
    const actionUpper = action.toUpperCase();

    if (actionUpper.includes('LOGIN')) {
      return actionUpper.includes('FAILED') ? 'badge-danger' : 'badge-login';
    }
    if (actionUpper.includes('CREATE') || actionUpper.includes('POST') || actionUpper.includes('REGISTER')) {
      return 'badge-create';
    }
    if (actionUpper.includes('UPDATE') || actionUpper.includes('PUT') || actionUpper.includes('EDIT')) {
      return 'badge-update';
    }
    if (actionUpper.includes('DELETE') || actionUpper.includes('REMOVE')) {
      return 'badge-delete';
    }
    if (actionUpper.includes('LOGOUT')) {
      return 'badge-logout';
    }
    return 'badge-default';
  }

  getActionIcon(action: string): string {
    const actionUpper = action.toUpperCase();

    if (actionUpper.includes('LOGIN')) return 'log-in';
    if (actionUpper.includes('LOGOUT')) return 'log-out';
    if (actionUpper.includes('CREATE') || actionUpper.includes('POST') || actionUpper.includes('REGISTER')) return 'plus-circle';
    if (actionUpper.includes('UPDATE') || actionUpper.includes('PUT') || actionUpper.includes('EDIT')) return 'edit-3';
    if (actionUpper.includes('DELETE') || actionUpper.includes('REMOVE')) return 'trash-2';
    return 'activity';
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return this.formatTimestamp(timestamp);
  }

  formatActionName(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  trackByLogId(index: number, log: ActivityLog): number {
    return log.id;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);

    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }

    for (let i = start; i < end; i++) {
      pages.push(i);
    }

    return pages;
  }

  retryLoad(): void {
    this.loadLogs();
  }
}
