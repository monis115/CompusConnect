
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AccountantService } from '../../../services/accountant.service';

interface AccountantDTO {
  id: number;
  fullName: string;
  username: string;
  email: string;
  contactNumber: string;
  status: string;
}

@Component({
  selector: 'app-update-accountant',
  standalone: false,
  templateUrl: './update-accountant.html',
  styleUrls: ['./update-accountant.css']
})
export class UpdateAccountant implements OnInit {

  accountants: AccountantDTO[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Edit Modal State
  showEditModal = false;
  isUpdating = false;
  selectedAccountant: AccountantDTO | null = null;
  editForm: any = {};

  // Confirmation Modal State
  showConfirmModal = false;
  confirmAction: (() => void) | null = null;
  confirmMessage = '';
  confirmTitle = '';

  constructor(
    private accountantService: AccountantService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadAccountants();
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard/account']);
  }

  getActiveCount(): number {
    return this.accountants.filter(a => a.status === 'Active').length;
  }

  loadAccountants(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.accountantService.getAllAccountants().subscribe({
      next: (data) => {
        this.accountants = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load accountants', err);
        this.errorMessage = 'Failed to load accountants. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleStatus(accountant: AccountantDTO): void {
    const newStatus = accountant.status === 'Active' ? 'Inactive' : 'Active';

    this.confirmTitle = newStatus === 'Inactive' ? 'Deactivate Accountant?' : 'Activate Accountant?';
    this.confirmMessage = `Are you sure you want to mark ${accountant.fullName} as ${newStatus}?`;
    this.confirmAction = () => {
      this.accountantService.updateAccountantStatus(accountant.id, newStatus).subscribe({
        next: () => {
          accountant.status = newStatus;
          this.showSuccess(`Status updated to ${newStatus}`);
        },
        error: (err) => {
          console.error('Status update failed', err);
          this.showError('Failed to update status');
        }
      });
    };
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  confirmModalAction(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.closeConfirmModal();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmAction = null;
    this.confirmMessage = '';
    this.confirmTitle = '';
    this.cdr.detectChanges();
  }

  openEditModal(acc: AccountantDTO): void {
    this.selectedAccountant = acc;
    this.editForm = { ...acc }; // Clone
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedAccountant = null;
    this.editForm = {};
    this.cdr.detectChanges();
  }

  saveChanges(): void {
    if (!this.selectedAccountant) return;

    this.isUpdating = true;
    this.cdr.detectChanges();

    const payload = {
      username: this.editForm.username,
      fullName: this.editForm.fullName,
      email: this.editForm.email,
      contactNumber: this.editForm.contactNumber,
      status: this.editForm.status
    };

    this.accountantService.updateAccountant(this.selectedAccountant.id, payload).subscribe({
      next: () => {
        this.isUpdating = false;
        this.closeEditModal();
        this.showSuccess('Accountant details updated successfully');
        this.loadAccountants(); // Refresh
      },
      error: (err) => {
        this.isUpdating = false;
        console.error('Update failed', err);
        this.showError('Failed to update details.');
        this.cdr.detectChanges();
      }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  private showError(msg: string) {
    this.errorMessage = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  getStatusClass(status: string): string {
    return status === 'Active' ? 'status-active' : 'status-inactive';
  }
}
