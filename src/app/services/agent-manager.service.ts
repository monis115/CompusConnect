import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AgentSummary } from '../models/agent-summary';
import { Student } from '../models/student';

@Injectable({
    providedIn: 'root'
})
export class AgentManagerService {
    private apiUrl = 'http://localhost:8080/api'; // Base URL (adjust if needed specific to environment)

    constructor(private http: HttpClient) { }

    /**
     * Fetch Active Agents (Master List)
     * URL: GET /api/agents/with-students
     */
    getAgentsWithStudents(): Observable<AgentSummary[]> {
        return this.http.get<AgentSummary[]>(`${this.apiUrl}/agents/with-students`);
    }

    /**
     * Fetch Enrolled Students (Detail View)
     * URL: GET /api/agents/{id}/enrolled-students
     */
    getEnrolledStudents(agentId: number): Observable<Student[]> {
        return this.http.get<Student[]>(`${this.apiUrl}/agents/${agentId}/enrolled-students`);
    }
}
