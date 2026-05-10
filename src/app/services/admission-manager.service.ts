import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CollegeService, CoordinatorValidation } from './college.service';
import { environment } from '../../environments/environment';

// ============================================================================
// REPORT INTERFACES - Performance Dashboard DTOs (Updated API Structure)
// ============================================================================

export type ReportPeriod = 'yearly' | 'monthly' | 'daily';

export interface ManagerReportStatsDTO {
    forwardedToUniversity: number;
    forwardedToUniversityTrend: number | null;  // Percentage change (+/-), null if N/A

    admissionLettersApproved: number;
    admissionLettersApprovedTrend: number | null;

    telexManagersAssigned: number;
    telexManagersAssignedTrend: number | null;

    visaManagersAssigned: number;
    visaManagersAssignedTrend: number | null;
}

export interface AdmissionManagerReportDTO {
    managerId: number;
    managerName: string;
    managerUsername: string;
    period: ReportPeriod;
    periodStats: ManagerReportStatsDTO;
}

// Generic interface for future user types
export interface UserReportDTO {
    userId: number;
    userName: string;
    userUsername: string;
    userRole: 'ADMISSION_MANAGER' | 'UNIVERSITY_COORDINATOR' | 'TELEX_PERSON' | 'VISA_PERSON' | 'DOC_PERSON' | 'ACCOUNTANT' | 'AGENT';
    period: ReportPeriod;
    periodStats: ManagerReportStatsDTO;
}

// ============================================================================
// UNIVERSITY PERSON REPORT INTERFACES
// ============================================================================

export interface UniversityPersonStatsDTO {
    totalStudents: number;
    lettersUploaded: number;
    conditionalOffersUploaded: number;
    pendingLetters: number;
    lettersUploadedTrend: number | null;
    conditionalOffersTrend: number | null;
    efficiencyRate: number;
}

export interface UniversityPersonReportDTO {
    id: number;
    userName: string;
    collegeName: string;
    collegeId: number;
    period: ReportPeriod;
    periodStats: UniversityPersonStatsDTO;
}

// ============================================================================
// COLLEGE/UNIVERSITY REPORT INTERFACES
// ============================================================================

export interface CoordinatorDTO {
    id: number;
    userName: string;
    status: string; // "Active" or "Inactive"
}

export interface CollegeStatsDTO {
    totalStudents: number;
    lettersUploaded: number;
    conditionalOffers: number;
    pendingLetters: number;
    efficiencyRate: number;
    lettersTrend: number | null;
    conditionalOffersTrend: number | null;
}

export interface CollegeReportDTO {
    collegeId: number;
    collegeName: string;
    city: string;
    country: string;
    period: ReportPeriod;
    coordinator: CoordinatorDTO | null;
    stats: CollegeStatsDTO;
}

