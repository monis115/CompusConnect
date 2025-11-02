import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
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
  students: any[];
}

@Component({
  selector: 'app-admission-manager-access-college',
  standalone: false,
  templateUrl: './admission-manager-access-college.html',
  styleUrl: './admission-manager-access-college.css',
})
export class AdmissionManagerAccessCollege implements OnInit {
  // List mode states
  listMode: boolean = true;
  managers: AdmissionManager[] = [];
  filteredManagers: AdmissionManager[] = [];
  managerSearchTerm: string = '';

  // Edit mode states
  managerId: number | null = null;
  manager: AdmissionManager | null = null;
  colleges: College[] = [];
  filteredColleges: College[] = [];
  selectedCollegeIds: Set<number> = new Set();
  collegeSearchTerm: string = '';
  loading: boolean = false;
  updating: boolean = false;
  showSuccessModal: boolean = false;
  errorMessage: string = '';

  private apiBase = 'http://localhost:8080/api';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadManagers();
  }

  // List Mode Methods
  loadManagers(): void {
    this.loading = true;
    this.errorMessage = '';

    console.log('Fetching all managers...');  // Debug

    const managersUrl = `${this.apiBase}/managers/all`;
    this.http.get<AdmissionManager[]>(managersUrl).subscribe({
      next: (managers) => {
        console.log('Managers fetched:', managers.length, 'items');  // Debug
        this.managers = managers;
        this.filteredManagers = [...managers];
        this.loading = false;
        this.cdr.detectChanges();  // Force view update after state change
      },
      error: (err: HttpErrorResponse) => {
        console.error('Managers fetch error:', err);  // Debug
        this.errorMessage = 'Failed to load managers. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();  // Force error view update
      }
    });
  }

  onManagerSearch(): void {
    if (!this.managerSearchTerm.trim()) {
      this.filteredManagers = [...this.managers];
    } else {
      this.filteredManagers = this.managers.filter(manager =>
        manager.fullName.toLowerCase().includes(this.managerSearchTerm.toLowerCase()) ||
        manager.email.toLowerCase().includes(this.managerSearchTerm.toLowerCase()) ||
        manager.username.toLowerCase().includes(this.managerSearchTerm.toLowerCase())
      );
    }
    this.cdr.detectChanges();  // Ensure filtered list updates immediately
  }

  onEditAccess(managerId: number): void {
    this.managerId = managerId;
    this.listMode = false;
    this.loadData();
  }

  onBackToList(): void {
    this.listMode = true;
    this.manager = null;
    this.managerId = null;
    this.selectedCollegeIds.clear();
    this.collegeSearchTerm = '';
    this.errorMessage = '';
    this.cdr.detectChanges();  // Force mode switch update
  }

  onListRefresh(): void {
    this.loadManagers();
    this.managerSearchTerm = '';
    this.onManagerSearch();
  }

  // Edit Mode Methods
  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    console.log('Fetching manager:', this.managerId);  // Debug

    const managerUrl = `${this.apiBase}/managers/${this.managerId}`;
    this.http.get<AdmissionManager>(managerUrl).subscribe({
      next: (manager) => {
        console.log('Manager fetched:', manager);  // Debug: Log full manager
        this.manager = manager;
        this.setSelectedColleges(manager.colleges);
        this.cdr.detectChanges();  // Force manager load update before async colleges fetch
        this.fetchColleges();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Manager fetch error:', err);  // Debug: Full error
        let msg = 'Failed to load manager details.';
        if (err.status === 404) {
          msg = `Manager with ID ${this.managerId} not found.`;
        } else if (err.status === 0) {
          msg = 'Network error. Check if backend is running on localhost:8080.';
        }
        this.errorMessage = msg;
        this.loading = false;
        this.cdr.detectChanges();  // Force error view update
      }
    });
  }

  private fetchColleges(): void {
    console.log('Fetching colleges...');  // Debug
    const collegesUrl = `${this.apiBase}/colleges`;
    this.http.get<College[]>(collegesUrl).subscribe({
      next: (colleges) => {
        console.log('Colleges fetched:', colleges.length, 'items');  // Debug
        this.colleges = colleges;
        this.filteredColleges = [...colleges];
        this.setSelectedColleges(this.manager?.colleges || []);
        this.loading = false;
        this.cdr.detectChanges();  // Force colleges list and checkboxes to render
      },
      error: (err: HttpErrorResponse) => {
        console.error('Colleges fetch error:', err);  // Debug
        this.errorMessage = 'Failed to load colleges. Access editing unavailable.';
        this.loading = false;
        this.cdr.detectChanges();  // Force error view update
      }
    });
  }

  private setSelectedColleges(assignedColleges: College[] | undefined): void {
    this.selectedCollegeIds.clear();
    if (assignedColleges) {
      assignedColleges.forEach(college => {
        this.selectedCollegeIds.add(college.id);
      });
    }
    console.log('Selected college IDs:', Array.from(this.selectedCollegeIds));  // Debug
  }

  onCollegeSearch(): void {
    if (!this.collegeSearchTerm.trim()) {
      this.filteredColleges = [...this.colleges];
    } else {
      this.filteredColleges = this.colleges.filter(college =>
        college.collegeName.toLowerCase().includes(this.collegeSearchTerm.toLowerCase()) ||
        college.city.toLowerCase().includes(this.collegeSearchTerm.toLowerCase()) ||
        college.country.toLowerCase().includes(this.collegeSearchTerm.toLowerCase())
      );
    }
    this.cdr.detectChanges();  // Ensure filtered colleges update immediately
  }

  onCollegeToggle(college: College, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedCollegeIds.add(college.id);
    } else {
      this.selectedCollegeIds.delete(college.id);
    }
    console.log('Toggled - New selected IDs:', Array.from(this.selectedCollegeIds));  // Debug
    this.cdr.detectChanges();  // Force checkbox state update
  }

  onEditRefresh(): void {
    if (this.managerId) {
      this.loadData();
    }
  }

  onUpdate(): void {
    if (!this.manager) {
      this.errorMessage = 'No manager loaded. Please refresh or select again.';
      this.cdr.detectChanges();
      return;
    }

    this.updating = true;
    this.errorMessage = '';

    console.log('Updating with college IDs:', Array.from(this.selectedCollegeIds));  // Debug

    // Send DTO-like body with scalars + collegeIds array (matches backend expectation)
    const updateDto = {
      fullName: this.manager.fullName,
      email: this.manager.email,
      contactNumber: this.manager.contactNumber,
      role: this.manager.role,
      status: this.manager.status,
      collegeIds: Array.from(this.selectedCollegeIds)  // Array in body, no params
    };

    const updateUrl = `${this.apiBase}/managers/update/${this.manager.id}`;
    this.http.put<AdmissionManager>(updateUrl, updateDto).subscribe({
      next: (updated) => {
        console.log('Update success:', updated);  // Debug
        this.manager = updated;
        this.setSelectedColleges(updated.colleges);
        this.updating = false;
        // Use setTimeout(0) to queue after current async stack for modal reliability
        setTimeout(() => {
          this.showSuccessModal = true;
          this.cdr.detectChanges();  // Force modal to appear immediately
        }, 0);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Update error:', err);  // Debug
        this.errorMessage = `Failed to update: ${err.status === 404 ? 'Manager not found' : err.message || 'Server error'}.`;
        this.updating = false;
        this.cdr.detectChanges();  // Force error view update
      }
    });
  }

  onCancel(): void {
    if (this.listMode) {
      window.history.back();  // If directly accessed, go back
    } else {
      this.onBackToList();  // Switch back to list
    }
  }

  clearCollegeSearch(): void {
    this.collegeSearchTerm = '';
    this.onCollegeSearch();
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.cdr.detectChanges();  // Ensure modal hides cleanly
    // Auto-switch back to list mode and refresh to reflect updates (e.g., colleges count)
    this.onBackToList();
    this.loadManagers();
  }
}