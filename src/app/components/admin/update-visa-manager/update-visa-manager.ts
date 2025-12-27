import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface VisaManDTO {
  id: number;
  username: string;
  fullName: string;
  email: string;
  contactNumber: string;
  status: string;
  role: string;
  studentCount: number;
}

interface UpdateVisaManRequest {
  username?: string;
  fullName?: string;
  email?: string;
  contactNumber?: string;
  status?: string;
}

@Component({
  selector: 'app-update-visa-manager',
  standalone: false,
  templateUrl: './update-visa-manager.html',
  styleUrl: './update-visa-manager.css',
})
export class UpdateVisaManager implements OnInit {

  // Data
  visaManagers: VisaManDTO[] = [];
  selectedVisaMan: VisaManDTO | null = null;

  // UI State
  isLoading = true;
  isUpdating = false;
  showEditModal = false;
  showSuccessToast = false;
  showErrorToast = false;
  successMessage = '';
  errorMessage = '';

  // Edit Form
  editForm: UpdateVisaManRequest = {};
  originalData: VisaManDTO | null = null;

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
    this.router.navigate(['/admin-dashboard/visa']);
  }

  loadVisaManagers(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.http.get<VisaManDTO[]>(`${this.apiUrl}/all-details`).subscribe({
      next: (data) => {
        this.visaManagers = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load Visa Managers:', err);
        this.showError('Failed to load Visa Managers. Please try again.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openEditModal(visaMan: VisaManDTO): void {
    this.selectedVisaMan = visaMan;
    this.originalData = { ...visaMan };
    this.editForm = {
      username: visaMan.username,
      fullName: visaMan.fullName,
      email: visaMan.email,
      contactNumber: visaMan.contactNumber,
      status: visaMan.status
    };
    this.showEditModal = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedVisaMan = null;
    this.originalData = null;
    this.editForm = {};
    document.body.style.overflow = '';
    this.cdr.detectChanges();
  }

  toggleStatus(visaMan: VisaManDTO): void {
    const newStatus = visaMan.status === 'Active' ? 'Inactive' : 'Active';
    this.updateVisaMan(visaMan.id, { status: newStatus });
  }

  saveChanges(): void {
    if (!this.selectedVisaMan || !this.originalData) return;

    // Build payload with only changed fields
    const updates: UpdateVisaManRequest = {};

    if (this.editForm.username !== this.originalData.username) {
      updates.username = this.editForm.username;
    }
    if (this.editForm.fullName !== this.originalData.fullName) {
      updates.fullName = this.editForm.fullName;
    }
    if (this.editForm.email !== this.originalData.email) {
      updates.email = this.editForm.email;
    }
    if (this.editForm.contactNumber !== this.originalData.contactNumber) {
      updates.contactNumber = this.editForm.contactNumber;
    }
    if (this.editForm.status !== this.originalData.status) {
      updates.status = this.editForm.status;
    }

    // If no changes, close modal
    if (Object.keys(updates).length === 0) {
      this.closeEditModal();
      return;
    }

    this.updateVisaMan(this.selectedVisaMan.id, updates, true);
  }

  private updateVisaMan(id: number, updates: UpdateVisaManRequest, closeModal = false): void {
    this.isUpdating = true;
    this.cdr.detectChanges();

    this.http.patch(`${this.apiUrl}/${id}`, updates).subscribe({
      next: () => {
        this.isUpdating = false;
        if (closeModal) {
          this.closeEditModal();
        }
        this.showSuccess('Visa Manager updated successfully!');
        this.loadVisaManagers(); // Refresh list
      },
      error: (err) => {
        this.isUpdating = false;
        console.error('Failed to update Visa Manager:', err);
        if (err.status === 404) {
          this.showError('Visa Manager not found.');
        } else {
          this.showError(err.error?.message || 'Failed to update. Please try again.');
        }
        this.cdr.detectChanges();
      }
    });
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
    }, 4000);
  }

  getStatusClass(status: string): string {
    return status === 'Active' ? 'status-active' : 'status-inactive';
  }

  getActiveCount(): number {
    return this.visaManagers.filter(vm => vm.status === 'Active').length;
  }

  trackById(index: number, item: VisaManDTO): number {
    return item.id;
  }
}
