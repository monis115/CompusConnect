import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ElementRef } from '@angular/core';
import { AdminAuthService } from '../../../services/admin-auth-service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface StatCard {
  title: string;
  value: number;
  change: string;
  icon: string;
  color: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  status: string;
  email: string;
  lastLogin: string;
}

interface Application {
  id: string;
  studentName: string;
  college: string;
  status: string;
  agent: string;
  date: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

interface College {
  id?: number;
  collegeName: string;
  city: string;
  country: string;
}

@Component({
  selector: 'app-admin-dashboard-overview',
  templateUrl: './admin-dashboard-overview.html',
  standalone: false,
  styleUrls: ['./admin-dashboard-overview.css']
})
export class AdminDashboardOverview implements OnInit, AfterViewInit {

  isContentLoading = true;
  private pendingSection: string | null = null;
  activeSection: string = 'overview';
  admin: any;
  colleges: College[] = [];
  filteredColleges: College[] = [];
  loading = false;
  error = '';
  searchTerm = '';
  showAddModal = false;
  showSuccessMessage = false;
  successMessage = '';
  newCollege: College = { collegeName: '', city: '', country: '' };
  isAdding = false;

  isHeaderLoaded = false;

  private apiUrl = 'http://localhost:8080/api/colleges';

  stats: StatCard[] = [
    { title: 'Total Users', value: 1248, change: '+12%', icon: 'users', color: '#6366f1' },
    { title: 'Pending Approvals', value: 23, change: '+5', icon: 'clock', color: '#f59e0b' },
    { title: 'Active Students', value: 856, change: '+8%', icon: 'graduation-cap', color: '#10b981' },
    { title: 'Total Revenue', value: 245000, change: '+18%', icon: 'dollar-sign', color: '#8b5cf6' }
  ];

  recentUsers: User[] = [
    { id: 'U001', name: 'John Smith', role: 'Agent', status: 'Waiting for Approval', email: 'john@example.com', lastLogin: '2 hours ago' },
    { id: 'U002', name: 'Sarah Johnson', role: 'Student', status: 'Active', email: 'sarah@example.com', lastLogin: '1 day ago' },
    { id: 'U003', name: 'Mike Davis', role: 'Admission Manager', status: 'Active', email: 'mike@example.com', lastLogin: '3 hours ago' }
  ];

  recentApplications: Application[] = [
    { id: 'APP001', studentName: 'Emily Chen', college: 'Harvard University', status: 'Pending', agent: 'John Smith', date: '2024-10-22' },
    { id: 'APP002', studentName: 'David Park', college: 'MIT', status: 'Approved', agent: 'Sarah Wilson', date: '2024-10-21' },
    { id: 'APP003', studentName: 'Lisa Wang', college: 'Stanford', status: 'VISA Process', agent: 'John Smith', date: '2024-10-20' }
  ];

  menuItems: MenuItem[] = [
    { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
    { id: 'students', label: 'Students', icon: 'graduation-cap' },
    { id: 'agents', label: 'Agents', icon: 'users' },
    { id: 'visa-managers', label: 'VISA Managers', icon: 'plane' },
    { id: 'admission-managers', label: 'Admission Managers', icon: 'building' },
    { id: 'colleges', label: 'Colleges', icon: 'university' },
    { id: 'users', label: 'User Management', icon: 'shield' },
    { id: 'applications', label: 'Applications', icon: 'file-text' },
    { id: 'payments', label: 'Payments', icon: 'credit-card' },
    { id: 'reports', label: 'Reports & Audits', icon: 'bar-chart' }
  ];

  constructor(
    private authService: AdminAuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private elRef: ElementRef
  ) { }

  ngOnInit() {
    this.admin = this.authService.getUserData();

    // Listen to the child route data
    const childRoute = this.route.firstChild;
    if (childRoute) {
      childRoute.data.subscribe(data => {
        this.handleSectionChange(data['section'] || 'overview');
      });
    }

    // Fallback: Listen to URL changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Logic to find the current active section from URL
      const urlSegments = this.router.url.split('/');
      const lastSegment = urlSegments[urlSegments.length - 1];

      // Check if the last segment is a valid menu item id
      if (this.menuItems.some(item => item.id === lastSegment)) {
        this.handleSectionChange(lastSegment);
      } else {
        // Fallback or check parent route
        const parentSegment = urlSegments[urlSegments.length - 2];
        if (parentSegment === 'admin-dashboard' && urlSegments.length > 2) {
          this.handleSectionChange(lastSegment);
        } else if (parentSegment === 'admin-dashboard') {
          this.handleSectionChange('overview');
        }
      }
    });

