import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface TelexManSummaryDTO {
  id: number;
  username: string;
  fullName: string;
  studentCount: number;
}

interface LastHistoryDTO {
  status: string;
  updatedBy: string;
  updatedAt: string;
  remarks: string | null;
}

interface TelexManStudentDTO {
  id: number;
  applicationId: string;
  fullName: string;
  collegeName: string | null;
  agentName: string | null;
  course: string;
  applicationStatus: string;
  lastHistory: LastHistoryDTO | null;
}

@Component({
  selector: 'app-telex-manager-student-directory',
  standalone: false,
  templateUrl: './telex-manager-student-directory.html',
  styleUrl: './telex-manager-student-directory.css',
})
export class TelexManagerStudentDirectory implements OnInit {

  // Data
  telexManagers: TelexManSummaryDTO[] = [];
  students: TelexManStudentDTO[] = [];
  selectedTelexMan: TelexManSummaryDTO | null = null;

  // UI State
  isLoadingManagers = true;
  isLoadingStudents = false;
  showStudentPanel = false;
  errorMessage = '';

  private apiUrl = environment.apiUrl + '/api/telex-man';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadTelexManagers();
  }

  goBack(): void {
    if (this.showStudentPanel) {
      this.closeStudentPanel();
    } else {
      this.router.navigate(['/admin-dashboard/telex']);
    }
  }

  loadTelexManagers(): void {
    this.isLoadingManagers = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.http.get<TelexManSummaryDTO[]>(`${this.apiUrl}/list-with-count`).subscribe({
      next: (data) => {
        this.telexManagers = data;
        this.isLoadingManagers = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load Telex Managers:', err);
        this.errorMessage = 'Failed to load Telex Managers. Please try again.';
        this.isLoadingManagers = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectTelexMan(telexMan: TelexManSummaryDTO): void {
    this.selectedTelexMan = telexMan;
    this.showStudentPanel = true;
    this.loadStudents(telexMan.id);
  }

  closeStudentPanel(): void {
    this.showStudentPanel = false;
    this.selectedTelexMan = null;
    this.students = [];
    this.cdr.detectChanges();
  }

  loadStudents(telexManId: number): void {
    this.isLoadingStudents = true;
    this.students = [];
    this.cdr.detectChanges();

    this.http.get<TelexManStudentDTO[]>(`${this.apiUrl}/${telexManId}/students`).subscribe({
      next: (data) => {
        this.students = data;
        this.isLoadingStudents = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load students:', err);
        this.isLoadingStudents = false;
        if (err.status === 404) {
          this.errorMessage = 'Telex Manager not found.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  getTotalStudents(): number {
    return this.telexManagers.reduce((sum, tm) => sum + tm.studentCount, 0);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY':
        return 'status-university';
      case 'TELEX_APPLICATION_SUBMITTED_TO_MEA':
        return 'status-mea';
      case 'TELEX_NUMBER_ISSUED':
        return 'status-issued';
      default:
        return 'status-default';
    }
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

  trackByManagerId(index: number, item: TelexManSummaryDTO): number {
    return item.id;
  }

  trackByStudentId(index: number, item: TelexManStudentDTO): number {
    return item.id;
  }
}
