import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface UniversityPersonDTO {
  id: number;
  userName: string;
  status: string;
  role: string;
  collegeId: number;
  collegeName: string;
  studentCount: number;
}

interface CollegeDTO {
  id: number;
  collegeName: string;
  city: string;
  country: string;
}

interface LastHistoryDTO {
  status: string;
  updatedBy: string;
  updatedAt: string;
  remarks: string | null;
}

interface StudentDTO {
  id: number;
  applicationId: string;
  fullName: string;
  agentName: string | null;
  course: string;
  applicationStatus: string;
  lastHistory: LastHistoryDTO | null;
}

interface UpdateRequest {
  userName?: string;
  status?: string;
  role?: string;
  collegeId?: number;
}

@Component({
  selector: 'app-update-university-person',
  standalone: false,
  templateUrl: './update-university-person.html',
  styleUrl: './update-university-person.css',
})
export class UpdateUniversityPerson implements OnInit {

  // Data
  coordinators: UniversityPersonDTO[] = [];
  colleges: CollegeDTO[] = [];
  students: StudentDTO[] = [];
  selectedCoordinator: UniversityPersonDTO | null = null;

  // UI State
  isLoading = true;
  isUpdating = false;
  isLoadingStudents = false;
  showEditModal = false;
  showStudentsModal = false;
  showSuccessToast = false;
  showErrorToast = false;
  successMessage = '';
  errorMessage = '';

  // Edit Form
  editForm: UpdateRequest = {};
  originalData: UniversityPersonDTO | null = null;

  private apiUrl = environment.apiUrl + '/api/universityPerson';
  private collegesUrl = environment.apiUrl + '/api/colleges';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard/university-coordinators']);
  }

  loadData(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    // Load coordinators
    this.http.get<UniversityPersonDTO[]>(`${this.apiUrl}/all-details`).subscribe({
      next: (data) => {
        this.coordinators = data;
        this.loadColleges();
      },
      error: (err) => {
        console.error('Failed to load coordinators:', err);
        this.showError('Failed to load University Coordinators. Please try again.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadColleges(): void {
    this.http.get<CollegeDTO[]>(this.collegesUrl).subscribe({
      next: (data) => {
        this.colleges = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load colleges:', err);
        this.showError('Failed to load colleges. Some features may not work.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openEditModal(coordinator: UniversityPersonDTO): void {
    this.selectedCoordinator = coordinator;
    this.originalData = { ...coordinator };
    this.editForm = {
      userName: coordinator.userName,
      status: coordinator.status,
      collegeId: coordinator.collegeId
    };
    this.showEditModal = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedCoordinator = null;
    this.originalData = null;
    this.editForm = {};
    document.body.style.overflow = '';
    this.cdr.detectChanges();
  }

  openStudentsModal(coordinator: UniversityPersonDTO): void {
    this.selectedCoordinator = coordinator;
    this.showStudentsModal = true;
    this.loadStudents(coordinator.id);
    document.body.style.overflow = 'hidden';
  }

  closeStudentsModal(): void {
    this.showStudentsModal = false;
    this.selectedCoordinator = null;
    this.students = [];
    document.body.style.overflow = '';
    this.cdr.detectChanges();
  }

  loadStudents(coordinatorId: number): void {
    this.isLoadingStudents = true;
    this.students = [];
    this.cdr.detectChanges();

    this.http.get<StudentDTO[]>(`${this.apiUrl}/${coordinatorId}/students`).subscribe({
      next: (data) => {
        this.students = data;
        this.isLoadingStudents = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load students:', err);
        this.isLoadingStudents = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleStatus(coordinator: UniversityPersonDTO): void {
    const newStatus = coordinator.status === 'Active' ? 'Inactive' : 'Active';
    this.updateCoordinator(coordinator.id, { status: newStatus });
  }

  saveChanges(): void {
    if (!this.selectedCoordinator || !this.originalData) return;

    // Build payload with only changed fields
    const updates: UpdateRequest = {};

    if (this.editForm.userName !== this.originalData.userName) {
      updates.userName = this.editForm.userName;
    }
    if (this.editForm.status !== this.originalData.status) {
      updates.status = this.editForm.status;
    }
    if (this.editForm.collegeId !== this.originalData.collegeId) {
      updates.collegeId = this.editForm.collegeId;
    }

    // If no changes, close modal
    if (Object.keys(updates).length === 0) {
      this.closeEditModal();
      return;
    }

    this.updateCoordinator(this.selectedCoordinator.id, updates, true);
  }

  private updateCoordinator(id: number, updates: UpdateRequest, closeModal = false): void {
    this.isUpdating = true;
    this.cdr.detectChanges();

    this.http.patch(`${this.apiUrl}/${id}`, updates).subscribe({
      next: () => {
        this.isUpdating = false;
        if (closeModal) {
          this.closeEditModal();
        }
        this.showSuccess('University Coordinator updated successfully!');
        this.loadData(); // Refresh list
      },
      error: (err) => {
        this.isUpdating = false;
        console.error('Failed to update coordinator:', err);

        // Check for college assignment conflict
        const errorMsg = err.error?.message || err.error || '';
        if (errorMsg.includes('already assigned')) {
          this.showError(errorMsg);
        } else if (err.status === 404) {
          this.showError('University Coordinator not found.');
        } else if (err.status === 500) {
          this.showError(errorMsg || 'Server error. The college may already be assigned to another active coordinator.');
        } else {
          this.showError('Failed to update. Please try again.');
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Check if a college is assigned to an active coordinator (other than the one being edited)
  isCollegeAssigned(collegeId: number): boolean {
    const editingId = this.selectedCoordinator?.id;
    return this.coordinators.some(c =>
      c.collegeId === collegeId &&
      c.status === 'Active' &&
      c.id !== editingId
    );
  }

  // Get the coordinator who has this college assigned
  getAssignedCoordinator(collegeId: number): string {
    const coordinator = this.coordinators.find(c =>
      c.collegeId === collegeId &&
      c.status === 'Active' &&
      c.id !== this.selectedCoordinator?.id
    );
    return coordinator ? coordinator.userName : '';
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.showSuccessToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showSuccessToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.showErrorToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showErrorToast = false;
      this.cdr.detectChanges();
    }, 5000);
  }

  getStatusClass(status: string): string {
    return status === 'Active' ? 'status-active' : 'status-inactive';
  }

  getActiveCount(): number {
    return this.coordinators.filter(c => c.status === 'Active').length;
  }

  getTotalStudents(): number {
    return this.coordinators.reduce((sum, c) => sum + c.studentCount, 0);
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

  trackById(index: number, item: UniversityPersonDTO): number {
    return item.id;
  }

  trackByStudentId(index: number, item: StudentDTO): number {
    return item.id;
  }
}
