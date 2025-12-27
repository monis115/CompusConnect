import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface VisaManSummaryDTO {
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

interface VisaManStudentDTO {
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
  selector: 'app-visa-manager-student-directory',
  standalone: false,
  templateUrl: './visa-manager-student-directory.html',
  styleUrl: './visa-manager-student-directory.css',
})
export class VisaManagerStudentDirectory implements OnInit {

  // Data
  visaManagers: VisaManSummaryDTO[] = [];
  students: VisaManStudentDTO[] = [];
  selectedVisaMan: VisaManSummaryDTO | null = null;

  // UI State
  isLoadingManagers = true;
  isLoadingStudents = false;
  showStudentPanel = false;
  errorMessage = '';

  private apiUrl = environment.apiUrl + '/api/visa-man';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadVisaManagers();
  }

  goBack(): void {
    if (this.showStudentPanel) {
      this.closeStudentPanel();
    } else {
      this.router.navigate(['/admin-dashboard/visa']);
    }
  }

  loadVisaManagers(): void {
    this.isLoadingManagers = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.http.get<VisaManSummaryDTO[]>(`${this.apiUrl}/list-with-count`).subscribe({
      next: (data) => {
        this.visaManagers = data;
        this.isLoadingManagers = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load Visa Managers:', err);
        this.errorMessage = 'Failed to load Visa Managers. Please try again.';
        this.isLoadingManagers = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectVisaMan(visaMan: VisaManSummaryDTO): void {
    this.selectedVisaMan = visaMan;
    this.showStudentPanel = true;
    this.loadStudents(visaMan.id);
  }

  closeStudentPanel(): void {
    this.showStudentPanel = false;
    this.selectedVisaMan = null;
    this.students = [];
    this.cdr.detectChanges();
  }

  loadStudents(visaManId: number): void {
    this.isLoadingStudents = true;
    this.students = [];
    this.cdr.detectChanges();

    this.http.get<VisaManStudentDTO[]>(`${this.apiUrl}/${visaManId}/students`).subscribe({
      next: (data) => {
        this.students = data;
        this.isLoadingStudents = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load students:', err);
        this.isLoadingStudents = false;
        if (err.status === 404) {
          this.errorMessage = 'Visa Manager not found.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  getTotalStudents(): number {
    return this.visaManagers.reduce((sum, vm) => sum + vm.studentCount, 0);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'VISA_APPLIED':
        return 'status-applied';
      case 'SUBMITTED_TO_EMBASSY':
        return 'status-embassy';
      case 'VISA_STAMPED':
        return 'status-stamped';
      case 'DOCS_RETURNED':
        return 'status-returned';
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

  trackByManagerId(index: number, item: VisaManSummaryDTO): number {
    return item.id;
  }

  trackByStudentId(index: number, item: VisaManStudentDTO): number {
    return item.id;
  }
}
