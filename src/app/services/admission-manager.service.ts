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

    // FIX: Updated to use new endpoint that returns telex managers with student counts
    getTelexManagerUsernames(): Observable<{ username: string; studentCount: number }[]> {
        return this.http.get<{ username: string; studentCount: number }[]>(`${this.apiBaseUrl}/api/telex-man/usernames`);
    }

    // Interface for Visa Manager response (with full details)
    getVisaManagers(): Observable<{ id: number; username: string; fullName: string; status: string }[]> {
        return this.http.get<{ id: number; username: string; fullName: string; status: string }[]>(`${this.apiBaseUrl}/api/visa-man`);
    }

    // Updated to use new endpoint that returns visa managers with student counts
    getVisaManagerUsernames(): Observable<{ username: string; studentCount: number }[]> {
        return this.http.get<{ username: string; studentCount: number }[]>(`${this.apiBaseUrl}/api/visa-man/usernames`);
    }

    assignTelexManager(studentId: number, payload: any): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/telex/assign/${studentId}`, payload);
    }

    assignVisaManager(studentId: number, payload: any): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/visa/assign/${studentId}`, payload);
    }

    // --- Messaging ---

    getManagerMessages(managerId: number): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/messages/manager/${managerId}`);
    }

    getStudentMessages(studentId: number): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/messages/student/${studentId}`);
    }

    sendMessage(payload: any): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/messages/send`, payload);
    }
}