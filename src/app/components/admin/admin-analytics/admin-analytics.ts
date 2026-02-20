import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, interval, takeUntil, switchMap, catchError, of } from 'rxjs';
import { AdminDashboardService } from '../../../services/admin-dashboard.service';
import {
  AdminDashboardResponse,
  SystemOverview,
  RoleSummaries,
  StudentPipeline,
  Alert,
  RecentActivity,
  TimeSeries,
  Granularity,
  DashboardFilters,
  StatCard,
  RoleCard,
  PipelineStage
} from '../../../models/admin-dashboard.models';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';

@Component({
  selector: 'app-admin-analytics',
  standalone: false,
  templateUrl: './admin-analytics.html',
  styleUrls: ['./admin-analytics.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerCards', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          stagger('80ms', [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class AdminAnalytics implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Loading states
  isLoading = true;
  isRefreshing = false;
  error: string | null = null;

  // Auto-refresh
  autoRefresh = false;
  private autoRefreshInterval = 5 * 60 * 1000; // 5 minutes

  // Filter states
  dateFrom: string = '';
  dateTo: string = '';
  granularity: Granularity = 'daily';

  // Dashboard data
  dashboardData: AdminDashboardResponse | null = null;
  systemOverview: SystemOverview | null = null;
  roleSummaries: RoleSummaries | null = null;
  studentPipeline: StudentPipeline | null = null;
  alerts: Alert[] = [];
  recentActivities: RecentActivity[] = [];
  timeSeries: TimeSeries | null = null;

  // UI data
  statCards: StatCard[] = [];
  roleCards: RoleCard[] = [];
  pipelineStages: PipelineStage[] = [];

  // Last refresh timestamp
  lastRefreshTime: Date | null = null;

  // Animated counters
  animatedValues: { [key: string]: number } = {};

  // Chart Configuration
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4, // Smooth curves
        borderWidth: 3,
        fill: true,
      },
      point: {
        radius: 0,
        hitRadius: 20,
        hoverRadius: 6,
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawTicks: true,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: "'Inter', sans-serif",
            size: 11
          }
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawTicks: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          padding: 10
        },
        border: {
          display: false
        },
        beginAtZero: true
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          color: '#64748b',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: 500
          },
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    }
  };
  public lineChartLegend = true;
  public lineChartType: 'line' = 'line';

  constructor(
    private dashboardService: AdminDashboardService,
    private cdr: ChangeDetectorRef
  ) {
    this.setDefaultDateRange();
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setDefaultDateRange(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.dateTo = this.formatDate(today);
    this.dateFrom = this.formatDate(thirtyDaysAgo);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.error = null;
    this.cdr.detectChanges();

    const filters: DashboardFilters = {
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      granularity: this.granularity
    };

    this.dashboardService.getDashboard(filters).pipe(
      catchError(err => {
        this.error = 'Failed to load dashboard data. Please try again.';
        this.isLoading = false;
        this.isRefreshing = false;
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe(data => {
      if (data) {
        this.dashboardData = data;
        this.systemOverview = data.systemOverview;
        this.roleSummaries = data.roleSummaries;
        this.studentPipeline = data.studentPipeline;
        this.alerts = data.alerts || [];
        this.recentActivities = data.recentActivities || [];
        this.timeSeries = data.timeSeries;

        this.buildStatCards();
        this.buildRoleCards();
        this.buildPipelineStages();
        this.setupChartData();
        this.animateCounters();

        this.lastRefreshTime = new Date();
      }
      this.isLoading = false;
      this.isRefreshing = false;
      this.cdr.detectChanges();
    });
  }

  refreshDashboard(): void {
    this.isRefreshing = true;
    this.loadDashboard();
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;

    if (this.autoRefresh) {
      interval(this.autoRefreshInterval).pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (!this.autoRefresh) return of(null);
          this.isRefreshing = true;
          this.cdr.detectChanges();
          return this.dashboardService.getDashboard({
            dateFrom: this.dateFrom,
            dateTo: this.dateTo,
            granularity: this.granularity
          });
        }),
        catchError(() => of(null))
      ).subscribe(data => {
        if (data && this.autoRefresh) {
          this.dashboardData = data;
          this.systemOverview = data.systemOverview;
          this.buildStatCards();
          this.animateCounters();
          this.lastRefreshTime = new Date();
        }
        this.isRefreshing = false;
        this.cdr.detectChanges();
      });
    }
  }

  onFilterChange(): void {
    this.loadDashboard();
  }

  private buildStatCards(): void {
    if (!this.systemOverview) return;

    this.statCards = [
      {
        title: 'Total Students',
        value: this.systemOverview.totalStudents,
        icon: 'graduation-cap',
        color: '#6366F1',
        gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
      },
      {
        title: 'Total Agents',
        value: this.systemOverview.totalAgents,
        icon: 'briefcase',
        color: '#10B981',
        gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
      },
      {
        title: 'Admission Managers',
        value: this.systemOverview.totalAdmissionManagers,
        icon: 'user-check',
        color: '#F59E0B',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
      },
      {
        title: 'University Coordinators',
        value: this.systemOverview.totalUniversityCoordinators,
        icon: 'building-2',
        color: '#3B82F6',
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'
      },
      {
        title: 'Doc Persons',
        value: this.systemOverview.totalDocPersons,
        icon: 'file-check',
        color: '#8B5CF6',
        gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
      },
      {
        title: 'Accountants',
        value: this.systemOverview.totalAccountants,
        icon: 'calculator',
        color: '#EC4899',
        gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)'
      },
      {
        title: 'Telex Persons',
        value: this.systemOverview.totalTelexPersons,
        icon: 'send',
        color: '#14B8A6',
        gradient: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)'
      },
      {
        title: 'Visa Persons',
        value: this.systemOverview.totalVisaPersons,
        icon: 'plane',
        color: '#EF4444',
        gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
      }
    ];
  }

  private buildRoleCards(): void {
    if (!this.roleSummaries) return;

    this.roleCards = [
      {
        id: 'agent',
        title: 'Agents',
        icon: 'briefcase',
        color: '#10B981',
        badge: 'Field',
        isExpanded: false,
        metrics: [
          { label: 'Total Students', value: this.roleSummaries.agent.totalStudents, status: 'good' },
          { label: 'Pending Applications', value: this.roleSummaries.agent.pendingApplications, status: this.roleSummaries.agent.pendingApplications > 10 ? 'warning' : 'good' },
          { label: 'Visa Approved', value: this.roleSummaries.agent.visaApproved, status: 'good' },
          { label: 'Rejected', value: this.roleSummaries.agent.rejected, status: this.roleSummaries.agent.rejected > 0 ? 'danger' : 'good' }
        ]
      },
      {
        id: 'admissionManager',
        title: 'Admission Managers',
        icon: 'user-check',
        color: '#F59E0B',
        badge: 'Core',
        isExpanded: false,
        metrics: [
          { label: 'New Applications', value: this.roleSummaries.admissionManager.newApplications, status: 'good' },
          { label: 'Pending University', value: this.roleSummaries.admissionManager.pendingUniversityAction, status: this.roleSummaries.admissionManager.pendingUniversityAction > 5 ? 'warning' : 'good' },
          { label: 'Letters Generated', value: this.roleSummaries.admissionManager.admissionLettersGenerated, status: 'good' }
        ]
      },
      {
        id: 'universityCoordinator',
        title: 'University Coordinators',
        icon: 'building-2',
        color: '#3B82F6',
        badge: 'Partner',
        isExpanded: false,
        metrics: [
          { label: 'Pending Admissions', value: this.roleSummaries.universityCoordinator.pendingAdmissions, status: this.roleSummaries.universityCoordinator.pendingAdmissions > 10 ? 'warning' : 'good' },
          { label: 'Admitted Students', value: this.roleSummaries.universityCoordinator.admittedStudents, status: 'good' }
        ]
      },
      {
        id: 'docPerson',
        title: 'Doc Persons',
        icon: 'file-check',
        color: '#8B5CF6',
        badge: 'Document',
        isExpanded: false,
        metrics: [
          { label: 'Pending Verification', value: this.roleSummaries.docPerson.pendingDocVerification, status: this.roleSummaries.docPerson.pendingDocVerification > 5 ? 'warning' : 'good' },
          { label: 'Docs Received', value: this.roleSummaries.docPerson.docsReceived, status: 'good' },
          { label: 'Docs Returned', value: this.roleSummaries.docPerson.docsReturned, status: 'good' }
        ]
      },
      {
        id: 'accountant',
        title: 'Accountants',
        icon: 'calculator',
        color: '#EC4899',
        badge: 'Finance',
        isExpanded: false,
        metrics: [
          { label: 'Pending Payments', value: this.roleSummaries.accountant.pendingPayments, status: this.roleSummaries.accountant.pendingPayments > 5 ? 'warning' : 'good' },
          { label: 'Payments Received', value: this.roleSummaries.accountant.paymentsReceived, status: 'good' },
          { label: 'Amount Collected', value: this.roleSummaries.accountant.totalAmountCollected, status: 'good' }
        ]
      },
      {
        id: 'telexPerson',
        title: 'Telex Persons',
        icon: 'send',
        color: '#14B8A6',
        badge: 'Communication',
        isExpanded: false,
        metrics: [
          { label: 'Pending Telex', value: this.roleSummaries.telexPerson.pendingTelex, status: this.roleSummaries.telexPerson.pendingTelex > 5 ? 'warning' : 'good' },
          { label: 'To University', value: this.roleSummaries.telexPerson.submittedToUniversity, status: 'good' },
          { label: 'To MEA', value: this.roleSummaries.telexPerson.submittedToMEA, status: 'good' },
          { label: 'Telex Issued', value: this.roleSummaries.telexPerson.telexIssued, status: 'good' }
        ]
      },
      {
        id: 'visaPerson',
        title: 'Visa Persons',
        icon: 'plane',
        color: '#EF4444',
        badge: 'Travel',
        isExpanded: false,
        metrics: [
          { label: 'Pending Visa Fee', value: this.roleSummaries.visaPerson.pendingVisaFee, status: this.roleSummaries.visaPerson.pendingVisaFee > 5 ? 'warning' : 'good' },
          { label: 'Passport Submitted', value: this.roleSummaries.visaPerson.passportSubmitted, status: 'good' },
          { label: 'Visa Applied', value: this.roleSummaries.visaPerson.visaApplied, status: 'good' },
          { label: 'Visa Stamped', value: this.roleSummaries.visaPerson.visaStamped, status: 'good' }
        ]
      }
    ];
  }

  private buildPipelineStages(): void {
    if (!this.studentPipeline) return;

    const total = Object.values(this.studentPipeline).reduce((sum, val) => sum + val, 0);

    // Custom Stage Configuration
    const stagesConfig = [
      { key: 'REGISTERED', label: 'Registered', color: '#6366F1' },
      { key: 'UNDER_REVIEW', label: 'Forwarded To Uni', color: '#8B5CF6' },
      { key: 'APPROVED', label: 'Conditional Offer Legacy', color: '#A855F7' },
      { key: 'ADMISSION_LETTER_GENERATED', label: 'Admission Letter Generated', color: '#10B981' },
      { key: 'TELEX_INITIATED', label: 'Applied For Telex', color: '#0EA5E9' },
      { key: 'TELEX_NUMBER_ISSUED', label: 'Telex Initiated', color: '#06B6D4' },
      {
        key: 'TELEX_MEA',
        label: 'Telex Application Submitted To Mea',
        color: '#3B82F6',
        customCount: this.roleSummaries?.telexPerson?.submittedToMEA || 0
      },
      { key: 'VISA_APPLIED', label: 'Visa Fee Pending', color: '#F59E0B' },
      { key: 'VISA_STAMPED', label: 'Visa Stamped', color: '#D4AF37' }
    ];

    this.pipelineStages = stagesConfig.map(config => {
      // Use custom count if provided (for MEA stage), otherwise look up in pipeline data
      const count = config.customCount !== undefined
        ? config.customCount
        : (this.studentPipeline as any)[config.key] || 0;

      return {
        key: config.key,
        label: config.label,
        count: count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: config.color
      };
    });
  }

  private setupChartData(): void {
    if (!this.timeSeries || !this.timeSeries.data) return;

    const data = this.timeSeries.data;
    const labels = data.map(d => this.formatDateLabel(d.date));

    this.lineChartData = {
      labels: labels,
      datasets: [
        {
          data: data.map(d => d.newRegistrations),
          label: 'New Registrations',
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          pointBackgroundColor: '#6366F1',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#6366F1',
          pointHoverBorderColor: '#ffffff',
        },
        {
          data: data.map(d => d.admissionLettersGenerated),
          label: 'Admission Letters Generated',
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#10B981',
          pointHoverBorderColor: '#ffffff',
        },
        {
          data: data.map(d => d.visaStamped),
          label: 'Visa Stamped',
          borderColor: '#D4AF37',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          pointBackgroundColor: '#D4AF37',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#D4AF37',
          pointHoverBorderColor: '#ffffff',
        }
      ]
    };
  }

  private formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private formatPipelineLabel(key: string): string {
    return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  toggleRoleCard(card: RoleCard): void {
    card.isExpanded = !card.isExpanded;
    this.cdr.detectChanges();
  }

  private animateCounters(): void {
    if (!this.systemOverview) return;

    const targets = {
      totalStudents: this.systemOverview.totalStudents,
      activeToday: this.systemOverview.activeStudentsToday,
      newThisWeek: this.systemOverview.newRegistrationsThisWeek,
      visaStamped: this.systemOverview.visaStampedThisMonth
    };

    Object.entries(targets).forEach(([key, target]) => {
      this.animatedValues[key] = 0;
      const increment = Math.ceil(target / 30);
      const interval = setInterval(() => {
        this.animatedValues[key] += increment;
        if (this.animatedValues[key] >= target) {
          this.animatedValues[key] = target;
          clearInterval(interval);
        }
        this.cdr.detectChanges();
      }, 30);
    });
  }

  getAlertClass(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'alert-critical';
      case 'WARNING': return 'alert-warning';
      case 'INFO': return 'alert-info';
      default: return 'alert-info';
    }
  }

  getAlertIcon(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'alert-circle';
      case 'WARNING': return 'alert-triangle';
      case 'INFO': return 'info';
      default: return 'info';
    }
  }

  getRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  getMetricStatusClass(status: string): string {
    switch (status) {
      case 'good': return 'metric-good';
      case 'warning': return 'metric-warning';
      case 'danger': return 'metric-danger';
      default: return '';
    }
  }

  getLastRefreshDisplay(): string {
    if (!this.lastRefreshTime) return 'Never';
    return this.getRelativeTime(this.lastRefreshTime.toISOString());
  }

  retryLoad(): void {
    this.loadDashboard();
  }

  trackByIndex(index: number, item?: any): number {
    return index;
  }

  trackByActivityId(index: number, activity: RecentActivity): string {
    return activity.applicationId + activity.timestamp;
  }
}
