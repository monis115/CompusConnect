import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student } from '../components/doc-person-dashbaord/doc-person.models';

@Injectable({
    providedIn: 'root'
})
export class DocPersonService {
    private API_ENDPOINT = 'http://localhost:8080/api/doc-person';

    constructor(private http: HttpClient) { }

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
