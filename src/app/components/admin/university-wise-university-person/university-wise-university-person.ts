import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface CoordinatorDTO {
  id: number;
  userName: string;
  status: string;
  studentCount: number;
}

interface CollegeWithCoordinatorDTO {
  collegeId: number;
  collegeName: string;
  city: string;
  country: string;
  hasCoordinator: boolean;
  coordinator: CoordinatorDTO | null;
}

type FilterType = 'all' | 'assigned' | 'unassigned';

@Component({
  selector: 'app-university-wise-university-person',
  standalone: false,
  templateUrl: './university-wise-university-person.html',
  styleUrl: './university-wise-university-person.css',
})
export class UniversityWiseUniversityPerson implements OnInit {

  // Data
  allColleges: CollegeWithCoordinatorDTO[] = [];
  filteredColleges: CollegeWithCoordinatorDTO[] = [];

  // UI State
  isLoading = true;
  errorMessage = '';
  activeFilter: FilterType = 'all';
  searchTerm = '';

  private apiUrl = 'http://localhost:8080/api/colleges';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadColleges();
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard/university-coordinators']);
  }

  loadColleges(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.http.get<CollegeWithCoordinatorDTO[]>(`${this.apiUrl}/with-coordinators`).subscribe({
      next: (data) => {
        this.allColleges = data;
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load colleges:', err);
        this.errorMessage = 'Failed to load colleges. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setFilter(filter: FilterType): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    let result = [...this.allColleges];

    // Apply status filter
    if (this.activeFilter === 'assigned') {
      result = result.filter(c => c.hasCoordinator);
    } else if (this.activeFilter === 'unassigned') {
      result = result.filter(c => !c.hasCoordinator);
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(c =>
        c.collegeName.toLowerCase().includes(term) ||
        c.city.toLowerCase().includes(term) ||
        c.country.toLowerCase().includes(term) ||
        (c.coordinator?.userName?.toLowerCase().includes(term) ?? false)
      );
    }

    this.filteredColleges = result;
    this.cdr.detectChanges();
  }

  // Stats methods
  getTotalColleges(): number {
    return this.allColleges.length;
  }

  getAssignedCount(): number {
    return this.allColleges.filter(c => c.hasCoordinator).length;
  }

  getUnassignedCount(): number {
    return this.allColleges.filter(c => !c.hasCoordinator).length;
  }

  getActiveCoordinators(): number {
    return this.allColleges.filter(c => c.coordinator?.status === 'Active').length;
  }

  getTotalStudents(): number {
    return this.allColleges.reduce((sum, c) => sum + (c.coordinator?.studentCount || 0), 0);
  }

  // Navigation
  navigateToManage(): void {
    this.router.navigate(['/admin-dashboard/manage-university-person']);
  }

  viewStudents(coordinator: CoordinatorDTO): void {
    this.router.navigate(['/admin-dashboard/university-person-directory']);
  }

  getStatusClass(status: string): string {
    return status === 'Active' ? 'status-active' : 'status-inactive';
  }

  trackByCollegeId(index: number, item: CollegeWithCoordinatorDTO): number {
    return item.collegeId;
  }
}
