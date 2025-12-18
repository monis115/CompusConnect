import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {
    CollegePerformanceService,
    CollegeInfo,
    CollegePerformanceDashboard,
    PipelineStage,
    EntityMetrics,
    RecentActivity,
    Alert
} from '../../../services/college-performance.service';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface DatePreset {
    label: string;
    value: string;
    icon: string;
}

@Component({
    selector: 'app-college-performances-dashbaord',
    standalone: false,
    templateUrl: './college-performances-dashbaord.html',
    styleUrls: ['./college-performances-dashbaord.css']
})
export class CollegePerformancesDashbaord implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // State
    colleges: CollegeInfo[] = [];
    filteredColleges: CollegeInfo[] = [];
    selectedCollegeId: number | null = null;
    selectedPreset: string = '7d';
    searchQuery: string = '';
    showCollegeDropdown: boolean = false;

    // Dashboard Data
    dashboard: CollegePerformanceDashboard | null = null;

    // Loading States
    isLoadingColleges: boolean = true;
    isLoadingDashboard: boolean = false;
    isRefreshing: boolean = false;

    // UI States
    expandedAlerts: Set<string> = new Set();

    // Date Presets
    datePresets: DatePreset[] = [
        { label: 'Today', value: 'today', icon: 'calendar-clock' },
        { label: '7 Days', value: '7d', icon: 'calendar' },
        { label: '90 Days', value: '90d', icon: 'calendar' },
        { label: 'This Month', value: 'thisMonth', icon: 'calendar-check' },
        { label: 'This Year', value: 'thisYear', icon: 'calendar-clock' }
    ];

    // Chart Configurations
    lineChartData: ChartData<'line'> = {
        labels: [],
        datasets: []
    };

    lineChartOptions: ChartConfiguration<'line'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                    font: { family: 'Inter, sans-serif', size: 11 },
                    padding: 15,
                    usePointStyle: true
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 15, 35, 0.95)',
                titleColor: '#fff',
                bodyColor: 'rgba(255, 255, 255, 0.8)',
                borderColor: 'rgba(79, 140, 255, 0.3)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10 } }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10 } },
                beginAtZero: true
            }
        },
        elements: {
            line: { tension: 0.4 },
            point: { radius: 3, hoverRadius: 6 }
        }
    };

    barChartData: ChartData<'bar'> = {
        labels: [],
        datasets: []
    };

    barChartOptions: ChartConfiguration<'bar'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                    font: { family: 'Inter, sans-serif', size: 11 },
                    padding: 15,
                    usePointStyle: true
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 15, 35, 0.95)',
                titleColor: '#fff',
                bodyColor: 'rgba(255, 255, 255, 0.8)',
                borderColor: 'rgba(79, 140, 255, 0.3)',
                borderWidth: 1,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10 } }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10 } },
                beginAtZero: true
            }
        }
    };

    // Pipeline stage colors
    stageColors: { [key: string]: string } = {
        'REGISTERED': '#4f8cff',
        'ADMISSION_LETTER': '#9b5de5',
        'TELEX': '#00d68f',
        'VISA_APPLIED': '#ffaa00',
        'VISA_STAMPED': '#00d68f'
    };

    constructor(
        private performanceService: CollegePerformanceService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadColleges();
        this.setupAutoRefresh();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getSelectedPresetLabel(): string {
        const preset = this.datePresets.find(p => p.value === this.selectedPreset);
        return preset ? preset.label : 'Custom Range';
    }

    // ============================================================================
    // DATA LOADING
    // ============================================================================

    loadColleges(): void {
        this.isLoadingColleges = true;
        this.performanceService.getAllColleges().subscribe({
            next: (colleges) => {
                this.colleges = colleges;
                this.filteredColleges = colleges;
                this.isLoadingColleges = false;

                // Auto-select first college
                if (colleges.length > 0 && !this.selectedCollegeId) {
                    this.selectCollege(colleges[0]);
                }
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoadingColleges = false;
                this.cdr.detectChanges();
            }
        });
    }

    loadDashboard(): void {
        if (!this.selectedCollegeId) return;

        this.isLoadingDashboard = true;
        this.performanceService.getDashboardWithPreset(this.selectedCollegeId, this.selectedPreset).subscribe({
            next: (dashboard) => {
                this.dashboard = dashboard;
                this.updateCharts();
                this.isLoadingDashboard = false;
                this.isRefreshing = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoadingDashboard = false;
                this.isRefreshing = false;
                this.cdr.detectChanges();
            }
        });
    }

    refreshDashboard(): void {
        this.isRefreshing = true;
        this.loadDashboard();
    }

    setupAutoRefresh(): void {
        // Auto-refresh every 5 minutes
        interval(5 * 60 * 1000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                if (this.selectedCollegeId) {
                    this.refreshDashboard();
                }
            });
    }

    // ============================================================================
    // COLLEGE SELECTION
    // ============================================================================

    selectCollege(college: CollegeInfo): void {
        this.selectedCollegeId = college.id;
        this.showCollegeDropdown = false;
        this.searchQuery = '';
        this.loadDashboard();
    }

    filterColleges(): void {
        const query = this.searchQuery.toLowerCase().trim();
        if (!query) {
            this.filteredColleges = this.colleges;
        } else {
            this.filteredColleges = this.colleges.filter(c =>
                c.collegeName.toLowerCase().includes(query) ||
                c.city.toLowerCase().includes(query) ||
                c.country.toLowerCase().includes(query)
            );
        }
    }

    toggleCollegeDropdown(): void {
        this.showCollegeDropdown = !this.showCollegeDropdown;
        if (this.showCollegeDropdown) {
            this.filteredColleges = this.colleges;
            this.searchQuery = '';
        }
    }

    closeDropdown(): void {
        this.showCollegeDropdown = false;
    }

    getSelectedCollege(): CollegeInfo | null {
        return this.colleges.find(c => c.id === this.selectedCollegeId) || null;
    }

    // ============================================================================
    // DATE PRESET HANDLING
    // ============================================================================

    selectPreset(preset: string): void {
        this.selectedPreset = preset;
        this.loadDashboard();
    }

    // ============================================================================
    // CHART UPDATES
    // ============================================================================

    updateCharts(): void {
        if (!this.dashboard?.timeSeries?.data) return;

        const data = this.dashboard.timeSeries.data;
        const labels = data.map(d => this.formatChartDate(d.date));

        // Line Chart - Registrations & Visa Stamped Trend
        this.lineChartData = {
            labels,
            datasets: [
                {
                    label: 'New Registrations',
                    data: data.map(d => d.newRegistrations),
                    borderColor: '#4f8cff',
                    backgroundColor: 'rgba(79, 140, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Visa Stamped',
                    data: data.map(d => d.visaStamped),
                    borderColor: '#00d68f',
                    backgroundColor: 'rgba(0, 214, 143, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        // Bar Chart - Status Transitions
        this.barChartData = {
            labels: labels.filter((_, i) => i % 3 === 0), // Every 3rd label
            datasets: [
                {
                    label: 'Admission Letters',
                    data: data.filter((_, i) => i % 3 === 0).map(d => d.admissionLettersGenerated),
                    backgroundColor: 'rgba(155, 93, 229, 0.8)',
                    borderColor: '#9b5de5',
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: 'Telex Issued',
                    data: data.filter((_, i) => i % 3 === 0).map(d => d.telexIssued),
                    backgroundColor: 'rgba(0, 214, 143, 0.8)',
                    borderColor: '#00d68f',
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: 'Rejected',
                    data: data.filter((_, i) => i % 3 === 0).map(d => d.rejected),
                    backgroundColor: 'rgba(255, 61, 113, 0.8)',
                    borderColor: '#ff3d71',
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        };
    }

    formatChartDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ============================================================================
    // TREND HELPERS
    // ============================================================================

    getTrendDirection(trend: number | undefined | null): 'up' | 'down' | 'stable' {
        if (trend === undefined || trend === null || trend === 0) return 'stable';
        return trend > 0 ? 'up' : 'down';
    }

    getTrendClass(trend: number | undefined | null, inverse: boolean = false): string {
        const direction = this.getTrendDirection(trend);
        if (direction === 'stable') return 'trend-stable';
        if (inverse) {
            return direction === 'up' ? 'trend-down' : 'trend-up';
        }
        return direction === 'up' ? 'trend-up' : 'trend-down';
    }

    formatTrend(trend: number | undefined | null): string {
        if (trend === undefined || trend === null) return '0%';
        const sign = trend > 0 ? '+' : '';
        return `${sign}${trend.toFixed(1)}%`;
    }

    // ============================================================================
    // PIPELINE HELPERS
    // ============================================================================

    getPipelineWidth(stage: PipelineStage): string {
        return `${stage.percentage}%`;
    }

    getStageColor(stageKey: string): string {
        return this.stageColors[stageKey] || '#4f8cff';
    }

    getStageGradient(stageKey: string): string {
        const color = this.getStageColor(stageKey);
        return `linear-gradient(90deg, ${color} 0%, ${this.adjustColorBrightness(color, 20)} 100%)`;
    }

    adjustColorBrightness(hex: string, percent: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // ============================================================================
    // ENTITY HELPERS
    // ============================================================================

    getEntityIcon(role: string): string {
        const icons: { [key: string]: string } = {
            'Admission Manager': 'clipboard-list',
            'University Coordinator': 'building-2',
            'Telex Handler': 'send',
            'Visa Handler': 'plane',
            'Document Person': 'file-text',
            'Accountant': 'calculator'
        };
        return icons[role] || 'user';
    }

    getStatusDotClass(status: string | undefined): string {
        if (!status) return 'status-unknown';
        return status.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';
    }

    // ============================================================================
    // ACTIVITY HELPERS
    // ============================================================================

    getRelativeTime(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    getStatusIcon(status: string): string {
        const icons: { [key: string]: string } = {
            'REGISTERED': 'user-plus',
            'ADMISSION_LETTER': 'file-check',
            'TELEX': 'send',
            'VISA_APPLIED': 'file-signature',
            'VISA_STAMPED': 'check-circle',
            'REJECTED': 'x-circle'
        };
        return icons[status] || 'circle';
    }

    getStatusColor(status: string): string {
        const colors: { [key: string]: string } = {
            'REGISTERED': '#4f8cff',
            'ADMISSION_LETTER': '#9b5de5',
            'TELEX': '#00d68f',
            'VISA_APPLIED': '#ffaa00',
            'VISA_STAMPED': '#00d68f',
            'REJECTED': '#ff3d71'
        };
        return colors[status] || '#4f8cff';
    }

    formatStatus(status: string): string {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // ============================================================================
    // ALERT HELPERS
    // ============================================================================

    getSeverityClass(severity: string): string {
        return `severity-${severity.toLowerCase()}`;
    }

    getSeverityIcon(severity: string): string {
        const icons: { [key: string]: string } = {
            'HIGH': 'alert-octagon',
            'MEDIUM': 'alert-triangle',
            'LOW': 'info'
        };
        return icons[severity] || 'info';
    }

    toggleAlert(alertType: string): void {
        if (this.expandedAlerts.has(alertType)) {
            this.expandedAlerts.delete(alertType);
        } else {
            this.expandedAlerts.add(alertType);
        }
    }

    isAlertExpanded(alertType: string): boolean {
        return this.expandedAlerts.has(alertType);
    }

    // ============================================================================
    // UTILITY
    // ============================================================================

    trackByActivityId(index: number, activity: RecentActivity): number {
        return activity.activityId;
    }

    trackByAlertType(index: number, alert: Alert): string {
        return alert.alertType;
    }

    trackByStageKey(index: number, stage: PipelineStage): string {
        return stage.stageKey;
    }
}
