import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocPersonStats } from './doc-person-stats.model';
import { Student } from '../components/doc-person-dashbaord/doc-person.models';
import { environment } from '../../environments/environment';

export interface DocPersonDTO {
    id: number;
    username: string;
    fullName: string;
    email: string;
    contactNumber: string;
    status: string;
}

export interface DocPersonStudentDTO {
    applicationId: string;
    fullName: string;
    collegeName: string;
    course: string;
    status: string;
    lastUpdateDate: string | null;
    lastUpdateAction: string;
}

export interface DocPersonWithStudentsDTO extends DocPersonDTO {
    studentCount: number;
    students: DocPersonStudentDTO[];
}

@Injectable({
    providedIn: 'root'
})
export class DocPersonService {
    private API_ENDPOINT = `${environment.apiUrl}/api/doc-person`;

    constructor(private http: HttpClient) { }

    // Admin Management APIs
    getAllDocPersons(): Observable<DocPersonDTO[]> {
        return this.http.get<DocPersonDTO[]>(`${this.API_ENDPOINT}/all`);
    }

    updateDocPerson(id: number, payload: Partial<DocPersonDTO>): Observable<DocPersonDTO> {
        return this.http.put<DocPersonDTO>(`${this.API_ENDPOINT}/${id}`, payload);
    }

    updateDocPersonStatus(id: number, status: string): Observable<DocPersonDTO> {
        return this.http.put<DocPersonDTO>(`${this.API_ENDPOINT}/${id}/status/${status}`, {});
    }

    getDocPersonWithStudents(id: number): Observable<DocPersonWithStudentsDTO> {
        return this.http.get<DocPersonWithStudentsDTO>(`${this.API_ENDPOINT}/${id}/with-students`);
    }

    // Stats & Reporting APIs
    getStats(username: string, period: string = 'Today'): Observable<DocPersonStats> {
        let params = new HttpParams()
            .set('username', username)
            .set('period', period);
        return this.http.get<DocPersonStats>(`${this.API_ENDPOINT}/stats`, { params });
    }

    receiveDocs(studentId: number, data: any): Observable<any> {
        return this.http.post(`${this.API_ENDPOINT}/receive-docs/${studentId}`, data);
    }

    verifyDocs(studentId: number, data: any): Observable<any> {
        return this.http.post(`${this.API_ENDPOINT}/verify-telex-docs/${studentId}`, data);
    }

    returnDocs(studentId: number, data: any): Observable<any> {
        return this.http.post(`${this.API_ENDPOINT}/return-docs/${studentId}`, data);
    }

    sendReport(username: string, email: string, period: string = 'Today'): Observable<any> {
        const body = { username, email, period };
        return this.http.post(`${this.API_ENDPOINT}/send-report`, body);
    }

    // Existing Doc Person Dashboard APIs (Keeping for backward compatibility)
    returnDocsToStudent(studentId: number, payload: any): Observable<any> {
        return this.http.post(`${this.API_ENDPOINT}/return-docs/${studentId}`, payload);
    }

    getRequestDetails(studentId: number): Observable<any> {
        return this.http.get(`${this.API_ENDPOINT}/return-requests/${studentId}`);
    }

    confirmCollection(studentId: number, payload: any): Observable<any> {
        return this.http.post(`${this.API_ENDPOINT}/confirm-collection/${studentId}`, payload);
    }
}