    // Initial check on load
    const currentUrl = this.router.url;
    const urlSegments = currentUrl.split('/');
    const lastSegment = urlSegments[urlSegments.length - 1];

    if (this.menuItems.some(item => item.id === lastSegment)) {
      this.handleSectionChange(lastSegment);
    } else {
      this.handleSectionChange('overview');
    }
  }

  private handleSectionChange(section: string) {
    if (section === this.activeSection && !this.isContentLoading) {
      return;
    }

    this.isContentLoading = true;
    this.pendingSection = section;
    this.cdr.detectChanges();

    setTimeout(() => this.finaliseSection(section), 120);
  }

  private finaliseSection(section: string) {
    this.activeSection = section;
    this.isContentLoading = false;
    this.cdr.detectChanges();

    requestAnimationFrame(() => {
      const el = this.elRef.nativeElement.querySelector('.content-area');
      el?.classList.add('animate-in');
    });

    if (section === 'colleges' && this.colleges.length === 0) { // Only load if not already loaded
      console.log('Loading colleges...');
      this.loadColleges();
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.isHeaderLoaded = true;
      this.cdr.detectChanges();
    }, 100);
  }

  navigateTo(section: string) {
    this.router.navigate([`/admin-dashboard/${section}`]);
  }

  loadColleges() {
    this.loading = true;
    this.error = '';
    this.http.get<College[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.colleges = data;
        this.filteredColleges = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load colleges. Please try again.';
        this.loading = false;
        console.error('Load colleges error:', err);
        this.cdr.detectChanges();
      }
    });
  }

  addCollege() {
    if (!this.newCollege.collegeName?.trim() || !this.newCollege.city?.trim() || !this.newCollege.country?.trim()) {
      alert('Please fill all fields');
      return;
    }
    this.isAdding = true;
    this.cdr.detectChanges();
    this.http.post<College>(this.apiUrl, this.newCollege).subscribe({
      next: (college) => {
        this.colleges.unshift(college);
        this.searchTerm = '';
        this.searchCollege();
        this.closeModal();
        this.showSuccess('College added successfully!');
        this.isAdding = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert('Failed to add college. Please try again.');
        console.error('Add college error:', err);
        this.isAdding = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteCollege(id: number | undefined) {
    if (!id || !confirm('Are you sure you want to delete this college?')) return;
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.colleges = this.colleges.filter(c => c.id !== id);
        this.searchCollege();
        this.showSuccess('College deleted successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert('Failed to delete college');
        console.error('Delete error:', err);
      }
    });
  }

  searchCollege() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredColleges = [...this.colleges];
    } else {
      this.filteredColleges = this.colleges.filter(college =>
        college.collegeName.toLowerCase().includes(term) ||
        college.city.toLowerCase().includes(term) ||
        college.country.toLowerCase().includes(term)
      );
    }
    this.cdr.detectChanges();
  }

  showSuccess(message: string) {
    this.successMessage = message;
    this.showSuccessMessage = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showSuccessMessage = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  openAddModal() {
    this.showAddModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.showAddModal = false;
    this.resetBlob(); // You had resetBlob, I'll keep it, assuming it's your resetForm
    this.isAdding = false;
    this.cdr.detectChanges();
  }

  resetBlob() { // Renaming this to resetForm would be clearer
    this.newCollege = { collegeName: '', city: '', country: '' };
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Active': 'status-active',
      'Waiting for Approval': 'status-pending',
      'Inactive': 'status-inactive',
      'Pending': 'status-pending',
      'Approved': 'status-approved',
      'VISA Process': 'status-visa',
      'Enrolled': 'status-enrolled'
    };
    return statusMap[status] || 'status-default';
  }

  // === 🚀 ADDED MISSING PROPERTIES HERE ===

  /**
   * Gets the display title for the currently active section.
   */
  get pageTitle(): string {
    if (this.activeSection === 'overview') {
      return 'Dashboard Overview';
    }
    const item = this.menuItems.find(m => m.id === this.activeSection);
    // Use the section ID as a fallback title if not found
    return item ? item.label : this.activeSection.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Gets the Lucide icon name for the currently active section.
   */
  get currentSectionIcon(): string {
    const item = this.menuItems.find(m => m.id === this.activeSection);
    return item?.icon || 'layout-dashboard'; // Default icon
  }

  /**
   * Checks if the currently active section is a valid, known section.
   */
  isValidSection(): boolean {
    return this.menuItems.some(m => m.id === this.activeSection);
  }

}