import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';

// --- Interfaces ---

interface Manager {
  id: number;
  fullName: string;
  email: string;
  contactNumber: string;
  role: string;
  status: string;
  username: string;
  password?: string;
  colleges: College[];
  students: any[];
}

interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
}

interface UpdateAdmissionManagerDTO {
  fullName: string;
  email: string;
  contactNumber: string;
  role: string;
  status: string;
  collegeIds: number[];
}

// --- Component ---

@Component({
  selector: 'app-admission-manager-update',
  standalone: false,
  templateUrl: './admission-manager-update.html',
  styleUrl: './admission-manager-update.css', // We are using the "premium" CSS file
})
export class AdmissionManagerUpdate implements OnInit {
  // Event emitter for the close button
  @Output() close = new EventEmitter<void>();

  // --- Component State ---
  managers: Manager[] = [];
  colleges: College[] = [];
  selectedManager: Manager | null = null;
  updateDto: UpdateAdmissionManagerDTO = this.getEmptyDto();
  isEditing = false;
  searchTerm = '';
  showSuccessModal = false;
  successMessage = '';
  title = 'Admission Managers';
  subtitle = 'Manage admission managers and their assignments';
  isLoading = false;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef, // Injected ChangeDetectorRef for manual UI updates
    private location: Location // Injected Location service
  ) {}

  ngOnInit(): void {
    this.loadManagers();
  }

  /**
   * Creates a clean, empty DTO object.
   */
  private getEmptyDto(): UpdateAdmissionManagerDTO {
    return {
      fullName: '',
      email: '',
      contactNumber: '',
      role: 'AdmissionManager',
      status: '',
      collegeIds: []
    };
  }

  /**
   * Fetches all managers from the API and updates the UI.
   */
  loadManagers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.http.get<Manager[]>('http://localhost:8080/api/managers/all').subscribe({
      next: (data) => {
        this.managers = data;
        // Collect unique colleges (as in original file)
        const uniqueCollegesSet = new Set<number>();
        const uniqueColleges: College[] = [];
        data.forEach(manager => {
          manager.colleges.forEach(college => {
            if (!uniqueCollegesSet.has(college.id)) {
              uniqueCollegesSet.add(college.id);
              uniqueColleges.push(college);
            }
          });
        });
        this.colleges = uniqueColleges;
        this.isLoading = false;
        this.cdr.detectChanges(); // Manually trigger change detection
      },
      error: (err) => {
        console.error('Error loading managers:', err);
        this.errorMessage = 'Failed to load managers. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges(); // Also trigger on error to hide spinner
      }
    });
  }

  /**
   * Filters managers based on the search term.
   */
  get filteredManagers(): Manager[] {
    if (!this.searchTerm) return this.managers;
    const term = this.searchTerm.toLowerCase();
    return this.managers.filter(m =>
      m.fullName.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      m.contactNumber.includes(term) ||
      m.username.toLowerCase().includes(term) ||
      m.id.toString().includes(term)
    );
  }

  /**
   * Selects a manager and switches to the "edit" view.
   */
  selectManager(manager: Manager): void {
    this.selectedManager = { ...manager };
    this.updateDto = {
      fullName: manager.fullName,
      email: manager.email,
      contactNumber: manager.contactNumber,
      role: manager.role,
      status: manager.status,
      collegeIds: manager.colleges.map(c => c.id)
    };
    this.isEditing = true;
    this.searchTerm = '';
    this.errorMessage = '';
    this.title = 'Update Manager Details';
    this.subtitle = `Editing profile for ${manager.username}`;
    this.cdr.detectChanges();
  }

  /**
   * Handles the "back/close" button.
   * If editing, goes back to the list.
   * If on the list, emits a (close) event to the parent.
   */
  cancelEdit(): void {
    if (this.isEditing) {
      // Go back to the list view
      this.isEditing = false;
      this.selectedManager = null;
      this.updateDto = this.getEmptyDto();
      this.errorMessage = '';
      this.title = 'Admission Managers';
      this.subtitle = 'Manage admission managers and their assignments';
      this.cdr.detectChanges();
    } else {
      // Emit the close event for the parent component to handle
      this.close.emit();
      
      // Fallback for browser back, as seen in original file
      // this.location.back();
    }
  }

  /**
   * Checks if the update form is valid.
   */
  isValidForm(): boolean {
    return !!this.updateDto.fullName?.trim() &&
           !!this.updateDto.email?.trim() &&
           !!this.updateDto.contactNumber?.trim() &&
           !!this.updateDto.status;
  }

  /**
   * Submits the update request to the API.
   */
  updateManager(): void {
    if (!this.selectedManager || !this.isValidForm()) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.http.put(`http://localhost:8080/api/managers/update/${this.selectedManager.id}`, this.updateDto).subscribe({
      next: () => {
        // Use the DTO's full name, as it might have been what was updated
        this.successMessage = `Successfully updated profile for ${this.updateDto.fullName}`;
        this.showSuccessModal = true;
        
        // Reset state
        this.isEditing = false;
        this.selectedManager = null;
        this.title = 'Admission Managers';
        this.subtitle = 'Manage admission managers and their assignments';
        
        this.isLoading = false;
        this.loadManagers(); // Reload the list *after* showing success
        // DTO is reset *after* success modal reads from it
      },
      error: (err) => {
        console.error('Error updating manager:', err);
        this.errorMessage = 'Failed to update manager. Please check your inputs and try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Closes the success modal and resets the form DTO.
   */
  closeSuccess(): void {
    this.showSuccessModal = false;
    this.updateDto = this.getEmptyDto(); // Reset DTO *after* modal is closed
    this.cdr.detectChanges();
  }

  /**
   * Helper function for the template to get assigned colleges.
   */
  getAssignedColleges(): College[] {
    if (!this.selectedManager) return [];
    return this.selectedManager.colleges;
  }

  /**
   * Helper function for the template (not currently used in premium HTML).
   */
  getCollegeNames(manager: Manager): string {
    return manager.colleges.map(c => c.collegeName).join(', ');
  }
}
