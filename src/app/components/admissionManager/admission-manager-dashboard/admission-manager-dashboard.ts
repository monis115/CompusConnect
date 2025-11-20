import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AdmissionManagerService } from '../../../services/admission-manager.service';
import { HttpErrorResponse } from '@angular/common/http';

// --- Interfaces ---
interface User {
  id: number;
  fullName: string;
  email: string;
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

  // Family
  emergencyContactNo: string;
  emergencyRelation: string;
  mothersName: string;
  fathersName: string;

  // ID & Passport
  passportNo: string;
  passportValidTill: string;
  passportPath: string | null;
  adhaarCardNo: string;
  adhaarPath: string | null;

  // Academic
  class12thPassingYear: string;
  baords: string;
  class12thMarks: number;
  maxMarks: number;
  markseetPath: string | null;
  hasGivenNEET: boolean;
  neetScore: number | null;
  neetYear: string | null;

  // Application
  intake: string;
  appliedFor: string;
  college: { id: number; collegeName: string } | null;

  // Docs
  confirmationPagePath: string | null;
  admissionLetterPathInternal: string | null;
  profileImagePath: string | null;

  // Telex & Visa Details
  telexMan: User | null;
  visaMan: User | null;
  telexNumber: string | null;
  telexIssueDate: string | null;
  telexDocumentsPath: string | null; // Comma separated
  paymentStatus: string | null;
}

interface ManagerData {
  id: number;
  fullName: string;
  username: string;
  students: Student[];
}

