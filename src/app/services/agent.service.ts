import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// --- Interfaces ---

export interface College {
    id: number;
    collegeName: string;
    city: string;
    country: string;
}

export interface Location {
    id: number;
    state: string;
    district: string;
}

export interface CollegeAccess {
    id: number;
    college: College;
    allowedLocations: Location[];
    accessAllLocations: boolean;
}

export interface Student {
    action: string;
    telexPaymentScreenshotPath: string | undefined;
    adhaarPath: any;
    markseetPath: string | undefined;
    passportPath: string | undefined;
    conditionalOfferLetterPath: any;
    id: number;
    fullName: string;
    dob: string;
    age: number;
    email: string;
    contactNo: string;
    address: string;
    emergencyContactNo: string;
    emergencyRelation: string;
    passportNo: string;
    passportValidTill: string;
    highestDegree?: string; // Optional as it might not be in all responses
    marks?: number; // Optional
    intake?: string;
    neetScore?: number;
    appliedFor: string;
    applicationStatus: string;
    nextStep: string | null;
    college: College;
    createdAt: string;
    paymentStatus?: string;
    paymentAmount?: number;
    confirmationPagePath?: string;
    admissionLetterPath?: string;
    profileImagePath?: string;
    telexDocumentsPath?: string;
    telexNumber?: string;
    telexIssueDate?: string;
    studentStatusHistory?: any[];
    actionOnUser?: string;
    applicationId?: string;
    canRequestDocReturn?: boolean;
}

export interface AgentData {
    id: number;
    fullName: string;
    age: number;
    dob: string;
    email: string;
    contactNo: string;
    gender: string;
    address: string;
    identityProofType: string;
    identityProofNumber: string;
    designation: string;
    experience: string;
    status: string;
    creationDate: string;
    companyName: string;
    registeredBusinessName: string;
    businessType: string;
    registrationNumber: string;
    panOrGstNumber: string;
    registeredOfficeAddress: string;
    branchOfficeAddress: string;
    companyEmail: string;
    companyContactNo: string;
    website: string;
    userId: string;
    collegeAccess: CollegeAccess[]; // Updated structure
    student: Student[];
}

@Injectable({
    providedIn: 'root'
})
export class AgentService {
    private baseUrl = 'http://localhost:8080/api'; // Adjust base URL if needed

    constructor(private http: HttpClient) { }

    getAgentProfile(userId: string): Observable<AgentData> {
        return this.http.get<AgentData>(`${this.baseUrl}/agents/user/${userId}`);
    }

    registerStudent(formData: FormData): Observable<any> {
        // Note: The endpoint in the requirement was /students/add, not /api/students/add
        // Adjusting to match the requirement "Base path is /students, not /api/students"
        return this.http.post('http://localhost:8080/students/add', formData);
    }

    initiateTelex(studentId: number, passportFile: File, agentUsername: string): Observable<any> {
        const formData = new FormData();
        formData.append('passport', passportFile);
        formData.append('agentUsername', agentUsername);
        return this.http.post(`${this.baseUrl}/agents/initiate-telex/${studentId}`, formData);
    }

    // --- Dashboard Endpoints ---

    getDashboardStats(username: string): Observable<DashboardStats> {
        return this.http.get<DashboardStats>(`${this.baseUrl}/agents/${username}/dashboard/stats`);
    }

    getStatusBreakdown(username: string): Observable<StatusBreakdown[]> {
        return this.http.get<StatusBreakdown[]>(`${this.baseUrl}/agents/${username}/dashboard/status-breakdown`);
    }

    getRecentActivities(username: string): Observable<DashboardActivity[]> {
        return this.http.get<DashboardActivity[]>(`${this.baseUrl}/agents/${username}/dashboard/activities`);
    }
}

// --- Dashboard Interfaces ---

export interface DashboardStats {
    totalStudents: number;
    activeStudents: number;
    pendingApplications: number;
    visaApproved: number;
    rejected: number;
}

export interface StatusBreakdown {
    status: string;
    count: number;
}

export interface DashboardActivity {
    studentName: string;
    status: string;
    updatedAt: string;
    remarks: string | null;
}
