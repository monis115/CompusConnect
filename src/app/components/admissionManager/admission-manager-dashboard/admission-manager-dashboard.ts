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
  nextStep: string | null; // Ensures 'null' is allowed
  college: College;
  confirmationPagePath: string | null;
  admissionLetterPath: string | null;
  updatedBy: string | null;
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
  students: Student[];
}

// DTO for the new update API
interface StudentUpdatePayload {
  presentStatus: string;
  updatedByRole: string;
  updatedByUsername: string;
  nextStep?: string | null;
}

// --- Component ---
@Component({
  selector: 'app-admission-manager-dashboard',
  standalone: false,
  templateUrl: './admission-manager-dashboard.html',
  styleUrls: ['./admission-manager-dashboard.css'], // Main CSS
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
  activeView: 'dashboard' | 'allStudents' | 'actionSection' | 'uploadLetter' | 'letterGenerated' | 'profile' = 'dashboard';
  showStudentDetail = false;
  
  // Data for New Views
  actionableStudents: Student[] = [];
  approvedStudents: Student[] = [];
  letterGeneratedStudents: Student[] = []; 

  // Loading States
  isLoading = true;
  isSubmitting = false;
  isUploadingLetter = false;

  // Search & Filter
  searchTerm: string = '';
  filteredStudentList: Student[] = [];
  uploadLetterSearchTerm: string = ''; 
  filteredApprovedStudents: Student[] = []; 
  letterGeneratedSearchTerm: string = ''; 
  filteredLetterGeneratedStudents: Student[] = []; 

  // Upload Management
  selectedFile: File | null = null;
  studentIdForUpload: number | null = null;
  
  // Modal State
  showSuccessModal = false;
  successModalMessage = '';
  
  showActionModal = false;
  studentForAction: Student | null = null;

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
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    forkJoin({
      manager: this.http.get<ManagerData>(`${this.apiBaseUrl}/api/managers/userName/${username}`),
      actionable: this.http.get<Student[]>(`${this.apiBaseUrl}/api/managers/students/registered-or-under-review/${username}`),
      approved: this.http.get<Student[]>(`${this.apiBaseUrl}/api/managers/approved-students/${username}`),
      // <<< NEW: Use the new API endpoint for Letter Generated students >>>
      letterGenerated: this.http.get<Student[]>(`${this.apiBaseUrl}/students/generated-by-manager-username/${username}`)
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
        this.letterGeneratedStudents = results.letterGenerated; // <<< NEW
        
        // Initialize filtered lists
        this.filteredStudentList = results.manager.students || [];
        this.filteredApprovedStudents = results.approved || []; 
        this.filteredLetterGeneratedStudents = results.letterGenerated || []; // <<< NEW

        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading initial data:', error);
      }
    });
  }

  // --- View Switching ---
  switchView(view: 'dashboard' | 'allStudents' | 'actionSection' | 'uploadLetter' | 'letterGenerated' | 'profile'): void {
    this.activeView = view;
    this.showStudentDetail = false;
    this.searchTerm = '';
    this.uploadLetterSearchTerm = ''; 
    this.letterGeneratedSearchTerm = ''; 
    
    if (this.managerData?.students) {
      this.filterStudents(); 
    }
    if (this.approvedStudents) {
      this.filterApprovedStudents(); 
    }
    if (this.letterGeneratedStudents) {
      this.filterLetterGeneratedStudents(); 
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
  openActionModal(student: Student): void {
    this.studentForAction = student;
    this.showActionModal = true;
    this.cdr.markForCheck();
  }

  closeActionModal(): void {
    this.showActionModal = false;
    this.studentForAction = null;
    this.cdr.markForCheck();
  }

  quickUpdateStudentStatus(student: Student, newStatus: 'APPROVED' | 'UNDER_REVIEW' | 'REJECTED'): void {
    if (!this.managerData) return;

    this.isSubmitting = true;
    this.cdr.markForCheck();

    const payload: StudentUpdatePayload = {
      presentStatus: newStatus,
      updatedByRole: this.managerData.role,
      updatedByUsername: this.managerData.username
    };

    if (newStatus === 'APPROVED') {
      payload.nextStep = 'ADMISSION_LETTER_WAITING';
    } else if (newStatus === 'REJECTED') {
      payload.nextStep = null;
    } else if (newStatus === 'UNDER_REVIEW') {
      payload.nextStep = 'PENDING_APPROVAL';
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
          if (this.showActionModal) {
            this.closeActionModal();
          }

          if (this.managerData && this.managerData.students) {
            const index = this.managerData.students.findIndex(s => s.id === student.id);
            if (index > -1) {
              const updatedStudent = { 
                ...this.managerData.students[index], 
                presentStatus: newStatus, 
                nextStep: payload.nextStep ?? this.managerData.students[index].nextStep
              };
              this.managerData.students = [
                ...this.managerData.students.slice(0, index),
                updatedStudent,
                ...this.managerData.students.slice(index + 1)
              ];
              this.filterStudents(); 
            }
          }
          
          this.loadActionableStudents();
          this.loadApprovedStudents();

          this.cdr.markForCheck(); 
        },
        error: (error: HttpErrorResponse) => {
          console.error(`Error updating status for student ${student.id}:`, error);
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
        this.filterApprovedStudents(); 
        this.cdr.markForCheck();
      });
  }

  filterApprovedStudents(): void {
    if (!this.approvedStudents) {
      this.filteredApprovedStudents = [];
      return;
    }
    if (!this.uploadLetterSearchTerm) {
      this.filteredApprovedStudents = this.approvedStudents;
    } else {
      const term = this.uploadLetterSearchTerm.toLowerCase();
      this.filteredApprovedStudents = this.approvedStudents.filter(student => 
        student.fullName.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.college?.collegeName.toLowerCase().includes(term)
      );
    }
    this.cdr.markForCheck();
  }

  onFileSelected(event: Event, studentId: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (input.files[0].type !== 'application/pdf') {
        input.value = '';
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

  // <<< UPDATED: This function now sends 'username' in FormData and switches view on success >>>
 // ... (omitted code is unchanged)

  uploadAdmissionLetter(studentId: number): void {
    if (!this.selectedFile || this.studentIdForUpload !== studentId) {
      return;
    }

    const username = sessionStorage.getItem('userId');
    if (!username) {
      console.error('Username not found in session');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('username', username); 

    this.isUploadingLetter = true;
    this.cdr.markForCheck();

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
          // --- FIX: Update states locally for instant feedback ---
          
          // 1. Remove from 'Approved' (Upload Letter) list
          this.approvedStudents = this.approvedStudents.filter(s => s.id !== studentId);
          this.filterApprovedStudents();

          // 2. Update 'All Students' list
          if (this.managerData && this.managerData.students) {
            const index = this.managerData.students.findIndex(s => s.id === studentId);
            if (index > -1) {
              const updatedStudent = { 
                ...this.managerData.students[index], 
                admissionLetterPath: 'uploaded', 
                presentStatus: 'ADMISSION_LETTER_GENERATED' 
              };
              this.managerData.students = [
                ...this.managerData.students.slice(0, index),
                updatedStudent,
                ...this.managerData.students.slice(index + 1)
              ];
              this.filterStudents();
            }
          }

          // 3. Reload the 'Letter Generated' list from server
          this.loadLetterGeneratedStudents();
          
          this.showSuccess('Admission letter uploaded successfully');
          this.switchView('letterGenerated');
          
          // <<< --- THIS IS THE FIX --- >>>
          // Manually tell Angular to update the view right now.
          this.cdr.markForCheck(); 
          // <<< --- END OF FIX --- >>>

        },
        error: (error: HttpErrorResponse) => {
          console.error(`Error uploading admission letter for student ${studentId}:`, error);
        }
      });
  }

// ... (rest of the file is unchanged)

  // --- 'Letter Generated' Logic (UPDATED) ---
  loadLetterGeneratedStudents(): void {
    const username = sessionStorage.getItem('userId');
    if (!username) {
      console.error('Username not found in session');
      return;
    }

    this.http.get<Student[]>(`${this.apiBaseUrl}/students/generated-by-manager-username/${username}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.letterGeneratedStudents = data;
        this.filterLetterGeneratedStudents(); // Apply filter
        this.cdr.markForCheck();
      });
  }

  filterLetterGeneratedStudents(): void {
    if (!this.letterGeneratedStudents) {
      this.filteredLetterGeneratedStudents = [];
      return;
    }
    if (!this.letterGeneratedSearchTerm) {
      this.filteredLetterGeneratedStudents = this.letterGeneratedStudents;
    } else {
      const term = this.letterGeneratedSearchTerm.toLowerCase();
      this.filteredLetterGeneratedStudents = this.letterGeneratedStudents.filter(student => 
        student.fullName.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term)
      );
    }
    this.cdr.markForCheck();
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
    this.router.navigate(['/login']);
  }

  // <<< UPDATED: Handles null status >>>
  getStatusLabel(status: string | null): string {
    if (!status) return 'N/A'; // Handle null or empty string
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-default';
    const statusMap: { [key: string]: string } = {
      'REGISTERED': 'status-pending',
      'UNDER_REVIEW': 'status-review',
      'PENDING_APPROVAL': 'status-pending',
      'APPROVED': 'status-approved',
      'ADMISSION_LETTER_WAITING': 'status-waiting',
      'ADMISSION_LETTER_GENERATED': 'status-generated',
      'TELEX_INITIATED': 'status-telex',
      'TELEX_APPROVED': 'status-telex-approved',
      'VISA_INITIATD': 'status-visa',
      'VISA_APPROVED': 'status-visa-approved',
      'COMPLETED': 'status-completed',
      'REJECTED': 'status-rejected'
    };
    return statusMap[status] || 'status-default';
  }

  getAvatarColor(name: string): string {
    if (!name) return this.avatarColors[0];
    const charCode = name.charCodeAt(0) || 0;
    return this.avatarColors[charCode % this.avatarColors.length];
  }
}