@Injectable({
    providedIn: 'root'
})
export class AdmissionManagerService {
    private apiBaseUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private collegeService: CollegeService
    ) { }

    getManagerDetails(username: string): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/managers/userName/${username}`);
    }

    getDashboardStats(username: string): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/managers/dashboard/stats/${username}`);
    }

    // --- Status Actions ---

    /**
     * Validate if student can be forwarded to university
     * Checks if the college has an active university coordinator
     * @param collegeId - College ID to validate
     * @returns Observable<CoordinatorValidation>
     */
    validateCoordinatorBeforeForward(collegeId: number): Observable<CoordinatorValidation> {
        return this.collegeService.checkCanForwardStudents(collegeId);
    }

    forwardToUniversity(studentId: number, payload: any): Observable<any> {
        // FIX: Changed from /api/admission-manager to /api/managers
        return this.http.post(`${this.apiBaseUrl}/api/managers/forward-student/${studentId}`, payload);
    }

    rejectStudent(studentId: number, payload: any): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/managers/reject-student/${studentId}`, payload);
    }

    approveAdmissionLetter(studentId: number, payload: any): Observable<any> {
        // FIX: Changed from /api/admission-manager to /api/managers
        return this.http.post(`${this.apiBaseUrl}/api/managers/approve-admission-letter/${studentId}`, payload);
    }

    // --- Telex & Visa Manager Assignment ---

    // FIX: Updated to use new endpoint that returns telex managers with student counts
    getTelexManagerUsernames(): Observable<{ username: string; studentCount: number }[]> {
        return this.http.get<{ username: string; studentCount: number }[]>(`${this.apiBaseUrl}/api/telex-man/usernames`);
    }

    // Interface for Visa Manager response (with full details)
    getVisaManagers(): Observable<{ id: number; username: string; fullName: string; status: string }[]> {
        return this.http.get<{ id: number; username: string; fullName: string; status: string }[]>(`${this.apiBaseUrl}/api/visa-man`);
    }

    // Updated to use new endpoint that returns visa managers with student counts
    getVisaManagerUsernames(): Observable<{ username: string; studentCount: number }[]> {
        return this.http.get<{ username: string; studentCount: number }[]>(`${this.apiBaseUrl}/api/visa-man/usernames`);
    }

    assignTelexManager(studentId: number, payload: any): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/telex/assign/${studentId}`, payload);
    }

    assignVisaManager(studentId: number, payload: any): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/visa/assign/${studentId}`, payload);
    }

    // --- Messaging ---

    getManagerMessages(managerId: number): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/messages/manager/${managerId}`);
    }

    getStudentMessages(studentId: number): Observable<any> {
        return this.http.get(`${this.apiBaseUrl}/api/messages/student/${studentId}`);
    }

    sendMessage(payload: any): Observable<any> {
        return this.http.post(`${this.apiBaseUrl}/api/messages/send`, payload);
    }

    // ============================================================================
    // REPORT METHODS - Performance Dashboard APIs (Period-based)
    // ============================================================================

    /**
     * Fetch all managers' performance reports with period filter
     * @param period - 'yearly' | 'monthly' | 'daily'
     */
    getAllManagerReports(period: ReportPeriod = 'yearly'): Observable<AdmissionManagerReportDTO[]> {
        return this.http.get<AdmissionManagerReportDTO[]>(
            `${this.apiBaseUrl}/api/managers/reports/all?period=${period}`
        ).pipe(
            catchError(() => of(this.getMockManagerReports(period)))
        );
    }

    /**
     * Fetch specific manager's detailed report with period filter
     * @param managerId - The manager's ID
     * @param period - 'yearly' | 'monthly' | 'daily'
     */
    getManagerReportById(managerId: number, period: ReportPeriod = 'yearly'): Observable<AdmissionManagerReportDTO> {
        return this.http.get<AdmissionManagerReportDTO>(
            `${this.apiBaseUrl}/api/managers/reports/${managerId}?period=${period}`
        ).pipe(
            catchError(() => {
                const mock = this.getMockManagerReports(period).find(m => m.managerId === managerId);
                return of(mock || this.getMockManagerReports(period)[0]);
            })
        );
    }

    // ============================================================================
    // EMAIL REPORT METHODS - Send Reports via Email
    // ============================================================================

    /**
     * Send single manager's report to specified email
     * @param managerId - Manager ID
     * @param period - Report period
     * @param email - Recipient email address
     */
    sendManagerReportEmail(managerId: number, period: ReportPeriod, email: string): Observable<any> {
        return this.http.post(
            `${this.apiBaseUrl}/api/managers/reports/${managerId}/email?period=${period}&email=${encodeURIComponent(email)}`,
            {},
            { responseType: 'text' }
        );
    }

    /**
     * Send all managers' consolidated report to specified email
     * @param period - Report period
     * @param email - Recipient email address
     */
    sendAllManagersReportEmail(period: ReportPeriod, email: string): Observable<any> {
        return this.http.post(
            `${this.apiBaseUrl}/api/managers/reports/all/email?period=${period}&email=${encodeURIComponent(email)}`,
            {},
            { responseType: 'text' }
        );
    }

    // Mock data for development/fallback (updated to new API structure)
    private getMockManagerReports(period: ReportPeriod = 'yearly'): AdmissionManagerReportDTO[] {
        // Generate mock data based on period for realistic demo
        const mockManagers = [
            { id: 1, name: 'John Wick', username: 'M2522229', yearly: { fwd: 71, appr: 56, telex: 0, visa: 26 } },
            { id: 2, name: 'Sarah Connor', username: 'M2511206', yearly: { fwd: 0, appr: 0, telex: 0, visa: 0 } },
            { id: 3, name: 'Bruce Wayne', username: 'M2533445', yearly: { fwd: 145, appr: 132, telex: 98, visa: 87 } },
            { id: 4, name: 'Tony Stark', username: 'M2544567', yearly: { fwd: 198, appr: 185, telex: 142, visa: 128 } },
            { id: 5, name: 'Diana Prince', username: 'M2555678', yearly: { fwd: 87, appr: 78, telex: 52, visa: 45 } },
            { id: 6, name: 'Peter Parker', username: 'M2566789', yearly: { fwd: 112, appr: 98, telex: 76, visa: 65 } },
            { id: 7, name: 'Natasha Romanoff', username: 'M2577890', yearly: { fwd: 156, appr: 143, telex: 110, visa: 95 } },
            { id: 8, name: 'Steve Rogers', username: 'M2588901', yearly: { fwd: 89, appr: 82, telex: 58, visa: 52 } },
            { id: 9, name: 'Clark Kent', username: 'M2599012', yearly: { fwd: 134, appr: 122, telex: 88, visa: 76 } },
            { id: 10, name: 'Barry Allen', username: 'M2510123', yearly: { fwd: 78, appr: 71, telex: 45, visa: 38 } },
            { id: 11, name: 'Arthur Curry', username: 'M2521234', yearly: { fwd: 67, appr: 58, telex: 34, visa: 28 } },
            { id: 12, name: 'Victor Stone', username: 'M2532345', yearly: { fwd: 45, appr: 38, telex: 22, visa: 18 } },
            { id: 13, name: 'Hal Jordan', username: 'M2543456', yearly: { fwd: 92, appr: 85, telex: 62, visa: 55 } },
            { id: 14, name: 'Oliver Queen', username: 'M2554567', yearly: { fwd: 108, appr: 96, telex: 72, visa: 64 } },
            { id: 15, name: 'Kara Danvers', username: 'M2565678', yearly: { fwd: 123, appr: 115, telex: 82, visa: 70 } }
        ];

        // Simulate trend calculations
        const getTrend = (value: number): number | null => {
            if (value === 0) return null;
            // Random trend between -15% and +25%
            return Math.round((Math.random() * 40 - 15) * 10) / 10;
        };

        return mockManagers.map(m => ({
            managerId: m.id,
            managerName: m.name,
            managerUsername: m.username,
            period: period,
            periodStats: {
                forwardedToUniversity: m.yearly.fwd,
                forwardedToUniversityTrend: getTrend(m.yearly.fwd),
                admissionLettersApproved: m.yearly.appr,
                admissionLettersApprovedTrend: getTrend(m.yearly.appr),
                telexManagersAssigned: m.yearly.telex,
                telexManagersAssignedTrend: getTrend(m.yearly.telex),
                visaManagersAssigned: m.yearly.visa,
                visaManagersAssignedTrend: getTrend(m.yearly.visa)
            }
        }));
    }

    // ============================================================================
    // UNIVERSITY PERSON REPORT METHODS
    // ============================================================================

    /**
     * Fetch university person's report with period filter
     * @param id - University Person ID
     * @param period - 'yearly' | 'monthly' | 'daily'
     */
    getUniversityPersonReport(id: number, period: ReportPeriod = 'daily'): Observable<UniversityPersonReportDTO> {
        return this.http.get<UniversityPersonReportDTO>(
            `${this.apiBaseUrl}/api/universityPerson/reports/${id}?period=${period}`
        ).pipe(
            catchError(() => of(this.getMockUniversityPersonReport(id, period)))
        );
    }

    /**
     * Fetch ALL university persons' reports with period filter
     * @param period - 'yearly' | 'monthly' | 'daily'
     */
    getAllUniversityPersonReports(period: ReportPeriod = 'monthly'): Observable<UniversityPersonReportDTO[]> {
        return this.http.get<UniversityPersonReportDTO[]>(
            `${this.apiBaseUrl}/api/universityPerson/reports/all?period=${period}`
        ).pipe(
            catchError(() => of(this.getMockAllUniversityPersonReports(period)))
        );
    }

    // Mock data for all university persons
    private getMockAllUniversityPersonReports(period: ReportPeriod): UniversityPersonReportDTO[] {
        const mockCoordinators = [
            { id: 1, userName: 'UP001', collegeName: 'Oxford University', collegeId: 5, base: { total: 45, letters: 12, conditional: 8 } },
            { id: 2, userName: 'UP002', collegeName: 'Cambridge University', collegeId: 6, base: { total: 62, letters: 28, conditional: 15 } },
            { id: 3, userName: 'UP003', collegeName: 'Harvard University', collegeId: 7, base: { total: 38, letters: 20, conditional: 10 } },
            { id: 4, userName: 'UP004', collegeName: 'MIT', collegeId: 8, base: { total: 55, letters: 35, conditional: 18 } },
            { id: 5, userName: 'UP005', collegeName: 'Stanford University', collegeId: 9, base: { total: 41, letters: 18, conditional: 12 } }
        ];

        const multiplier = period === 'yearly' ? 12 : period === 'monthly' ? 1 : 0.1;
        const getTrend = () => {
            const rand = Math.random();
            if (rand < 0.2) return null;
            return Math.round((Math.random() * 40 - 15) * 10) / 10;
        };

        return mockCoordinators.map(c => {
            const letters = Math.round(c.base.letters * multiplier);
            const conditional = Math.round(c.base.conditional * multiplier);
            const total = Math.round(c.base.total * multiplier);
            const pending = Math.max(0, total - letters - conditional);
            const efficiency = total > 0 ? ((letters + conditional) / total) * 100 : 0;

            return {
                id: c.id,
                userName: c.userName,
                collegeName: c.collegeName,
                collegeId: c.collegeId,
                period: period,
                periodStats: {
                    totalStudents: total,
                    lettersUploaded: letters,
                    conditionalOffersUploaded: conditional,
                    pendingLetters: pending,
                    lettersUploadedTrend: getTrend(),
                    conditionalOffersTrend: getTrend(),
                    efficiencyRate: Math.round(efficiency * 100) / 100
                }
            };
        });
    }

    /**
     * Send university person's report to specified email
     * @param id - University Person ID
     * @param period - Report period
     * @param email - Recipient email address
     */
    sendUniversityPersonReportEmail(id: number, period: ReportPeriod, email: string): Observable<any> {
        return this.http.post(
            `${this.apiBaseUrl}/api/universityPerson/reports/${id}/email?period=${period}&email=${encodeURIComponent(email)}`,
            {},
            { responseType: 'text' }
        );
    }

    /**
     * Send all university persons' consolidated report to specified email
     * @param period - Report period
     * @param email - Recipient email address
     */
    sendAllUniversityPersonReportsEmail(period: ReportPeriod, email: string): Observable<any> {
        return this.http.post(
            `${this.apiBaseUrl}/api/universityPerson/reports/all/email?period=${period}&email=${encodeURIComponent(email)}`,
            {},
            { responseType: 'text' }
        );
    }

    // Mock data for University Person
    private getMockUniversityPersonReport(id: number, period: ReportPeriod): UniversityPersonReportDTO {
        const mockCoordinators = [
            { id: 1, userName: 'UP001', collegeName: 'Oxford University', collegeId: 5, base: { total: 45, letters: 12, conditional: 8 } },
            { id: 2, userName: 'UP002', collegeName: 'Cambridge University', collegeId: 6, base: { total: 62, letters: 28, conditional: 15 } },
            { id: 3, userName: 'UP003', collegeName: 'Harvard University', collegeId: 7, base: { total: 38, letters: 20, conditional: 10 } },
            { id: 4, userName: 'UP004', collegeName: 'MIT', collegeId: 8, base: { total: 55, letters: 35, conditional: 18 } },
            { id: 5, userName: 'UP005', collegeName: 'Stanford University', collegeId: 9, base: { total: 41, letters: 18, conditional: 12 } }
        ];

        const coordinator = mockCoordinators.find(c => c.id === id) || mockCoordinators[0];

        // Adjust based on period
        const multiplier = period === 'yearly' ? 12 : period === 'monthly' ? 1 : 0.1;
        const letters = Math.round(coordinator.base.letters * multiplier);
        const conditional = Math.round(coordinator.base.conditional * multiplier);
        const total = Math.round(coordinator.base.total * multiplier);
        const pending = Math.max(0, total - letters - conditional);
        const efficiency = total > 0 ? ((letters + conditional) / total) * 100 : 0;

        // Random trends
        const getTrend = () => {
            const rand = Math.random();
            if (rand < 0.2) return null;
            return Math.round((Math.random() * 40 - 15) * 10) / 10;
        };

        return {
            id: coordinator.id,
            userName: coordinator.userName,
            collegeName: coordinator.collegeName,
            collegeId: coordinator.collegeId,
            period: period,
            periodStats: {
                totalStudents: total,
                lettersUploaded: letters,
                conditionalOffersUploaded: conditional,
                pendingLetters: pending,
                lettersUploadedTrend: getTrend(),
                conditionalOffersTrend: getTrend(),
                efficiencyRate: Math.round(efficiency * 100) / 100
            }
        };
    }

    // ============================================================================
    // COLLEGE/UNIVERSITY REPORT METHODS
    // ============================================================================

    /**
     * Fetch all colleges/universities performance reports
     * @param period - 'yearly' | 'monthly' | 'daily'
     */
    getAllCollegeReports(period: ReportPeriod = 'monthly'): Observable<CollegeReportDTO[]> {
        return this.http.get<CollegeReportDTO[]>(
            `${this.apiBaseUrl}/api/colleges/reports/all?period=${period}`
        ).pipe(
            catchError(() => of(this.getMockCollegeReports(period)))
        );
    }

    /**
     * Fetch single college/university report
     * @param collegeId - College ID
     * @param period - Report period
     */
    getCollegeReportById(collegeId: number, period: ReportPeriod = 'monthly'): Observable<CollegeReportDTO> {
        return this.http.get<CollegeReportDTO>(
            `${this.apiBaseUrl}/api/colleges/reports/${collegeId}?period=${period}`
        ).pipe(
            catchError(() => {
                const mock = this.getMockCollegeReports(period).find(c => c.collegeId === collegeId);
                return of(mock || this.getMockCollegeReports(period)[0]);
            })
        );
    }

    /**
     * Send single college report via email
     */
    sendCollegeReportEmail(collegeId: number, period: ReportPeriod, email: string): Observable<any> {
        return this.http.post(
            `${this.apiBaseUrl}/api/colleges/reports/${collegeId}/email?period=${period}&email=${encodeURIComponent(email)}`,
            {},
            { responseType: 'text' }
        );
    }

    /**
     * Send all colleges consolidated report via email
     */
    sendAllCollegesReportEmail(period: ReportPeriod, email: string): Observable<any> {
        return this.http.post(
            `${this.apiBaseUrl}/api/colleges/reports/all/email?period=${period}&email=${encodeURIComponent(email)}`,
            {},
            { responseType: 'text' }
        );
    }

    // Mock data for Colleges
    private getMockCollegeReports(period: ReportPeriod): CollegeReportDTO[] {
        const mockColleges = [
            { id: 1, name: 'Oxford University', city: 'Oxford', country: 'UK', hasCoord: true, coordId: 1, coordUser: 'UP001', base: { total: 145, letters: 82, conditional: 35 } },
            { id: 2, name: 'Cambridge University', city: 'Cambridge', country: 'UK', hasCoord: true, coordId: 2, coordUser: 'UP002', base: { total: 162, letters: 98, conditional: 42 } },
            { id: 3, name: 'Harvard University', city: 'Boston', country: 'USA', hasCoord: true, coordId: 3, coordUser: 'UP003', base: { total: 238, letters: 145, conditional: 58 } },
            { id: 4, name: 'MIT', city: 'Boston', country: 'USA', hasCoord: false, coordId: null, coordUser: null, base: { total: 185, letters: 120, conditional: 45 } },
            { id: 5, name: 'Stanford University', city: 'Stanford', country: 'USA', hasCoord: true, coordId: 4, coordUser: 'UP004', base: { total: 195, letters: 130, conditional: 48 } },
            { id: 6, name: 'Imperial College', city: 'London', country: 'UK', hasCoord: true, coordId: 5, coordUser: 'UP005', base: { total: 128, letters: 75, conditional: 32 } },
            { id: 7, name: 'ETH Zurich', city: 'Zurich', country: 'Switzerland', hasCoord: false, coordId: null, coordUser: null, base: { total: 95, letters: 55, conditional: 22 } },
            { id: 8, name: 'University of Melbourne', city: 'Melbourne', country: 'Australia', hasCoord: true, coordId: 6, coordUser: 'UP006', base: { total: 112, letters: 68, conditional: 28 } }
        ];

        const multiplier = period === 'yearly' ? 12 : period === 'monthly' ? 1 : 0.1;

        const getTrend = (): number | null => {
            const rand = Math.random();
            if (rand < 0.2) return null;
            return Math.round((Math.random() * 50 - 15) * 10) / 10;
        };

        return mockColleges.map(c => {
            const letters = Math.round(c.base.letters * multiplier);
            const conditional = Math.round(c.base.conditional * multiplier);
            const total = Math.round(c.base.total * multiplier);
            const pending = Math.max(0, total - letters - conditional);
            const efficiency = total > 0 ? ((letters + conditional) / total) * 100 : 0;

            return {
                collegeId: c.id,
                collegeName: c.name,
                city: c.city,
                country: c.country,
                period: period,
                coordinator: c.hasCoord ? {
                    id: c.coordId!,
                    userName: c.coordUser!,
                    status: 'Active'
                } : null,
                stats: {
                    totalStudents: total,
                    lettersUploaded: letters,
                    conditionalOffers: conditional,
                    pendingLetters: pending,
                    efficiencyRate: Math.round(efficiency * 100) / 100,
                    lettersTrend: getTrend(),
                    conditionalOffersTrend: getTrend()
                }
            };
        });
    }
}