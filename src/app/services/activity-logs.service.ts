import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, retry, throwError, map, of } from 'rxjs';
import {
    PagedActivityLogs,
    ActivityLog,
    ActivityLogFilter,
    LogStatistics,
    ExportFormat
} from '../models/activity-log.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ActivityLogsService {
    private readonly baseUrl = `${environment.apiUrl}/api/activity-logs`;

    constructor(private http: HttpClient) { }

    /**
     * Get paginated activity logs
     * @param page Page number (0-indexed)
     * @param size Number of items per page
     */
    getActivityLogs(page: number = 0, size: number = 20): Observable<PagedActivityLogs> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<PagedActivityLogs>(this.baseUrl, { params }).pipe(
            retry(2),
            catchError(this.handleError)
        );
    }

    /**
     * Get all activity logs for client-side filtering and export
     * Fetches large page for client-side operations
     */
    getAllLogs(maxSize: number = 1000): Observable<ActivityLog[]> {
        const params = new HttpParams()
            .set('page', '0')
            .set('size', maxSize.toString());

        return this.http.get<PagedActivityLogs>(this.baseUrl, { params }).pipe(
            retry(2),
            map(response => response.content),
            catchError(this.handleError)
        );
    }

    /**
     * Search and filter logs (client-side implementation)
     * Since backend may not support filtering, we fetch and filter locally
     */
    searchLogs(filter: ActivityLogFilter, page: number = 0, size: number = 20): Observable<PagedActivityLogs> {
        return this.getAllLogs().pipe(
            map(logs => this.applyFilters(logs, filter)),
            map(filteredLogs => this.paginateResults(filteredLogs, page, size))
        );
    }

    /**
     * Apply filters to logs array
     */
    private applyFilters(logs: ActivityLog[], filter: ActivityLogFilter): ActivityLog[] {
        return logs.filter(log => {
            // Search query - matches username, action, details, entity, IP
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

            // Date range filter
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

            // Action type filter
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

            // Username filter
            if (filter.username) {
                if (!log.username.toLowerCase().includes(filter.username.toLowerCase())) {
                    return false;
                }
            }

            // IP address filter
            if (filter.ipAddress) {
                if (!log.ipAddress.includes(filter.ipAddress)) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Paginate filtered results
     */
    private paginateResults(logs: ActivityLog[], page: number, size: number): PagedActivityLogs {
        const totalElements = logs.length;
        const totalPages = Math.ceil(totalElements / size);
        const start = page * size;
        const end = start + size;
        const content = logs.slice(start, end);

        return {
            content,
            totalPages,
            totalElements,
            number: page,
            size,
            first: page === 0,
            last: page >= totalPages - 1,
            empty: content.length === 0
        };
    }

    /**
     * Calculate statistics from logs for charts
     */
    calculateStatistics(logs: ActivityLog[]): LogStatistics {
        // Group by date for timeline (last 7 days)
        const now = new Date();
        const last7Days: string[] = [];
        const timelineData: number[] = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            last7Days.push(dateStr);

            const count = logs.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate.toDateString() === date.toDateString();
            }).length;
            timelineData.push(count);
        }

        // Group by action for distribution
        const actionCounts: Record<string, number> = {};
        logs.forEach(log => {
            const action = this.normalizeAction(log.action);
            actionCounts[action] = (actionCounts[action] || 0) + 1;
        });

        const sortedActions = Object.entries(actionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        const actionLabels = sortedActions.map(([action]) => action);
        const actionData = sortedActions.map(([, count]) => count);
        const actionColors = actionLabels.map(action => this.getActionColor(action));

        // Today's logs
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLogs = logs.filter(log => new Date(log.timestamp) >= today).length;

        // Unique users
        const uniqueUsers = new Set(logs.map(log => log.username)).size;

        // Top actions
        const topActions = sortedActions.map(([action, count]) => ({ action, count }));

        return {
            activityTimeline: {
                labels: last7Days,
                data: timelineData
            },
            actionDistribution: {
                labels: actionLabels,
                data: actionData,
                colors: actionColors
            },
            totalLogs: logs.length,
            todayLogs,
            uniqueUsers,
            topActions
        };
    }

    /**
     * Normalize action name for grouping
     */
    private normalizeAction(action: string): string {
        const upper = action.toUpperCase();
        if (upper.includes('LOGIN') && upper.includes('FAILED')) return 'Login Failed';
        if (upper.includes('LOGIN')) return 'Login';
        if (upper.includes('LOGOUT')) return 'Logout';
        if (upper.includes('CREATE') || upper.includes('POST')) return 'Create';
        if (upper.includes('UPDATE') || upper.includes('PUT')) return 'Update';
        if (upper.includes('DELETE') || upper.includes('REMOVE')) return 'Delete';
        return 'Other';
    }

    /**
     * Get color for action type
     */
    private getActionColor(action: string): string {
        const colors: Record<string, string> = {
            'Login': '#3b82f6',
            'Login Failed': '#ef4444',
            'Logout': '#8b5cf6',
            'Create': '#10b981',
            'Update': '#f59e0b',
            'Delete': '#ef4444',
            'Other': '#64748b'
        };
        return colors[action] || '#64748b';
    }

    /**
     * Export logs to specified format
     */
    exportLogs(logs: ActivityLog[], format: ExportFormat): void {
        switch (format) {
            case 'csv':
                this.exportToCsv(logs);
                break;
            case 'json':
                this.exportToJson(logs);
                break;
            case 'pdf':
                this.exportToPdf(logs);
                break;
        }
    }

    /**
     * Export to CSV
     */
    private exportToCsv(logs: ActivityLog[]): void {
        const headers = ['ID', 'Timestamp', 'Action', 'Username', 'Role', 'Entity', 'Details', 'IP Address'];
        const rows = logs.map(log => [
            log.id,
            log.timestamp,
            log.action,
            log.username,
            log.role,
            log.entityName || '',
            `"${(log.details || '').replace(/"/g, '""')}"`,
            log.ipAddress
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        this.downloadFile(csvContent, 'activity-logs.csv', 'text/csv');
    }

    /**
     * Export to JSON
     */
    private exportToJson(logs: ActivityLog[]): void {
        const jsonContent = JSON.stringify(logs, null, 2);
        this.downloadFile(jsonContent, 'activity-logs.json', 'application/json');
    }

    /**
     * Export to PDF (simple text-based for now)
     */
    private exportToPdf(logs: ActivityLog[]): void {
        // Create a simple HTML-based printable document
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Activity Logs Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1e3a5f; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #1e3a5f; color: white; }
                    tr:nth-child(even) { background-color: #f9fafb; }
                    .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h1>System Activity Logs Report</h1>
                <p class="meta">Generated: ${new Date().toLocaleString()} | Total Records: ${logs.length}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Action</th>
                            <th>User</th>
                            <th>Role</th>
                            <th>Entity</th>
                            <th>Details</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(log => `
                            <tr>
                                <td>${new Date(log.timestamp).toLocaleString()}</td>
                                <td>${log.action}</td>
                                <td>${log.username}</td>
                                <td>${log.role}</td>
                                <td>${log.entityName || '-'}</td>
                                <td>${log.details || '-'}</td>
                                <td>${log.ipAddress}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        // Open in new window for printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.print();
        }
    }

    /**
     * Download file helper
     */
    private downloadFile(content: string, filename: string, mimeType: string): void {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Handle HTTP errors gracefully
     */
    private handleError(error: any): Observable<never> {
        let errorMessage = 'An error occurred while fetching activity logs';

        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Error: ${error.error.message}`;
        } else {
            // Server-side error
            errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
        }

        console.error('ActivityLogsService Error:', errorMessage);
        return throwError(() => new Error(errorMessage));
    }
}
