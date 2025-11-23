import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AdmissionManagerService {
    private apiBaseUrl = 'http://localhost:8080';

    constructor(private http: HttpClient) { }

    getManagerDetails(username: string): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/managers/userName/${username}`);
    }

    getDashboardStats(username: string): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/managers/dashboard/stats/${username}`);
    }

    // --- Status Actions ---

    forwardToUniversity(studentId: number, payload: any): Observable<any> {
        // FIX: Changed from /api/admission-manager to /api/managers
        return this.http.post(`${this.apiBaseUrl}/api/managers/forward-student/${studentId}`, payload);
    }

    approveAdmissionLetter(studentId: number, payload: any): Observable<any> {
        // FIX: Changed from /api/admission-manager to /api/managers
        return this.http.post(`${this.apiBaseUrl}/api/managers/approve-admission-letter/${studentId}`, payload);
    }

    // --- Telex & Visa Manager Assignment ---

    // FIX: Changed return type and extract username from response
    getTelexManagerUsernames(): Observable<string[]> {
        return this.http.get<{ username: string }>(`${this.apiBaseUrl}/api/telex-man/username-only`)
            .pipe(map(response => [response.username])); // Return as array with single username
    }

    getVisaManagerUsernames(): Observable<string[]> {
        return this.http.get<{ username: string }>(`${this.apiBaseUrl}/api/visa-man/username-only`)
            .pipe(map(response => [response.username])); // Return as array with single username
    }

    assignTelexManager(studentId: number, payload: any): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/telex/assign/${studentId}`, payload);
    }

    assignVisaManager(studentId: number, payload: any): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/visa/assign/${studentId}`, payload);
    }
}