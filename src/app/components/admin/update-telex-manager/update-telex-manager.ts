import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface TelexManDTO {
  id: number;
  username: string;
  fullName: string;
  email: string;
  contactNumber: string;
  status: string;
  role: string;
  studentCount: number;
}

interface UpdateTelexManRequest {
  username?: string;
  fullName?: string;
  email?: string;
  contactNumber?: string;
  status?: string;
}

@Component({
  selector: 'app-update-telex-manager',
  standalone: false,
  templateUrl: './update-telex-manager.html',
  styleUrl: './update-telex-manager.css',
})
export class UpdateTelexManager implements OnInit {

  // Data
  telexManagers: TelexManDTO[] = [];
  selectedTelexMan: TelexManDTO | null = null;

  // UI State
  isLoading = true;
  isUpdating = false;
  showEditModal = false;
  showSuccessToast = false;
  showErrorToast = false;
  successMessage = '';
  errorMessage = '';

  // Edit Form
  editForm: UpdateTelexManRequest = {};
  originalData: TelexManDTO | null = null;

  private apiUrl = 'http://localhost:8080/api/telex-man';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadTelexManagers();
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard/telex']);
  }

  loadTelexManagers(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.http.get<TelexManDTO[]>(`${this.apiUrl}/all-details`).subscribe({
      next: (data) => {
        this.telexManagers = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load Telex Managers:', err);
        this.showError('Failed to load Telex Managers. Please try again.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openEditModal(telexMan: TelexManDTO): void {
    this.selectedTelexMan = telexMan;
    this.originalData = { ...telexMan };
    this.editForm = {
      username: telexMan.username,
      fullName: telexMan.fullName,
      email: telexMan.email,
      contactNumber: telexMan.contactNumber,
      status: telexMan.status
    };
    this.showEditModal = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedTelexMan = null;
    this.originalData = null;
    this.editForm = {};
    document.body.style.overflow = '';
    this.cdr.detectChanges();
  }

  toggleStatus(telexMan: TelexManDTO): void {
    const newStatus = telexMan.status === 'Active' ? 'Inactive' : 'Active';
    this.updateTelexMan(telexMan.id, { status: newStatus });
  }

  saveChanges(): void {
    if (!this.selectedTelexMan || !this.originalData) return;

    // Build payload with only changed fields
    const updates: UpdateTelexManRequest = {};

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

    this.updateTelexMan(this.selectedTelexMan.id, updates, true);
  }

  private updateTelexMan(id: number, updates: UpdateTelexManRequest, closeModal = false): void {
    this.isUpdating = true;
    this.cdr.detectChanges();

    this.http.patch(`${this.apiUrl}/${id}`, updates).subscribe({
      next: () => {
        this.isUpdating = false;
        if (closeModal) {
          this.closeEditModal();
        }
        this.showSuccess('Telex Manager updated successfully!');
        this.loadTelexManagers(); // Refresh list
      },
      error: (err) => {
        this.isUpdating = false;
        console.error('Failed to update Telex Manager:', err);
        if (err.status === 404) {
          this.showError('Telex Manager not found.');
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
    return this.telexManagers.filter(tm => tm.status === 'Active').length;
  }

  trackById(index: number, item: TelexManDTO): number {
    return item.id;
  }
}
