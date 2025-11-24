import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStats {
    totalStudents: number;
    admittedStudents: number;
    pendingApplications: number;
    rejectedStudents: number;
}

export interface StatusBreakdown {
    status: string;
    count: number;
}

export interface AdmittedStudent {
    id: number;
    applicationId: string;
    fullName: string;
    passportNumber: string;
    courseName: string;
    status: string;
    admissionDate: string;
}

@Injectable({
    providedIn: 'root'
})
export class UniversityService {
    private baseUrl = 'http://localhost:8080/api/universityPerson';

    constructor(private http: HttpClient) { }

    getDashboardStats(username: string): Observable<DashboardStats> {
        return this.http.get<DashboardStats>(`${this.baseUrl}/${username}/dashboard/stats`);
    }

    getStatusBreakdown(username: string): Observable<StatusBreakdown[]> {
        return this.http.get<StatusBreakdown[]>(`${this.baseUrl}/${username}/dashboard/status-breakdown`);
    }

    getAdmittedStudents(username: string): Observable<AdmittedStudent[]> {
        return this.http.get<AdmittedStudent[]>(`${this.baseUrl}/${username}/dashboard/admitted-students`);
    }
}
