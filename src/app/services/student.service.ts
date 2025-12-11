import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student } from '../models/student.model';

@Injectable({
    providedIn: 'root'
})
export class StudentService {
    private apiUrl = 'http://localhost:8080/students'; // Or use environment.apiUrl if available

    constructor(private http: HttpClient) { }

    getAllStudentsPaginated(page: number, size: number): Observable<any> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<any>(`${this.apiUrl}/paginated`, { params });
    }

    getStudentById(id: number): Observable<Student> {
        return this.http.get<Student>(`${this.apiUrl}/${id}`);
    }

    // Add other methods as needed based on dashboard actions
    updateStudentStatus(id: number, status: string, remarks?: string): Observable<Student> {
        return this.http.put<Student>(`${this.apiUrl}/${id}/status`, { status, remarks });
    }
}
