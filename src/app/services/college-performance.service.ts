import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CollegeInfo {
    id: number;
    collegeName: string;
    city: string;
    country: string;
    admissionManagerName?: string;
    universityCoordinatorName?: string;
}

export interface StatsOverview {
    totalStudents: number;
    activePipeline: number;
    visaSuccessRate: number;
    avgProcessingDays: number;
    conversionRate: number;
    newRegistrationsInPeriod: number;
    visaStampedInPeriod: number;
    rejectedInPeriod: number;
    completedInPeriod: number;
    totalStudentsTrend?: number;
    activePipelineTrend?: number;
    visaSuccessRateTrend?: number;
    avgProcessingDaysTrend?: number;
}

export interface PipelineStage {
    stageName: string;
    stageKey: string;
    count: number;
    percentage: number;
    dropOffRate?: number;
}

export interface StudentPipeline {
    stages: PipelineStage[];
    totalStudents: number;
    rejectedCount: number;
}

export interface EntityMetrics {
    entityId: number;
    entityName: string;
    role: string;
    status?: string;
    studentsHandled?: number;
    studentsInProgress?: number;
    studentsCompleted?: number;
    avgProcessingDays?: number;
    successRate?: number;
}

export interface EntityPerformance {
    admissionManager?: EntityMetrics;
    universityCoordinator?: EntityMetrics;
    telexMen?: EntityMetrics[];
    visaMen?: EntityMetrics[];
    docPerson?: EntityMetrics;
    accountant?: EntityMetrics;
}

export interface TimeSeriesDataPoint {
    date: string;
    newRegistrations: number;
    admissionLettersGenerated: number;
    telexIssued: number;
    visaStamped: number;
    rejected: number;
}

export interface TimeSeries {
    granularity: string;
    dateFrom: string;
    dateTo: string;
    data: TimeSeriesDataPoint[];
}

export interface RecentActivity {
    activityId: number;
    studentId: number;
    studentName: string;
    applicationId: string;
    previousStatus?: string;
    newStatus: string;
    updatedBy: string;
    updatedAt: string;
    remarks?: string;
}

export interface Alert {
    alertType: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    message: string;
    affectedCount: number;
    referenceId?: number;
    referenceName?: string;
    detectedAt?: string;
}

export interface DashboardMetadata {
    generatedAt: string;
    dateFrom: string;
    dateTo: string;
}

export interface CollegePerformanceDashboard {
    collegeInfo: CollegeInfo;
    statsOverview: StatsOverview;
    studentPipeline: StudentPipeline;
    entityPerformance: EntityPerformance;
    timeSeries: TimeSeries;
    recentActivities: RecentActivity[];
    alerts: Alert[];
    metadata: DashboardMetadata;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({ providedIn: 'root' })
export class CollegePerformanceService {
    private apiUrl = `${environment.apiUrl}/api/college-performance`;

    constructor(private http: HttpClient) { }

    getAllColleges(): Observable<CollegeInfo[]> {
        return this.http.get<CollegeInfo[]>(`${this.apiUrl}/colleges`);
    }

    getDashboard(collegeId: number, dateFrom?: string, dateTo?: string): Observable<CollegePerformanceDashboard> {
        let params = new HttpParams();
        if (dateFrom) params = params.set('dateFrom', dateFrom);
        if (dateTo) params = params.set('dateTo', dateTo);
        return this.http.get<CollegePerformanceDashboard>(`${this.apiUrl}/${collegeId}`, { params });
    }

    getDashboardWithPreset(collegeId: number, preset: string): Observable<CollegePerformanceDashboard> {
        return this.http.get<CollegePerformanceDashboard>(`${this.apiUrl}/${collegeId}/preset/${preset}`);
    }
}

