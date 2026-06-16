import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AdminAuthService } from '../../../services/admin-auth-service';
import { AgentService, AgentData, Student, College, Location as AgentLocation, DashboardStats, StatusBreakdown, DashboardActivity } from '../../../services/agent.service';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TelexApplicationService } from '../../../services/telex-application.service';
import { TelexApplicationDTO } from '../../../models/telex-application.model';
import { environment } from '../../../../environments/environment';
import { FileService } from '../../../services/file.service';
import { forkJoin, Observable } from 'rxjs';

// --- Updated Enum based on your provided list ---
export enum StudentStatus {
  REGISTERED = 'REGISTERED',
  CONDITIONAL_OFFER_LETTER_GENERATED = 'CONDITIONAL_OFFER_LETTER_GENERATED',
  PENDING_ADMISSION_LETTER = 'PENDING_ADMISSION_LETTER',
  ADMISSION_LETTER_GENERATED = 'ADMISSION_LETTER_GENERATED',
  ADMISSION_LETTER_APPROVED = 'ADMISSION_LETTER_APPROVED',

  APPLIED_FOR_TELEX = 'APPLIED_FOR_TELEX',
  TELEX_INITIATED = 'TELEX_INITIATED',
  TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY = 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY',
  TELEX_APPLICATION_SUBMITTED_TO_MEA = 'TELEX_APPLICATION_SUBMITTED_TO_MEA',
  TELEX_NUMBER_ISSUED = 'TELEX_NUMBER_ISSUED',
  REJECTED_BY_TELEX = 'REJECTED_BY_TELEX',

  VISA_FEE_PENDING = 'VISA_FEE_PENDING',
  VISA_FEE_RECEIVED = 'VISA_FEE_RECEIVED',
  VISA_APPLIED = 'VISA_APPLIED',
  PASSPORT_COLLECTED = 'PASSPORT_COLLECTED',
  VISA_PAYMENT_CONFIRMED = 'VISA_PAYMENT_CONFIRMED',
  PASSPORT_SUBMITTED_TO_EMBASSY = 'PASSPORT_SUBMITTED_TO_EMBASSY',
  VISA_STAMPED = 'VISA_STAMPED',

  READY_FOR_TRAVEL = 'READY_FOR_TRAVEL',
  REJECTED = 'REJECTED'
}

// Telex Form Data Interface
interface TelexFormData {
  passportValidationDate: string;
  telexPaymentAmount: number | null;
  telexPaymentTxId: string;
  passportNumber: string;
}

// News Item Interface
interface NewsItem {
  id: number;
  activeFrom: string;
  tillDate: string;
  heading: string;
  content: string;
  tag: string;
  username: string;
  forUser: string;
  createdAt: string;
  updatedAt: string | null;
  active: boolean;
}

