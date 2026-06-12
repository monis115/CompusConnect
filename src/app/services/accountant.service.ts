import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';

// --- Interfaces ---

export interface SubAccount {
    id?: number;
    bankName: string;
    accountNumber: string;
    swiftBic: string;
    beneficiaryName: string;
    branchAddress: string;
    relationshipManager?: string;
    balance?: number;
    accountType?: string; // "BANK" | "CASH"
    cashAccountName?: string;
}

export interface Student {
    affidavitPath?: string;
    neetMarksheetPath?: string;
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
    visaMan?: {
        id: number;
        username: string;
        fullName: string;
    } | null;
}

export interface Accountant {
    totalAccToVisaManPaidAmount: number;
    totalVisaRequestedByVisaMan: number;
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
    rejectionRemarks?: string;
}

// --- NEW Dashboard Interfaces ---

export interface LiabilityDashboardSummary {
    totalBorrowed: number;
    totalOutstanding: number;
    totalRepaid: number;
    activeLoansCount: number;
    criticalLoansCount: number;
    purposeDistribution: { [key: string]: number };
    agingAnalysis: { [key: string]: number };
    cashFlowForecast: { [key: string]: number };
    creditCardAnalytics?: {
        totalCardLimit: number;
        totalCardOutstanding: number;
        limitUtilization: number;
    };
}

export interface DashboardStats {
    totalStudentsAssigned: number;
    pendingPayments: number;
    paymentsReceived: number;
    paymentsNotReceived: number;
    totalAmountReceived: number;
    totalAmountPending: number;
    totalVisaRequestedByVisaMan: number;
    totalAccToVisaManPaidAmount: number;
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
    id: number;
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
    confirmationPagePath?: string | null;

    // Action / Workflow Fields
    action?: string;
    actionOnUser?: string;

    // Visa Payment Fields
    visaPaymentRequestedAmount?: number | null;
    visaPaymentRequestedCurrency?: string | null;
    visaManServiceCharge?: number | null;
    visaPaymentTxId?: string | null;
    visaPaymentConfirmationPath?: string | null;
    visaMan?: any | null;
    visaPaymentReceivedAmount?: number | null;
    visaPaymentReceivedDate?: string | null;
    accToVisaManPaidAmount?: number | null;
    accToVisaManPaymentDate?: string | null;
    accToVisaManTxId?: string | null;
    accToVisaManMode?: string | null;
    accToVisaManStatus?: string | null;

    // Agent & College enrichment
    agentFullName?: string | null;
    collegeName?: string | null;
    appliedFor?: string | null;
    paymentRejectionRemarks?: string | null;
    visaManFullName?: string | null;
    agentUserFullName?: string | null;
}

export interface PayVisaManPayload {
    amountToPay: number;
    paymentDate: string;
    mode: string;
    txId: string;
    accountantUsername: string;
}

export interface DashboardData {
    stats: DashboardStats;
    collections: CollectionSummary[];
    activities: RecentActivity[];
    students: AssignedStudent[];
}

// --- NEW Credit Ledger Interfaces ---

