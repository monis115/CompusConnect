import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Response interface for coordinator validation
export interface CoordinatorValidation {
    canForward: boolean;
    message: string;
    collegeName?: string;
    coordinatorUsername?: string;
    coordinatorStatus?: string;
}

// Interface for college with coordinator info
export interface CollegeWithCoordinator {
    collegeId: number;
    collegeName: string;
    city: string;
    country: string;
    hasCoordinator: boolean;
    coordinator?: {
        id: number;
        username: string;
        status: string;
        studentCount: number;
    } | null;
}

@Injectable({
    providedIn: 'root'
})
export class CollegeService {
    private baseUrl = 'http://localhost:8080';

    constructor(private http: HttpClient) { }

    /**
     * Check if a college can receive forwarded students
     * Validates that the college has an active university coordinator
     * @param collegeId - The college ID to validate
     * @returns Observable<CoordinatorValidation>
     */
    checkCanForwardStudents(collegeId: number): Observable<CoordinatorValidation> {
        return this.http.get<CoordinatorValidation>(
            `${this.baseUrl}/api/colleges/${collegeId}/can-forward-students`
        );
    }

    /**
     * Get all colleges with their coordinator status
     * Useful for admin dashboards to see which colleges are ready
     * @returns Observable<CollegeWithCoordinator[]>
     */
    getCollegesWithCoordinators(): Observable<CollegeWithCoordinator[]> {
        return this.http.get<CollegeWithCoordinator[]>(
            `${this.baseUrl}/api/colleges/with-coordinators`
        );
    }

    /**
     * Get all colleges (basic endpoint)
     * @returns Observable<any[]>
     */
    getAllColleges(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/api/colleges`);
    }
}
