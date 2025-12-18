
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DocPersonService, DocPersonDTO } from '../../../services/doc-person.service';

@Component({
  selector: 'app-doc-person-update',
  standalone: false,
  templateUrl: './doc-person-update.html',
  styleUrls: ['./doc-person-update.css']
})
export class DocPersonUpdate implements OnInit {

  docPersons: DocPersonDTO[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Edit Modal State
  showEditModal = false;
  isUpdating = false;
  selectedDocPerson: DocPersonDTO | null = null;
  editForm: any = {};

  // Confirmation Modal State
  showConfirmModal = false;
  confirmAction: (() => void) | null = null;
  confirmMessage = '';
  confirmTitle = '';

  constructor(
    private docPersonService: DocPersonService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadDocPersons();
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard/doc-person']);
  }

  getActiveCount(): number {
    return this.docPersons.filter(d => d.status === 'Active').length;
  }

  loadDocPersons(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.docPersonService.getAllDocPersons().subscribe({
      next: (data) => {
        this.docPersons = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load doc persons', err);
        this.errorMessage = 'Failed to load Doc Persons. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleStatus(docPerson: DocPersonDTO): void {
    const newStatus = docPerson.status === 'Active' ? 'Inactive' : 'Active';

    this.confirmTitle = newStatus === 'Inactive' ? 'Deactivate Doc Person?' : 'Activate Doc Person?';
    this.confirmMessage = `Are you sure you want to mark ${docPerson.fullName} as ${newStatus}?`;
    this.confirmAction = () => {
      this.docPersonService.updateDocPersonStatus(docPerson.id, newStatus).subscribe({
        next: () => {
          docPerson.status = newStatus;
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

  openEditModal(docPerson: DocPersonDTO): void {
    this.selectedDocPerson = docPerson;
    this.editForm = { ...docPerson }; // Clone
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedDocPerson = null;
    this.editForm = {};
    this.cdr.detectChanges();
  }

  saveChanges(): void {
    if (!this.selectedDocPerson) return;

    this.isUpdating = true;
    this.cdr.detectChanges();

    const payload = {
      username: this.editForm.username,
      fullName: this.editForm.fullName,
      email: this.editForm.email,
      contactNumber: this.editForm.contactNumber,
      status: this.editForm.status
    };

    this.docPersonService.updateDocPerson(this.selectedDocPerson.id, payload).subscribe({
      next: () => {
        this.isUpdating = false;
        this.closeEditModal();
        this.showSuccess('Doc Person details updated successfully');
        this.loadDocPersons(); // Refresh
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
