// ===== SYSTEM OVERVIEW =====
export interface SystemOverview {
    totalStudents: number;
    totalAgents: number;
    totalAdmissionManagers: number;
    totalUniversityCoordinators: number;
    totalDocPersons: number;
    totalAccountants: number;
    totalTelexPersons: number;
    totalVisaPersons: number;
    activeStudentsToday: number;
    newRegistrationsThisWeek: number;
    visaStampedThisMonth: number;
}

// ===== ROLE SUMMARIES =====
export interface AgentSummary {
    totalStudents: number;
    pendingApplications: number;
    visaApproved: number;
    rejected: number;
}

export interface AdmissionManagerSummary {
    newApplications: number;
    pendingUniversityAction: number;
    admissionLettersGenerated: number;
}

export interface UniversityCoordinatorSummary {
    pendingAdmissions: number;
    admittedStudents: number;
}

export interface DocPersonSummary {
    pendingDocVerification: number;
    docsReceived: number;
    docsReturned: number;
}

export interface AccountantSummary {
    pendingPayments: number;
    paymentsReceived: number;
    totalAmountCollected: number;
}

export interface TelexPersonSummary {
    pendingTelex: number;
    submittedToUniversity: number;
    submittedToMEA: number;
    telexIssued: number;
}

export interface VisaPersonSummary {
    pendingVisaFee: number;
    passportSubmitted: number;
    visaApplied: number;
    visaStamped: number;
}

export interface RoleSummaries {
    agent: AgentSummary;
    admissionManager: AdmissionManagerSummary;
    universityCoordinator: UniversityCoordinatorSummary;
    docPerson: DocPersonSummary;
    accountant: AccountantSummary;
    telexPerson: TelexPersonSummary;
    visaPerson: VisaPersonSummary;
}

// ===== STUDENT PIPELINE =====
export interface StudentPipeline {
    REGISTERED: number;
    UNDER_REVIEW: number;
    APPROVED: number;
    ADMISSION_LETTER_GENERATED: number;
    TELEX_INITIATED: number;
    TELEX_NUMBER_ISSUED: number;
    VISA_APPLIED: number;
    VISA_STAMPED: number;
    REJECTED: number;
    COMPLETED: number;
}

// ===== TIME SERIES =====
export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface TimeSeriesDataPoint {
    date: string;
    newRegistrations: number;
    visaStamped: number;
    admissionLettersGenerated: number;
    telexIssued: number;
}

export interface TimeSeries {
    granularity: Granularity;
    dateFrom: string;
    dateTo: string;
    data: TimeSeriesDataPoint[];
}

// ===== ALERTS =====
export type AlertType = 'STUCK_IN_STATUS' | 'PAYMENT_PENDING' | 'DOCS_PENDING_VERIFICATION' | 'VISA_IN_PROGRESS';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Alert {
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    count: number;
}

// ===== RECENT ACTIVITIES =====
export type ActivityAction = 'STATUS_CHANGE' | 'CURRENT_STATUS';

export interface RecentActivity {
    studentId: number;
    applicationId: string;
    studentName: string;
    action: ActivityAction;
    previousStatus: string | null;
    newStatus: string;
    timestamp: string;
    actor: string;
}

// ===== METADATA =====
export interface DashboardMetadata {
    generatedAt: string;
    filtersApplied: {
        dateFrom: string;
        dateTo: string;
        granularity: string;
    };
}

// ===== FULL RESPONSE =====
export interface AdminDashboardResponse {
    systemOverview: SystemOverview;
    roleSummaries: RoleSummaries;
    studentPipeline: StudentPipeline;
    timeSeries: TimeSeries;
    alerts: Alert[];
    recentActivities: RecentActivity[];
    metadata: DashboardMetadata;
}

// ===== FILTERS =====
export interface DashboardFilters {
    dateFrom?: string;
    dateTo?: string;
    granularity?: Granularity;
    page?: number;
    size?: number;
}

// ===== UI HELPERS =====
export interface StatCard {
    title: string;
    value: number;
    icon: string;
    color: string;
    gradient: string;
    change?: string;
    suffix?: string;
}

export interface RoleCard {
    id: string;
    title: string;
    icon: string;
    color: string;
    badge: string;
    metrics: { label: string; value: number; status: 'good' | 'warning' | 'danger' }[];
    isExpanded: boolean;
}

export interface PipelineStage {
    key: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
}
