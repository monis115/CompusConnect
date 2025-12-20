import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Output, EventEmitter, Input, ChangeDetectorRef } from '@angular/core';
import { AdmissionManagerService, AdmissionManagerReportDTO, ManagerReportStatsDTO, ReportPeriod, UniversityPersonReportDTO, UniversityPersonStatsDTO, CollegeReportDTO, CollegeStatsDTO } from '../../../services/admission-manager.service';
import { TelexReportService, TelexStatsDTO, TelexManStats } from '../../../services/telex-report.service';
import { VisaDashboardService, VisaManStatsDTO, EmailReportRequest } from '../../../services/visa-dashboard.service';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChartConfiguration, ChartData } from 'chart.js';
import { trigger, transition, style, animate, state } from '@angular/animations';

type UserType = 'ADMISSION_MANAGER' | 'UNIVERSITY_COORDINATOR' | 'UNIVERSITIES' | 'TELEX_PERSON' | 'VISA_PERSON' | 'DOC_PERSON' | 'ACCOUNTANT' | 'AGENT';

interface KpiCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  trend: number | null;  // Now using backend trend value
}

// AI Insight types
type InsightType = 'achievement' | 'warning' | 'suggestion' | 'info';

interface AIInsight {
  type: InsightType;
  icon: string;
  title: string;
  description: string;
  metric?: string;
  priority: number; // For sorting
}

interface UniversityCoordinatorSummary {
  totalStudents: number;
  lettersUploaded: number;
  conditionalOffers: number;
  pendingLetters: number;
}

