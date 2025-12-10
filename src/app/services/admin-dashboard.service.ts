import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, retry, throwError } from 'rxjs';
import {
    AdminDashboardResponse,
    SystemOverview,
    RoleSummaries,
    StudentPipeline,
    Alert,
    DashboardFilters
} from '../models/admin-dashboard.models';

@Injectable({
    providedIn: 'root'
})
export class AdminDashboardService {
    private readonly baseUrl = 'http://localhost:8080/api/admin/dashboard';

    constructor(private http: HttpClient) { }

    /**
     * Get full dashboard data with all sections
     */
    getDashboard(filters?: DashboardFilters): Observable<AdminDashboardResponse> {
        let params = new HttpParams();

        if (filters?.dateFrom) {
            params = params.set('dateFrom', filters.dateFrom);
        }
        if (filters?.dateTo) {
            params = params.set('dateTo', filters.dateTo);
        }
        if (filters?.granularity) {
            params = params.set('granularity', filters.granularity);
        }
        if (filters?.page !== undefined) {
            params = params.set('page', filters.page.toString());
        }
        if (filters?.size !== undefined) {
            params = params.set('size', filters.size.toString());
        }

        return this.http.get<AdminDashboardResponse>(this.baseUrl, { params }).pipe(
            retry(2),
            catchError(this.handleError)
        );
    }

    /**
     * Get quick system overview only
     */
    getOverview(): Observable<SystemOverview> {
        return this.http.get<SystemOverview>(`${this.baseUrl}/overview`).pipe(
            retry(2),
            catchError(this.handleError)
        );
    }

    /**
     * Get role summaries only
     */
    getRoleSummaries(): Observable<RoleSummaries> {
        return this.http.get<RoleSummaries>(`${this.baseUrl}/roles`).pipe(
            retry(2),
            catchError(this.handleError)
        );
    }

    /**
     * Get student status pipeline only
     */
    getPipeline(): Observable<StudentPipeline> {
        return this.http.get<StudentPipeline>(`${this.baseUrl}/pipeline`).pipe(
            retry(2),
            catchError(this.handleError)
        );
    }

    /**
     * Get system alerts only
     */
    getAlerts(): Observable<Alert[]> {
        return this.http.get<Alert[]>(`${this.baseUrl}/alerts`).pipe(
            retry(2),
            catchError(this.handleError)
        );
    }

    /**
     * Handle HTTP errors gracefully
     */
    private handleError(error: any): Observable<never> {
        let errorMessage = 'An error occurred while fetching dashboard data';

        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Error: ${error.error.message}`;
        } else {
            // Server-side error
            errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
        }

        console.error('AdminDashboardService Error:', errorMessage);
        return throwError(() => new Error(errorMessage));
    }
}
