import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface UniversityPersonSummaryDTO {
  id: number;
  userName: string;
  collegeName: string;
  studentCount: number;
}

interface LastHistoryDTO {
  status: string;
  updatedBy: string;
  updatedByName?: string;
  updatedAt: string;
  remarks: string | null;
}

interface StudentDTO {
  id: number;
  applicationId: string;
  fullName: string;
  applicationStatus: string;
  admissionLetterUploaded: string;
  lastHistory: LastHistoryDTO | null;
}

@Component({
  selector: 'app-university-person-student-directory',
  standalone: false,
  templateUrl: './university-person-student-directory.html',
  styleUrl: './university-person-student-directory.css',
})
export class UniversityPersonStudentDirectory implements OnInit {

  // Data
  universityPersons: UniversityPersonSummaryDTO[] = [];
  students: StudentDTO[] = [];
  selectedPerson: UniversityPersonSummaryDTO | null = null;

  // UI State
  isLoadingPersons = true;
  isLoadingStudents = false;
  showStudentPanel = false;
  errorMessage = '';

  private apiUrl = environment.apiUrl + '/api/universityPerson';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadUniversityPersons();
  }

  goBack(): void {
    if (this.showStudentPanel) {
      this.closeStudentPanel();
    } else {
      this.router.navigate(['/admin-dashboard/university-coordinators']);
    }
  }

  loadUniversityPersons(): void {
    this.isLoadingPersons = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.http.get<UniversityPersonSummaryDTO[]>(`${this.apiUrl}/list-with-count`).subscribe({
      next: (data) => {
        this.universityPersons = data;
        this.isLoadingPersons = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load University Persons:', err);
        this.errorMessage = 'Failed to load University Coordinators. Please try again.';
        this.isLoadingPersons = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectPerson(person: UniversityPersonSummaryDTO): void {
    this.selectedPerson = person;
    this.showStudentPanel = true;
    this.loadStudents(person.id);
  }

  closeStudentPanel(): void {
    this.showStudentPanel = false;
    this.selectedPerson = null;
    this.students = [];
    this.cdr.detectChanges();
  }

  loadStudents(personId: number): void {
    this.isLoadingStudents = true;
    this.students = [];
    this.cdr.detectChanges();

    this.http.get<StudentDTO[]>(`${this.apiUrl}/${personId}/students`).subscribe({
      next: (data) => {
        this.students = data;
        this.isLoadingStudents = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load students:', err);
        this.isLoadingStudents = false;
        if (err.status === 404) {
          this.errorMessage = 'University Coordinator not found.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  getTotalStudents(): number {
    return this.universityPersons.reduce((sum, p) => sum + p.studentCount, 0);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ADMISSION_LETTER_GENERATED':
        return 'status-generated';
      case 'PENDING_DOCUMENTS':
        return 'status-pending';
      case 'DOCUMENTS_VERIFIED':
        return 'status-verified';
      case 'ADMISSION_CONFIRMED':
        return 'status-confirmed';
      default:
        return 'status-default';
    }
  }

  getLetterStatusClass(status: string): string {
    return status === 'Yes' ? 'letter-yes' : 'letter-no';
  }

  formatStatus(status: string): string {
    if (!status) return 'Unknown';
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackByPersonId(index: number, item: UniversityPersonSummaryDTO): number {
    return item.id;
  }

  trackByStudentId(index: number, item: StudentDTO): number {
    return item.id;
  }
}
