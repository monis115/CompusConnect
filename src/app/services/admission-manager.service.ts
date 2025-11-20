import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AdmissionManagerService {
    private apiBaseUrl = 'http://localhost:8080';

    constructor(private http: HttpClient) { }

    getManagerDetails(username: string): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/managers/userName/${username}`);
    }

    getPendingStudents(username: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiBaseUrl}/api/managers/students/registered-or-under-review/${username}`);
    }

    getApprovedStudents(username: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiBaseUrl}/api/managers/approved-students/${username}`);
    }

    forwardToUniversity(studentId: number, managerUsername: string): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/managers/forward-student/${studentId}`, { admissionManagerUsername: managerUsername });
    }

    approveAdmissionLetter(studentId: number, managerUsername: string): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/managers/approve-admission-letter/${studentId}`, { admissionManagerUsername: managerUsername });
    }

    // --- Telex & Visa Manager Assignment ---

    getTelexManager(): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/telex-man/get-one`);
    }

    getVisaManager(): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/visa-man/get-one`);
    }

    assignTelexManager(studentId: number, managerUsername: string): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/telex/assign/${studentId}`, { managerUsername });
    }

    assignVisaManager(studentId: number, managerUsername: string): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/visa/assign/${studentId}`, { managerUsername });
    }
}