@Component({
  selector: 'app-reports-generation-dashboard',
  standalone: false,
  templateUrl: './reports-generation-dashboard.html',
  styleUrls: ['./reports-generation-dashboard.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('modalAnimation', [
      state('void', style({ opacity: 0, transform: 'scale(0.95) translateY(20px)' })),
      state('*', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
      transition(':enter', [
        animate('350ms cubic-bezier(0.16, 1, 0.3, 1)')
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ])
  ]
})
export class ReportsGenerationDashboard implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // State
  isLoading = true;
  selectedUserType: UserType = 'ADMISSION_MANAGER';
  selectedTimePeriod: ReportPeriod = 'monthly';
  selectedManagerId: number | null = null;
  showDetailView = false;

  // Data
  allManagerReports: AdmissionManagerReportDTO[] = [];
  selectedManagerReport: AdmissionManagerReportDTO | null = null;

  // KPI Cards
  kpiCards: KpiCard[] = [];

  // AI-Powered Insights
  aiInsights: AIInsight[] = [];
  showInsightsPanel = true;

  // Email Report Modal State
  showEmailModal = false;
  emailAddress = '';
  isSendingEmail = false;
  emailSendSuccess = false;
  emailSendError = '';
  emailTargetType: 'single' | 'all' = 'all';

  // University Person Data
  universityPersonReport: UniversityPersonReportDTO | null = null; // Keeping for backward compatibility if needed, but primary view is now all colleges
  selectedUniversityPersonId: number = 1;

  // College/Universities Data (kept for potential future use)
  allCollegeReports: CollegeReportDTO[] = [];
  selectedCollegeReport: CollegeReportDTO | null = null;
  selectedCollegeId: number | null = null;
  showCollegeDetailView = false;

  // University Person/Coordinator Reports (Used for University Coordinators view)
  allUniversityPersonReports: UniversityPersonReportDTO[] = [];
  selectedUniversityPersonReport: UniversityPersonReportDTO | null = null;

  // Coordinator Summary Stats
  coordinatorSummaryStats: UniversityCoordinatorSummary = {
    totalStudents: 0,
    lettersUploaded: 0,
    conditionalOffers: 0,
    pendingLetters: 0
  };

  // Extended Performance Insights for Coordinators
  coordinatorPerformanceInsights = {
    topPerformer: null as UniversityPersonReportDTO | null,
    avgEfficiency: 0,
    processingRate: 0,
    activeCoordinators: 0,
    performanceGrade: 'N/A' as string,
    bestUniversity: '' as string,
    avgLettersPerCoordinator: 0,
    completionTrend: 0 as number | null
  };

  // Telex Person Data - Table and Detail View
  allTelexManagers: TelexManStats[] = [];
  selectedTelexManager: TelexManStats | null = null;
  telexStats: TelexStatsDTO | null = null;
  telexActivityChartData: ChartData<'line'> | null = null;
  telexDistributionChartData: ChartData<'doughnut'> | null = null;
  showTelexDetailView = false;

  // Telex Summary Analytics
  telexSummaryAnalytics = {
    totalStudents: 0,
    totalDocsUploaded: 0,
    totalSubmittedToUniversity: 0,
    totalSubmittedToMEA: 0,
    totalTelexIssued: 0,
    completionRate: 0,
    avgEfficiency: 0,
    activeManagers: 0,
    inactiveManagers: 0,
    topPerformer: null as TelexManStats | null,
    lowPerformer: null as TelexManStats | null
  };
  telexManagerComparisonChartData: ChartData<'bar'> | null = null;
  telexPipelineChartData: ChartData<'bar'> | null = null;

  // Visa Manager Data
  visaStats: VisaManStatsDTO | null = null;
  visaFunnelChartData: ChartData<'bar'> | null = null;
  visaPieChartData: ChartData<'doughnut'> | null = null;
  allVisaManagers: VisaManStatsDTO[] = [];
  selectedVisaManager: VisaManStatsDTO | null = null;
  showVisaDetailView = false;


  // User Types for tabs
  userTypes: { key: UserType; label: string; icon: string }[] = [
    { key: 'ADMISSION_MANAGER', label: 'Admission Managers', icon: 'user-check' },
    { key: 'UNIVERSITY_COORDINATOR', label: 'University Coordinators', icon: 'school' },
    { key: 'TELEX_PERSON', label: 'Telex Personnel', icon: 'send' },
    { key: 'VISA_PERSON', label: 'Visa Personnel', icon: 'plane' },
    { key: 'DOC_PERSON', label: 'Doc Personnel', icon: 'file-check' },
    { key: 'ACCOUNTANT', label: 'Accountants', icon: 'credit-card' },
    { key: 'AGENT', label: 'Agents', icon: 'users' }
  ];

  timePeriods: { key: ReportPeriod; label: string; icon: string }[] = [
    { key: 'yearly', label: 'Yearly', icon: 'calendar' },
    { key: 'monthly', label: 'Monthly', icon: 'calendar-days' },
    { key: 'daily', label: 'Daily', icon: 'calendar-clock' }
  ];

  // Charts
  donutChartData: ChartData<'doughnut'> | null = null;
  donutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Inter' } } }
    },
    elements: { arc: { borderWidth: 0 } },
    cutout: '75%'
  };

  barChartData: ChartData<'bar'> | null = null;
  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Inter' } }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Inter' } }
      }
    }
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Inter' } }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Inter' } }
      }
    },
    elements: {
      line: { tension: 0.4 }
    }
  };

  constructor(
    private admissionManagerService: AdmissionManagerService,
    private telexReportService: TelexReportService,
    private visaDashboardService: VisaDashboardService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (this.isOpen) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When modal opens (isOpen changes to true), load data for the current user type
    if (changes['isOpen'] && changes['isOpen'].currentValue === true && !changes['isOpen'].firstChange) {
      // Reset to initial state
      this.showDetailView = false;
      this.showCollegeDetailView = false;
      this.selectedManagerId = null;
      this.selectedManagerReport = null;
      this.selectedCollegeReport = null;
      this.selectedCollegeId = null;

      // Load data based on selected user type
      if (this.selectedUserType === 'ADMISSION_MANAGER') {
        this.loadData();
      } else if (this.selectedUserType === 'UNIVERSITY_COORDINATOR') {
        this.loadCollegesData();
      } else if (this.selectedUserType === 'TELEX_PERSON') {
        this.loadTelexData();
      } else if (this.selectedUserType === 'VISA_PERSON') {
        this.loadVisaData();
      }
    }
  }

  // Common Methods --------------------------

  close(): void {
    this.closeModal.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }

  loadData(): void {
    this.isLoading = true;
    this.allManagerReports = []; // Clear first
    this.cdr.detectChanges(); // Force UI to show loading state immediately

    // Call API with selected period
    this.admissionManagerService.getAllManagerReports(this.selectedTimePeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reports) => {
          this.allManagerReports = reports || [];
          this.isLoading = false;

          // Update selected manager's data if in detail view
          if (this.showDetailView && this.selectedManagerId !== null) {
            this.selectedManagerReport = this.allManagerReports.find(
              m => m.managerId === this.selectedManagerId
            ) || null;
          }

          this.updateKpiCards();
          this.updateCharts();
          this.cdr.detectChanges(); // Force UI update after data loads

          // Force additional change detection cycle
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        },
        error: (err) => {
          console.error('Failed to load reports:', err);
          this.allManagerReports = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  selectUserType(type: UserType): void {
    this.selectedUserType = type;
    this.showDetailView = false;
    this.selectedManagerId = null;
    this.selectedManagerReport = null;
    this.cdr.detectChanges();

    if (type === 'ADMISSION_MANAGER') {
      this.universityPersonReport = null;
      this.allCollegeReports = [];
      this.loadData();
    } else if (type === 'UNIVERSITY_COORDINATOR') {
      this.allManagerReports = [];
      this.universityPersonReport = null;
      this.loadCollegesData(); // Load ALL colleges for Coordinator view
    } else if (type === 'TELEX_PERSON') {
      this.allManagerReports = [];
      this.universityPersonReport = null;
      this.allCollegeReports = [];
      this.loadTelexData();
    } else if (type === 'VISA_PERSON') {
      this.allManagerReports = [];
      this.universityPersonReport = null;
      this.allCollegeReports = [];
      this.allTelexManagers = [];
      this.loadVisaData();
    } else {
      // Other user types - clear data and show empty state
      this.allManagerReports = [];
      this.universityPersonReport = null;
      this.allCollegeReports = [];
      this.updateKpiCards();
      this.updateCharts();
    }
  }

  selectTimePeriod(period: ReportPeriod): void {
    if (this.selectedTimePeriod === period) return; // Prevent reload if same tab
    this.selectedTimePeriod = period;
    this.cdr.detectChanges();

    // Fetch fresh data for the new period based on selected user type
    if (this.selectedUserType === 'ADMISSION_MANAGER') {
      this.loadData();
    } else if (this.selectedUserType === 'UNIVERSITY_COORDINATOR') {
      this.loadCollegesData();
    } else if (this.selectedUserType === 'TELEX_PERSON') {
      // If in detail view, reload that specific manager's stats
      if (this.showTelexDetailView && this.selectedTelexManager) {
        this.selectTelexManager(this.selectedTelexManager);  // Reload detail with new period
      } else {
        this.loadTelexData();  // Reload list
      }
    } else if (this.selectedUserType === 'VISA_PERSON') {
      this.loadVisaData();
    }
  }

  // Load University Coordinators/Persons data (Used for University Coordinators Dashboard)
  loadCollegesData(): void {
    this.isLoading = true;
    this.showCollegeDetailView = false;
    this.allUniversityPersonReports = []; // Clear first
    this.cdr.detectChanges();

    this.admissionManagerService.getAllUniversityPersonReports(this.selectedTimePeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reports) => {
          this.allUniversityPersonReports = reports || [];
          this.isLoading = false;
          this.calculateCoordinatorSummaryStats();
          this.updateCoordinatorCharts(); // Generate charts from all data
          this.cdr.detectChanges();

          // Force additional change detection cycle
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        },
        error: (err) => {
          console.error('Failed to load university person reports:', err);
          this.allUniversityPersonReports = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Calculate summary stats for coordinators metrics
  private calculateCoordinatorSummaryStats(): void {
    const coordinators = this.allUniversityPersonReports;
    if (!coordinators.length) {
      this.coordinatorSummaryStats = { totalStudents: 0, lettersUploaded: 0, conditionalOffers: 0, pendingLetters: 0 };
      this.resetPerformanceInsights();
      return;
    }

    // Basic summary stats
    this.coordinatorSummaryStats = {
      totalStudents: coordinators.reduce((sum, c) => sum + c.periodStats.totalStudents, 0),
      lettersUploaded: coordinators.reduce((sum, c) => sum + c.periodStats.lettersUploaded, 0),
      conditionalOffers: coordinators.reduce((sum, c) => sum + c.periodStats.conditionalOffersUploaded, 0),
      pendingLetters: coordinators.reduce((sum, c) => sum + c.periodStats.pendingLetters, 0)
    };

    // Calculate extended performance insights
    this.calculatePerformanceInsights(coordinators);
  }

  private resetPerformanceInsights(): void {
    this.coordinatorPerformanceInsights = {
      topPerformer: null,
      avgEfficiency: 0,
      processingRate: 0,
      activeCoordinators: 0,
      performanceGrade: 'N/A',
      bestUniversity: '',
      avgLettersPerCoordinator: 0,
      completionTrend: null
    };
  }

  private calculatePerformanceInsights(coordinators: UniversityPersonReportDTO[]): void {
    // Find top performer (highest efficiency with meaningful activity)
    const activeCoordinators = coordinators.filter(c => c.periodStats.totalStudents > 0);
    const topPerformer = activeCoordinators.length > 0
      ? activeCoordinators.reduce((best, c) =>
        c.periodStats.efficiencyRate > (best?.periodStats.efficiencyRate || 0) ? c : best
      )
      : null;

    // Calculate average efficiency
    const avgEfficiency = activeCoordinators.length > 0
      ? activeCoordinators.reduce((sum, c) => sum + c.periodStats.efficiencyRate, 0) / activeCoordinators.length
      : 0;

    // Calculate processing rate (letters + conditional / total students)
    const totalProcessed = this.coordinatorSummaryStats.lettersUploaded + this.coordinatorSummaryStats.conditionalOffers;
    const processingRate = this.coordinatorSummaryStats.totalStudents > 0
      ? (totalProcessed / this.coordinatorSummaryStats.totalStudents) * 100
      : 0;

    // Determine performance grade
    const performanceGrade = this.getPerformanceGrade(avgEfficiency);

    // Average letters per active coordinator
    const avgLettersPerCoordinator = activeCoordinators.length > 0
      ? this.coordinatorSummaryStats.lettersUploaded / activeCoordinators.length
      : 0;

    // Calculate average trend from all coordinators
    const trendsWithValues = coordinators
      .map(c => c.periodStats.lettersUploadedTrend)
      .filter(t => t !== null) as number[];
    const completionTrend = trendsWithValues.length > 0
      ? trendsWithValues.reduce((sum, t) => sum + t, 0) / trendsWithValues.length
      : null;

    this.coordinatorPerformanceInsights = {
      topPerformer,
      avgEfficiency: Math.round(avgEfficiency * 10) / 10,
      processingRate: Math.round(processingRate * 10) / 10,
      activeCoordinators: activeCoordinators.length,
      performanceGrade,
      bestUniversity: topPerformer?.collegeName || 'N/A',
      avgLettersPerCoordinator: Math.round(avgLettersPerCoordinator * 10) / 10,
      completionTrend: completionTrend !== null ? Math.round(completionTrend * 10) / 10 : null
    };
  }

  private getPerformanceGrade(avgEfficiency: number): string {
    if (avgEfficiency >= 90) return 'A+';
    if (avgEfficiency >= 80) return 'A';
    if (avgEfficiency >= 70) return 'B+';
    if (avgEfficiency >= 60) return 'B';
    if (avgEfficiency >= 50) return 'C';
    if (avgEfficiency >= 40) return 'D';
    return 'F';
  }

  // Generate charts for University Coordinators dashboard
  private updateCoordinatorCharts(): void {
    if (!this.allUniversityPersonReports.length) {
      this.donutChartData = null;
      this.barChartData = null;
      return;
    }

    const summary = this.coordinatorSummaryStats;

    // Donut Chart: Aggregate Letters vs Conditional vs Pending
    this.donutChartData = {
      labels: ['Letters Uploaded', 'Conditional Offers', 'Pending'],
      datasets: [{
        data: [summary.lettersUploaded, summary.conditionalOffers, summary.pendingLetters],
        backgroundColor: [
          'rgba(34, 197, 94, 0.85)',   // Green - Letters
          'rgba(139, 92, 246, 0.85)',  // Purple - Conditional
          'rgba(251, 146, 60, 0.85)'   // Orange - Pending
        ],
        borderWidth: 0,
        hoverOffset: 8
      }]
    };

    // Bar Chart: University Coordinator Comparison (Top 7 for readability)
    const topCoordinators = this.allUniversityPersonReports.slice(0, 7);

    this.barChartData = {
      labels: topCoordinators.map(c => c.collegeName.split(' ')[0]), // Shorten names
      datasets: [
        {
          label: 'Letters Uploaded',
          data: topCoordinators.map(c => c.periodStats.lettersUploaded),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderRadius: 4
        },
        {
          label: 'Conditional Offers',
          data: topCoordinators.map(c => c.periodStats.conditionalOffersUploaded),
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
          borderRadius: 4
        },
        {
          label: 'Pending',
          data: topCoordinators.map(c => c.periodStats.pendingLetters),
          backgroundColor: 'rgba(251, 146, 60, 0.8)',
          borderRadius: 4
        }
      ]
    };
  }

  // Select a college for detail view
  selectCollege(college: CollegeReportDTO): void {
    this.selectedCollegeId = college.collegeId;
    this.selectedCollegeReport = college;
    this.showCollegeDetailView = true;
    this.cdr.detectChanges();
  }

  // Select a university person/coordinator for detail view
  selectUniversityPerson(coordinator: UniversityPersonReportDTO): void {
    this.selectedUniversityPersonReport = coordinator;
    this.selectedUniversityPersonId = coordinator.id;
    this.showCollegeDetailView = true;
    this.cdr.detectChanges();
  }

  backToCollegesList(): void {
    this.showCollegeDetailView = false;
    this.selectedCollegeReport = null;
    this.selectedCollegeId = null;
    this.selectedUniversityPersonReport = null;
  }

  // Get efficiency class for color coding
  getCollegeEfficiencyClass(rate: number): string {
    if (rate >= 70) return 'efficiency-high';
    if (rate >= 40) return 'efficiency-medium';
    return 'efficiency-low';
  }

  // Get efficiency class for university coordinator color coding
  getCoordinatorEfficiencyClass(rate: number): string {
    if (rate >= 70) return 'efficiency-high';
    if (rate >= 40) return 'efficiency-medium';
    return 'efficiency-low';
  }

  // Load University Person data
  loadUniversityPersonData(): void {
    this.isLoading = true;
    this.universityPersonReport = null; // Clear first
    this.kpiCards = []; // Clear KPIs
    this.cdr.detectChanges();

    this.admissionManagerService.getUniversityPersonReport(this.selectedUniversityPersonId, this.selectedTimePeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.universityPersonReport = report;
          this.isLoading = false;
          this.updateKpiCardsForUniversityPerson();
          this.updateChartsForUniversityPerson();
          this.cdr.detectChanges();

          // Force additional change detection cycle
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        },
        error: (err) => {
          console.error('Failed to load university person report:', err);
          this.universityPersonReport = null;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Load Telex Data - Summary Table
  loadTelexData(): void {
    this.isLoading = true;
    this.allTelexManagers = [];
    this.selectedTelexManager = null;
    this.telexStats = null;
    this.showTelexDetailView = false;
    this.cdr.detectChanges();

    this.telexReportService.getAllManagersStats(this.selectedTimePeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (managers) => {
          this.allTelexManagers = managers || [];
          this.calculateTelexSummaryAnalytics();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load Telex managers:', err);
          this.allTelexManagers = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Select a TelexMan from the table to view details
  selectTelexManager(manager: TelexManStats): void {
    this.selectedTelexManager = manager;
    this.showTelexDetailView = true;
    this.isLoading = true;
    this.telexStats = null;
    this.cdr.detectChanges();

    this.telexReportService.getTelexStats(manager.username, this.selectedTimePeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.telexStats = stats;
          this.isLoading = false;
          this.updateTelexCharts();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load Telex manager details:', err);
          this.telexStats = null;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Back to TelexMan summary table
  backToTelexList(): void {
    this.showTelexDetailView = false;
    this.selectedTelexManager = null;
    this.telexStats = null;
    this.telexActivityChartData = null;
    this.telexDistributionChartData = null;
    this.cdr.detectChanges();
  }

  private updateTelexCharts(): void {
    if (!this.telexStats) return;

    // 1. Activity Trend (Line Chart)
    const logs = this.telexStats.activityLogs || [];
    // Sort logs by date
    logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    this.telexActivityChartData = {
      labels: logs.map(l => l.date),
      datasets: [{
        label: 'Daily Activity',
        data: logs.map(l => l.count),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#f59e0b',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };

    // 2. Distribution (Doughnut) - Based on selected time period
    let submitted = 0, toUni = 0, toMEA = 0, issued = 0;
    if (this.selectedTimePeriod === 'daily') {
      submitted = this.telexStats.submittedDocumentsToday;
      toUni = this.telexStats.submittedToUniversityToday;
      toMEA = this.telexStats.submittedToMEAToday;
      issued = this.telexStats.telexIssuedToday;
    } else if (this.selectedTimePeriod === 'monthly') {
      submitted = this.telexStats.submittedDocumentsMonth;
      toUni = this.telexStats.submittedToUniversityMonth;
      toMEA = this.telexStats.submittedToMEAMonth;
      issued = this.telexStats.telexIssuedMonth;
    } else {
      submitted = this.telexStats.submittedDocumentsYear;
      toUni = this.telexStats.submittedToUniversityYear;
      toMEA = this.telexStats.submittedToMEAYear;
      issued = this.telexStats.telexIssuedYear;
    }

    this.telexDistributionChartData = {
      labels: ['Docs Uploaded', 'To University', 'To MEA', 'Telex Issued'],
      datasets: [{
        data: [submitted, toUni, toMEA, issued],
        backgroundColor: [
          '#3b82f6', // Blue
          '#8b5cf6', // Violet
          '#ec4899', // Pink
          '#10b981'  // Emerald
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }

  sendTelexReport(): void {
    if (!this.selectedTelexManager) return;
    this.showEmailModal = true;
    this.emailTargetType = 'single';
  }

  // Calculate Telex Summary Analytics
  private calculateTelexSummaryAnalytics(): void {
    const managers = this.allTelexManagers;
    if (!managers.length) return;

    // Aggregate totals
    const totals = managers.reduce((acc, m) => ({
      students: acc.students + m.totalStudents,
      docs: acc.docs + m.docsUploaded,
      toUni: acc.toUni + m.submittedToUniversity,
      toMEA: acc.toMEA + m.submittedToMEA,
      issued: acc.issued + m.telexIssued
    }), { students: 0, docs: 0, toUni: 0, toMEA: 0, issued: 0 });

    // Completion rate = Telex Issued / Total Students
    const completionRate = totals.students > 0
      ? Math.round((totals.issued / totals.students) * 100)
      : 0;

    // Efficiency = Telex Issued / Docs Uploaded (how much gets through)
    const avgEfficiency = totals.docs > 0
      ? Math.round((totals.issued / totals.docs) * 100)
      : 0;

    // Active/Inactive counts
    const activeManagers = managers.filter(m => m.status === 'Active').length;
    const inactiveManagers = managers.length - activeManagers;

    // Top Performer (highest telexIssued)
    const sortedByPerformance = [...managers].sort((a, b) => b.telexIssued - a.telexIssued);
    const topPerformer = sortedByPerformance[0] || null;
    const lowPerformer = sortedByPerformance[sortedByPerformance.length - 1] || null;

    this.telexSummaryAnalytics = {
      totalStudents: totals.students,
      totalDocsUploaded: totals.docs,
      totalSubmittedToUniversity: totals.toUni,
      totalSubmittedToMEA: totals.toMEA,
      totalTelexIssued: totals.issued,
      completionRate,
      avgEfficiency,
      activeManagers,
      inactiveManagers,
      topPerformer,
      lowPerformer
    };

    // Manager Comparison Bar Chart (sorted by telexIssued desc)
    const sortedManagers = [...managers].sort((a, b) => b.telexIssued - a.telexIssued);
    this.telexManagerComparisonChartData = {
      labels: sortedManagers.map(m => m.fullName.split(' ')[0]), // First name only
      datasets: [{
        label: 'Telex Issued',
        data: sortedManagers.map(m => m.telexIssued),
        backgroundColor: sortedManagers.map((m, i) =>
          i === 0 ? '#10b981' : (m.status === 'Active' ? '#3b82f6' : '#6b7280')
        ),
        borderRadius: 8,
        barThickness: 28
      }]
    };

    // Pipeline Funnel Chart
    this.telexPipelineChartData = {
      labels: ['Students', 'Docs Uploaded', 'To University', 'To MEA', 'Telex Issued'],
      datasets: [{
        label: 'Pipeline',
        data: [totals.students, totals.docs, totals.toUni, totals.toMEA, totals.issued],
        backgroundColor: [
          '#f59e0b',
          '#3b82f6',
          '#8b5cf6',
          '#ec4899',
          '#10b981'
        ],
        borderRadius: 6,
        barThickness: 32
      }]
    };
  }

  // ==================================================================================
  // VISA MANAGER LOGIC
  // ==================================================================================

  updateVisaCharts(stats?: VisaManStatsDTO): void {
    if (stats) this.visaStats = stats;
    if (!this.visaStats) return;

    // Funnel Chart
    this.visaFunnelChartData = {
      labels: ['Assigned', 'Payment Req', 'Visa Applied', 'Stamped'],
      datasets: [
        {
          label: 'Processing Funnel',
          data: [
            this.visaStats.totalAssignedStudents,
            this.visaStats.paymentRequested,
            this.visaStats.visaApplied,
            this.visaStats.visaStamped
          ],
          backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'],
          borderRadius: 6,
          barThickness: 40
        }
      ]
    };

    // Breakdown Pie Chart
    this.visaPieChartData = {
      labels: ['Payment Confirmed', 'Passport Collected', 'Embassy Submitted', 'Passport Returned'],
      datasets: [
        {
          data: [
            this.visaStats.paymentConfirmed,
            this.visaStats.passportCollected,
            this.visaStats.embassySubmitted,
            this.visaStats.passportReturned
          ],
          backgroundColor: ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899'],
          hoverOffset: 4,
          borderWidth: 0
        }
      ]
    };
  }

  sendVisaReport(): void {
    this.showEmailModal = true;
    this.emailTargetType = 'single'; // Or 'all' if we support bulk
  }

  selectManager(manager: AdmissionManagerReportDTO): void {
    this.selectedManagerId = manager.managerId;
    this.selectedManagerReport = manager;
    this.showDetailView = true;
    this.updateKpiCards();
    this.updateCharts();
  }

  backToOverview(): void {
    this.showDetailView = false;
    this.selectedManagerId = null;
    this.selectedManagerReport = null;
    this.updateKpiCards();
    this.updateCharts();
  }

  private getAggregatedStats(): ManagerReportStatsDTO {
    // Aggregate all managers' periodStats
    const aggregated: ManagerReportStatsDTO = {
      forwardedToUniversity: 0,
      forwardedToUniversityTrend: null,
      admissionLettersApproved: 0,
      admissionLettersApprovedTrend: null,
      telexManagersAssigned: 0,
      telexManagersAssignedTrend: null,
      visaManagersAssigned: 0,
      visaManagersAssignedTrend: null
    };

    let fwdTrendCount = 0, apprTrendCount = 0, telexTrendCount = 0, visaTrendCount = 0;
    let fwdTrendSum = 0, apprTrendSum = 0, telexTrendSum = 0, visaTrendSum = 0;

    this.allManagerReports.forEach(m => {
      const s = m.periodStats;
      aggregated.forwardedToUniversity += s.forwardedToUniversity;
      aggregated.admissionLettersApproved += s.admissionLettersApproved;
      aggregated.telexManagersAssigned += s.telexManagersAssigned;
      aggregated.visaManagersAssigned += s.visaManagersAssigned;

      // Aggregate trends (average of non-null trends)
      if (s.forwardedToUniversityTrend !== null) { fwdTrendSum += s.forwardedToUniversityTrend; fwdTrendCount++; }
      if (s.admissionLettersApprovedTrend !== null) { apprTrendSum += s.admissionLettersApprovedTrend; apprTrendCount++; }
      if (s.telexManagersAssignedTrend !== null) { telexTrendSum += s.telexManagersAssignedTrend; telexTrendCount++; }
      if (s.visaManagersAssignedTrend !== null) { visaTrendSum += s.visaManagersAssignedTrend; visaTrendCount++; }
    });

    // Calculate average trends
    aggregated.forwardedToUniversityTrend = fwdTrendCount > 0 ? Math.round((fwdTrendSum / fwdTrendCount) * 10) / 10 : null;
    aggregated.admissionLettersApprovedTrend = apprTrendCount > 0 ? Math.round((apprTrendSum / apprTrendCount) * 10) / 10 : null;
    aggregated.telexManagersAssignedTrend = telexTrendCount > 0 ? Math.round((telexTrendSum / telexTrendCount) * 10) / 10 : null;
    aggregated.visaManagersAssignedTrend = visaTrendCount > 0 ? Math.round((visaTrendSum / visaTrendCount) * 10) / 10 : null;

    return aggregated;
  }

  private getCurrentStats(): ManagerReportStatsDTO {
    if (this.selectedManagerReport) {
      return this.selectedManagerReport.periodStats;
    }
    return this.getAggregatedStats();
  }

  private updateKpiCards(): void {
    const stats = this.getCurrentStats();

    this.kpiCards = [
      {
        label: 'Forwarded to University',
        value: stats.forwardedToUniversity,
        icon: 'send',
        color: '#f59e0b',
        trend: stats.forwardedToUniversityTrend
      },
      {
        label: 'Letters Approved',
        value: stats.admissionLettersApproved,
        icon: 'check-circle',
        color: '#22c55e',
        trend: stats.admissionLettersApprovedTrend
      },
      {
        label: 'Telex Assigned',
        value: stats.telexManagersAssigned,
        icon: 'mail',
        color: '#fb923c',
        trend: stats.telexManagersAssignedTrend
      },
      {
        label: 'Visa Assigned',
        value: stats.visaManagersAssigned,
        icon: 'plane',
        color: '#a78bfa',
        trend: stats.visaManagersAssignedTrend
      }
    ];

    // Generate AI insights based on current data
    this.generateAIInsights();
  }

  private updateCharts(): void {
    const stats = this.getCurrentStats();

    // Donut Chart - Warm palette
    this.donutChartData = {
      labels: ['Forwarded', 'Approved', 'Telex', 'Visa'],
      datasets: [{
        data: [
          stats.forwardedToUniversity,
          stats.admissionLettersApproved,
          stats.telexManagersAssigned,
          stats.visaManagersAssigned
        ],
        backgroundColor: [
          'rgba(245, 158, 11, 0.85)',
          'rgba(34, 197, 94, 0.85)',
          'rgba(251, 146, 60, 0.85)',
          'rgba(167, 139, 250, 0.85)'
        ],
        borderColor: 'transparent',
        borderWidth: 0,
        hoverOffset: 10
      }]
    };

    // Bar Chart - Show aggregated data for each manager
    this.updateBarChartData();
  }

  private updateBarChartData(): void {
    if (!this.allManagerReports.length) return;

    // For overview, show top managers; for detail view, show single manager breakdown
    if (this.showDetailView && this.selectedManagerReport) {
      // Single manager breakdown by metric
      const s = this.selectedManagerReport.periodStats;
      this.barChartData = {
        labels: ['Forwarded', 'Approved', 'Telex', 'Visa'],
        datasets: [{
          label: this.selectedManagerReport.managerName,
          data: [s.forwardedToUniversity, s.admissionLettersApproved, s.telexManagersAssigned, s.visaManagersAssigned],
          backgroundColor: [
            'rgba(245, 158, 11, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(167, 139, 250, 0.8)'
          ],
          borderRadius: 8
        }]
      };
    } else {
      // Overview - show top 6 managers comparison
      const topManagers = [...this.allManagerReports]
        .sort((a, b) => this.getTotalActions(b) - this.getTotalActions(a))
        .slice(0, 6);

      this.barChartData = {
        labels: topManagers.map(m => m.managerName.split(' ')[0]),
        datasets: [
          {
            label: 'Forwarded',
            data: topManagers.map(m => m.periodStats.forwardedToUniversity),
            backgroundColor: 'rgba(245, 158, 11, 0.8)',
            borderRadius: 8
          },
          {
            label: 'Approved',
            data: topManagers.map(m => m.periodStats.admissionLettersApproved),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderRadius: 8
          }
        ]
      };
    }
  }

  getTotalActions(manager: AdmissionManagerReportDTO): number {
    const s = manager.periodStats;
    return s.forwardedToUniversity + s.admissionLettersApproved + s.telexManagersAssigned + s.visaManagersAssigned;
  }

  getEfficiencyScore(manager: AdmissionManagerReportDTO): number {
    const s = manager.periodStats;
    if (s.forwardedToUniversity === 0) return 0;
    return Math.round((s.admissionLettersApproved / s.forwardedToUniversity) * 100);
  }

  getMaxTotalActions(): number {
    if (!this.allManagerReports.length) return 1;
    return Math.max(...this.allManagerReports.map(m => this.getTotalActions(m)));
  }

  getProgressWidth(manager: AdmissionManagerReportDTO): number {
    return (this.getTotalActions(manager) / this.getMaxTotalActions()) * 100;
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  formatTrend(trend: number | null): string {
    if (trend === null) return 'N/A';
    return (trend >= 0 ? '+' : '') + trend + '%';
  }

  getTrendClass(trend: number | null): string {
    if (trend === null) return 'neutral';
    return trend >= 0 ? 'positive' : 'negative';
  }

  toggleInsightsPanel(): void {
    this.showInsightsPanel = !this.showInsightsPanel;
  }

  // ============================================================================
  // AI-POWERED INSIGHTS GENERATOR
  // ============================================================================

  private generateAIInsights(): void {
    const insights: AIInsight[] = [];
    const stats = this.getCurrentStats();
    const managers = this.allManagerReports;

    if (!managers.length) {
      this.aiInsights = [];
      return;
    }

    // Calculate key metrics
    const totalForwarded = stats.forwardedToUniversity;
    const totalApproved = stats.admissionLettersApproved;
    const overallEfficiency = totalForwarded > 0 ? Math.round((totalApproved / totalForwarded) * 100) : 0;
    const avgEfficiency = managers.reduce((sum, m) => sum + this.getEfficiencyScore(m), 0) / managers.length;
    const topPerformer = managers.reduce((best, m) =>
      this.getTotalActions(m) > this.getTotalActions(best) ? m : best, managers[0]);
    const lowPerformers = managers.filter(m => this.getEfficiencyScore(m) < 50);
    const highPerformers = managers.filter(m => this.getEfficiencyScore(m) >= 80);
    const zeroActivityManagers = managers.filter(m => this.getTotalActions(m) === 0);

    // 🏆 Achievement: High overall efficiency
    if (overallEfficiency >= 75) {
      insights.push({
        type: 'achievement',
        icon: 'trophy',
        title: 'Excellent Approval Rate!',
        description: `Team is converting ${overallEfficiency}% of forwarded applications to approvals. Outstanding performance!`,
        metric: `${overallEfficiency}%`,
        priority: 1
      });
    }

    // 🌟 Achievement: Top performer recognition
    if (topPerformer && this.getTotalActions(topPerformer) > 50) {
      insights.push({
        type: 'achievement',
        icon: 'star',
        title: `Star Performer: ${topPerformer.managerName}`,
        description: `Leading with ${this.getTotalActions(topPerformer)} total actions and ${this.getEfficiencyScore(topPerformer)}% efficiency this period.`,
        metric: `#1`,
        priority: 2
      });
    }

    // 🎯 Achievement: Multiple high performers
    if (highPerformers.length >= 3) {
      insights.push({
        type: 'achievement',
        icon: 'users',
        title: 'Strong Team Performance',
        description: `${highPerformers.length} managers maintaining 80%+ efficiency. Great teamwork!`,
        metric: `${highPerformers.length} stars`,
        priority: 3
      });
    }

    // ⚠️ Warning: Low performers need attention
    if (lowPerformers.length > 0 && lowPerformers.length <= 3) {
      insights.push({
        type: 'warning',
        icon: 'alert-triangle',
        title: 'Attention Needed',
        description: `${lowPerformers.length} manager(s) below 50% efficiency. Consider providing additional training or support.`,
        metric: `${lowPerformers.length}`,
        priority: 4
      });
    }

    // 🚨 Warning: Inactive managers
    if (zeroActivityManagers.length > 0) {
      insights.push({
        type: 'warning',
        icon: 'user-x',
        title: 'Inactive Managers Detected',
        description: `${zeroActivityManagers.length} manager(s) have zero activity this period. Check assignments or availability.`,
        metric: `${zeroActivityManagers.length}`,
        priority: 5
      });
    }

    // 💡 Suggestion: Telex bottleneck
    if (stats.telexManagersAssigned < stats.admissionLettersApproved * 0.5) {
      insights.push({
        type: 'suggestion',
        icon: 'lightbulb',
        title: 'Telex Processing Opportunity',
        description: 'Only ' + Math.round((stats.telexManagersAssigned / (stats.admissionLettersApproved || 1)) * 100) + '% of approved letters moved to telex. Consider speeding up telex assignments.',
        priority: 6
      });
    }

    // 💡 Suggestion: Visa pipeline
    if (stats.visaManagersAssigned < stats.telexManagersAssigned * 0.7) {
      insights.push({
        type: 'suggestion',
        icon: 'zap',
        title: 'Visa Pipeline Needs Boost',
        description: 'Visa assignments lagging behind telex completions. Consider allocating more visa resources.',
        priority: 7
      });
    }

    // 📊 Info: Trend analysis
    const fwdTrend = stats.forwardedToUniversityTrend;
    if (fwdTrend !== null) {
      if (fwdTrend > 15) {
        insights.push({
          type: 'info',
          icon: 'trending-up',
          title: 'Forwarding Volume Surging',
          description: `Forwarding activity up ${fwdTrend}% compared to previous period. Ensure downstream processes can handle the volume.`,
          metric: `+${fwdTrend}%`,
          priority: 8
        });
      } else if (fwdTrend < -10) {
        insights.push({
          type: 'warning',
          icon: 'trending-down',
          title: 'Forwarding Volume Declining',
          description: `Forwarding activity down ${Math.abs(fwdTrend)}%. Investigate potential causes or seasonal patterns.`,
          metric: `${fwdTrend}%`,
          priority: 4
        });
      }
    }

    // 📈 Info: Efficiency comparison
    if (avgEfficiency >= 60 && avgEfficiency < 80) {
      insights.push({
        type: 'info',
        icon: 'target',
        title: 'Room for Improvement',
        description: `Average team efficiency is ${Math.round(avgEfficiency)}%. Target 80%+ for optimal performance.`,
        metric: `${Math.round(avgEfficiency)}%`,
        priority: 9
      });
    }

    // Sort by priority and take top 4
    this.aiInsights = insights.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }

  getInsightCardClass(type: InsightType): string {
    return `insight-card ${type}`;
  }

  // ============================================================================
  // VISA MANAGER METHODS
  // ============================================================================

  loadVisaData(): void {
    if (this.isLoading) return;
    this.isLoading = true;

    // ForkJoin to get both Global Stats and List of Managers
    forkJoin({
      globalStats: this.visaDashboardService.getStats(this.selectedTimePeriod),
      allManagers: this.visaDashboardService.getAllVisaManagers(this.selectedTimePeriod)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ globalStats, allManagers }) => {
          this.visaStats = globalStats;
          this.allVisaManagers = allManagers || [];
          this.updateVisaCharts(globalStats);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load Visa data', err);
          this.isLoading = false;
          // this.toastr.error('Could not load Visa Dashboard data'); // Toastr removed
        }
      });
  }

  selectVisaManager(manager: VisaManStatsDTO): void {
    this.selectedVisaManager = manager;
    this.showVisaDetailView = true;
    this.isLoading = true;

    // Fetch specific stats for this manager
    this.visaDashboardService.getStats(this.selectedTimePeriod, manager.visaManagerUsername)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.selectedVisaManager = stats;
          this.visaStats = stats; // Temporarily show this manager's stats in the main view area
          this.updateVisaCharts(stats);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load specific manager stats', err);
          this.isLoading = false;
        }
      });
  }

  backToVisaList(): void {
    this.showVisaDetailView = false;
    this.selectedVisaManager = null;
    this.loadVisaData(); // Reload global stats
  }

  // ============================================================================
  // EMAIL REPORT METHODS
  // ============================================================================

  openEmailModal(targetType: 'single' | 'all' = 'all'): void {
    this.emailTargetType = targetType;
    this.emailAddress = '';
    this.isSendingEmail = false;
    this.emailSendSuccess = false;
    this.emailSendError = '';
    this.showEmailModal = true;
    this.cdr.detectChanges();
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.emailAddress = '';
    this.isSendingEmail = false;
    this.emailSendSuccess = false;
    this.emailSendError = '';
  }

  sendReportEmail(): void {
    if (!this.emailAddress || !this.isValidEmail(this.emailAddress)) {
      this.emailSendError = 'Please enter a valid email address';
      return;
    }

    this.isSendingEmail = true;
    this.emailSendError = '';
    this.emailSendSuccess = false;
    this.cdr.detectChanges();

    let request$;

    if (this.selectedUserType === 'UNIVERSITY_COORDINATOR') {
      request$ = this.admissionManagerService.sendAllUniversityPersonReportsEmail(
        this.selectedTimePeriod,
        this.emailAddress
      );
    } else if (this.selectedUserType === 'TELEX_PERSON') {
      // Send Telex Report for selected manager
      const managerUsername = this.selectedTelexManager?.username || 'admin';
      // Format period to Title Case (daily -> Daily)
      const period = this.selectedTimePeriod.charAt(0).toUpperCase() + this.selectedTimePeriod.slice(1);
      request$ = this.telexReportService.sendReportEmail(managerUsername, this.emailAddress, period);
    } else if (this.selectedUserType === 'VISA_PERSON') {
      const request: EmailReportRequest = {
        period: this.selectedTimePeriod.toUpperCase() as any,
        targetEmail: this.emailAddress,
        username: this.showVisaDetailView && this.selectedVisaManager ? this.selectedVisaManager.visaManagerUsername : undefined
      };
      request$ = this.visaDashboardService.sendEmailReport(request);
    } else {
      // Default to Admission Manager logic
      request$ = this.emailTargetType === 'single' && this.selectedManagerId
        ? this.admissionManagerService.sendManagerReportEmail(
          this.selectedManagerId,
          this.selectedTimePeriod,
          this.emailAddress
        )
        : this.admissionManagerService.sendAllManagersReportEmail(
          this.selectedTimePeriod,
          this.emailAddress
        );
    }

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSendingEmail = false;
        this.emailSendSuccess = true;
        this.cdr.detectChanges();

        // Auto-close after 3 seconds on success
        setTimeout(() => {
          if (this.emailSendSuccess) {
            this.closeEmailModal();
          }
        }, 3000);
      },
      error: (err) => {
        this.isSendingEmail = false;
        this.emailSendError = err.error?.message || 'Failed to send report. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ============================================================================
  // UNIVERSITY PERSON SPECIFIC METHODS
  // ============================================================================

  private updateKpiCardsForUniversityPerson(): void {
    if (!this.universityPersonReport) {
      this.kpiCards = [];
      return;
    }

    const stats = this.universityPersonReport.periodStats;

    this.kpiCards = [
      {
        label: 'Total Students',
        value: stats.totalStudents,
        icon: 'users',
        color: '#a78bfa', // Purple
        trend: null // No trend for total
      },
      {
        label: 'Letters Uploaded',
        value: stats.lettersUploaded,
        icon: 'file-text',
        color: '#22c55e', // Green
        trend: stats.lettersUploadedTrend
      },
      {
        label: 'Conditional Offers',
        value: stats.conditionalOffersUploaded,
        icon: 'file-check',
        color: '#8b5cf6', // Purple
        trend: stats.conditionalOffersTrend
      },
      {
        label: 'Pending Letters',
        value: stats.pendingLetters,
        icon: 'clock',
        color: '#f59e0b', // Orange warning
        trend: null // No trend for pending
      }
    ];
  }

  private updateChartsForUniversityPerson(): void {
    if (!this.universityPersonReport) {
      this.donutChartData = null;
      this.barChartData = null;
      return;
    }

    const stats = this.universityPersonReport.periodStats;

    // Donut Chart - Letters vs Pending with purple theme
    this.donutChartData = {
      labels: ['Letters Uploaded', 'Conditional Offers', 'Pending'],
      datasets: [{
        data: [
          stats.lettersUploaded,
          stats.conditionalOffersUploaded,
          stats.pendingLetters
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.85)',   // Green - Letters
          'rgba(139, 92, 246, 0.85)',  // Purple - Conditional
          'rgba(251, 146, 60, 0.85)'   // Orange - Pending
        ],
        borderWidth: 0,
        hoverOffset: 8
      }]
    };

    // Bar chart - Single coordinator stats
    this.barChartData = {
      labels: ['Letters', 'Conditional', 'Pending'],
      datasets: [
        {
          label: this.universityPersonReport.collegeName,
          data: [stats.lettersUploaded, stats.conditionalOffersUploaded, stats.pendingLetters],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(251, 146, 60, 0.8)'
          ],
          borderRadius: 8
        }
      ]
    };
  }

  getEfficiencyColor(): string {
    if (!this.universityPersonReport) return 'neutral';
    const rate = this.universityPersonReport.periodStats.efficiencyRate;
    if (rate >= 70) return 'high';
    if (rate >= 40) return 'medium';
    return 'low';
  }

  // Telex Helpers
  getTelexMetric(metricBase: 'assigned' | 'submittedDocuments' | 'submittedToUniversity' | 'submittedToMEA' | 'telexIssued'): number {
    if (!this.telexStats) return 0;
    let suffix = 'Year';
    if (this.selectedTimePeriod === 'daily') suffix = 'Today';
    else if (this.selectedTimePeriod === 'monthly') suffix = 'Month';

    const key = `${metricBase}${suffix}` as keyof TelexStatsDTO;
    return (this.telexStats[key] as number) || 0;
  }

  getTelexTrend(metricBase: 'assigned' | 'submittedDocuments' | 'submittedToUniversity' | 'submittedToMEA' | 'telexIssued'): number | null {
    if (!this.telexStats) return null;
    let suffix = 'Year';
    if (this.selectedTimePeriod === 'daily') suffix = 'Today';
    else if (this.selectedTimePeriod === 'monthly') suffix = 'Month';

    const key = `${metricBase}${suffix}Trend` as keyof TelexStatsDTO;
    return (this.telexStats[key] as number) ?? null;
  }

  // Send UP report email
  sendUniversityPersonReportEmail(): void {
    if (!this.emailAddress || !this.isValidEmail(this.emailAddress)) {
      this.emailSendError = 'Please enter a valid email address';
      return;
    }

    this.isSendingEmail = true;
    this.emailSendError = '';
    this.emailSendSuccess = false;
    this.cdr.detectChanges();

    this.admissionManagerService.sendUniversityPersonReportEmail(
      this.selectedUniversityPersonId,
      this.selectedTimePeriod,
      this.emailAddress
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSendingEmail = false;
        this.emailSendSuccess = true;
        this.cdr.detectChanges();

        setTimeout(() => {
          if (this.emailSendSuccess) {
            this.closeEmailModal();
          }
        }, 3000);
      },
      error: (err) => {
        this.isSendingEmail = false;
        this.emailSendError = err.error?.message || 'Failed to send report. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}