@Component({
  selector: 'app-admission-manager-dashboard',
  standalone: false,
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
  ],
})
export class AdmissionManagerDashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private avatarColors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED'];

  managerData: ManagerData | null = null;
  selectedStudent: Student | null = null;

  // Views
  activeView: 'actions-required' | 'pending-university' | 'processing' | 'completed' = 'actions-required';

  // Lists
  actionRequiredStudents: Student[] = [];
  pendingUniversityStudents: Student[] = [];
  processingStudents: Student[] = [];
  allStudents: Student[] = [];
  filteredList: Student[] = [];

  // State
  isLoading = true;
  isSubmitting = false;
  searchTerm = '';

  // Modals
  showStudentDetail = false;
  showActionModal = false;
  showSuccessModal = false;
  successModalMessage = '';

  // Action Logic
  studentForAction: Student | null = null;
  actionType: 'forward' | 'approve' | 'assign-telex' | 'assign-visa' | null = null;
  selectedManagerUsername: string = '';

  constructor(
    private admissionService: AdmissionManagerService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInitialData(): void {
    const username = sessionStorage.getItem('userId');
    if (!username) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.admissionService.getManagerDetails(username)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          this.managerData = data;
          this.categorizeStudents();
          this.filterStudents();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading data:', error);
        }
      });
  }

  categorizeStudents(): void {
    if (!this.managerData || !this.managerData.students) return;

    this.allStudents = this.managerData.students;

    // 1. Actions Required (The "To-Do" List for Manager)
    this.actionRequiredStudents = this.allStudents.filter(s => {
      const status = s.applicationStatus?.toUpperCase();
      // Forwarding
      if (status === 'REGISTERED') return true;
      // Approving Letter
      if (status === 'ADMISSION_LETTER_GENERATED') return true;
      // Assigning Telex Man (Only if not assigned yet)
      if (status === 'APPLIED_FOR_TELEX' && !s.telexMan) return true;
      // Assigning Visa Man (Only if Telex issued and no Visa Man yet)
      if (status === 'TELEX_NUMBER_ISSUED' && !s.visaMan) return true;

      return false;
    });

    // 2. Pending University (Waiting on Uni Person)
    this.pendingUniversityStudents = this.allStudents.filter(s =>
      s.applicationStatus?.toUpperCase() === 'FORWARDED_TO_UNI'
    );

    // 3. In Processing (Waiting on Telex/Visa Managers)
    this.processingStudents = this.allStudents.filter(s => {
      const status = s.applicationStatus?.toUpperCase();
      return (status === 'APPLIED_FOR_TELEX' && s.telexMan) || // Manager working on it
        status === 'TELEX_APPLICATION_SUBMITTED_TO_MEA' ||
        status === 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY' ||
        status === 'VISA_FEE_PENDING' ||
        status === 'VISA_FEE_RECEIVED' ||
        status === 'VISA_APPLIED' ||
        status === 'PASSPORT_SUBMITTED_TO_EMBASSY';
    });
  }

  switchView(view: typeof this.activeView): void {
    this.activeView = view;
    this.searchTerm = '';
    this.filterStudents();
    this.cdr.markForCheck();
  }

  filterStudents(): void {
    let sourceList: Student[] = [];
    switch (this.activeView) {
      case 'actions-required': sourceList = this.actionRequiredStudents; break;
      case 'pending-university': sourceList = this.pendingUniversityStudents; break;
      case 'processing': sourceList = this.processingStudents; break;
      case 'completed': sourceList = this.allStudents; break;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredList = sourceList.filter(student =>
      !term ||
      student.fullName?.toLowerCase().includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.passportNo?.toLowerCase().includes(term)
    );
  }

  // --- Actions Setup ---

  initiateForwardToUniversity(student: Student): void {
    this.studentForAction = student;
    this.actionType = 'forward';
    this.showActionModal = true;
    this.cdr.markForCheck();
  }

  initiateApproveLetter(student: Student): void {
    this.studentForAction = student;
    this.actionType = 'approve';
    this.showActionModal = true;
    this.cdr.markForCheck();
  }

  initiateAssignManager(student: Student, type: 'telex' | 'visa'): void {
    this.studentForAction = student;
    this.actionType = type === 'telex' ? 'assign-telex' : 'assign-visa';
    this.selectedManagerUsername = ''; // Reset
    this.showActionModal = true;
    this.cdr.markForCheck();
  }

  // --- BUG FIX IMPLEMENTED HERE ---
  confirmAction(): void {
    if (!this.studentForAction || !this.managerData) return;

    const studentId = this.studentForAction.id;
    const managerUsername = this.managerData.username;

    this.isSubmitting = true;
    this.cdr.markForCheck(); // Trigger spinner

    // 1. Forward To University
    if (this.actionType === 'forward') {
      this.admissionService.forwardToUniversity(studentId, managerUsername).subscribe({
        next: () => {
          // CRITICAL FIX: Force update immediately
          this.isSubmitting = false;
          this.showActionModal = false;
          this.cdr.detectChanges();

          this.updateLocalStudentStatus(studentId, 'FORWARDED_TO_UNI');
          this.handleActionSuccess('Student forwarded to University successfully.');
        },
        error: (err) => this.handleError(err)
      });
    }
    // 2. Approve Admission Letter
    else if (this.actionType === 'approve') {
      this.admissionService.approveAdmissionLetter(studentId, managerUsername).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showActionModal = false;
          this.cdr.detectChanges();

          this.updateLocalStudentStatus(studentId, 'ADMISSION_LETTER_APPROVED');
          this.handleActionSuccess('Admission Letter Approved.');
        },
        error: (err) => this.handleError(err)
      });
    }
    // 3. Assign Telex Manager
    else if (this.actionType === 'assign-telex') {
      // Assuming service method exists based on API guide: POST /api/telex/assign/{studentId}
      // Passing object { managerUsername: "TELEX_001" }
      this.admissionService.assignTelexManager(studentId, this.selectedManagerUsername).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showActionModal = false;
          this.cdr.detectChanges();

          this.updateLocalStudentStatus(studentId, 'APPLIED_FOR_TELEX'); // Status usually stays same but manager added
          this.loadInitialData(); // Reload to get full manager object
          this.handleActionSuccess(`Telex Manager ${this.selectedManagerUsername} assigned.`);
        },
        error: (err) => this.handleError(err)
      });
    }
    // 4. Assign Visa Manager
    else if (this.actionType === 'assign-visa') {
      this.admissionService.assignVisaManager(studentId, this.selectedManagerUsername).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showActionModal = false;
          this.cdr.detectChanges();

          this.updateLocalStudentStatus(studentId, 'VISA_FEE_PENDING');
          this.loadInitialData();
          this.handleActionSuccess(`Visa Manager ${this.selectedManagerUsername} assigned.`);
        },
        error: (err) => this.handleError(err)
      });
    }
  }

  handleError(err: any): void {
    console.error(err);
    this.isSubmitting = false;
    this.cdr.detectChanges(); // Ensure spinner stops on error
  }

  updateLocalStudentStatus(studentId: number, newStatus: string): void {
    const student = this.allStudents.find(s => s.id === studentId);
    if (student) {
      student.applicationStatus = newStatus;
    }
    this.categorizeStudents();
    this.filterStudents();
  }

  handleActionSuccess(message: string): void {
    this.studentForAction = null;
    this.actionType = null;
    this.successModalMessage = message;
    setTimeout(() => {
      this.showSuccessModal = true;
      this.cdr.detectChanges();
    }, 150);
  }

  closeActionModal(): void {
    this.showActionModal = false;
    this.studentForAction = null;
    this.actionType = null;
    this.cdr.markForCheck();
  }

  // --- Helpers ---
  selectStudent(student: Student): void {
    this.selectedStudent = student;
    this.showStudentDetail = true;
    this.cdr.markForCheck();
  }

  closeStudentDetail(): void {
    this.showStudentDetail = false;
    setTimeout(() => { this.selectedStudent = null; }, 200);
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

  getDocUrl(path: string | null): string {
    if (!path) return '';
    return `http://localhost:8080/${path}`;
  }

  getDocsArray(pathStr: string | null): string[] {
    if (!pathStr) return [];
    return pathStr.split(',');
  }

  getStatusLabel(status: string | null): string {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getStatusClass(status: string | null): string {
    if (!status) return 'status-default';
    const s = status.toUpperCase();
    if (s === 'REGISTERED') return 'status-pending'; // Yellow
    if (s === 'ADMISSION_LETTER_APPROVED' || s === 'VISA_STAMPED') return 'status-approved'; // Green
    return 'status-default';
  }

  getAvatarColor(name: string): string {
    if (!name) return this.avatarColors[0];
    return this.avatarColors[name.charCodeAt(0) % this.avatarColors.length];
  }
}