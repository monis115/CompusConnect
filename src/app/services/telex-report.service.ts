import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface for summary table row
export interface TelexManStats {
    id: number;
    username: string;
    fullName: string;
    status: string;
    totalStudents: number;
    docsUploaded: number;
    submittedToUniversity: number;
    submittedToMEA: number;
    telexIssued: number;
}

// Interface for activity log entries
export interface TelexActivityLogDTO {
    date: string; // YYYY-MM-DD
    count: number;
}

// Interface for detailed stats (when a manager is selected)
export interface TelexStatsDTO {
    totalStudents: number;

    // Period-based assigned students
    assignedToday: number;
    assignedMonth: number;
    assignedYear: number;
    assignedTodayTrend: number | null;
    assignedMonthTrend: number | null;
    assignedYearTrend: number | null;

    submittedDocumentsToday: number;
    submittedToUniversityToday: number;
    submittedToMEAToday: number;
    telexIssuedToday: number;

    submittedDocumentsMonth: number;
    submittedToUniversityMonth: number;
    submittedToMEAMonth: number;
    telexIssuedMonth: number;

    submittedDocumentsYear: number;
    submittedToUniversityYear: number;
    submittedToMEAYear: number;
    telexIssuedYear: number;

    // Trends
    submittedDocumentsTodayTrend: number | null;
    submittedToUniversityTodayTrend: number | null;
    submittedToMEATodayTrend: number | null;
    telexIssuedTodayTrend: number | null;

    submittedDocumentsMonthTrend: number | null;
    submittedToUniversityMonthTrend: number | null;
    submittedToMEAMonthTrend: number | null;
    telexIssuedMonthTrend: number | null;

    submittedDocumentsYearTrend: number | null;
    submittedToUniversityYearTrend: number | null;
    submittedToMEAYearTrend: number | null;
    telexIssuedYearTrend: number | null;

    activityLogs: TelexActivityLogDTO[];
}

@Injectable({
    providedIn: 'root'
})
export class TelexReportService {
    private readonly API_URL = 'http://localhost:8080/api/telex';

    constructor(private http: HttpClient) { }

    // Get all TelexMan summary stats for table (with period filter)
    getAllManagersStats(period: string = 'monthly'): Observable<TelexManStats[]> {
        return this.http.get<TelexManStats[]>(`${this.API_URL}/all-managers-stats?period=${period}`);
    }

    // Get detailed stats for a specific manager (with optional period filter)
    getTelexStats(managerUsername: string, period: string = 'monthly', date?: string): Observable<TelexStatsDTO> {
        let url = `${this.API_URL}/stats?managerUsername=${managerUsername}&period=${period}`;
        if (date) {
            url += `&date=${date}`;
        }
        return this.http.get<TelexStatsDTO>(url);
    }

    // Send report email
    sendReportEmail(managerUsername: string, email: string, period: string = 'Daily', date?: string): Observable<string> {
        const payload: any = { managerUsername, email, period };
        if (date) {
            payload.date = date;
        }
        return this.http.post<string>(`${this.API_URL}/send-report`, payload, { responseType: 'text' as 'json' });
    }
}