export interface AccountantCredit {
    id?: number;
    amount: number;
    method: string; // FRIEND, LOAN, CREDIT_CARD
    creditDate: string;
    dueDate?: string;
    interestRate?: number;
    friendName?: string;
    friendPhone?: string;
    bankName?: string;
    loanTenureMonths?: number;
    cardInfo?: string;
    emiDetails?: string;
    amountRepaid?: number;
    outstandingAmount?: number;
    totalRepaymentAmount?: number;
    installmentAmount?: number;
    repaymentStructure?: string; // LUMP_SUM, INSTALLMENTS
    purpose?: string;
    lateFeeType?: string;
    lateFeeValue?: number;
    fixedLateFine?: number;
    status?: string; // ACTIVE, REPAID
    accountantUsername?: string;
    subAccountId?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AccountantService {
    private readonly API_URL = `${environment.apiUrl}/api`;

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

    /**
     * Pay Visa Man
     * @param studentId - The student ID
     * @param payload - Contains amount, dates, modes, accountant username
     */
    payVisaMan(studentId: number, payload: PayVisaManPayload): Observable<any> {
        return this.http.post(`${this.API_URL}/visa/pay-visa-man/${studentId}`, payload);
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

    // --- NEW Passbook Methods ---

    /**
     * Get VisaMan Accountant Ledger Passbook
     */
    getVisaManPassbooks(): Observable<any[]> {
        return this.http.get<any[]>(`${this.API_URL}/accountant/passbook/visaman`);
    }

    /**
     * Get Agent Accountant Ledger Passbook
     */
    getAgentPassbooks(): Observable<any[]> {
        return this.http.get<any[]>(`${this.API_URL}/accountant/passbook/agent`);
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

    // --- NEW Credit Ledger Methods ---

    getAllCredits(username: string): Observable<AccountantCredit[]> {
        return this.http.get<AccountantCredit[]>(`${this.API_URL}/accountant/credits/${username}`);
    }

    addCredit(credit: AccountantCredit, username: string): Observable<AccountantCredit> {
        return this.http.post<AccountantCredit>(`${this.API_URL}/accountant/credits/${username}`, credit);
    }

    updateCreditDetails(creditId: number, data: any): Observable<AccountantCredit> {
        return this.http.put<AccountantCredit>(`${this.API_URL}/accountant/credits/${creditId}/details`, data);
    }

    repayCredit(creditId: number, amount: number, subAccountId: number | null, notes: string, username: string): Observable<any> {
        let params = new HttpParams()
            .set('amount', amount.toString())
            .set('username', username);
        
        if (subAccountId !== null) {
            params = params.set('subAccountId', subAccountId.toString());
        }
        if (notes) {
            params = params.set('notes', notes);
        }
        return this.http.post(`${this.API_URL}/accountant/credits/${creditId}/repay`, null, { params });
    }

    forecloseCredit(creditId: number, chargePercentage: number, username: string, subAccountId?: number | null): Observable<any> {
        let params = new HttpParams()
            .set('foreclosureChargePercentage', chargePercentage.toString())
            .set('username', username);
        if (subAccountId != null) {
            params = params.set('subAccountId', subAccountId.toString());
        }
        return this.http.post(`${this.API_URL}/accountant/credits/${creditId}/foreclose`, null, { params });
    }

    prepayCredit(creditId: number, amount: number, strategy: string, username: string): Observable<any> {
        let params = new HttpParams()
            .set('amount', amount.toString())
            .set('strategy', strategy)
            .set('username', username);
        return this.http.post(`${this.API_URL}/accountant/credits/${creditId}/prepay`, null, { params });
    }

    getCreditInstallments(creditId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.API_URL}/accountant/credits/${creditId}/installments`);
    }

    getCreditLedger(creditId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.API_URL}/accountant/credits/${creditId}/ledger`);
    }

    getCreditTimeline(creditId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.API_URL}/accountant/credits/${creditId}/timeline`);
    }

    // --- Liability Dashboard API ---
    getLiabilityDashboardSummary(username: string): Observable<any> {
        return this.http.get<any>(`${this.API_URL}/accountant/liability-dashboard/${username}/summary`);
    }

    getLiabilityCalendar(username: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.API_URL}/accountant/credits/calendar/${username}`);
    }

    getFinancialAlerts(username: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.API_URL}/accountant/credits/alerts/${username}`);
    }
    
    markAlertAsRead(alertId: number): Observable<any> {
        return this.http.post(`${this.API_URL}/accountant/credits/alerts/${alertId}/read`, {});
    }

    downloadClosureCertificate(creditId: number): Observable<Blob> {
        return this.http.get(`${this.API_URL}/accountant/credits/${creditId}/closure-certificate`, { responseType: 'blob' });
    }

    // ==========================================
    // SubAccount Endpoints
    // ==========================================

    getSubAccounts(): Observable<SubAccount[]> {
        return this.http.get<SubAccount[]>(`${this.API_URL}/accountant/subaccounts`);
    }

    getAllSubAccountTransactions(page: number = 0, size: number = 100, bankId?: string, startDate?: string, endDate?: string): Observable<any> {
        let params = new HttpParams()
          .set('page', page.toString())
          .set('size', size.toString());
          
        if (bankId) params = params.set('bankId', bankId);
        if (startDate) params = params.set('startDate', startDate);
        if (endDate) params = params.set('endDate', endDate);
          
        return this.http.get(`${this.API_URL}/accountant/subaccounts/transactions/all`, { params });
    }

    createSubAccount(subAccount: SubAccount): Observable<SubAccount> {
        return this.http.post<SubAccount>(`${this.API_URL}/accountant/subaccounts`, subAccount);
    }

    updateSubAccount(id: number, subAccount: SubAccount): Observable<SubAccount> {
        return this.http.put<SubAccount>(`${this.API_URL}/accountant/subaccounts/${id}`, subAccount);
    }
}
