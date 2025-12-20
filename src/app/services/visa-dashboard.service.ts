import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface VisaManStatsDTO {
    visaManagerName: string;
    visaManagerUsername: string; // Added to match likely need for ID/Username
    period: 'DAILY' | 'MONTHLY' | 'YEARLY';
    totalAssignedStudents: number;
    paymentRequested: number;
    paymentConfirmed: number;
    passportCollected: number;
    visaApplied: number;
    embassySubmitted: number;
    visaStamped: number;
    passportReturned: number;
    efficiencyRate?: number; // Optional derived or backend field
}

export interface EmailReportRequest {
    period: 'DAILY' | 'MONTHLY' | 'YEARLY';
    username?: string;
    targetEmail: string;
}

@Injectable({
    providedIn: 'root'
})
export class VisaDashboardService {
    private apiUrl = 'http://localhost:8080/api/visa';

    constructor(private http: HttpClient) { }

    getStats(period: string, visaManUsername?: string): Observable<VisaManStatsDTO> {
        let params = new HttpParams().set('period', period);
        if (visaManUsername) {
            params = params.set('visaManUsername', visaManUsername);
        }
        return this.http.get<VisaManStatsDTO>(`${this.apiUrl}/stats`, { params });
    }

    getAllVisaManagers(period: string): Observable<VisaManStatsDTO[]> {
        const params = new HttpParams().set('period', period);
        return this.http.get<VisaManStatsDTO[]>(`${this.apiUrl}/all-stats`, { params });
    }

    // Assuming there might be an endpoint to list managers or we just use stats for now.
    // If the user didn't specify a "List Managers" endpoint, we might rely on Global Stats or existing user lists.
    // For now, I'll stick to getStats.

    // Send Email Report
    sendEmailReport(data: EmailReportRequest): Observable<any> {
        return this.http.post(`${this.apiUrl}/report/email`, data, { responseType: 'text' });
    }

    // Get assigned students for a specific manager
    getAssignedStudents(username: string, period: string): Observable<any[]> {
        const params = new HttpParams()
            .set('visaManUsername', username)
            .set('period', period);
        return this.http.get<any[]>(`${this.apiUrl}/students`, { params });
    }
}
