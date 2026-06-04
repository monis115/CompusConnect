
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class VisaService {
    private baseUrl = `${environment.apiUrl}/api/visa`;

    constructor(private http: HttpClient) { }

    applyForVisa(studentId: number, managerUsername: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/apply/${studentId}`, { managerUsername });
    }

    // 1. Collect Passport (Physical Collection)
    collectPassport(studentId: number, managerUsername: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/collect-passport/${studentId}`, { managerUsername });
    }

    // 3. Submit to Embassy
    submitToEmbassy(studentId: number, managerUsername: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/passport-submitted/${studentId}`, { managerUsername });
    }

    // 4. Mark Visa Stamped
    markVisaStamped(studentId: number, managerUsername: string, visaNumber?: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/stamped/${studentId}`, { managerUsername, visaNumber });
    }

    // Return Documents to Doc Person (Post-Stamping)
    returnDocsToDocPerson(studentId: number, username: string): Observable<any> {
        // Controller uses @RequestParam for username
        return this.http.post(`${this.baseUrl}/return-docs/${studentId}?username=${username}`, {});
    }

    // Get Passbooks
    getPassbooks(username: string): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiUrl}/api/visa-man/passbook/${username}`);
    }
}