// --- Animations ---
const listAnimation = trigger('listAnimation', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(15px)' }),
      stagger('50ms', [
        animate('300ms 150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

@Component({
  selector: 'app-agent-dashboard',
  standalone: false,
  templateUrl: './agent-dashboard.html',
  styleUrls: ['./agent-dashboard.css'],
  animations: [
    listAnimation,
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class AgentDashboard implements OnInit {
  public readonly StudentStatus = StudentStatus;


  // Travel & Logistics View Properties
  travelStudents: Student[] = [];
  docReturnStudents: Student[] = [];
  uniqueColleges: string[] = [];
  travelTab: 'travel' | 'docs' = 'travel';
  visaModalMode: 'upload' | 'view' | 'none' = 'none';

  // --- Travel Modal Mode ---
  travelModalMode: 'view' | 'edit' = 'view';
  travelFilterCollege: string = '';
  travelFilterAgent: string = '';
  travelFilterStartDate: string = '';
  travelFilterEndDate: string = '';

  get filteredTravelStudents(): Student[] {
    return this.travelStudents.filter(s => {
      if (this.travelFilterCollege && s.college?.collegeName !== this.travelFilterCollege) return false;
      if (this.travelFilterStartDate && s.travelDoj) {
        if (new Date(s.travelDoj) < new Date(this.travelFilterStartDate)) return false;
      }
      if (this.travelFilterEndDate && s.travelDoj) {
        if (new Date(s.travelDoj) > new Date(this.travelFilterEndDate)) return false;
      }
      return true;
    });
  }

  get filteredDocReturnStudents(): Student[] {
    return this.docReturnStudents.filter(s => {
      if (this.travelFilterCollege && s.college?.collegeName !== this.travelFilterCollege) return false;
      if (this.travelFilterStartDate && s.documentReturnRequest?.travelDate) {
        if (new Date(s.documentReturnRequest.travelDate) < new Date(this.travelFilterStartDate)) return false;
      }
      if (this.travelFilterEndDate && s.documentReturnRequest?.travelDate) {
        if (new Date(s.documentReturnRequest.travelDate) > new Date(this.travelFilterEndDate)) return false;
      }
      return true;
    });
  }

  clearTravelFilters(): void {
    this.travelFilterCollege = '';
    this.travelFilterAgent = '';
    this.travelFilterStartDate = '';
    this.travelFilterEndDate = '';
  }

  // --- View State ---
  currentView: 'dashboard' | 'students' | 'register' | 'edit-student' | 'profile' | 'student-detail' | 'assigned-tasks' | 'travel-details' | 'travel-management' | 'visa-stamped' | 'reports' | 'payments' | 'messages' | 'apply-telex' | 'apply-visa' | 'doc-return' | 'rejected' | 'travelling' | 'request-doc' | 'visa-payment' = 'dashboard';
  isLoading = true;
  isRefreshing = false;
  isReloadingData = false; // For floating button
  isSidebarCollapsed = false;
  error: string | null = null;

  // --- Data ---
  agentData: AgentData | null = null;
  students: Student[] = [];
  selectedStudent: Student | null = null;
  studentToEdit: any = null;

  exportToExcel(): void {
    if (!this.filteredAllStudents || this.filteredAllStudents.length === 0) {
      // Assuming a toast service exists, or just return
      return;
    }

    const headers = [
      'Serial No',
      'Student Name',
      'Application ID',
      'Email',
      'Contact',
      'University',
      'Intake',
      'Current Status',
      'Last Updated'
    ];

    const rows = this.filteredAllStudents.map((s, index) => [
      index + 1,
      s.fullName || '',
      s.applicationId || s.id || '',
      s.email || '',
      s.contactNo || '',
      s.college?.collegeName || '',
      '',
      s.applicationStatus || '',
      (s as any).updatedAt ? new Date((s as any).updatedAt).toLocaleString() : (s.createdAt ? new Date(s.createdAt).toLocaleString() : '')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Students_Export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- News Data ---
  newsItems: NewsItem[] = [];

  get getTravellingCount(): number {
    return this.students.filter(s => s.applicationStatus === 'TRAVELLING').length;
  }
  isNewsModalOpen = false;
  isSupportModalOpen = false;

  // --- Stats & Widgets ---
  stats = { totalStudents: 0, pending: 0, approved: 0, completed: 0, rejected: 0 };

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  // --- All Students Advanced Filters & Pagination ---
  allStudentsSearch: string = '';
  allStudentsUniversity: string = 'all';
  allStudentsStatus: string = 'all';
  allStudentsIntake: string = 'all';
  allStudentsDateRange: string = '';

  allStudentsCurrentPage: number = 1;
  allStudentsPageSize: number = 25;

  get kpiTotalStudents(): number { return this.students.length; }
  get kpiAdmissionLetter(): number { return this.students.filter(s => !!s.admissionLetterPath).length; }
  get kpiTelexIssued(): number { return this.students.filter(s => !!s.telexNumber).length; }
  get kpiVisaStamped(): number { return this.students.filter(s => s.applicationStatus === 'VISA_STAMPED' || s.applicationStatus === 'TRAVELLING' || s.applicationStatus === 'COMPLETED').length; }
  get kpiReadyToTravel(): number { return this.students.filter(s => s.applicationStatus === 'READY_TO_TRAVEL').length; }

  get kpiAdmissionLetterPct(): string { return this.kpiTotalStudents ? (this.kpiAdmissionLetter / this.kpiTotalStudents * 100).toFixed(1) : '0.0'; }
  get kpiTelexIssuedPct(): string { return this.kpiTotalStudents ? (this.kpiTelexIssued / this.kpiTotalStudents * 100).toFixed(1) : '0.0'; }
  get kpiVisaStampedPct(): string { return this.kpiTotalStudents ? (this.kpiVisaStamped / this.kpiTotalStudents * 100).toFixed(1) : '0.0'; }
  get kpiReadyToTravelPct(): string { return this.kpiTotalStudents ? (this.kpiReadyToTravel / this.kpiTotalStudents * 100).toFixed(1) : '0.0'; }

  get filteredAllStudents(): Student[] {
    let filtered = this.students;
    if (this.allStudentsUniversity !== 'all') {
      filtered = filtered.filter(s => s.college?.collegeName === this.allStudentsUniversity);
    }
    if (this.allStudentsStatus !== 'all') {
      if (this.allStudentsStatus === 'ADMISSION_LETTER_ISSUED') {
        filtered = filtered.filter(s => !!s.admissionLetterPath);
      } else if (this.allStudentsStatus === 'TELEX_ISSUED') {
        filtered = filtered.filter(s => !!s.telexNumber);
      } else if (this.allStudentsStatus === 'VISA_STAMPED') {
        filtered = filtered.filter(s => s.applicationStatus === 'VISA_STAMPED' || s.applicationStatus === 'TRAVELLING' || s.applicationStatus === 'COMPLETED');
      } else {
        // Fallback for others (like REGISTERED)
        filtered = filtered.filter(s => s.applicationStatus === this.allStudentsStatus || (this.allStudentsStatus === 'ADMISSION_APPLIED' && (s.applicationStatus === 'Submitted' || s.applicationStatus === 'UNDER_REVIEW')));
      }
    }
    // Intake filter is a placeholder for now as it's missing from DB
    if (this.allStudentsIntake !== 'all') {
      // ...
    }
    // Date filter
    if (this.allStudentsDateRange) {
      // basic date filtering logic placeholder
    }

    if (this.allStudentsSearch) {
      const q = this.allStudentsSearch.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName?.toLowerCase().includes(q) ||
        s.applicationId?.toLowerCase().includes(q) ||
        s.contactNo?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  get paginatedAllStudents(): Student[] {
    const startIndex = (this.allStudentsCurrentPage - 1) * this.allStudentsPageSize;
    return this.filteredAllStudents.slice(startIndex, startIndex + this.allStudentsPageSize);
  }

  get allStudentsTotalPages(): number {
    return Math.ceil(this.filteredAllStudents.length / this.allStudentsPageSize);
  }

  allStudentsGoToPage(page: number) {
    if (page >= 1 && page <= this.allStudentsTotalPages) {
      this.allStudentsCurrentPage = page;
    }
  }

  clearAllStudentsFilters() {
    this.allStudentsSearch = '';
    this.allStudentsUniversity = 'all';
    this.allStudentsStatus = 'all';
    this.allStudentsIntake = 'all';
    this.allStudentsDateRange = '';
    this.allStudentsCurrentPage = 1;
  }

  // --- Assigned Tasks Advanced Filters & Pagination ---
  assignedTasksSearch: string = '';
  assignedTasksUniversity: string = 'all';
  assignedTasksActionFilter: 'ALL' | 'REJECTED' | 'TELEX' | 'DOCS' | 'VISA' | 'TRAVEL' = 'ALL';

  assignedTasksCurrentPage: number = 1;
  assignedTasksPageSize: number = 25;

  get studentDrafts(): any[] {
    const draftsStr = localStorage.getItem('agent_student_drafts') || '[]';
    try {
      const drafts = JSON.parse(draftsStr);
      return Array.isArray(drafts) ? drafts : [];
    } catch {
      return [];
    }
  }

  get filteredAssignedTasks(): any[] {
    let tasks: any[] = this.students.filter(s => this.showInitiateTelexButton(s) || this.showRequestDocsButton(s) || this.showVisaPaymentButton(s) || this.showRequestVisaStampingButton(s) || ((s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT') && s['action'] === 'SUBMIT_TRAVEL_DETAILS') || s.applicationStatus === 'REJECTED');

    const drafts = this.studentDrafts.map(d => ({
      ...d,
      applicationId: 'DRAFT',
      applicationStatus: 'DRAFT',
      college: this.agentData?.collegeAccess?.find((c: any) => c.college.id === Number(d.selectedCollegeId))?.college || { collegeName: 'Not Selected' }
    }));
    if (this.assignedTasksActionFilter === 'ALL') {
      tasks = [...drafts, ...tasks];
    } else if (this.assignedTasksActionFilter === 'REJECTED') {
      tasks = tasks.filter(s => s.applicationStatus === 'REJECTED');
    } else if (this.assignedTasksActionFilter === 'TELEX') {
      tasks = tasks.filter(s => this.showInitiateTelexButton(s));
    } else if (this.assignedTasksActionFilter === 'DOCS') {
      tasks = tasks.filter(s => this.showRequestDocsButton(s));
    } else if (this.assignedTasksActionFilter === 'VISA') {
      tasks = tasks.filter(s => this.showVisaPaymentButton(s));
    } else if (this.assignedTasksActionFilter === 'TRAVEL') {
      tasks = tasks.filter(s => (s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT') && s['action'] === 'SUBMIT_TRAVEL_DETAILS');
    }

    if (this.assignedTasksUniversity !== 'all') {
      tasks = tasks.filter(s => s.college?.collegeName === this.assignedTasksUniversity);
    }

    if (this.assignedTasksSearch) {
      const q = this.assignedTasksSearch.toLowerCase();
      tasks = tasks.filter(s =>
        s.fullName?.toLowerCase().includes(q) ||
        s.applicationId?.toLowerCase().includes(q) ||
        s.contactNo?.toLowerCase().includes(q)
      );
    }
    return tasks;
  }

  get paginatedAssignedTasks(): Student[] {
    const startIndex = (this.assignedTasksCurrentPage - 1) * this.assignedTasksPageSize;
    return this.filteredAssignedTasks.slice(startIndex, startIndex + this.assignedTasksPageSize);
  }

  get assignedTasksTotalPages(): number {
    return Math.ceil(this.filteredAssignedTasks.length / this.assignedTasksPageSize) || 1;
  }

  assignedTasksGoToPage(page: number) {
    if (page >= 1 && page <= this.assignedTasksTotalPages) {
      this.assignedTasksCurrentPage = page;
    }
  }

  clearAssignedTasksFilters() {
    this.assignedTasksSearch = '';
    this.assignedTasksUniversity = 'all';
    this.assignedTasksActionFilter = 'ALL';
    this.assignedTasksCurrentPage = 1;
  }

  // --- Telex Dashboard View State ---
  telexSearchQuery: string = '';
  telexUniversityFilter: string = 'all';
  telexStatusFilter: string = 'all';
  telexDateFilter: string = '';
  telexCurrentPage: number = 1;
  telexPageSize: number = 10;
  showRecentIssued: boolean = false;

  getTelexCategory(s: Student): string {
    if (s.telexNumber || s.applicationStatus === StudentStatus.TELEX_NUMBER_ISSUED) {
      return 'ISSUED';
    }
    if (s.applicationStatus === StudentStatus.TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY ||
      s.applicationStatus === StudentStatus.TELEX_APPLICATION_SUBMITTED_TO_MEA ||
      s.telexDocumentsPath) {
      return 'IN_PROCESS';
    }
    if (s.applicationStatus === StudentStatus.REJECTED_BY_TELEX) {
      return 'REJECTED';
    }
    // Check if Telex Manager is assigned
    if (s.telexMan && (s.applicationStatus === StudentStatus.TELEX_INITIATED || s.applicationStatus === StudentStatus.APPLIED_FOR_TELEX)) {
      return 'PENDING';
    }

    if (s.applicationStatus === StudentStatus.TELEX_INITIATED ||
      s.applicationStatus === StudentStatus.APPLIED_FOR_TELEX ||
      s.applicationStatus === 'TELEX_PAYMENT_DOCS_SUBMITTED') {
      return 'INITIATED';
    }
    return 'ELIGIBLE';
  }

  get allTelexStudents(): Student[] {
    if (!this.students) return [];
    return this.students.filter(s => {
      if (s.telexNumber) return true;
      const telexStatuses = [
        StudentStatus.APPLIED_FOR_TELEX,
        StudentStatus.TELEX_INITIATED,
        StudentStatus.TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY,
        StudentStatus.TELEX_APPLICATION_SUBMITTED_TO_MEA,
        StudentStatus.TELEX_NUMBER_ISSUED,
        StudentStatus.ADMISSION_LETTER_APPROVED,
        StudentStatus.REJECTED_BY_TELEX
      ];
      if (telexStatuses.includes(s.applicationStatus as StudentStatus)) return true;
      if (s['action'] === 'INITIATE_TELEX' && (s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT')) return true;
      return false;
    });
  }

  get telexTotalRequests(): number {
    return this.allTelexStudents.length;
  }

  get telexPendingCount(): number {
    return this.allTelexStudents.filter(s => this.getTelexCategory(s) === 'PENDING').length;
  }

  get telexIssuedCount(): number {
    return this.allTelexStudents.filter(s => this.getTelexCategory(s) === 'ISSUED').length;
  }

  get telexInProcessCount(): number {
    return this.allTelexStudents.filter(s => this.getTelexCategory(s) === 'IN_PROCESS').length;
  }

  get telexEligibleCount(): number {
    return this.allTelexStudents.filter(s => this.getTelexCategory(s) === 'ELIGIBLE').length;
  }

  get recentIssuedTelexStudents(): Student[] {
    const issued = this.allTelexStudents.filter(s => this.getTelexCategory(s) === 'ISSUED');
    issued.sort((a, b) => {
      const dateA = a.telexIssueDate ? new Date(a.telexIssueDate).getTime() : 0;
      const dateB = b.telexIssueDate ? new Date(b.telexIssueDate).getTime() : 0;
      return dateB - dateA;
    });
    return issued.slice(0, 5);
  }

  get filteredTelexStudents(): Student[] {
    let filtered = this.allTelexStudents;

    if (this.telexUniversityFilter !== 'all') {
      filtered = filtered.filter(s => s.college?.collegeName === this.telexUniversityFilter);
    }

    if (this.telexStatusFilter !== 'all') {
      filtered = filtered.filter(s => this.getTelexCategory(s) === this.telexStatusFilter);
    }

    if (this.telexDateFilter) {
      filtered = filtered.filter(s => {
        if (!s.telexRequestDate) return false;
        const studentDate = new Date(s.telexRequestDate).toISOString().split('T')[0];
        return studentDate === this.telexDateFilter;
      });
    }

    if (this.telexSearchQuery) {
      const q = this.telexSearchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName?.toLowerCase().includes(q) ||
        s.applicationId?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        (s.telexNumber && s.telexNumber.toLowerCase().includes(q))
      );
    }
    // Sort by requested date (telexRequestDate), latest at top
    filtered.sort((a, b) => {
      const dateA = a.telexRequestDate ? new Date(a.telexRequestDate).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.telexRequestDate ? new Date(b.telexRequestDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA;
    });

    return filtered;
  }

  get paginatedTelexStudents(): Student[] {
    const startIndex = (this.telexCurrentPage - 1) * this.telexPageSize;
    return this.filteredTelexStudents.slice(startIndex, startIndex + this.telexPageSize);
  }

  get telexTotalPages(): number {
    return Math.ceil(this.filteredTelexStudents.length / this.telexPageSize) || 1;
  }

  telexGoToPage(page: number) {
    if (page >= 1 && page <= this.telexTotalPages) {
      this.telexCurrentPage = page;
    }
  }

  get paginatedDocStudents(): Student[] {
    const startIndex = (this.docCurrentPage - 1) * this.docPageSize;
    return this.filteredStudents.slice(startIndex, startIndex + this.docPageSize);
  }

  get docTotalPages(): number {
    return Math.ceil(this.filteredStudents.length / this.docPageSize) || 1;
  }

  docGoToPage(page: number) {
    if (page >= 1 && page <= this.docTotalPages) {
      this.docCurrentPage = page;
    }
  }

  clearDocFilters() {
    this.searchQuery = '';
    this.docCollegeFilter = 'All';
    this.docStatusFilter = 'All';
    this.docCurrentPage = 1;
  }

  clearTelexFilters() {
    this.telexSearchQuery = '';
    this.telexUniversityFilter = 'all';
    this.telexStatusFilter = 'all';
    this.telexDateFilter = '';
    this.telexCurrentPage = 1;
  }

  getDistinctColleges(): string[] {
    if (!this.students) return [];
    const colleges = this.students
      .map(s => s.college?.collegeName)
      .filter((name): name is string => !!name);
    return [...new Set(colleges)].sort();
  }

  getTelexStatusDisplay(s: Student): { label: string, class: string, icon: string, tooltip: string } {
    const category = this.getTelexCategory(s);
    if (category === 'ISSUED') {
      return { label: 'Issued', class: 'status-issued', icon: 'check-circle', tooltip: 'TELEX number has been issued' };
    }
    if (category === 'PENDING') {
      return { label: 'Pending', class: 'status-pending', icon: 'clock', tooltip: 'Verification SuccessFul -  Your appplication is now with Telex Person' };
    }
    if (category === 'IN_PROCESS') {
      return { label: 'In Process', class: 'status-in-process', icon: 'settings', tooltip: 'Telex man started working on it will release the TELEX NUMBER' };
    }
    if (category === 'INITIATED') {
      return { label: 'Initiated', class: 'status-initiated', icon: 'file-text', tooltip: 'You have initaited the telex. accountant and doc person will process now' };
    }
    if (category === 'REJECTED') {
      return { label: 'Rejected by Telex', class: 'status-rejected', icon: 'x-circle', tooltip: 'Telex Manager rejected the verification. Please reapply.' };
    }
    return { label: 'ELIGIBLE', class: 'status-initiated', icon: 'file-text', tooltip: 'Please initiate telex' };
  }




  // --- Visa Dashboard View State ---
  visaSearchQuery: string = '';
  visaUniversityFilter: string = 'all';
  visaStatusFilter: string = 'all';
  visaDateFilter: string = '';
  visaCurrentPage: number = 1;
  visaPageSize: number = 10;
  showRecentIssuedVisa: boolean = false;

  getVisaCategory(s: Student): string {
    if (s.applicationStatus === StudentStatus.VISA_STAMPED) {
      return 'VISA_STAMPED';
    }
    // Application is in process once applied
    const inProcessStatuses = [
      StudentStatus.VISA_APPLIED,
      StudentStatus.PASSPORT_SUBMITTED_TO_EMBASSY,
      StudentStatus.PASSPORT_COLLECTED,
      StudentStatus.VISA_FEE_RECEIVED,
      StudentStatus.VISA_PAYMENT_CONFIRMED
    ];
    if (inProcessStatuses.includes(s.applicationStatus as StudentStatus)) {
      return 'IN_PROCESS';
    }
    // Fee requested but not yet paid fully
    if (s.visaPaymentRequestedAmount != null && s.visaPaymentReceivedDate == null) {
      return 'VISA_FEE_PENDING';
    }
    // If assigned to Visa man but fee not requested, it's pending to apply
    if (s.visaMan) {
      return 'PENDING_FOR_APPLY_VISA';
    }
    return 'PENDING_FOR_APPLY_VISA';
  }

  get allVisaStudents(): Student[] {
    if (!this.students) return [];
    return this.students.filter(s => s.visaMan != null || s.applicationStatus === StudentStatus.VISA_STAMPED);
  }

  get visaTotalRequests(): number {
    return this.allVisaStudents.length;
  }

  get visaPendingCount(): number {
    return this.allVisaStudents.filter(s => this.getVisaCategory(s) === 'PENDING_FOR_APPLY_VISA').length;
  }

  get visaIssuedCount(): number {
    return this.allVisaStudents.filter(s => this.getVisaCategory(s) === 'VISA_STAMPED').length;
  }

  get visaInProcessCount(): number {
    return this.allVisaStudents.filter(s => this.getVisaCategory(s) === 'IN_PROCESS').length;
  }

  get visaPaymentPendingCount(): number {
    return this.allVisaStudents.filter(s => this.getVisaCategory(s) === 'VISA_FEE_PENDING').length;
  }

  get recentIssuedVisaStudents(): Student[] {
    const issued = this.allVisaStudents.filter(s => this.getVisaCategory(s) === 'VISA_STAMPED');
    issued.sort((a, b) => {
      // Sort by whatever date you have, assuming createdAt for now or visa issue date if added later
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    return issued.slice(0, 5);
  }

  get filteredVisaStudents(): Student[] {
    let filtered = this.allVisaStudents;

    if (this.visaSearchQuery) {
      const q = this.visaSearchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName?.toLowerCase().includes(q) ||
        s.studentRollNo?.toLowerCase().includes(q) ||
        s.universityRegNo?.toLowerCase().includes(q)
      );
    }

    if (this.visaUniversityFilter !== 'all') {
      filtered = filtered.filter(s => s.college?.collegeName === this.visaUniversityFilter);
    }

    if (this.visaStatusFilter !== 'all') {
      filtered = filtered.filter(s => this.getVisaCategory(s) === this.visaStatusFilter);
    }

    if (this.visaDateFilter) {
      const filterDate = new Date(this.visaDateFilter).toDateString();
      filtered = filtered.filter(s => {
        const d = s.createdAt ? new Date(s.createdAt) : null;
        return d && d.toDateString() === filterDate;
      });
    }

    filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return filtered;
  }

  get paginatedVisaStudents(): Student[] {
    const startIndex = (this.visaCurrentPage - 1) * this.visaPageSize;
    return this.filteredVisaStudents.slice(startIndex, startIndex + this.visaPageSize);
  }

  changeVisaPage(page: number): void {
    this.visaCurrentPage = page;
  }

  get visaTotalPages(): number {
    return Math.ceil(this.filteredVisaStudents.length / this.visaPageSize) || 1;
  }

  visaGoToPage(page: number): void {
    if (page >= 1 && page <= this.visaTotalPages) {
      this.visaCurrentPage = page;
    }
  }

  clearVisaFilters(): void {
    this.visaSearchQuery = '';
    this.visaUniversityFilter = 'all';
    this.visaStatusFilter = 'all';
    this.visaDateFilter = '';
    this.visaCurrentPage = 1;
  }

  getVisaStatusDisplay(s: Student): { label: string, class: string, icon: string, tooltip: string } {
    const category = this.getVisaCategory(s);
    if (category === 'VISA_STAMPED') {
      return { label: 'Visa Stamped', class: 'status-issued', icon: 'check-circle', tooltip: 'Visa has been successfully stamped' };
    }
    if (category === 'VISA_FEE_PENDING') {
      return { label: 'Visa Payment Pending', class: 'status-pending', icon: 'clock', tooltip: 'Visa fee requested, waiting for payment' };
    }
    if (category === 'IN_PROCESS') {
      return { label: 'Visa In Process', class: 'status-in-process', icon: 'settings', tooltip: 'Application is being processed by Visa Man' };
    }
    if (category === 'PENDING_FOR_APPLY_VISA') {
      return { label: 'Pending for Apply Visa', class: 'status-initiated', icon: 'file-text', tooltip: 'Eligible for Visa. Pending action.' };
    }
    return { label: 'Pending for Apply Visa', class: 'status-initiated', icon: 'file-text', tooltip: 'Eligible for Visa. Pending action.' };
  }

  // --- Dashboard Dynamic Filter State ---
  selectedDashboardCollegeId: string = 'all';
  selectedDashboardDate: string = '';
  dashboardSearchQuery: string = '';

  get filteredStudentsForDashboard(): Student[] {
    let filtered = this.students;
    if (this.selectedDashboardCollegeId !== 'all') {
      filtered = filtered.filter(s => s.college?.collegeName === this.selectedDashboardCollegeId || s.college?.id?.toString() === this.selectedDashboardCollegeId);
    }
    if (this.selectedDashboardDate) {
      filtered = filtered.filter(s => {
        if (!s.createdAt) return false;
        const sDate = new Date(s.createdAt).toISOString().split('T')[0];
        return sDate === this.selectedDashboardDate;
      });
    }
    if (this.dashboardSearchQuery.trim()) {
      const q = this.dashboardSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(s =>
        s.fullName?.toLowerCase().includes(q) ||
        s.applicationId?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.passportNo?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  get dynamicDashboardStats() {
    const students = this.filteredStudentsForDashboard;
    return {
      totalStudents: students.length,
      activeStudents: students.filter(s => !['VISA_STAMPED', 'READY_FOR_TRAVEL', 'REJECTED'].includes(s.applicationStatus)).length,
      visaApproved: students.filter(s => s.applicationStatus === 'VISA_STAMPED' || s.applicationStatus === 'READY_FOR_TRAVEL').length,
      visaRejected: students.filter(s => s.applicationStatus === 'REJECTED').length
    };
  }

  get dynamicStatusBreakdown() {
    const students = this.filteredStudentsForDashboard;
    const breakdownMap = new Map<string, number>();
    for (const s of students) {
      const status = s.applicationStatus;
      breakdownMap.set(status, (breakdownMap.get(status) || 0) + 1);
    }
    return Array.from(breakdownMap.entries()).map(([status, count]) => ({ status, count }));
  }

  get dynamicCollegeDistribution() {
    if (!this.agentData?.collegeAccess) return [];
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const students = this.filteredStudentsForDashboard;

    return this.agentData.collegeAccess.map((access: any, idx: number) => {
      const collegeName = access.college?.collegeName || 'Unknown College';
      const studentCount = students.filter(s => s.college?.id?.toString() === access.college?.id?.toString() || s.college?.collegeName === collegeName).length;
      return { collegeName, count: studentCount, color: colors[idx % colors.length] };
    }).filter(c => c.count > 0);
  }

  get dynamicRecentActivities() {
    return this.recentActivities.filter(a => {
      if (this.selectedDashboardCollegeId === 'all') return true;
      const s = this.students.find(st => st.fullName === a.studentName); // Approximate check
      return s ? (s.college?.collegeName === this.selectedDashboardCollegeId || s.college?.id?.toString() === this.selectedDashboardCollegeId) : true;
    });
  }

  get dynamicPendingActions() {
    const students = this.filteredStudentsForDashboard;
    const pendingList: any[] = [];

    // Telex Eligible
    students.filter(s => s['action'] === 'INITIATE_TELEX' && (s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT'))
      .forEach(s => pendingList.push({ student: s, taskName: 'Initiate Telex', actionText: 'Initiate TELEX', actionClass: 'btn-telex', type: 'TELEX' }));

    // Visa Payment
    students.filter(s => s['action'] === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT' && (s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT'))
      .forEach(s => pendingList.push({ student: s, taskName: 'Visa Payment', actionText: 'Pay Visa', actionClass: 'btn-payment', type: 'PAYMENT' }));

    // Doc Return
    students.filter(s => s.applicationStatus === 'VISA_STAMPED' && s.canRequestDocReturn === true)
      .forEach(s => pendingList.push({ student: s, taskName: 'Request Passport', actionText: 'Request Passport', actionClass: 'btn-passport', type: 'PASSPORT' }));

    // Visa Stamping
    students.filter(s => s['action'] === 'NEED_TO_REQUEST_VISA_STAMPING' && (s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT'))
      .forEach(s => pendingList.push({ student: s, taskName: 'Visa Stamping', actionText: 'Request Stamping', actionClass: 'btn-telex', type: 'VISA_STAMPING' }));

    // Rejected
    students.filter(s => s.applicationStatus === 'REJECTED')
      .forEach(s => pendingList.push({ student: s, taskName: 'Rejected', actionText: 'Review Rejection', actionClass: 'btn-reject', type: 'REJECTED' }));

    return pendingList.slice(0, 5);
  }

  get dynamicUpcomingTravels() {
    const students = this.filteredStudentsForDashboard;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);

    const travels: any[] = [];
    students.forEach(s => {
      if (s.travelDoj) {
        const travelDate = new Date(s.travelDoj);
        travelDate.setHours(0, 0, 0, 0);
        if (travelDate >= oneWeekAgo) {
          const isUpcoming = travelDate >= now;
          travels.push({
            student: s,
            statusLabel: isUpcoming ? 'Upcoming' : 'Recently Travelled',
            statusClass: isUpcoming ? 'badge-upcoming' : 'badge-past'
          });
        }
      }
    });

    return travels.sort((a, b) => new Date(a.student.travelDoj).getTime() - new Date(b.student.travelDoj).getTime()).slice(0, 3);
  }

  get travelingThisMonthCount(): number {
    const students = this.filteredStudentsForDashboard;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return students.filter(s => {
      if (!s.travelDoj) return false;
      const travelDate = new Date(s.travelDoj);
      return travelDate.getMonth() === currentMonth && travelDate.getFullYear() === currentYear;
    }).length;
  }

  handlePendingAction(item: any): void {
    if (item.type === 'TELEX') this.openTelexModal(item.student);
    if (item.type === 'PAYMENT') this.openPaymentConfirmationModal(item.student);
    if (item.type === 'PASSPORT') this.openRequestDocsModal(item.student);
    if (item.type === 'VISA_STAMPING') this.openRequestVisaModal(item.student);
    if (item.type === 'REJECTED') this.viewStudentDetails(item.student);
  }

  onDashboardCollegeChange(event: any): void {
    this.selectedDashboardCollegeId = event.target.value;
    this.updateDashboardCharts();
  }

  onDashboardDateChange(event: any): void {
    this.selectedDashboardDate = event.target.value;
    this.updateDashboardCharts();
  }

  onDashboardSearch(): void {
    this.updateDashboardCharts();
  }

  clearFilters(): void {
    this.selectedDashboardCollegeId = 'all';
    this.selectedDashboardDate = '';
    this.dashboardSearchQuery = '';
    this.updateDashboardCharts();
  }

  goToCreateDocRequest(): void {
    this.docRequestActiveTab = 'list';
    this.navigateTo('request-doc');
  }

  updateDashboardCharts(): void {
    this.cdr.detectChanges();
  }

  // --- New Dashboard Data ---
  dashboardStats: DashboardStats | null = null;
  statusBreakdown: StatusBreakdown[] = [];
  recentActivities: DashboardActivity[] = [];

  dashboardTasks: any[] = [];
  collegeDistribution: any[] = [];

  // --- Travel Management ---
  travelSearchQuery = '';
  selectedTravelStudent: Student | null = null;
  travelForm!: FormGroup;
  travelTicketFile: File | null = null;
  isSubmittingTravel = false;
  travelMgmtFilterStatus: string = 'ALL';
  travelMgmtFilterUniversity: string = 'ALL';
  travelMgmtFilterDate: string = '';
  travelMgmtCurrentPage: number = 1;
  travelMgmtPageSize: number = 10;

  get travelMgmtStudents(): Student[] {
    return this.students.filter(s =>
      s.applicationStatus === 'VISA_STAMPED' ||
      s.applicationStatus === 'TRAVELLING' ||
      s.applicationStatus === 'COMPLETED'
    );
  }

  travelCalendarDate: Date = new Date();

  get travelCalendarMonthName(): string {
    return this.travelCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  get travelCalendarDays(): any[] {
    const year = this.travelCalendarDate.getFullYear();
    const month = this.travelCalendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const travelCounts: { [key: string]: number } = {};
    this.travelMgmtStudents.forEach(s => {
      const dojStr = s.travelDoj || s.documentReturnRequest?.travelDate;
      if (dojStr) {
        const d = new Date(dojStr);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          travelCounts[key] = (travelCounts[key] || 0) + 1;
        }
      }
    });

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const count = travelCounts[dateStr] || 0;
      let intensity = 0;
      if (count > 0 && count <= 2) intensity = 1;
      else if (count >= 3 && count <= 5) intensity = 2;
      else if (count > 5) intensity = 3;

      days.push({
        dayNumber: i,
        dateString: dateStr,
        count: count,
        intensity: intensity
      });
    }
    return days;
  }

  prevTravelMonth() {
    this.travelCalendarDate = new Date(this.travelCalendarDate.getFullYear(), this.travelCalendarDate.getMonth() - 1, 1);
  }

  nextTravelMonth() {
    this.travelCalendarDate = new Date(this.travelCalendarDate.getFullYear(), this.travelCalendarDate.getMonth() + 1, 1);
  }

  selectTravelCalendarDate(dateString: string) {
    if (this.travelMgmtFilterDate === dateString) {
      this.travelMgmtFilterDate = ''; // deselect
    } else {
      this.travelMgmtFilterDate = dateString;
    }
    this.travelMgmtCurrentPage = 1;
  }

  get travelStats() {
    const all = this.travelMgmtStudents;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const today = new Date(now);

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);

    let todayStudents: any[] = [];
    let tomorrowStudents: any[] = [];
    let upcomingStudents: any[] = [];
    let recentPastStudents: any[] = [];

    all.forEach(s => {
      const dojStr = s.travelDoj || s.documentReturnRequest?.travelDate;
      if (dojStr) {
        const doj = new Date(dojStr);
        if (!isNaN(doj.getTime())) {
          const dojDate = new Date(doj);
          dojDate.setHours(0, 0, 0, 0);

          if (dojDate.getTime() === today.getTime()) {
            todayStudents.push({ name: s.fullName, date: dojStr, airline: s.travelAirlines || 'TBD' });
          } else if (dojDate.getTime() === tomorrow.getTime()) {
            tomorrowStudents.push({ name: s.fullName, date: dojStr, airline: s.travelAirlines || 'TBD' });
          } else if (dojDate > tomorrow && dojDate <= nextWeek) {
            upcomingStudents.push({ name: s.fullName, date: dojStr, airline: s.travelAirlines || 'TBD' });
          } else if (dojDate < today && dojDate >= lastWeek) {
            recentPastStudents.push({ name: s.fullName, date: dojStr, airline: s.travelAirlines || 'TBD' });
          }
        }
      }
    });

    todayStudents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    tomorrowStudents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    upcomingStudents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    recentPastStudents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      total: all.length,
      updated: all.filter(s => !!s.travelDoj || !!s.travelAirlines).length,
      ticketPending: all.filter(s => !s.travelTicketPdfPath && !s.documentReturnRequest?.ticketPdfPath).length,
      pickupPending: all.filter(s => s.applicationStatus === 'TRAVELLING' && !s.isReturnReceivedByStudent).length,
      arrived: all.filter(s => s.applicationStatus === 'COMPLETED').length,
      today: todayStudents,
      tomorrow: tomorrowStudents,
      upcomingWeek: upcomingStudents,
      lastWeek: recentPastStudents
    };
  }

  get filteredTravelMgmtStudents(): Student[] {
    let filtered = this.travelMgmtStudents;
    if (this.travelSearchQuery) {
      const q = this.travelSearchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.applicationId?.toLowerCase().includes(q)
      );
    }
    if (this.travelMgmtFilterStatus !== 'ALL') {
      if (this.travelMgmtFilterStatus === 'DETAILS_UPDATED') {
        filtered = filtered.filter(s => !!s.travelDoj || !!s.travelAirlines);
      } else if (this.travelMgmtFilterStatus === 'TICKET_PENDING') {
        filtered = filtered.filter(s => !s.travelTicketPdfPath && !s.documentReturnRequest?.ticketPdfPath);
      } else if (this.travelMgmtFilterStatus === 'ARRIVED') {
        filtered = filtered.filter(s => s.applicationStatus === 'COMPLETED');
      } else {
        filtered = filtered.filter(s => s.applicationStatus === this.travelMgmtFilterStatus);
      }
    }
    if (this.travelMgmtFilterUniversity !== 'ALL') {
      filtered = filtered.filter(s => s.college?.collegeName === this.travelMgmtFilterUniversity);
    }
    if (this.travelMgmtFilterDate) {
      filtered = filtered.filter(s => {
        const doj = s.travelDoj || s.documentReturnRequest?.travelDate;
        return doj && doj.startsWith(this.travelMgmtFilterDate);
      });
    }
    return filtered;
  }

  get paginatedTravelMgmtStudents(): Student[] {
    const start = (this.travelMgmtCurrentPage - 1) * this.travelMgmtPageSize;
    return this.filteredTravelMgmtStudents.slice(start, start + this.travelMgmtPageSize);
  }

  get travelMgmtTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTravelMgmtStudents.length / this.travelMgmtPageSize));
  }

  clearTravelMgmtFilters(): void {
    this.travelSearchQuery = '';
    this.travelMgmtFilterStatus = 'ALL';
    this.travelMgmtFilterUniversity = 'ALL';
    this.travelMgmtFilterDate = '';
    this.travelMgmtCurrentPage = 1;
  }

  viewTravelStudent(student: Student): void {
    this.selectedTravelStudent = student;
    this.travelForm.patchValue({
      travelDoj: student.travelDoj || '',
      travelAirlines: student.travelAirlines || '',
      travelSource: student.travelSource || '',
      travelDestination: student.travelDestination || ''
    });
  }

  getTravelStatus(s: Student): string {
    if (s.applicationStatus === 'COMPLETED') return 'Arrived';
    if (s.travelDoj && s.travelAirlines && (s.travelTicketPdfPath || s.documentReturnRequest?.ticketPdfPath)) return 'Ticket Booked';
    if (s.travelDoj || s.travelAirlines) return 'Details Updated';
    return 'Ticket Pending';
  }

  getTravelStatusColor(s: Student): string {
    const status = this.getTravelStatus(s);
    if (status === 'Arrived') return '#10b981';
    if (status === 'Ticket Booked') return '#2563eb';
    if (status === 'Details Updated') return '#8b5cf6';
    return '#f59e0b';
  }

  // --- Filters ---
  searchQuery: string = '';
  statusFilter: string = 'all';

  // --- Modals ---
  isHistoryModalOpen = false;
  selectedStudentForHistory: any | null = null;

  // --- Telex Modal State ---
  isTelexModalOpen = false;

  isSuccessModalOpen = false;
  studentForTelex: Student | null = null;

  // --- Logout Confirmation Modal ---
  isLogoutModalOpen = false;

  // --- Logout Messages ---
  logoutMessages = [
    'Great work today! See you soon!',
    'You made a difference today! Rest well!',
    'Your dedication inspires us! Come back refreshed!',
    'Another day of excellence! Take care!',
    'Thank you for your amazing efforts! Until next time!',
    'You are a star! See you tomorrow!',
    'Mission accomplished! Time to recharge!',
    'Your hard work matters! Stay blessed!',
    'Take a moment to celebrate your wins! Bye for now!',
    'Goals achieved! You deserve a break!',
    'Your positive energy brightens our day! See you!',
    'Creativity and dedication - you have both! Rest up!',
    'Strong work ethic! Time to relax!',
    'Keep blooming! We appreciate you!',
    'You bring harmony to the team! Until next time!',
    'Champion mindset! Take a well-deserved break!',
    'Stars shine brighter because of people like you! Goodnight!',
    'Your transformation of students\' lives is beautiful! See you!',
    'You are precious to this team! Stay safe!'
  ];
  currentLogoutMessage = '';

  // --- Telex Form State ---
  telexForm!: FormGroup;
  currentStep = 1;
  totalSteps = 3;
  isSubmittingTelex = false;

  // File storage
  visaPhotoFile: File | null = null;
  visaPassportCopyFile: File | null = null;
  ttCopyFile: File | null = null;
  paymentConfirmationFile: File | null = null;
  visaPhotoPreviewUrl: string | ArrayBuffer | null = null;
  visaPassportCopyPreviewUrl: string | ArrayBuffer | null = null;
  isLoadingVisaPhoto = false;
  isLoadingPassportCopy = false;

  // --- Validation Modal State ---
  isValidationModalOpen = false;
  validationMessage = '';

  // --- Visa Payment Modal State ---
  showPaymentConfirmationModal = false;
  selectedPaymentStudent: any = null;
  paymentAmount: number = 0;
  paymentCurrency: string = 'INR';
  transactionId: string = '';
  confirmationFile: File | null = null;
  isSubmittingPayment = false;
  isPaymentSuccessModalOpen = false;

  // --- Toast State ---
  showPassword = false;

  // Pagination for Document Return
  docCurrentPage: number = 1;
  docPageSize: number = 10;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  // --- Doc Request State ---
  docRequestActiveTab: 'new' | 'list' = 'list';
  docRequests: any[] = [];
  docRequestStudentId: number | null = null;
  docRequestStudentSearch: string = '';
  docRequestStudentSuggestions: any[] = [];
  docRequestShowSuggestions = false;
  docRequestDocType: string = '';
  docRequestCustomName: string = '';
  docRequestRemarks: string = '';

  // List Filters
  docRequestListSearch: string = '';
  docRequestListStatus: string = 'ALL';
  docRequestSelectedStudent: any = null;

  // Pagination
  docRequestCurrentPage: number = 1;
  docRequestPageSize: number = 10;


  // Document Return Stats
  docStats = {
    total: 0,
    pending: 0,
    ready: 0,
    returned: 0,
    received: 0,
    pendingPercent: '0.0',
    readyPercent: '0.0',
    returnedPercent: '0.0',
    receivedPercent: '0.0'
  };
  docStatusFilter: string = 'All';
  docCollegeFilter: string = 'All';
  isAirTicketBooked: string = '';
  isSubmittingDocRequest = false;
  docTypeOptions = [
    { value: 'LOAN_LETTER', label: 'Loan Letter' },
    { value: 'BONAFIDE_CERTIFICATE', label: 'Bonafide Certificate' },
    { value: 'FEE_STRUCTURE', label: 'Fee Structure' },
    { value: 'ENROLLMENT_LETTER', label: 'Enrollment Letter' },
    { value: 'NOC', label: 'No Objection Certificate (NOC)' },
    { value: 'MIGRATION_CERTIFICATE', label: 'Migration Certificate' },
    { value: 'CHARACTER_CERTIFICATE', label: 'Character Certificate' },
    { value: 'TRANSFER_CERTIFICATE', label: 'Transfer Certificate' },
    { value: 'SCHOLARSHIP_LETTER', label: 'Scholarship Letter' },
    { value: 'OTHER', label: 'Other (Custom)' }
  ];

  // Standardized List of Visa Issuance Places
  visaIssuancePlaces: string[] = [
    'Vienna', 'Baku', 'Kabul', 'Brussels', 'London', 'Berlin', 'Cairo', 'Tel Aviv',
    'New-Delhi', 'Jakarta', 'Tehran', 'Madrid', 'Rome', 'Almaty', 'Beijing', 'Riyadh',
    'Kuwait', 'Bishkek', 'Riga', 'Kuala Lumpur', 'Abu Dhabi', 'Islamabad', 'Warsaw',
    'Moscow', 'Singapore', 'Washington', 'Dushanbe', 'Ashkhabad', 'Ankara', 'Kiev',
    'Paris', 'Seoul', 'Tokyo', 'Athens', 'Bangkok', 'Jeddah', 'Dubai', 'Novosibirsk',
    'New-York', 'Istanbul', 'Shanghai', 'Frankfurt am Main', 'Mazare-Sharif',
    'Tashkent (Airport)', 'Tashkent (MFA)', 'Termez', 'Samarkand', 'Bukhara',
    'Urgench', 'Nukus', 'Saint-Petersburg', 'Minsk', 'Astana', 'Vladivostok',
    'Ekaterinburg', 'Kazan', 'Muscat', 'Rostov on Don', 'Aktau', 'Guangzhou',
    'Stockholm', 'Budapest', 'Qatar', 'Fergana (Airport)', 'Osh'
  ].sort();

  // Countries by Continent
  countriesByContinent = [
    {
      continent: 'Africa',
      countries: [
        'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde (Cape Verde)', 'Cameroon',
        'Central African Republic', 'Chad', 'Comoros', 'Congo, Democratic Republic of the', 'Congo, Republic of the',
        "Côte d'Ivoire (Ivory Coast)", 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini (formerly Swaziland)',
        'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya',
        'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
        'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan',
        'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'
      ]
    },
    {
      continent: 'Asia',
      countries: [
        'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei', 'Cambodia', 'China', 'Cyprus',
        'Georgia', 'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan',
        'Laos', 'Lebanon', 'Malaysia', 'Maldives', 'Mongolia', 'Myanmar (Burma)', 'Nepal', 'North Korea', 'Oman', 'Pakistan',
        'Palestine', 'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea', 'Sri Lanka', 'Syria', 'Tajikistan',
        'Thailand', 'Timor-Leste (East Timor)', 'Turkey (Türkiye)', 'Turkmenistan', 'United Arab Emirates (UAE)', 'Uzbekistan',
        'Vietnam', 'Yemen'
      ]
    },
    {
      continent: 'Europe',
      countries: [
        'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia',
        'Czechia (Czech Republic)', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Holy See (Vatican City)',
        'Hungary', 'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova',
        'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia',
        'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom'
      ]
    },
    {
      continent: 'North America',
      countries: [
        'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Canada', 'Costa Rica', 'Cuba', 'Dominica',
        'Dominican Republic', 'El Salvador', 'Grenada', 'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua',
        'Panama', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago',
        'United States of America'
      ]
    },
    {
      continent: 'Oceania',
      countries: [
        'Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru', 'New Zealand', 'Palau',
        'Papua New Guinea', 'Samoa', 'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu'
      ]
    },
    {
      continent: 'South America',
      countries: [
        'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana', 'Paraguay', 'Peru', 'Suriname',
        'Uruguay', 'Venezuela'
      ]
    }
  ];

  // Courier Partners List
  courierPartners = [
    {
      category: 'International',
      partners: ['DHL Express', 'FedEx', 'UPS', 'Aramex', 'USPS']
    },
    {
      category: 'Indian Domestic',
      partners: ['Blue Dart', 'Delhivery', 'DTDC', 'Gati', 'Xpressbees', 'Ecom Express', 'Shadowfax', 'India Post']
    },
    {
      category: 'Aggregators (All-in-One)',
      partners: ['Shiprocket', 'NimbusPost', 'ClickPost', 'Pickrr']
    }
  ];

  // For the Quick Summary Rotating Card
  quickInsights: string[] = ['Analyzing data...'];
  currentInsightIndex: number = 0;
  insightInterval: any;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private authService: AdminAuthService,
    private agentService: AgentService,
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private telexService: TelexApplicationService,
    private fileService: FileService
  ) { }

  private readonly API_URL = environment.apiUrl + '/api';

  showToastMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  ngOnInit(): void {
    this.loadAgentData();
    this.initTravelForm();
    this.loadDocRequests();
  }

  // --- Core Data Loading ---


  refreshDashboard(): void {
    this.isReloadingData = true;

    // Reset Agent Analyzer to show visual refresh state
    this.quickInsights = ['Analyzing data...'];
    this.currentInsightIndex = 0;
    if (this.insightInterval) clearInterval(this.insightInterval);

    this.cdr.detectChanges();

    // 1.9 second delay as requested
    setTimeout(() => {
      this.loadAgentData();
    }, 1900);
  }

  // --- Data Loading Internal ---
  private loadDataInternal(username: string): void {
    this.agentService.getAgentProfile(username).subscribe({
      next: (data: AgentData) => {
        this.agentData = data;
        this.students = data.student || [];
        this.travelStudents = this.students.filter(s => s.travelDoj || s.travelAirlines);
        this.docReturnStudents = this.students.filter(s => s.hasRaiseReturnRequest);
        const colleges = new Set(this.students.map(s => s.college?.collegeName).filter(Boolean));
        this.uniqueColleges = Array.from(colleges).sort() as string[];

        this.calculateStats();
        this.generateDashboardTasks();
        this.generateCollegeDistribution();

        // Fetch new dashboard data
        this.fetchDashboardData(username);
        
        // Fetch news and notifications now that agentData is loaded
        this.fetchNews();

        // Fetch messages to get unread count
        this.fetchUnreadMessages(data.id);

        this.isLoading = false;
        this.isRefreshing = false;
        this.isReloadingData = false;
        this.generateQuickInsights();
        this.startInsightRotation();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch agent profile:', err);
        this.error = 'Failed to load data.';
        this.isLoading = false;
        this.isRefreshing = false;
        this.isReloadingData = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadAgentData(): void {
    // If it's a full reload (not refresh), show main loader
    if (!this.isReloadingData && !this.isRefreshing) {
      this.isLoading = true;
    }
    this.cdr.detectChanges();

    const authUser = this.authService.getUserData();

    if (authUser && authUser.username) {
      this.loadDataInternal(authUser.username);
    } else {
      this.error = 'Not authenticated.';
      this.isLoading = false;
      this.isReloadingData = false;
      this.cdr.detectChanges();
    }
  }

  generateQuickInsights(): void {
    const insights: string[] = [];
    const pending = this.getActionRequiredCount();
    const traveling = this.travelingThisMonthCount;
    const completed = this.dynamicDashboardStats.visaApproved;
    const total = this.dynamicDashboardStats.totalStudents;

    if (pending > 0) insights.push(`${pending} application${pending > 1 ? 's' : ''} require${pending === 1 ? 's' : ''} your immediate action.`);
    if (traveling > 0) insights.push(`${traveling} student${traveling > 1 ? 's' : ''} scheduled to travel this month.`);
    if (completed > 0) insights.push(`${completed} visa${completed > 1 ? 's' : ''} successfully stamped this month.`);
    if (this.dynamicCollegeDistribution.length > 0) {
      const topCollege = this.dynamicCollegeDistribution.reduce((prev, current) => (prev.count > current.count) ? prev : current);
      insights.push(`Top destination: ${topCollege.collegeName} (${topCollege.count} students).`);
    }

    if (insights.length === 0) {
      insights.push(`You have a total of ${total} registered student${total !== 1 ? 's' : ''}.`);
    }

    this.quickInsights = insights;
  }

  startInsightRotation(): void {
    if (this.insightInterval) {
      clearInterval(this.insightInterval);
    }
    this.insightInterval = setInterval(() => {
      this.currentInsightIndex = (this.currentInsightIndex + 1) % this.quickInsights.length;
      this.cdr.detectChanges();
    }, 5000);
  }

  fetchDashboardData(username: string): void {
    this.agentService.getDashboardStats(username).subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch dashboard stats', err)
    });

    this.agentService.getStatusBreakdown(username).subscribe({
      next: (breakdown) => {
        this.statusBreakdown = breakdown;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch status breakdown', err)
    });

    this.agentService.getRecentActivities(username).subscribe({
      next: (activities) => {
        this.recentActivities = activities;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch recent activities', err)
    });
  }

  // --- Fetch News & Notifications ---
  fetchNews(): void {
    const userJson = localStorage.getItem('user');
    const username = userJson ? JSON.parse(userJson).username : (this.agentData?.userId || this.agentData?.email);
    
    // Create an observable for news
    const news$ = this.http.get<NewsItem[]>(environment.apiUrl + '/api/news');
    
    // Create an observable for notifications
    const notifications$ = username ? this.http.get<any[]>(environment.apiUrl + `/api/notifications/user/${username}`) : new Observable<any[]>(sub => { sub.next([]); sub.complete(); });
    
    forkJoin({
      news: news$,
      notifications: notifications$
    }).subscribe({
      next: ({ news, notifications }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day

        // Filter news by active status and date range
        let validNews = news.filter(item => {
          if (!item.active) return false;

          const activeFrom = new Date(item.activeFrom);
          const tillDate = new Date(item.tillDate);
          activeFrom.setHours(0, 0, 0, 0);
          tillDate.setHours(23, 59, 59, 999); // End of day

          const isDateValid = today >= activeFrom && today <= tillDate;
          
          // Filter out news not meant for this specific agent
          const isUserTargeted = !item.forUser || 
                                 item.forUser === 'ALL' || 
                                 item.forUser === 'AGENT' || 
                                 (this.agentData && (item.forUser === this.agentData.userId || item.forUser === this.agentData.email));
                                 
          return isDateValid && isUserTargeted;
        });

        // Map notifications to NewsItem format
        const mappedNotifications: NewsItem[] = notifications.map(n => ({
          id: n.id,
          activeFrom: n.createdAt,
          tillDate: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
          heading: n.heading,
          content: n.content,
          tag: 'document', // map Notification type to News tag
          username: n.senderUsername,
          forUser: n.targetUsername,
          createdAt: n.createdAt,
          updatedAt: n.createdAt,
          active: true
        }));

        this.newsItems = [...validNews, ...mappedNotifications];

        // Sort by createdAt (most recent first)
        this.newsItems.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch news and notifications', err)
    });
  }

  // Get note color class based on index
  getNoteColorClass(index: number): string {
    const colors = ['note-blue', 'note-green', 'note-amber', 'note-purple', 'note-pink'];
    return colors[index % colors.length];
  }

  // Format date for display
  formatNewsDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Get icon for news based on tag
  getNewsIcon(tag: string): string {
    switch (tag?.toLowerCase()) {
      case 'admission':
        return 'clock';
      case 'general':
        return 'info';
      case 'holiday':
        return 'calendar';
      case 'visa':
        return 'stamp';
      default:
        return 'document';
    }
  }

  // Format tag for display
  formatTag(tag: string): string {
    return tag ? tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase() : 'General';
  }

  // --- Logic ---
  calculateStats(): void {
    if (!this.students) return;
    this.stats.totalStudents = this.students.length;
    this.stats.pending = this.students.filter(s =>
      ['REGISTERED', 'PENDING_ADMISSION_LETTER'].includes(s.applicationStatus)
    ).length;
    this.stats.approved = this.students.filter(s =>
      ['VISA_STAMPED', 'ADMISSION_LETTER_APPROVED', 'TELEX_NUMBER_ISSUED'].includes(s.applicationStatus)
    ).length;
    this.stats.completed = this.students.filter(s => s.applicationStatus === 'READY_FOR_TRAVEL').length;
    this.stats.rejected = this.students.filter(s => s.applicationStatus === 'REJECTED').length;
  }

  getDocReturnEligibleStudents(): Student[] {
    if (!this.students) return [];
    return this.students.filter(s =>
      s.applicationStatus === 'VISA_STAMPED' && s.canRequestDocReturn === true
    );
  }

  generateDashboardTasks(): void {
    // Show students where Action is required by Agent or those with ADMISSION_LETTER_APPROVED status
    // EXCLUDING those eligible for Doc Return (displayed in separate section)
    this.dashboardTasks = this.students
      .filter(s => {
        const isDocReturnEligible = s.applicationStatus === 'VISA_STAMPED' && s.canRequestDocReturn === true;
        if (isDocReturnEligible) return false;

        return (
          s['actionOnUser'] === 'AGENT' ||
          s['actionOnUser'] === 'agent' ||
          s.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED ||
          (s['action'] === 'INITIATE_TELEX' && s['actionOnUser'] === 'agent') ||
          (s['action'] === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT' && (s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT'))
        );
      })
      .sort((a, b) => {
        // Sort by registration date (latest first)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 10); // Show top 10 action items
  }

  generateCollegeDistribution(): void {
    // Use agent's collegeAccess to show all colleges the agent has access to
    // along with the student count for each college
    if (!this.agentData?.collegeAccess) return;

    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    this.collegeDistribution = this.agentData.collegeAccess.map((access: any, idx: number) => {
      const collegeName = access.college?.collegeName || 'Unknown College';
      // Count students enrolled in this college
      const studentCount = this.students.filter(s =>
        s.college?.id === access.college?.id ||
        s.college?.collegeName === collegeName
      ).length;

      return {
        collegeName: collegeName,
        count: studentCount,
        color: colors[idx % colors.length]
      };
    });
  }

  // --- Navigation & Views ---
  navigateTo(view: any): void {
    this.currentView = view;
    if (view !== 'student-detail') this.selectedStudent = null;
    if (view === 'request-doc') this.loadDocRequests();
    this.cdr.detectChanges();
  }

  viewStudentDetails(student: Student): void {
    this.selectedStudent = student;
    this.currentView = 'student-detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  editStudent(student: any): void {
    this.studentToEdit = student;
    this.navigateTo('edit-student');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get filteredStudents(): Student[] {
    let filtered = this.students;

    // 1. View Filtering
    if (this.currentView === 'visa-stamped') {
      filtered = filtered.filter(s => s.applicationStatus === 'VISA_STAMPED');
    } else if (this.currentView === 'assigned-tasks') {
      // Show students where Action is required by Agent or those with ADMISSION_LETTER_APPROVED status
      filtered = filtered.filter(s =>
        s['actionOnUser'] === 'AGENT' ||
        s['actionOnUser'] === 'agent' ||
        s.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED ||
        (s['action'] === 'INITIATE_TELEX' && s['actionOnUser'] === 'agent')
      );
    } else if (this.currentView === 'travel-details') {
      filtered = this.students; // we show search UI instead of list directly, or empty list
    } else if (this.currentView === 'apply-telex') {
      filtered = this.getTelexEligibleStudents();
    } else if (this.currentView === 'apply-visa') {
      this.clearVisaFilters();
      filtered = this.getVisaPaymentStudents();
    } else if (this.currentView === 'doc-return') {
      filtered = this.students.filter(s =>
        s.applicationStatus === 'VISA_STAMPED' ||
        s.hasRaiseReturnRequest ||
        s.readyForDocReturn ||
        s.docReturnedDate ||
        s.docReturnTrackingId ||
        s.passportReturnReceivedDate
      );

      // Update Doc Stats
      const total = filtered.length;
      let pending = 0, ready = 0, returned = 0, received = 0;

      filtered.forEach(s => {
        if (s.passportReturnReceivedDate) received++;
        else if (s.docReturnedDate || s.docReturnTrackingId) returned++;
        else if (s.readyForDocReturn) ready++;
        else if (s.hasRaiseReturnRequest) pending++;
      });

      this.docStats = {
        total, pending, ready, returned, received,
        pendingPercent: total ? ((pending / total) * 100).toFixed(1) : '0.0',
        readyPercent: total ? ((ready / total) * 100).toFixed(1) : '0.0',
        returnedPercent: total ? ((returned / total) * 100).toFixed(1) : '0.0',
        receivedPercent: total ? ((received / total) * 100).toFixed(1) : '0.0'
      };

      // Apply Doc Status Filter
      if (this.docStatusFilter !== 'All') {
        filtered = filtered.filter(s => {
          if (this.docStatusFilter === 'RECEIVED') return !!s.passportReturnReceivedDate;
          if (this.docStatusFilter === 'ELIGIBLE_RECEIVED') return !s.passportReturnReceivedDate && (!!s.docReturnedDate || !!s.docReturnTrackingId);
          if (this.docStatusFilter === 'ELIGIBLE_REQUEST') return s.applicationStatus === 'VISA_STAMPED' && !s.hasRaiseReturnRequest;
          return true;
        });
      }

      if (this.docCollegeFilter !== 'All') {
        filtered = filtered.filter(s => s.college?.collegeName === this.docCollegeFilter);
      }
    } else if (this.currentView === 'rejected') {
      filtered = this.getRejectedStudents();
    } else if (this.currentView === 'travelling') {
      filtered = filtered.filter(s => s.applicationStatus === 'TRAVELLING');
    }

    // 2. Search Filtering
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.college?.collegeName || '').toLowerCase().includes(query)
      );
    }

    // 3. Sort by registration date (createdAt) - Latest first
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (latest first)
    });

    return filtered;
  }

  getViewTitle(): string {
    switch (this.currentView) {
      case 'dashboard': return 'Dashboard';
      case 'students': return 'All Students';
      case 'travel-details': return 'Update Travel Details';
      case 'travel-management': return 'Travel Management';
      case 'visa-stamped': return 'Visa Stamped';
      case 'assigned-tasks': return 'Assigned Tasks';
      case 'apply-telex': return 'Apply Telex';
      case 'apply-visa': return 'Apply Visa';
      case 'doc-return': return 'Doc Return';
      case 'rejected': return 'Reapply / Rejected';
      case 'reports': return 'Reports';
      case 'payments': return 'Payments';
      case 'register': return 'Register New';
      case 'edit-student': return 'Edit Student Application';
      case 'profile': return 'My Profile';
      case 'messages': return 'Messages';
      case 'request-doc': return 'Request Document';
      default: return 'Dashboard';
    }
  }

  getRejectionReason(student: Student): string {
    if (!student.studentStatusHistory || student.studentStatusHistory.length === 0) return 'No reason provided.';
    const rejectionEvents = student.studentStatusHistory.filter(h => h.studentApplicationStatus === 'REJECTED');
    if (rejectionEvents.length > 0) {
      // Get the latest rejection event
      const latestRejection = rejectionEvents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      return latestRejection.remarks || 'No reason provided.';
    }
    return 'No reason provided.';
  }

  // --- Helper Methods ---
  getStatusColor(status: string): string {
    if (!status) return '#64748B';
    if (status.includes('APPROVED') || status.includes('STAMPED') || status === 'READY_FOR_TRAVEL') return '#10B981';
    if (status.includes('PENDING') || status.includes('REGISTERED')) return '#F59E0B';
    if (status.includes('REJECTED')) return '#EF4444';
    if (status.includes('TELEX') || status.includes('VISA')) return '#6366F1';
    return '#64748B';
  }

  formatStatus(status: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  }

  getCurrentDate(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date().toLocaleDateString('en-US', options);
  }

  // --- Additional Stats Methods ---
  getAllStudentsCount(): number {
    return this.students ? this.students.length : 0;
  }

  getActionRequiredCount(): number {
    return this.filteredAssignedTasks.length;
  }

  unreadMessagesCount: number = 0;
  recentMessages: any[] = [];

  fetchUnreadMessages(agentId: number): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/messages/agent/${agentId}`)
      .subscribe({
        next: (msgs) => {
          this.unreadMessagesCount = msgs.filter(m => !m.read && m.senderRole !== 'AGENT').length;
          this.recentMessages = msgs.sort((a, b) => new Date(b.timestamp || new Date()).getTime() - new Date(a.timestamp || new Date()).getTime()).slice(0, 3);
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Failed to fetch messages', err)
      });
  }

  get recentTelexStudents(): any[] {
    return this.students.filter(s => s.applicationStatus === 'TELEX_NUMBER_ISSUED' || s.telexNumber)
      .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || new Date()).getTime() - new Date(a.updatedAt || a.createdAt || new Date()).getTime())
      .slice(0, 3);
  }

  get recentVisaStudents(): any[] {
    return this.students.filter(s => s.applicationStatus === 'VISA_STAMPED')
      .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || new Date()).getTime() - new Date(a.updatedAt || a.createdAt || new Date()).getTime())
      .slice(0, 3);
  }

  getMessagesCount(): number {
    return this.unreadMessagesCount;
  }

  getVisaStampedCount(): number {
    return this.students.filter(s => s.applicationStatus === 'VISA_STAMPED').length;
  }

  getTelexPendingCount(): number {
    return this.students.filter(s =>
      s.applicationStatus === 'ADMISSION_LETTER_APPROVED' ||
      s.applicationStatus === 'APPLIED_FOR_TELEX'
    ).length;
  }

  getDocsPendingCount(): number {
    return this.students.filter(s =>
      s.applicationStatus === 'REGISTERED' ||
      s.applicationStatus === 'PENDING_ADMISSION_LETTER'
    ).length;
  }

  getRejectedStudents(): Student[] {
    return this.students.filter(s => s.applicationStatus === 'REJECTED');
  }

  /**
   * Get students eligible for Telex application
   * Students with ADMISSION_LETTER_APPROVED or whose action is INITIATE_TELEX
   */
  getTelexEligibleStudents(): Student[] {
    if (!this.students) return [];
    return this.students.filter(s =>
      s.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED ||
      (s['action'] === 'INITIATE_TELEX' && (s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT'))
    );
  }

  /**
   * Get students who have already applied for telex (form filled)
   */
  getTelexApplicationStudents(): Student[] {
    if (!this.students) return [];
    return this.students.filter(s =>
      s.applicationStatus === StudentStatus.APPLIED_FOR_TELEX ||
      s.applicationStatus === StudentStatus.TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY ||
      s.applicationStatus === StudentStatus.TELEX_APPLICATION_SUBMITTED_TO_MEA ||
      s.applicationStatus === StudentStatus.TELEX_NUMBER_ISSUED
    );
  }

  /**
   * Get students who have payment details from telex form submission
   * Includes students who paid (hasPaid=true) or have pending payments
   */
  getStudentsWithPayments(): Student[] {
    if (!this.students) return [];
    return this.students.filter(s =>
      s.hasPaid === true ||
      (s.paidAmount && s.paidAmount > 0) ||
      (s.telexPaymentAmount && s.telexPaymentAmount > 0) ||
      s.paidTo ||
      s.paymentDueDate
    );
  }

  /**
   * Get total payment amount collected from students
   */
  getTotalPaymentsAmount(): number {
    return this.getStudentsWithPayments()
      .reduce((sum, s) => sum + (s.paidAmount || s.telexPaymentAmount || 0), 0);
  }

  /**
   * Get count of students with pending payments
   */
  getPendingPaymentsCount(): number {
    return this.getStudentsWithPayments().filter(s => !s.hasPaid).length;
  }

  // --- TELEX OPERATIONS ---
  showInitiateTelexButton(student: any): boolean {
    // Check if action field indicates INITIATE_TELEX
    if (student.action === 'INITIATE_TELEX' && student.actionOnUser === 'agent') return true;
    // Fallback to status check
    if (student.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED) return true;
    return false;
  }

  showRequestVisaStampingButton(student: any): boolean {
    return student.action === 'NEED_TO_REQUEST_VISA_STAMPING' && (student.actionOnUser === 'agent' || student.actionOnUser === 'AGENT');
  }

  isRequestingVisaStamping: { [key: number]: boolean } = {};
  isRequestVisaModalOpen = false;
  studentForVisaRequest: Student | null = null;

  openRequestVisaModal(student: Student): void {
    this.studentForVisaRequest = student;
    this.isRequestVisaModalOpen = true;
  }

  closeRequestVisaModal(): void {
    this.isRequestVisaModalOpen = false;
    this.studentForVisaRequest = null;
  }

  confirmRequestVisaStamping(): void {
    if (!this.studentForVisaRequest) return;
    const student = this.studentForVisaRequest;
    if (this.isRequestingVisaStamping[student.id]) return;

    this.isRequestingVisaStamping[student.id] = true;
    this.agentService.requestVisaStamping(student.id, this.agentData!.userId).subscribe({
      next: (res) => {
        alert('Visa Stamping Requested successfully!');
        student.action = 'ASSIGN_TO_VISA_MAN';
        student.actionOnUser = 'admission_manager';
        this.isRequestingVisaStamping[student.id] = false;
        this.closeRequestVisaModal();
        this.loadAgentData(); // refresh data
      },
      error: (err) => {
        console.error('Error requesting visa stamping', err);
        alert('Failed to request visa stamping. Please try again.');
        this.isRequestingVisaStamping[student.id] = false;
        this.closeRequestVisaModal();
      }
    });
  }





  // --- History & Docs ---
  openTelexModal(student: Student): void {
    this.studentForTelex = student;
    this.currentStep = 1;
    this.initTelexForm();
    this.prefillData(student);
    this.isTelexModalOpen = true;
    this.cdr.detectChanges();
  }

  initTelexForm(): void {
    this.telexForm = this.fb.group({
      // Step 1: Document Dispatch Confirmation
      originalDocsSent: [null, Validators.required],
      docDeliveryMethod: [null],
      courierPartner: [null], // Changed to null for dropdown
      otherCourierDetails: [''], // New field for 'Other'
      courierTrackingNumber: [''],
      courierTrackingId: [''],
      selfPersonName: [''],
      selfPersonPhone: [''],
      docTentativeReachDate: [null],

      // Document Dispatch Checklist
      agentSentPassport: [false],
      agentSent10thMarksheet: [false],
      agentSent12thMarksheet: [false],
      agentSentAadharCard: [false],
      agentSentMedicalReport: [false],
      agentSentOtherDocuments: [false],
      agentOtherDocumentsRemarks: [''],

      // Step 2: Payment Status
      hasPaid: [null, Validators.required],
      paidAmount: [null],
      paidTo: [null],
      paymentType: [null],
      paymentDueDate: [null],

      // Payment Components
      telexTuitionFee: [false],
      telexHostelFee: [false],
      telexMessFee: [false],
      telexContractFee: [false],
      telexRegistrationFee: [false],
      telexOneTimeCharge: [false],

      // Step 2: Personal Details (Mandatory)
      surname: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      sex: ['', Validators.required],
      countryOfBirth: ['India', Validators.required],
      dateOfBirth: ['', Validators.required],
      placeOfBirth: ['', Validators.required],
      maritalStatus: ['SINGLE', Validators.required],
      citizenship: ['India', Validators.required],
      previousCitizenship: [null],
      passportType: ['ORDINARY', Validators.required],
      passportNumber: ['', Validators.required],
      passportIssueDate: ['', Validators.required],
      passportExpirationDate: ['', Validators.required],

      // New Fields & Removed IssuedBy
      durationOfVisaProcedure: [null, Validators.required],
      placeOfVisaIssuance: [null, Validators.required],
    });
    this.setupConditionalValidation();
  }

  setupConditionalValidation(): void {
    // Document Tracking Logic
    // Document Tracking Logic
    this.telexForm.get('originalDocsSent')?.valueChanges.subscribe(sent => {
      const methodControl = this.telexForm.get('docDeliveryMethod');
      const dateControl = this.telexForm.get('docTentativeReachDate');
      const partnerControl = this.telexForm.get('courierPartner');
      const trackingNumControl = this.telexForm.get('courierTrackingNumber');
      const nameControl = this.telexForm.get('selfPersonName');
      const phoneControl = this.telexForm.get('selfPersonPhone');

      const step2PaymentControls = ['hasPaid'];
      const step2PersonalControls = [
        'surname', 'firstName', 'sex', 'countryOfBirth', 'dateOfBirth', 'placeOfBirth',
        'maritalStatus', 'citizenship', 'passportType', 'passportNumber', 'passportIssueDate',
        'passportExpirationDate', 'durationOfVisaProcedure', 'placeOfVisaIssuance'
      ];

      if (sent === true || sent === 'true') {
        methodControl?.setValidators(Validators.required);
        dateControl?.setValidators(Validators.required);
        step2PaymentControls.forEach(ctrl => this.telexForm.get(ctrl)?.setValidators(Validators.required));
        if (this.studentForTelex?.applicationStatus === StudentStatus.REJECTED_BY_TELEX) {
          step2PersonalControls.forEach(ctrl => this.telexForm.get(ctrl)?.setValidators(Validators.required));
        }
      } else {
        methodControl?.clearValidators();
        methodControl?.setValue(null);

        // Also clear children of method
        partnerControl?.clearValidators();
        trackingNumControl?.clearValidators();
        nameControl?.clearValidators();
        phoneControl?.clearValidators();
        partnerControl?.setValue('');
        trackingNumControl?.setValue('');
        nameControl?.setValue('');
        phoneControl?.setValue('');

        dateControl?.clearValidators();
        dateControl?.setValue(null);
      }

      // Payment is always required regardless of Document Dispatch answer
      step2PaymentControls.forEach(ctrl => {
        this.telexForm.get(ctrl)?.setValidators(Validators.required);
        this.telexForm.get(ctrl)?.updateValueAndValidity({ emitEvent: false });
      });

      // Personal Details are only required if REJECTED_BY_TELEX
      step2PersonalControls.forEach(ctrl => {
        if (this.studentForTelex?.applicationStatus === StudentStatus.REJECTED_BY_TELEX) {
          this.telexForm.get(ctrl)?.setValidators(Validators.required);
        } else {
          this.telexForm.get(ctrl)?.clearValidators();
        }
        this.telexForm.get(ctrl)?.updateValueAndValidity({ emitEvent: false });
      });

      methodControl?.updateValueAndValidity({ emitEvent: false });
      dateControl?.updateValueAndValidity({ emitEvent: false });
      partnerControl?.updateValueAndValidity({ emitEvent: false });
      trackingNumControl?.updateValueAndValidity({ emitEvent: false });
      nameControl?.updateValueAndValidity({ emitEvent: false });
      phoneControl?.updateValueAndValidity({ emitEvent: false });
    });

    this.telexForm.get('docDeliveryMethod')?.valueChanges.subscribe(method => {
      const partnerControl = this.telexForm.get('courierPartner');
      const otherPartnerControl = this.telexForm.get('otherCourierDetails'); // New
      const trackingNumControl = this.telexForm.get('courierTrackingNumber');
      const nameControl = this.telexForm.get('selfPersonName');
      const phoneControl = this.telexForm.get('selfPersonPhone');

      if (method === 'COURIER') {
        partnerControl?.setValidators(Validators.required);
        trackingNumControl?.setValidators(Validators.required);
        nameControl?.clearValidators();
        phoneControl?.clearValidators();
        nameControl?.setValue('');
        phoneControl?.setValue('');
      } else if (method === 'SELF_PERSON') {
        nameControl?.setValidators(Validators.required);
        phoneControl?.setValidators(Validators.required);
        partnerControl?.clearValidators();
        otherPartnerControl?.clearValidators(); // Clear other
        trackingNumControl?.clearValidators();
        partnerControl?.setValue(null); // Reset select
        otherPartnerControl?.setValue('');
        trackingNumControl?.setValue('');
      } else {
        partnerControl?.clearValidators();
        otherPartnerControl?.clearValidators();
        trackingNumControl?.clearValidators();
        nameControl?.clearValidators();
        phoneControl?.clearValidators();
        partnerControl?.setValue(null);
        otherPartnerControl?.setValue('');
        trackingNumControl?.setValue('');
        nameControl?.setValue('');
        phoneControl?.setValue('');
      }
      partnerControl?.updateValueAndValidity();
      otherPartnerControl?.updateValueAndValidity();
      trackingNumControl?.updateValueAndValidity();
      nameControl?.updateValueAndValidity();
      phoneControl?.updateValueAndValidity();
    });

    // Watch for "OTHER" selection in Courier Partner
    this.telexForm.get('courierPartner')?.valueChanges.subscribe(value => {
      const otherControl = this.telexForm.get('otherCourierDetails');
      if (value === 'OTHER') {
        otherControl?.setValidators(Validators.required);
      } else {
        otherControl?.clearValidators();
        otherControl?.setValue('');
      }
      otherControl?.updateValueAndValidity();
    });

    // Payment Logic
    this.telexForm.get('hasPaid')?.valueChanges.subscribe(paid => {
      const amountControl = this.telexForm.get('paidAmount');
      const paidToControl = this.telexForm.get('paidTo');
      const typeControl = this.telexForm.get('paymentType');
      const dueDateControl = this.telexForm.get('paymentDueDate');

      if (paid === true || paid === 'true') {
        amountControl?.setValidators(Validators.required);
        paidToControl?.setValidators(Validators.required);
        typeControl?.clearValidators();
        dueDateControl?.clearValidators();

        typeControl?.setValue(null);
        dueDateControl?.setValue(null);
      } else if (paid === false || paid === 'false') {
        amountControl?.clearValidators();
        paidToControl?.clearValidators();
        amountControl?.setValue(null);
        paidToControl?.setValue(null);

        typeControl?.setValidators(Validators.required);
        dueDateControl?.setValidators(Validators.required);
      } else {
        // paid is null or empty
        amountControl?.clearValidators();
        paidToControl?.clearValidators();
        typeControl?.clearValidators();
        dueDateControl?.clearValidators();
      }
      amountControl?.updateValueAndValidity({ emitEvent: false });
      paidToControl?.updateValueAndValidity({ emitEvent: false });
      typeControl?.updateValueAndValidity({ emitEvent: false });
      dueDateControl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  // --- RETURN DOCUMENTS WORKFLOW ---
  isRequestDocsModalOpen = false;
  requestDocsForm!: FormGroup;
  selectedDocsStudent: Student | null = null;
  fileTicket: File | null = null;
  isSubmittingDocs = false;

  initRequestDocsForm(): void {
    this.requestDocsForm = this.fb.group({
      contactPersonName: ['', Validators.required],
      contactPhone: ['', Validators.required],
      alternativePhone: [''],
      addressWithZip: ['', Validators.required],
      needBeforeDate: [null],
      travelDate: [null],
      fromCountry: [''],
      fromAirport: [''],
      toCountry: [''],
      toAirport: [''],
      pnrNumber: ['']
    });
  }

  openRequestDocsModal(student: Student): void {
    this.selectedDocsStudent = student;
    this.fileTicket = null;
    this.initRequestDocsForm();
    this.isRequestDocsModalOpen = true;
    this.cdr.detectChanges();
  }

  closeRequestDocsModal(): void {
    this.isRequestDocsModalOpen = false;
    this.selectedDocsStudent = null;
    this.cdr.detectChanges();
  }

  showRequestDocsButton(student: Student): boolean {
    return student.applicationStatus === 'VISA_STAMPED' && student.canRequestDocReturn === true;
  }

  onTicketFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.showToastMessage('Only PDF files are allowed for tickets.', 'error');
        return;
      }
      this.fileTicket = file;
    }
  }

  submitRequestDocs(): void {
    if (this.requestDocsForm.invalid) {
      this.requestDocsForm.markAllAsTouched();
      this.showToastMessage('Please fill all required fields.', 'error');
      return;
    }

    if (!this.selectedDocsStudent) return;

    this.isSubmittingDocs = true;
    const formValue = this.requestDocsForm.value;

    // Construct FormData
    const formData = new FormData();
    const agentUsername = this.agentData?.userId || this.authService.getUserData()?.username || '';

    formData.append('agentUsername', agentUsername);
    formData.append('requestDetails', JSON.stringify(formValue));

    if (this.fileTicket) {
      formData.append('ticketPdf', this.fileTicket);
    }

    this.http.post(`${this.API_URL}/agents/request-docs/${this.selectedDocsStudent.id}`, formData)
      .subscribe({
        next: (res: any) => {
          this.isSubmittingDocs = false;
          this.showToastMessage('Document return request submitted successfully!', 'success');
          this.closeRequestDocsModal();
          this.refreshDashboard();
        },
        error: (err) => {
          this.isSubmittingDocs = false;
          console.error('Failed to submit doc return request', err);
          this.showToastMessage('Failed to submit request. Please try again.', 'error');
        }
      });
  }

  // --- TRAVEL DETAILS WORKFLOW ---
  initTravelForm(): void {
    this.travelForm = this.fb.group({
      travelDoj: ['', Validators.required],
      travelAirlines: ['', Validators.required],
      travelSource: ['', Validators.required],
      travelDestination: ['', Validators.required],
      pnrNumber: [''],
      flightNumber: ['']
    });
  }

  get travelSearchResults(): Student[] {
    if (!this.travelSearchQuery || this.travelSearchQuery.trim() === '') {
      return [];
    }
    const query = this.travelSearchQuery.toLowerCase();
    return this.students.filter(s =>
      s.fullName?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.applicationId?.toLowerCase().includes(query) ||
      s.passportNo?.toLowerCase().includes(query)
    ).slice(0, 5);
  }

  selectTravelStudent(student: Student): void {
    this.selectedTravelStudent = student;
    this.travelSearchQuery = '';
    this.travelTicketFile = null;
    this.travelForm.patchValue({
      travelDoj: student.travelDoj || '',
      travelAirlines: student.travelAirlines || '',
      travelSource: student.travelSource || '',
      travelDestination: student.travelDestination || '',
      pnrNumber: student.travelPnrNumber || student.documentReturnRequest?.pnrNumber || '',
      flightNumber: student.travelFlightNumber || ''
    });
  }

  openTravelModal(student: Student, mode: 'view' | 'edit' = 'view'): void {
    this.selectedTravelStudent = student;
    this.travelModalMode = mode;
    this.travelSearchQuery = '';
    this.travelTicketFile = null;
    this.travelForm.patchValue({
      travelDoj: student.travelDoj || '',
      travelAirlines: student.travelAirlines || '',
      travelSource: student.travelSource || '',
      travelDestination: student.travelDestination || '',
      pnrNumber: student.travelPnrNumber || student.documentReturnRequest?.pnrNumber || '',
      flightNumber: student.travelFlightNumber || ''
    });
    // Ensure we are on travel-management view if not already (e.g. from search)
    if (this.currentView !== 'travel-management') {
      this.navigateTo('travel-management');
    }
  }

  clearTravelSelection(): void {
    this.selectedTravelStudent = null;
    this.travelForm.reset();
    this.travelTicketFile = null;
  }

  onTravelTicketSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.showToastMessage('Only PDF files are allowed for tickets.', 'error');
        return;
      }
      this.travelTicketFile = file;
    }
  }

  submitTravelDetails(): void {
    if (this.travelForm.invalid) {
      this.travelForm.markAllAsTouched();
      this.showToastMessage('Please fill all required fields.', 'error');
      return;
    }

    if (!this.selectedTravelStudent) return;

    this.isSubmittingTravel = true;
    const formValue = this.travelForm.value;

    const formData = new FormData();
    const details = {
      travelDoj: formValue.travelDoj,
      travelAirlines: formValue.travelAirlines,
      travelSource: formValue.travelSource,
      travelDestination: formValue.travelDestination,
      pnrNumber: formValue.pnrNumber,
      flightNumber: formValue.flightNumber
    };

    formData.append('agentUsername', this.authService.getUserData()?.username || '');
    formData.append('travelDetails', JSON.stringify(details));

    if (this.travelTicketFile) {
      formData.append('ticketPdf', this.travelTicketFile);
    }

    this.http.post(`${this.API_URL}/agents/update-travel-details/${this.selectedTravelStudent.id}`, formData)
      .subscribe({
        next: () => {
          this.showToastMessage('Travel details updated successfully!');
          this.isSubmittingTravel = false;
          this.clearTravelSelection();
          this.refreshDashboard();
        },
        error: (err) => {
          console.error('Failed to update travel details:', err);
          this.showToastMessage('Failed to update travel details. Please try again.', 'error');
          this.isSubmittingTravel = false;
        }
      });
  }

  prefillData(student: Student): void {
    if (!student) return;

    this.telexForm.patchValue({
      firstName: student.fullName.split(' ')[0] || '',
      surname: student.fullName.split(' ').slice(1).join(' ') || '',
      passportNumber: student.passportNo || '',
      // Add other mappings as needed
    });
  }

  openHistoryModal(student: any): void {
    this.selectedStudentForHistory = student;
    this.isHistoryModalOpen = true;
    this.cdr.detectChanges();
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen = false;
    this.selectedStudentForHistory = null;
  }

  downloadFile(path: string | undefined): void {
    if (!path) {
      alert('File not found');
      return;
    }
    const url = this.fileService.getFileUrl(path);
    window.open(url, '_blank');
  }

  isLoggingOut = false;

  openLogoutModal(): void {
    this.isLogoutModalOpen = true;
    this.cdr.detectChanges();
  }

  cancelLogout(): void {
    this.isLogoutModalOpen = false;
    this.cdr.detectChanges();
  }

  confirmLogout(): void {
    this.isLogoutModalOpen = false;
    this.currentLogoutMessage = this.getRandomLogoutMessage();
    this.isLoggingOut = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.authService.logout();
      this.router.navigate(['/AdminLogin']);
    }, 2900);
  }

  logout(): void {
    this.openLogoutModal();
  }

  getRandomLogoutMessage(): string {
    const randomIndex = Math.floor(Math.random() * this.logoutMessages.length);
    return this.logoutMessages[randomIndex];
  }

  // --- Navigation ---
  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep++;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.insightInterval) {
      clearInterval(this.insightInterval);
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  validateCurrentStep(): boolean {
    const controls = this.telexForm.controls;
    let isValid = true;
    let fieldsToValidate: string[] = [];

    if (this.currentStep === 1) {
      fieldsToValidate = ['originalDocsSent'];
      if (controls['originalDocsSent'].value === true) {
        fieldsToValidate.push('docDeliveryMethod', 'docTentativeReachDate');
        if (controls['docDeliveryMethod'].value === 'COURIER') {
          fieldsToValidate.push('courierPartner', 'courierTrackingNumber');
        } else if (controls['docDeliveryMethod'].value === 'SELF_PERSON') {
          fieldsToValidate.push('selfPersonContact');
        }
      } else {
        fieldsToValidate.push('docTentativeReachDate');
      }
    } else if (this.currentStep === 2) {
      fieldsToValidate = [
        'hasPaid', 'surname', 'firstName', 'sex', 'countryOfBirth',
        'dateOfBirth', 'placeOfBirth', 'maritalStatus', 'citizenship',
        'passportType', 'passportNumber', 'passportIssueDate',
        'passportExpirationDate', 'durationOfVisaProcedure', 'placeOfVisaIssuance'
      ];

      if (controls['hasPaid'].value === true) {
        fieldsToValidate.push('paidAmount', 'paidTo');
      } else {
        fieldsToValidate.push('paymentType', 'paymentDueDate');
      }
    }

    for (const field of fieldsToValidate) {
      const control = controls[field];
      if (control && control.invalid) {
        control.markAsTouched();
        isValid = false;
      }
    }

    // File validation for Step 2
    if (this.currentStep === 2) {
      if (!this.visaPhotoFile) {
        this.validationMessage = 'Visa Photo is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      } else if (!this.visaPassportCopyFile) {
        this.validationMessage = 'Passport Copy is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      } else if (controls['hasPaid'].value === true && controls['paidTo'].value === 'UNIVERSITY' && !this.ttCopyFile) {
        this.validationMessage = 'TT Copy is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      } else if (controls['hasPaid'].value === true && controls['paidTo'].value === 'COMPANY' && !this.paymentConfirmationFile) {
        this.validationMessage = 'Payment Confirmation is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      }
    }

    return isValid;
  }

  goToStep(step: number): void {
    // Allow going back or to next immediate step
    if (step <= this.currentStep + 1) {
      this.currentStep = step;
    }
  }

  // --- File Handling ---
  onFileSelected(event: any, type: string): void {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const fileSizeKB = file.size / 1024;
      const fileSizeMB = fileSizeKB / 1024;

      let isValid = true;
      let errorMessage = '';

      switch (type) {
        case 'visaPhoto':
          if (fileSizeKB > 128) {
            isValid = false;
            errorMessage = 'Photo must be less than 128KB.';
          } else {
            this.visaPhotoFile = file;
            this.isLoadingVisaPhoto = true;
            this.cdr.detectChanges();
            // Create preview
            const reader = new FileReader();
            reader.onload = () => {
              this.visaPhotoPreviewUrl = reader.result;
              this.isLoadingVisaPhoto = false;
              this.cdr.detectChanges();
            };
            reader.onerror = () => {
              this.isLoadingVisaPhoto = false;
              this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);
          }
          break;
        case 'visaPassportCopy':
          if (fileSizeKB > 256) {
            isValid = false;
            errorMessage = 'Passport copy must be less than 256KB.';
          } else {
            this.visaPassportCopyFile = file;
            // Create preview for image files
            if (file.type.startsWith('image/')) {
              this.isLoadingPassportCopy = true;
              this.visaPassportCopyPreviewUrl = null; // Clear previous preview
              this.cdr.detectChanges();
              const reader = new FileReader();
              reader.onload = () => {
                this.visaPassportCopyPreviewUrl = reader.result;
                this.isLoadingPassportCopy = false;
                this.cdr.detectChanges();
              };
              reader.onerror = () => {
                this.isLoadingPassportCopy = false;
                this.cdr.detectChanges();
              };
              reader.readAsDataURL(file);
            } else {
              // PDF files - no preview
              this.visaPassportCopyPreviewUrl = null;
            }
          }
          break;
        case 'ttCopy':
          if (fileSizeMB > 5) {
            isValid = false;
            errorMessage = 'File must be less than 5MB.';
          } else {
            this.ttCopyFile = file;
          }
          break;
        case 'paymentConfirmation':
          if (fileSizeMB > 5) {
            isValid = false;
            errorMessage = 'File must be less than 5MB.';
          } else {
            this.paymentConfirmationFile = file;
          }
          break;
      }

      if (!isValid) {
        this.validationMessage = errorMessage;
        this.isValidationModalOpen = true;
        this.cdr.detectChanges();
        event.target.value = ''; // Clear the input
      }
    }
  }

  removeFile(type: string): void {
    switch (type) {
      case 'visaPhoto':
        this.visaPhotoFile = null;
        this.visaPhotoPreviewUrl = null;
        break;
      case 'visaPassportCopy':
        this.visaPassportCopyFile = null;
        this.visaPassportCopyPreviewUrl = null;
        break;
      case 'ttCopy':
        this.ttCopyFile = null;
        break;
      case 'paymentConfirmation':
        this.paymentConfirmationFile = null;
        break;
    }
  }

  closeValidationModal(): void {
    this.isValidationModalOpen = false;
    this.validationMessage = '';
    this.cdr.detectChanges();
  }

  closeNewsModal() {
    this.isNewsModalOpen = false;
  }

  // --- Referral Link Logic ---
  get referralLink(): string {
    if (!this.agentData || !this.agentData.userId) return '';
    const currentUrl = window.location.href;
    const basePath = currentUrl.split('/agent-dashboard')[0];
    return `${basePath}/apply/${this.agentData.userId}`;
  }

  copyReferralLink(): void {
    const link = this.referralLink;
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        // Find a way to show a toast, or simply alert for now
        alert('Referral link copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy link.');
      });
    }
  }

  closeTelexModal(): void {
    this.isTelexModalOpen = false;
    this.studentForTelex = null;
    this.currentStep = 1;
    this.telexForm.reset();
    this.visaPhotoFile = null;
    this.visaPhotoPreviewUrl = null;
    this.visaPassportCopyFile = null;
    this.visaPassportCopyPreviewUrl = null;
    this.ttCopyFile = null;
    this.paymentConfirmationFile = null;
  }

  // --- Submission ---
  submitTelexApplication(): void {
    if (!this.studentForTelex || !this.agentData) return;

    // Final Validation Check
    // Final Validation Check
    if (this.telexForm.invalid) {
      this.telexForm.markAllAsTouched();

      // Identify invalid fields for better feedback
      const invalidFields: string[] = [];
      const controls = this.telexForm.controls;
      for (const name in controls) {
        if (controls[name].invalid) {
          // Convert camelCase to Title Case for display
          const display = name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          invalidFields.push(display);
        }
      }

      this.validationMessage = `Please fill the following required fields: ${invalidFields.join(', ')}`;
      this.isValidationModalOpen = true;
      return;
    }

    this.isSubmittingTelex = true;
    this.cdr.detectChanges();

    const formValues = this.telexForm.value;

    // Handle Courier Partner mapping
    let finalCourierPartner = formValues.courierPartner;
    if (finalCourierPartner === 'OTHER') {
      finalCourierPartner = formValues.otherCourierDetails;
    }

    // Combine Name and Phone if SELF_PERSON
    let finalSelfPersonContact = '';
    if (formValues.docDeliveryMethod === 'SELF_PERSON') {
      finalSelfPersonContact = `${formValues.selfPersonName} - ${formValues.selfPersonPhone}`;
    }

    // Construct DTO
    const telexData: TelexApplicationDTO = {
      ...formValues,
      courierPartner: finalCourierPartner, // Use mapped value
      selfPersonContact: finalSelfPersonContact, // Combined contact
      // Map form control 'courierTrackingNumber' to DTO 'courierTrackingId'
      courierTrackingId: formValues.courierTrackingNumber,
      agentUsername: this.agentData.userId
    };

    // Remove UI-only fields so backend doesn't complain about UnrecognizedProperty
    delete (telexData as any).selfPersonName;
    delete (telexData as any).selfPersonPhone;

    this.telexService.submitTelexApplication(
      this.studentForTelex.id,
      telexData,
      {
        visaPhoto: this.visaPhotoFile || undefined,
        visaPassportCopy: this.visaPassportCopyFile || undefined,
        ttCopy: this.ttCopyFile || undefined,
        paymentConfirmation: this.paymentConfirmationFile || undefined
      }
    ).subscribe({
      next: (res) => {
        this.isSubmittingTelex = false;
        this.onTelexSuccess();
      },
      error: (err) => {
        console.error('Submission Error', err);
        this.isSubmittingTelex = false;
        alert('Failed to submit application. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  onTelexSuccess(): void {
    this.isTelexModalOpen = false;
    this.studentForTelex = null;
    this.isSuccessModalOpen = true; // Ensure this is set to true
    this.cdr.detectChanges(); // Trigger change detection to show modal

    // Delay refresh to allow user to see/close modal, OR just refresh data in background
    // We'll refresh data but keep modal open.
    // this.refreshDashboard(); // This might have been causing conflicts if it resets 'isSuccessModalOpen' or re-renders too hard.

    // Instead of full refresh that might glitch UI, just re-fetch data silently or wait.
    // Let's rely on the user closing the modal to refresh, OR refresh now but ensure modal stays.
    if (this.agentData) {
      this.fetchDashboardData(this.agentData.userId); // Background refresh
      this.loadDataInternal(this.agentData.userId); // Reload list
    }
  }

  // ======================= VISA PAYMENT FUNCTIONS =======================

  /**
   * Open payment confirmation modal
   * Called when student.action === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT'
   */
  openPaymentConfirmationModal(student: any): void {
    this.selectedPaymentStudent = student;
    const requested = (student.visaPaymentRequestedAmount || 0) + (student.visaManServiceCharge || 0);
    const received = student.visaPaymentReceivedAmount || 0;
    this.paymentAmount = Math.max(0, requested - received);
    this.paymentCurrency = student.visaPaymentRequestedCurrency || 'INR';
    this.transactionId = '';
    this.confirmationFile = null;
    this.showPaymentConfirmationModal = true;
    this.cdr.detectChanges();
  }

  closePaymentConfirmationModal(): void {
    this.showPaymentConfirmationModal = false;
    this.selectedPaymentStudent = null;
    this.cdr.detectChanges();
  }

  /**
   * Handle file selection for payment confirmation screenshot
   */
  onConfirmationFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.confirmationFile = input.files[0];
      this.cdr.detectChanges();
    }
  }

  /**
   * Submit payment confirmation to Accountant
   */
  submitPaymentConfirmation(): void {
    if (!this.selectedPaymentStudent || !this.agentData) return;

    this.isSubmittingPayment = true;
    this.cdr.detectChanges();

    const studentId = this.selectedPaymentStudent.id;
    const body = {
      agentUsername: this.agentData.userId,
      amount: this.paymentAmount,
      currency: this.paymentCurrency,
      transactionId: this.transactionId || null,
      confirmationPagePath: null as string | null
    };

    const finalizeRequest = (path: string | null) => {
      body.confirmationPagePath = path;
      this.http.post(
        `${environment.apiUrl}/api/visa/submit-payment-confirmation/${studentId}`,
        body
      ).subscribe({
        next: () => {
          this.isSubmittingPayment = false;
          this.closePaymentConfirmationModal();
          this.isPaymentSuccessModalOpen = true;
          this.cdr.detectChanges();
          this.refreshStudents();
        },
        error: (error: any) => {
          this.isSubmittingPayment = false;
          this.cdr.detectChanges();
          this.showErrorToast('Failed to submit confirmation: ' + (error?.message || 'Unknown error'));
        }
      });
    };

    if (this.confirmationFile) {
      const formData = new FormData();
      formData.append('file', this.confirmationFile);
      formData.append('studentId', studentId.toString());
      formData.append('type', 'visa-payment-confirmation');

      this.http.post<any>(
        environment.apiUrl + '/api/file/upload',
        formData
      ).subscribe({
        next: (uploadResponse) => {
          finalizeRequest(uploadResponse?.path || null);
        },
        error: (error: any) => {
          this.isSubmittingPayment = false;
          this.cdr.detectChanges();
          this.showErrorToast('Failed to upload file: ' + (error?.message || 'Unknown error'));
        }
      });
    } else {
      finalizeRequest(null);
    }
  }

  /**
   * Filter students needing visa payment action
   */
  getVisaPaymentStudents(): any[] {
    return this.students.filter(s =>
      (s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT') &&
      s['action'] === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT'
    );
  }

  /**
   * Show visa payment button
   */
  showVisaPaymentButton(student: any): boolean {
    return (student['actionOnUser'] === 'agent' || student['actionOnUser'] === 'AGENT') &&
      student['action'] === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT';
  }

  /**
   * Refresh students list
   */
  refreshStudents(): void {
    if (this.agentData) {
      this.loadDataInternal(this.agentData.userId);
    }
  }

  /**
   * Copy text to clipboard
   */
  copyToClipboard(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showSuccessToast('📋 Copied to clipboard!');
    }).catch(() => {
      this.showErrorToast('Failed to copy');
    });
  }

  /**
   * Show success toast message
   */
  showSuccessToast(message: string): void {
    this.toastMessage = message;
    this.toastType = 'success';
    this.showToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  /**
   * Show error toast message
   */
  showErrorToast(message: string): void {
    this.toastMessage = message;
    this.toastType = 'error';
    this.showToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 4000);
  }

  // --- Doc Request Methods ---

  loadDocRequests(): void {
    const username = this.authService.getUserData()?.username;
    if (!username) return;

    this.isLoading = true;
    this.http.get<any[]>(`${this.API_URL}/doc-requests/agent/${username}`).subscribe({
      next: (requests) => {
        this.docRequests = requests;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load doc requests', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get pendingDocRequests() {
    return this.docRequests.filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED');
  }

  get completedDocRequests() {
    return this.docRequests.filter(r => r.status === 'COMPLETED' || r.status === 'REJECTED');
  }

  get docRequestStats() {
    return {
      total: this.docRequests.length,
      pending: this.docRequests.filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED').length,
      completed: this.docRequests.filter(r => r.status === 'COMPLETED').length,
      rejected: this.docRequests.filter(r => r.status === 'REJECTED').length
    };
  }

  get filteredDocRequestsList() {
    return this.docRequests.filter(req => {
      let matchesSearch = true;
      if (this.docRequestListSearch) {
        const query = this.docRequestListSearch.toLowerCase();
        const name = (req.student?.fullName || '').toLowerCase();
        const email = (req.student?.email || '').toLowerCase();
        const appId = (req.student?.applicationId || '').toLowerCase();
        matchesSearch = name.includes(query) || email.includes(query) || appId.includes(query);
      }

      let matchesStatus = true;
      if (this.docRequestListStatus !== 'ALL') {
        if (this.docRequestListStatus === 'PENDING') {
          matchesStatus = req.status !== 'COMPLETED' && req.status !== 'REJECTED';
        } else {
          matchesStatus = req.status === this.docRequestListStatus;
        }
      }

      return matchesSearch && matchesStatus;
    });
  }

  clearDocRequestFilters() {
    this.docRequestListSearch = '';
    this.docRequestListStatus = 'ALL';
    this.docRequestCurrentPage = 1;
  }

  get paginatedDocRequestsList() {
    const startIndex = (this.docRequestCurrentPage - 1) * this.docRequestPageSize;
    return this.filteredDocRequestsList.slice(startIndex, startIndex + this.docRequestPageSize);
  }

  get docRequestTotalPages() {
    return Math.max(1, Math.ceil(this.filteredDocRequestsList.length / this.docRequestPageSize));
  }

  nextDocRequestPage() {
    if (this.docRequestCurrentPage < this.docRequestTotalPages) {
      this.docRequestCurrentPage++;
    }
  }

  prevDocRequestPage() {
    if (this.docRequestCurrentPage > 1) {
      this.docRequestCurrentPage--;
    }
  }

  goToDocRequestPage(page: number) {
    if (page >= 1 && page <= this.docRequestTotalPages) {
      this.docRequestCurrentPage = page;
    }
  }

  onDocRequestStudentSearch(): void {
    const query = this.docRequestStudentSearch.trim().toLowerCase();
    if (query.length < 2) {
      this.docRequestStudentSuggestions = [];
      this.docRequestShowSuggestions = false;
      return;
    }
    this.docRequestStudentSuggestions = this.students.filter(s =>
      s.fullName?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.applicationId?.toLowerCase().includes(query) ||
      s.passportNo?.toLowerCase().includes(query)
    ).slice(0, 8);
    this.docRequestShowSuggestions = this.docRequestStudentSuggestions.length > 0;
  }

  selectDocRequestStudent(student: any): void {
    this.docRequestSelectedStudent = student;
    this.docRequestStudentId = student.id;
    this.docRequestStudentSearch = student.fullName;
    this.docRequestShowSuggestions = false;
    this.docRequestStudentSuggestions = [];
  }

  clearDocRequestStudent(): void {
    this.docRequestSelectedStudent = null;
    this.docRequestStudentId = null;
    this.docRequestStudentSearch = '';
    this.docRequestStudentSuggestions = [];
    this.docRequestShowSuggestions = false;
  }

  submitDocRequest(): void {
    if (!this.docRequestStudentId || !this.docRequestDocType) {
      this.showErrorToast('Please select a student and document type.');
      return;
    }
    if (this.docRequestDocType === 'OTHER' && !this.docRequestCustomName.trim()) {
      this.showErrorToast('Please enter a custom document name.');
      return;
    }

    this.isSubmittingDocRequest = true;
    const authUser = this.authService.getUserData();
    const payload = {
      studentId: this.docRequestStudentId,
      docType: this.docRequestDocType,
      customDocName: this.docRequestDocType === 'OTHER' ? this.docRequestCustomName : null,
      requestedBy: authUser?.username || '',
      requestedByName: this.agentData?.fullName || authUser?.username || '',
      remarks: this.docRequestRemarks || null
    };

    this.http.post(`${this.API_URL}/doc-requests`, payload).subscribe({
      next: () => {
        this.clearDocRequestStudent();
        this.docRequestDocType = '';
        this.docRequestCustomName = '';
        this.docRequestRemarks = '';
        this.isSubmittingDocRequest = false;
        this.docRequestActiveTab = 'list';
        this.showToastMessage('Document request submitted successfully!');
        this.loadDocRequests();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showErrorToast('Failed to submit request: ' + (err.error || err.message));
        this.isSubmittingDocRequest = false;
        this.cdr.detectChanges();
      }
    });
  }

  getDocTypeLabel(docType: string, customName?: string): string {
    if (docType === 'OTHER' && customName) return customName;
    const found = this.docTypeOptions.find(o => o.value === docType);
    return found ? found.label : docType.replace(/_/g, ' ');
  }

  getDocRequestStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'badge-warn';
      case 'FORWARDED': return 'badge-info';
      case 'COMPLETED': return 'badge-success';
      case 'REJECTED': return 'badge-danger';
      default: return 'badge-info';
    }
  }

  downloadRequestedDoc(path: string): void {
    if (!path) return;
    const url = this.fileService.getFileUrl(path);
    window.open(url, '_blank');
  }

  // ==========================================
  // DOCUMENT RETURN LOGIC
  // ==========================================

  getInitials(name: string): string {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getDocStatusBadge(student: Student): string {
    if (student.passportReturnReceivedDate) {
      return `<span class="doc-badge badge-received"><i class="far fa-clock"></i> Return Received by Student</span>`;
    } else if (student.docReturnedDate || student.docReturnTrackingId) {
      return `<span class="doc-badge badge-returned"><i class="fas fa-check-circle"></i> Passport Returned</span>`;
    } else if (student.readyForDocReturn) {
      return `<span class="doc-badge badge-ready"><i class="fas fa-passport"></i> Passport Ready to Return</span>`;
    } else if (student.hasRaiseReturnRequest) {
      return `<span class="doc-badge badge-pending"><i class="far fa-clock"></i> Return Request Pending</span>`;
    } else if (student.applicationStatus === 'VISA_STAMPED') {
      return `<span class="doc-badge badge-na" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;"><i class="fas fa-info-circle"></i> Eligible for Return Request</span>`;
    } else {
      return `<span class="doc-badge badge-na"><i class="fas fa-minus-circle"></i> N/A</span>`;
    }
  }

  canRequestDoc(student: Student): boolean {
    return student.applicationStatus === 'VISA_STAMPED' && !student.hasRaiseReturnRequest && student.canRequestDocReturn !== false;
  }

  canMarkReceived(student: Student): boolean {
    return !!((student.docReturnedDate || student.docReturnTrackingId) && !student.passportReturnReceivedDate);
  }

  markDocReceived(student: Student): void {
    if (!this.agentData?.userId) return;

    this.http.post(`${this.API_URL}/agents/mark-doc-received/${student.id}?agentUsername=${this.agentData.userId}`, {}).subscribe({
      next: (res: any) => {
        this.showToastMessage(res.message || 'Document marked as received!', 'success');
        this.refreshStudents();
      },
      error: (err) => {
        this.showToastMessage('Error marking document as received', 'error');
      }
    });
  }
}