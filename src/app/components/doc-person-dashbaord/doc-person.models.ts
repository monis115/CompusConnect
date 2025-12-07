// ============================================
// UNIFIED DATA MODELS FOR DOC PERSON DASHBOARD
// ============================================

/**
 * Main Student interface - unified from both component and models
 */
export interface Student {
    age: any;
    address: any;
    // Core Identity
    id: number;
    studentId?: string;
    applicationId?: string;
    firstName: string;
    lastName: string;
    fullName?: string;
    email: string;
    dob?: string;
    contactNo?: string;

    // Passport Information
    passportNo?: string;
    passportValidTill?: string;

    // Documents (URLs/Paths)
    profileImage?: string;
    profileImagePath?: string;
    passportPath?: string;
    passport?: string;
    adhaarPath?: string;
    adhaarCard?: string;
    markseetPath?: string;
    marksheet?: string;
    confirmationPagePath?: string;
    admissionLetterPathInternal?: string;
    admissionLetterPath?: string;
    admissionLetter?: string;
    conditionalLetter?: string;
    telexDocumentsPath?: string;
    telexPaymentScreenshotPath?: string;
    neetMarksheetPath?: string;
    conditionalOfferLetterPath?: string;
    ttCopyPath?: string;
    paymentConfirmationPath?: string;

    // Status & Workflow
    status: string;
    applicationStatus?: string;
    action: string;
    actionOnUser: string;
    setActionOnUser?: string;
    readyForDocReturn?: boolean;
    isTelexDocApproved?: boolean | null;
    docPersonComment?: string | null;

    // Document Delivery Tracking
    docDeliveryMethod?: 'COURIER' | 'SELF_PERSON' | string;
    courierPartner?: string;
    courierTrackingId?: string;
    selfPersonContact?: string;
    docTentativeReachDate?: string;

    // Timestamps
    createdAt?: string;
    applicationDate?: string;

    // Related Entities
    telexMan?: { fullName: string };
    visaMan?: { fullName: string };
    accountant?: { fullName: string };
    college?: { collegeName: string; city: string; country: string };
    course?: string;
    studentStatusHistory?: any[];

    // Additional Fields
    neetScore?: number;

    // UI State
    isExpanded?: boolean;
}

/**
 * Doc Person Profile
 */
export interface DocPersonProfile {
    id?: number;
    username: string;
    fullName: string;
    email: string;
    role?: string;
    contactNumber?: string;
    students?: Student[];
}

/**
 * API Response structure
 */
export interface DocPersonResponse {
    docPerson: DocPersonProfile;
    students: Student[];
}

/**
 * Verification/Approval Payload
 */
export interface VerificationPayload {
    approved: boolean;
    comment: string;
    docPersonUsername: string;
    action?: string;
    actionOnUser?: string;
}

/**
 * Pagination Configuration
 */
export interface PaginationConfig {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
}

/**
 * Filter Configuration
 */
export interface FilterConfig {
    searchQuery: string;
    statusFilter: string;
    actionFilter: string;
    dateFrom?: string;
    dateTo?: string;
}

/**
 * Error State
 */
export interface ErrorState {
    hasError: boolean;
    message: string;
    type: 'network' | 'api' | 'validation' | 'session' | null;
}

/**
 * Toast Notification
 */
export interface ToastNotification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
    show: boolean;
}

/**
 * Chart Data for Reports
 */
export interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        borderWidth?: number;
    }[];
}

/**
 * Dashboard Statistics
 */
export interface DashboardStats {
    totalStudents: number;
    pendingApproval: number;
    inPipeline: number;
    approved: number;
    rejected: number;
}
