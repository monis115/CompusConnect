import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
}

interface AdmissionManager {
  id: number;
  fullName: string;
  email: string;
  contactNumber: string;
  role: string;
  status: string;
  username: string;
  password: string;
  colleges: College[];
  students: Student[];
}

@Component({
  selector: 'app-active-admission-manager',
  standalone: false,
  templateUrl: './active-admission-manager.html',
  styleUrl: './active-admission-manager.css',
})
export class ActiveAdmissionManager implements OnInit, OnDestroy {
  managers: AdmissionManager[] = [];
  selectedManager: AdmissionManager | null = null;
  selectedStudent: Student | null = null;
  isLoading = true;
  error: string | null = null;
  viewMode: 'list' | 'manager-detail' | 'student-detail' = 'list';
  
  totalStudents = 0;
  totalColleges = 0;

  loadingManagerId: number | null = null;
  loadingStudentId: number | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadManagers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadManagers(): void {
    this.isLoading = true;
    this.error = null;
    
    this.http.get<AdmissionManager[]>('http://localhost:8080/api/managers/with-students')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.managers = data;
          this.totalStudents = data.reduce((sum, m) => sum + m.students.length, 0);
          this.totalColleges = data.reduce((sum, m) => sum + m.colleges.length, 0);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'Failed to load admission managers. Please try again.';
          this.isLoading = false;
          console.error('Error loading managers:', err);
          this.cdr.markForCheck();
        }
      });
  }

  selectManager(manager: AdmissionManager): void {
    this.loadingManagerId = manager.id;

    setTimeout(() => {
      this.selectedManager = manager;
      this.viewMode = 'manager-detail';
      this.loadingManagerId = null;
      this.cdr.markForCheck();
    }, 300);
  }

  selectStudent(student: Student): void {
    this.loadingStudentId = student.id;

    setTimeout(() => {
      this.selectedStudent = student;
      this.viewMode = 'student-detail';
      this.loadingStudentId = null;
      this.cdr.markForCheck();
    }, 300);
  }

  backToList(): void {
    this.viewMode = 'list';
    this.selectedManager = null;
    this.selectedStudent = null;
    this.cdr.markForCheck();
  }

  backToManager(): void {
    this.viewMode = 'manager-detail';
    this.selectedStudent = null;
    this.cdr.markForCheck();
  }

  // --- THIS FUNCTION IS UPDATED ---
  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      // Manager Statuses
      'Active': 'status-active',
      'Inactive': 'status-inactive',

      // Student Statuses from Enum
      'REGISTERED': 'status-registered',
      'UNDER_REVIEW': 'status-review',
      'PENDING_APPROVAL': 'status-review',
      'APPROVED': 'status-active',
      'ADMISSION_LETTER_WAITING': 'status-submitted',
      'ADMISSION_LETTER_GENERATED': 'status-submitted',
      'TELEX_INITIATED': 'status-submitted',
      'TELEX_APPROVED': 'status-submitted',
      'VISA_INITIATED': 'status-submitted',
      'VISA_APPROVED': 'status-submitted',
      'COMPLETED': 'status-active',
      'REJECTED': 'status-inactive',
    };
    return statusMap[status] || ''; // Returns an empty string if no match (default)
  }
  // --- END OF UPDATE ---

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  }
}