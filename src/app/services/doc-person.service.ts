import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student } from '../components/doc-person-dashbaord/doc-person.models';

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
    private API_ENDPOINT = 'http://localhost:8080/api/doc-person';

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

    // Existing Doc Person Dashboard APIs
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
