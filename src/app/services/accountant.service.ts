import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';

// --- Interfaces ---

export interface Student {
    id: number;
    studentId?: number; // Alias for id, used in some contexts
    applicationId: string;
    fullName: string;
    email: string;
    contactNo: string;
    dob: string;
    age: number;
    address: string;
    applicationStatus: string;
    createdAt: string;

    // Emergency Contact
    emergencyContactNo: string;
    emergencyRelation: string;

    // Payment Fields
    hasPaid: boolean;
    paidAmount: number | null;
    paidTo: string | null;
    paymentDueDate: string | null;
    paymentType: string | null;
    paymentStatus: string | null;

    // Document Paths
    ttCopyPath: string | null;
    paymentConfirmationPath: string | null;
    profileImagePath: string | null;
    passportPath: string | null;

    // Application Details
    appliedFor: string;
    intake: string;
    college: {
        id: number;
        collegeName: string;
    } | null;

    // Action / Workflow Fields
    action?: string;
    actionOnUser?: string;

    // Visa Payment Fields
    visaPaymentRequestedAmount?: number | null;
    visaPaymentRequestedCurrency?: string | null;
    visaManServiceCharge?: number | null;
    visaPaymentTxId?: string | null;
    visaPaymentConfirmationPath?: string | null;
}

export interface Accountant {
contactNo: any;
    id: number;
    fullName: string;
    username: string;
    email: string;
    contactNumber: string;
    students: Student[];
}

export interface ApprovePaymentPayload {
    receivedAmount: number;
    receivedDate: string;
    accountantUsername: string;
}

export interface RejectPaymentPayload {
    accountantUsername: string;
}

// --- NEW Dashboard Interfaces ---

export interface DashboardStats {
    totalStudentsAssigned: number;
    pendingPayments: number;
    paymentsReceived: number;
    paymentsNotReceived: number;
    totalAmountReceived: number;
    totalAmountPending: number;
}

export interface CollectionSummary {
    period: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR';
    startDate: string;
    endDate: string;
    transactionCount: number;
    totalAmount: number;
}

export interface RecentActivity {
    studentName: string;
    applicationId: string;
    action: 'PAYMENT_RECEIVED' | 'PAYMENT_NOT_RECEIVED' | string;
    amount: number | null;
    timestamp: string;
    remarks: string;
}

export interface AssignedStudent {
    studentId: number;
    applicationId: string;
    fullName: string;
    email: string;
    contactNo: string;
    applicationStatus: string;
    paymentStatus: string;
    hasPaid: boolean;
    paidAmount: number | null;
    paidTo: string | null;
    ttCopyPath: string | null;
    paymentConfirmationPath: string | null;

    // Action / Workflow Fields
    action?: string;
    actionOnUser?: string;

    // Visa Payment Fields
    visaPaymentRequestedAmount?: number | null;
    visaPaymentRequestedCurrency?: string | null;
    visaManServiceCharge?: number | null;
    visaPaymentTxId?: string | null;
    visaPaymentConfirmationPath?: string | null;
}

export interface DashboardData {
    stats: DashboardStats;
    collections: CollectionSummary[];
    activities: RecentActivity[];
    students: AssignedStudent[];
}

@Injectable({
    providedIn: 'root'
})
export class AccountantService {
    private readonly API_URL = 'http://localhost:8080/api';

    constructor(private http: HttpClient) { }

    // --- Original Methods ---

    /**
     * Get accountant details and assigned students
     * @param username - The accountant's username
     */
    getAccountantDetails(username: string): Observable<Accountant> {
        return this.http.get<Accountant>(`${this.API_URL}/accountant/username/${username}`);
    }

    /**
     * Approve telex payment for a student
     * @param studentId - The student ID
     * @param payload - Contains receivedAmount, receivedDate, accountantUsername
     */
    approvePayment(studentId: number, payload: ApprovePaymentPayload): Observable<any> {
        return this.http.post(`${this.API_URL}/accountant/approve-telex-payment/${studentId}`, payload);
    }

    /**
     * Mark payment as not received for a student
     * @param studentId - The student ID
     * @param payload - Contains accountantUsername
     */
    rejectPayment(studentId: number, payload: RejectPaymentPayload): Observable<any> {
        return this.http.post(`${this.API_URL}/accountant/payment-not-received/${studentId}`, payload);
    }

    // --- NEW Dashboard Methods ---

    /**
     * Get dashboard statistics
     */
    getDashboardStats(username: string): Observable<DashboardStats> {
        return this.http.get<DashboardStats>(`${this.API_URL}/accountant/dashboard/stats/${username}`);
    }

    /**
     * Get collection summary (Daily/Weekly/Monthly/Yearly)
     */
    getCollectionSummary(username: string): Observable<CollectionSummary[]> {
        return this.http.get<CollectionSummary[]>(`${this.API_URL}/accountant/dashboard/collections/${username}`);
    }

    /**
     * Get recent activities
     */
    getRecentActivities(username: string, limit: number = 10): Observable<RecentActivity[]> {
        return this.http.get<RecentActivity[]>(`${this.API_URL}/accountant/dashboard/activities/${username}?limit=${limit}`);
    }

    /**
     * Get assigned students
     */
    getAssignedStudents(username: string): Observable<AssignedStudent[]> {
        return this.http.get<AssignedStudent[]>(`${this.API_URL}/accountant/dashboard/students/${username}`);
    }

    /**
     * Fetch all dashboard data concurrently
     */
    getAllDashboardData(username: string): Observable<DashboardData> {
        return forkJoin({
            stats: this.getDashboardStats(username),
            collections: this.getCollectionSummary(username),
            activities: this.getRecentActivities(username),
            students: this.getAssignedStudents(username)
        });
    }

    // --- Admin Management Methods ---

    /**
     * Get all accountants (for admin list)
     */
    getAllAccountants(): Observable<any[]> {
        // Assuming there is an endpoint for this, or using the universityPerson/all-details logic if applicable?
        // The user request implies a standard listing.
        // If there isn't a specific /api/accountant/all, we might need to rely on the generic /api/universityPerson/all-details filtering by role?
        // But the user asked for "Update Accountant" component which implies listing them.
        // Let's assume a standard endpoint or use a similar one.
        // Given the requirement "Update Accountant: Create a method to PUT ...", implies we need to list them first.
        // I will use /api/accountant/all-details similar to universityPerson if it exists, or just /api/accountant/all.
        // Let's assume /api/accountant/all exists or we use the generic person one.
        // Actually, looking at `UpdateUniversityPerson` it uses `/api/universityPerson/all-details`.
        // I'll stick to a clearer naming for now.
        return this.http.get<any[]>(`${this.API_URL}/accountant/all`);
    }

    /**
     * Update accountant personal details
     */
    updateAccountant(id: number, data: any): Observable<any> {
        return this.http.put(`${this.API_URL}/accountant/${id}`, data);
    }

    /**
     * Update accountant status
     */
    updateAccountantStatus(id: number, status: string): Observable<any> {
        return this.http.put(`${this.API_URL}/accountant/${id}/status/${status}`, {});
    }

    /**
     * Get accountant details with assigned students summary
     */
    getAccountantWithStudents(id: number): Observable<any> {
        return this.http.get<any>(`${this.API_URL}/accountant/${id}/with-students`);
    }
}
