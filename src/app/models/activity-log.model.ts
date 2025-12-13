/**
 * ActivityLog Model
 * Represents a system activity log entry from the audit trail
 */
export interface ActivityLog {
    id: number;
    action: string;
    username: string;
    role: string;
    entityName: string;
    details: string;
    ipAddress: string;
    timestamp: string;
    // Extended fields for enhanced display
    userAgent?: string;
    sessionId?: string;
    requestMethod?: string;
    responseStatus?: number;
    duration?: number;
}

/**
 * Paginated Response wrapper
 * Generic interface for Spring Boot paginated responses
 */
export interface PagedActivityLogs {
    content: ActivityLog[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

/**
 * Activity Log Filter Criteria
 * Used for search and filtering operations
 */
export interface ActivityLogFilter {
    searchQuery?: string;
    startDate?: string;
    endDate?: string;
    actions?: string[];
    roles?: string[];
    username?: string;
    ipAddress?: string;
}

/**
 * Log Statistics for Charts
 */
export interface LogStatistics {
    // Activity over time (for line chart)
    activityTimeline: {
        labels: string[];
        data: number[];
    };
    // Action distribution (for donut chart)
    actionDistribution: {
        labels: string[];
        data: number[];
        colors: string[];
    };
    // Summary stats
    totalLogs: number;
    todayLogs: number;
    uniqueUsers: number;
    topActions: { action: string; count: number }[];
}

/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'json' | 'pdf';

/**
 * Column configuration for visibility toggle
 */
export interface ColumnConfig {
    key: string;
    label: string;
    visible: boolean;
    sortable: boolean;
    width?: string;
}

/**
 * Sort configuration
 */
export interface SortConfig {
    column: string | null;
    direction: 'asc' | 'desc';
}

/**
 * Date range preset
 */
export type DateRangePreset = 'today' | 'yesterday' | '7days' | '30days' | 'custom';

/**
 * Action type enum for badge styling
 */
export type ActionType =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'POST_STUDENT'
    | 'PUT_STUDENT'
    | 'DELETE_STUDENT'
    | 'POST_AGENT'
    | 'PUT_AGENT'
    | 'DELETE_AGENT'
    | string;

/**
 * Available action types for filtering
 */
export const ACTION_TYPES = [
    { value: 'LOGIN_SUCCESS', label: 'Login Success', color: '#3b82f6' },
    { value: 'LOGIN_FAILED', label: 'Login Failed', color: '#ef4444' },
    { value: 'LOGOUT', label: 'Logout', color: '#8b5cf6' },
    { value: 'CREATE', label: 'Create', color: '#10b981' },
    { value: 'UPDATE', label: 'Update', color: '#f59e0b' },
    { value: 'DELETE', label: 'Delete', color: '#ef4444' },
    { value: 'POST_STUDENT', label: 'Add Student', color: '#10b981' },
    { value: 'PUT_STUDENT', label: 'Update Student', color: '#f59e0b' },
    { value: 'DELETE_STUDENT', label: 'Delete Student', color: '#ef4444' },
    { value: 'POST_AGENT', label: 'Add Agent', color: '#10b981' },
    { value: 'PUT_AGENT', label: 'Update Agent', color: '#f59e0b' },
    { value: 'DELETE_AGENT', label: 'Delete Agent', color: '#ef4444' }
];

/**
 * Available roles for filtering
 */
export const ROLE_TYPES = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'AGENT', label: 'Agent' },
    { value: 'ADMISSION_MANAGER', label: 'Admission Manager' },
    { value: 'STUDENT', label: 'Student' }
];
