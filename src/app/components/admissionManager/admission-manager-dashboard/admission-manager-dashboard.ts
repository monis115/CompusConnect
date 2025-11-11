import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';

// --- Interfaces ---
interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
}

interface Student {
  id: number;
  fullName: string;
  dob: string;
  age: number;
  createdAt: string;
  applicationStatus: string;
  email: string;
  contactNo: string;
  address: string;
  emergencyContactNo: string;
  emergencyRelation: string;
  passportNo: string;
  passportValidTill: string;
  collegePreferences: College[];
  highestDegree: string;
  marks: number;
  appliedFor: string;
  presentStatus: string;
  nextStep: string;
  college: College;
  confirmationPagePath: string | null;
  admissionLetterPath: string | null;
  updatedBy: string | null; // Added this field
}

interface ManagerData {
  id: number;
  fullName: string;
  email: string;
  contactNumber: string;
  role: string;
  status: string;
  username: string;
  colleges: College[];
  students: Student[]; // This will hold ALL students
}

// DTO for the new update API
interface StudentUpdatePayload {
  presentStatus: string;
  updatedByRole: string;
  updatedByUsername: string;
  nextStep?: string | null; // Optional: as logic can auto-set it
}

// --- Component ---
@Component({
  selector: 'app-admission-manager-dashboard',
  standalone: false, // Assuming it's part of a module
  templateUrl: './admission-manager-dashboard.html',
  styleUrls: ['./admission-manager-dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('slideInRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
  ],
})
export class AdmissionManagerDashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private avatarColors = ['#FFC107', '#E91E63', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#009688'];

  // --- State Properties ---
  managerData: ManagerData | null = null;
  selectedStudent: Student | null = null;
  
  // View Management
  activeView: 'dashboard' | 'allStudents' | 'actionSection' | 'uploadLetter' | 'profile' = 'dashboard';
  showStudentDetail = false;
  
  // Data for New Views
  actionableStudents: Student[] = [];
  approvedStudents: Student[] = [];

  // Loading States
  isLoading = true; // Initial load
  isSubmitting = false; // For quick actions
  isUploadingLetter = false;

  // Search & Filter
  searchTerm: string = '';
  filteredStudentList: Student[] = []; // For 'allStudents' view

  // Upload Management
  selectedFile: File | null = null;
  studentIdForUpload: number | null = null;
  
  // Modal State
  showSuccessModal = false;
  successModalMessage = '';

  // API Base URL
  private apiBaseUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  // --- Lifecycle Hooks ---
  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Data Loading ---
  loadInitialData(): void {
    const username = sessionStorage.getItem('userId');
    if (!username) {
      this.router.navigate(['/login']); // Or your login route
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    // Use forkJoin to load all initial data in parallel
    forkJoin({
      manager: this.http.get<ManagerData>(`${this.apiBaseUrl}/api/managers/userName/${username}`),
      actionable: this.http.get<Student[]>(`${this.apiBaseUrl}/api/managers/students/registered-or-under-review/${username}`),
      approved: this.http.get<Student[]>(`${this.apiBaseUrl}/api/managers/approved-students/${username}`)
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({
      next: (results) => {
        this.managerData = results.manager;
        this.actionableStudents = results.actionable;
        this.approvedStudents = results.approved;
        this.filteredStudentList = results.manager.students || []; // Initialize filter list
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading initial data:', error);
        // Handle error (e.g., show error modal)
      }
    });
  }

  // --- View Switching ---
  switchView(view: 'dashboard' | 'allStudents' | 'actionSection' | 'uploadLetter' | 'profile'): void {
    this.activeView = view;
    this.showStudentDetail = false; // Close detail view when switching
    this.searchTerm = ''; // Reset search
    if (this.managerData?.students) {
      this.filteredStudentList = this.managerData.students;
    }
    this.cdr.markForCheck();
  }

  // --- 'All Students' View Logic ---
  selectStudent(student: Student): void {
    this.selectedStudent = student;
    this.showStudentDetail = true;
    this.cdr.markForCheck();
  }

  closeStudentDetail(): void {
    this.showStudentDetail = false;
    this.selectedStudent = null;
    this.selectedFile = null;
    this.studentIdForUpload = null;
    this.cdr.markForCheck();
  }

  filterStudents(): void {
    if (!this.managerData?.students) {
      this.filteredStudentList = [];
      return;
    }
    if (!this.searchTerm) {
      this.filteredStudentList = this.managerData.students;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredStudentList = this.managerData.students.filter(student => 
        student.fullName.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.appliedFor.toLowerCase().includes(term)
      );
    }
    this.cdr.markForCheck();
  }

  // --- 'Action Section' Logic ---
  quickUpdateStudentStatus(student: Student, newStatus: 'APPROVED' | 'UNDER_REVIEW' | 'REJECTED'): void {
    if (!this.managerData) return;

    this.isSubmitting = true; // Use submitting spinner
    this.cdr.markForCheck();

    const payload: StudentUpdatePayload = {
      presentStatus: newStatus,
      updatedByRole: this.managerData.role,
      updatedByUsername: this.managerData.username
    };

    // Auto-set nextStep based on newStatus
    if (newStatus === 'APPROVED') {
      payload.nextStep = 'ADMISSION_LETTER_WAITING';
    } else if (newStatus === 'REJECTED') {
      payload.nextStep = null;
    } else if (newStatus === 'UNDER_REVIEW') {
      payload.nextStep = 'PENDING_APPROVAL'; // Or whatever logic fits
    }

    this.http.put(`${this.apiBaseUrl}/students/update-status/${student.id}`, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.showSuccess(`Student ${student.fullName} has been ${newStatus.toLowerCase()}.`);
          // Refresh the actionable students list
          this.loadActionableStudents();
          // Also refresh the approved list, in case one was just approved
          this.loadApprovedStudents();
        },
        error: (error: HttpErrorResponse) => {
          console.error(`Error updating status for student ${student.id}:`, error);
          // Show error modal
        }
      });
  }

  loadActionableStudents(): void {
    if (!this.managerData) return;
    this.http.get<Student[]>(`${this.apiBaseUrl}/api/managers/students/registered-or-under-review/${this.managerData.username}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.actionableStudents = data;
        this.cdr.markForCheck();
      });
  }

  // --- 'Upload Letter' Logic ---
  loadApprovedStudents(): void {
    if (!this.managerData) return;
    this.http.get<Student[]>(`${this.apiBaseUrl}/api/managers/approved-students/${this.managerData.username}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.approvedStudents = data;
        this.cdr.markForCheck();
      });
  }

  onFileSelected(event: Event, studentId: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (input.files[0].type !== 'application/pdf') {
        // Show error: non-PDF file
        input.value = ''; // Clear the input
        return;
      }
      this.selectedFile = input.files[0];
      this.studentIdForUpload = studentId;
      this.cdr.markForCheck();
    }
  }

  clearFileSelection(): void {
    this.selectedFile = null;
    this.studentIdForUpload = null;
    this.cdr.markForCheck();
  }

  uploadAdmissionLetter(studentId: number): void {
    if (!this.selectedFile || this.studentIdForUpload !== studentId) {
      // Show error: No file selected for this student
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.isUploadingLetter = true;
    this.cdr.markForCheck();

    // Use the correct endpoint from StudentController
    this.http.post(`${this.apiBaseUrl}/students/upload-admission-letter/${studentId}`, formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isUploadingLetter = false;
          this.clearFileSelection();
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.showSuccess('Admission letter uploaded successfully');
          // Refresh the approved students list to show the change
          this.loadApprovedStudents();
        },
        error: (error: HttpErrorResponse) => {
          console.error(`Error uploading admission letter for student ${studentId}:`, error);
          // Show error modal
        }
      });
  }

  // --- Utility & Helper Functions ---

  getConfirmationPageUrl(path: string): string {
    return `${this.apiBaseUrl}/${path}`;
  }

  getAdmissionLetterUrl(path: string): string {
    return `${this.apiBaseUrl}/${path}`;
  }

  showSuccess(message: string): void {
    this.successModalMessage = message;
    this.showSuccessModal = true;
    this.cdr.markForCheck();
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.cdr.markForCheck();
  }

  logout(): void {
    sessionStorage.clear();
    this.router.navigate(['/login']); // Or your login route
  }

  getStatusLabel(status: string): string {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-default';
    const statusMap: { [key: string]: string } = {
      'REGISTERED': 'status-pending', // Changed to pending
      'UNDER_REVIEW': 'status-review',
      'PENDING_APPROVAL': 'status-pending',
      'APPROVED': 'status-approved',
      'ADMISSION_LETTER_WAITING': 'status-waiting',
      'ADMISSION_LETTER_GENERATED': 'status-generated',
      'TELEX_INITIATED': 'status-telex',
      'TELEX_APPROVED': 'status-telex-approved',
      'VISA_INITIATD': 'status-visa', // Corrected typo
      'VISA_APPROVED': 'status-visa-approved',
      'COMPLETED': 'status-completed',
      'REJECTED': 'status-rejected'
    };
    return statusMap[status] || 'status-default';
  }

  getAvatarColor(name: string): string {
    const charCode = name.charCodeAt(0) || 0;
    return this.avatarColors[charCode % this.avatarColors.length];
  }
}