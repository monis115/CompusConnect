import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ElementRef, NgZone } from '@angular/core';
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
  active?: boolean;
}

import { SessionService, Session } from '../../../services/session.service';
import { environment } from '../../../../environments/environment';


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
  notificationType: 'success' | 'info' = 'success';
  successMessage = '';
  newCollege: College = { collegeName: '', city: '', country: '' };
  isAdding = false;

  isHeaderLoaded = false;

  private apiUrl = environment.apiUrl + '/api/colleges';

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
    { id: 'admission-managers', label: 'Admission Managers', icon: 'building' },
    { id: 'colleges', label: 'Colleges', icon: 'university' },
    { id: 'users', label: 'User Management', icon: 'shield' },
    { id: 'telex', label: 'Telex', icon: 'send' },
    { id: 'visa', label: 'Visa', icon: 'plane' },
    { id: 'university-coordinators', label: 'University Coordinators', icon: 'school' },
    { id: 'account', label: 'Account', icon: 'credit-card' },
    { id: 'doc-person', label: 'Doc Person', icon: 'file-check' },
    { id: 'news-management', label: 'News Management', icon: 'file-text' },
    { id: 'payments', label: 'Payments', icon: 'credit-card' },
    { id: 'reports', label: 'System Configuration', icon: 'bar-chart' }
  ];

  // Admin Creation State
  showAdminModal = false;
  adminCreationStep: 'policy' | 'otp' | 'success' = 'policy';
  adminOtp = '';
  isSendingOtp = false;
  isVerifyingOtp = false;
  loadingMessage = 'Processing...'; // Dynamic loading text
  loadingInterval: any;

  // Response structure
  generatedCredentials: { id?: number; userId: string; password?: string; status?: string; role?: string } | null = null;

  adminPolicies = [
    'Super Administrator Access: Full control over user management, system settings, and financial data.',
    'User Management Authority: Ability to create, modify, and delete all user roles (Agents, Managers, Staff).',
    'Financial Oversight: Access to all transaction histories, payment verifications, and revenue reports.',
    'System Configuration: Responsibility for system-wide settings, college lists, and application workflows.',
    'Audit & Compliance: Actions are logged for security. Misuse of privileges will lead to account suspension.'
  ];

  constructor(
    private authService: AdminAuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private elRef: ElementRef,
    private zone: NgZone,
    private sessionService: SessionService
  ) { }

  // --- Admin Creation Workflow Methods ---

  openAdminModal() {
    this.resetAdminWorkflow();
    this.showAdminModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeAdminModal() {
    this.showAdminModal = false;
    document.body.style.overflow = '';
    this.resetAdminWorkflow();
  }

  resetAdminWorkflow() {
    this.adminCreationStep = 'policy';
    this.adminOtp = '';
    this.isSendingOtp = false;
    this.isVerifyingOtp = false;
    this.generatedCredentials = null;
    this.stopLoadingCycle(); // Ensure no running intervals
  }

  // Helper for dynamic loading messages
  startLoadingCycle() {
    const messages = ['Processing...', 'Verifying...', 'Creating Account...', 'Sending Credentials...'];
    let index = 0;
    this.loadingMessage = messages[0];
    this.loadingInterval = setInterval(() => {
      index = (index + 1) % messages.length;
      this.loadingMessage = messages[index];
      this.cdr.detectChanges();
    }, 1500); // Change text every 1.5s
  }

  stopLoadingCycle() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
  }

  // Step 1 -> Step 2 (API: send-verification-otp)
  goToOtpStep() {
    this.isSendingOtp = true;

    // API Call - expects text response
    this.http.post(environment.apiUrl + '/api/admins/send-verification-otp', {}, { responseType: 'text' })
      .subscribe({
        next: (response: any) => {
          this.isSendingOtp = false;
          this.adminCreationStep = 'otp';
          this.cdr.detectChanges();
          console.log('OTP Sent:', response);
        },
        error: (err) => {
          this.isSendingOtp = false;
          this.cdr.detectChanges();

          // Fallback: If status is 200 but landed in error (unlikely with responseType: text, but possible)
          if (err.status === 200) {
            this.adminCreationStep = 'otp';
            return;
          }

          console.error('OTP Error:', err);
          alert('Failed to send OTP. Check console for details.');
        }
      });
  }

  // Step 2 -> Step 3 (API: verify-and-create)
  verifyOtpAndCreate() {
    if (!this.adminOtp || this.adminOtp.length < 4) return;

    this.isVerifyingOtp = true;
    this.startLoadingCycle(); // Start the dynamic text loop

    // API Call with OTP in query params
    this.http.post(environment.apiUrl + '/api/admins/verify-and-create', null, {
      params: { otp: this.adminOtp }
    }).subscribe({
      next: (response: any) => {
        this.stopLoadingCycle();
        this.isVerifyingOtp = false;

        // Backend response: { id: 1, userId: "...", password: "...", status: "active", role: "admin" }
        // Force UI update inside Angular Zone
        this.zone.run(() => {
          this.generatedCredentials = response;
          this.adminCreationStep = 'success';
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.stopLoadingCycle();
          this.isVerifyingOtp = false;
          alert('Verification Failed. Invalid OTP or Server Error.');
          console.error(err);
          this.cdr.detectChanges();
        });
      }
    });
  }

  copyCredentials() {
    if (!this.generatedCredentials) return;
    const text = `User ID: ${this.generatedCredentials.userId}\nPassword: ${this.generatedCredentials.password}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('Credentials copied to clipboard!');
    });
  }


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
    } else if (section === 'reports') {
      this.loadSessions();
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

  toggleCollegeStatus(college: College, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const newStatus = checkbox.checked;
    const statusText = newStatus ? 'Active' : 'Inactive';

    if (!college.id) {
      this.showSuccess('Cannot update status for an unsaved college.', 'info');
      checkbox.checked = !newStatus; // Revert UI
      return;
    }

    // PATCH /api/colleges/{id}/status?isActive=true|false
    this.http.patch(`${this.apiUrl}/${college.id}/status?isActive=${newStatus}`, {}).subscribe({
      next: () => {
        college.active = newStatus;
        if (newStatus) {
          this.showSuccess(`${college.collegeName} is now ${statusText}!`, 'success');
        } else {
          this.showSuccess(`${college.collegeName} is now ${statusText}!`, 'info');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Status update error:', err);
        this.showSuccess('Failed to update college status.', 'info');
        checkbox.checked = !newStatus; // Revert UI on failure
        this.cdr.detectChanges();
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

  showSuccess(message: string, type: 'success' | 'info' = 'success') {
    this.successMessage = message;
    this.notificationType = type;
    this.showSuccessMessage = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showSuccessMessage = false;
      this.cdr.detectChanges();
    }, 5000);
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


  // === 🚀 APPLICATION TRACKER LOGIC ===
  showAppSearchModal = false;
  appSearchQuery = '';
  isAppSearching = false;
  appSearchError = '';
  foundApplication: any | null = null;

  openAppSearch() {
    this.showAppSearchModal = true;
    this.cdr.detectChanges();
  }

  closeAppSearch() {
    this.showAppSearchModal = false;
    this.appSearchQuery = '';
    this.appSearchError = '';
    this.foundApplication = null;
    this.cdr.detectChanges();
  }

  searchApplication() {
    if (!this.appSearchQuery.trim()) return;

    this.isAppSearching = true;
    this.appSearchError = '';
    this.foundApplication = null;
    this.cdr.detectChanges();

    // Directly use HttpClient if PublicService isn't injected, 
    // BUT we should inject PublicService preferably.
    // For now, I'll use direct HTTP for speed as per "all in existing component" request or inject it.
    // Since I can't easily change constructor signature in a replace_file_content without context of full file easily (though I can try),
    // I will use `this.http` since `PublicService` essentially does the same.
    // Endpoint: http://localhost:8080/api/public/track-application?query={query}

    this.http.get<any>(`${environment.apiUrl}/api/public/track-application?query=${this.appSearchQuery}`).subscribe({
      next: (data) => {
        this.foundApplication = data;
        this.isAppSearching = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('App search error:', err);
        if (err.status === 404) {
          this.appSearchError = 'Application not found. Check ID or Email.';
        } else {
          this.appSearchError = 'Search failed. Please try again.';
        }
        this.isAppSearching = false;
        this.cdr.detectChanges();
      }
    });
  }

  getAppStatusColor(status: string): string {
    switch (status) {
      case 'VISA_STAMPED': return 'success';
      case 'ADMISSION_LETTER_ISSUED': return 'primary';
      case 'APPLICATION_REJECTED': return 'danger';
      case 'VISA_REJECTED': return 'danger';
      case 'PENDING': return 'warning';
      default: return 'info';
    }
  }

  formatAppStatus(status: string): string {
    return status ? status.replace(/_/g, ' ') : '';
  }

  // === USER ROLE CARD TOOLTIP SYSTEM ===
  roleTooltipMessage: string = '';
  showRoleTooltip: boolean = false;

  showRoleMessage(role: string) {
    const messages: { [key: string]: string } = {
      'agent': 'Agent can be created in Agent Section',
      'admission': 'Admission Manager can be created in Admission Manager Section',
      'university': 'University Coordinator can be created in University Coordinators Section',
      'doc': 'Doc Person can be created in Doc Person Section',
      'accountant': 'Accountant can be created in Account Section',
      'telex': 'Telex Man can be created in Telex Section',
      'visa': 'Visa Man can be created in Visa Section',
      'custom': 'Development is under progress',
      'admin': 'Admin can be created with Super Admin privileges'
    };

    this.roleTooltipMessage = messages[role] || 'Feature coming soon';
    this.showRoleTooltip = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.showRoleTooltip = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  // === UNIVERSITY COORDINATOR CREATION SYSTEM ===
  showCoordinatorModal = false;
  coordinatorFormDisabled = false;
  coordinatorAvailable = false;
  checkingAvailability = false;
  existingCoordinator: any = null;
  creatingCoordinator = false;
  showCoordinatorSuccess = false;
  showCoordinatorError = false;
  coordinatorErrorMessage = '';
  createdCoordinatorInfo: { userName: string; collegeName: string } | null = null;

  coordinatorForm = {
    userName: '',
    password: '',
    confirmPassword: '',
    collegeId: 0
  };

  passwordErrors: string[] = [];

  openCoordinatorModal() {
    this.showCoordinatorModal = true;
    this.resetCoordinatorForm();
    // Load colleges if not already loaded
    if (this.colleges.length === 0) {
      this.loadColleges();
    }
    this.cdr.detectChanges();
  }

  closeCoordinatorModal() {
    this.showCoordinatorModal = false;
    this.resetCoordinatorForm();
    this.cdr.detectChanges();
  }

  resetCoordinatorForm() {
    this.coordinatorForm = {
      userName: '',
      password: '',
      confirmPassword: '',
      collegeId: 0
    };
    this.coordinatorFormDisabled = false;
    this.coordinatorAvailable = false;
    this.existingCoordinator = null;
    this.passwordErrors = [];
    this.coordinatorErrorMessage = '';
  }

  onCollegeSelect() {
    if (!this.coordinatorForm.collegeId || this.coordinatorForm.collegeId === 0) {
      this.coordinatorFormDisabled = false;
      this.coordinatorAvailable = false;
      this.existingCoordinator = null;
      return;
    }

    this.checkingAvailability = true;
    this.cdr.detectChanges();

    this.http.get<any>(`${this.apiUrl}/${this.coordinatorForm.collegeId}/university-coordinator`).subscribe({
      next: (response) => {
        this.checkingAvailability = false;
        if (response.available) {
          // No coordinator exists - form is available
          this.coordinatorAvailable = true;
          this.coordinatorFormDisabled = false;
          this.existingCoordinator = null;
        } else {
          // Coordinator already exists - disable form
          this.coordinatorAvailable = false;
          this.coordinatorFormDisabled = true;
          this.existingCoordinator = response.coordinator;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.checkingAvailability = false;
        console.error('Error checking coordinator availability:', err);
        this.coordinatorErrorMessage = 'Failed to check availability. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  validatePassword(): boolean {
    this.passwordErrors = [];
    const password = this.coordinatorForm.password;

    if (password.length < 8) {
      this.passwordErrors.push('Password must be at least 8 characters');
    }
    if (!/[a-zA-Z]/.test(password)) {
      this.passwordErrors.push('Password must contain at least one letter');
    }
    if (!/[0-9]/.test(password)) {
      this.passwordErrors.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      this.passwordErrors.push('Password must contain at least one special character');
    }
    if (this.coordinatorForm.password !== this.coordinatorForm.confirmPassword) {
      this.passwordErrors.push('Passwords do not match');
    }

    return this.passwordErrors.length === 0;
  }

  isFormValid(): boolean {
    return !!(
      this.coordinatorForm.userName.trim() &&
      this.coordinatorForm.password &&
      this.coordinatorForm.confirmPassword &&
      this.coordinatorForm.collegeId > 0 &&
      this.coordinatorAvailable &&
      !this.coordinatorFormDisabled
    );
  }

  createUniversityCoordinator() {
    if (!this.validatePassword()) {
      this.cdr.detectChanges();
      return;
    }

    if (!this.isFormValid()) {
      return;
    }

    this.creatingCoordinator = true;
    this.cdr.detectChanges();

    const payload = {
      userName: this.coordinatorForm.userName.trim(),
      password: this.coordinatorForm.password,
      status: 'Active',
      role: 'UniversityCoordinator',
      collegeId: this.coordinatorForm.collegeId
    };

    this.http.post<any>(environment.apiUrl + '/api/universityPerson', payload).subscribe({
      next: (response) => {
        this.creatingCoordinator = false;

        // Get college name for success message
        const collegeId = Number(this.coordinatorForm.collegeId);
        const selectedCollege = this.colleges.find(c => c.id === collegeId);
        this.createdCoordinatorInfo = {
          userName: this.coordinatorForm.userName,
          collegeName: selectedCollege?.collegeName || 'Unknown College'
        };

        this.showCoordinatorModal = false;
        this.showCoordinatorSuccess = true;
        this.resetCoordinatorForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.creatingCoordinator = false;
        console.error('Error creating coordinator:', err);
        this.coordinatorErrorMessage = err.error?.message || 'Failed to create University Coordinator. Please try again.';
        this.showCoordinatorError = true;
        this.cdr.detectChanges();
      }
    });
  }

  closeSuccessModal() {
    this.showCoordinatorSuccess = false;
    this.createdCoordinatorInfo = null;
    this.cdr.detectChanges();
  }

  closeErrorModal() {
    this.showCoordinatorError = false;
    this.coordinatorErrorMessage = '';
    this.cdr.detectChanges();
  }

  // === DOC PERSON CREATION SYSTEM ===
  showDocPersonModal = false;
  docPersonFormDisabled = false;
  docPersonCanCreate = false;
  checkingDocPersonAvailability = false;
  existingDocPersons: any[] = [];
  availabilityMessage = '';
  creatingDocPerson = false;
  showDocPersonSuccess = false;
  showDocPersonError = false;
  docPersonErrorMessage = '';
  createdDocPersonInfo: { username: string; fullName: string } | null = null;

  docPersonForm = {
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    contactNumber: ''
  };

  docPersonPasswordErrors: string[] = [];

  openDocPersonModal() {
    this.showDocPersonModal = true;
    this.resetDocPersonForm();
    this.checkDocPersonAvailability();
    this.cdr.detectChanges();
  }

  closeDocPersonModal() {
    this.showDocPersonModal = false;
    this.resetDocPersonForm();
    this.cdr.detectChanges();
  }

  resetDocPersonForm() {
    this.docPersonForm = {
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      email: '',
      contactNumber: ''
    };
    this.docPersonFormDisabled = false;
    this.docPersonCanCreate = false;
    this.existingDocPersons = [];
    this.availabilityMessage = '';
    this.docPersonPasswordErrors = [];
    this.docPersonErrorMessage = '';
  }

  checkDocPersonAvailability() {
    this.checkingDocPersonAvailability = true;
    this.cdr.detectChanges();

    this.http.get<any>(environment.apiUrl + '/api/doc-person/check-availability').subscribe({
      next: (response) => {
        this.checkingDocPersonAvailability = false;
        this.docPersonCanCreate = response.canCreate;
        this.availabilityMessage = response.message;
        this.existingDocPersons = response.existingDocPersons || [];

        if (!response.canCreate) {
          this.docPersonFormDisabled = true;
        } else {
          this.docPersonFormDisabled = false;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.checkingDocPersonAvailability = false;
        console.error('Error checking Doc Person availability:', err);
        this.docPersonErrorMessage = 'Failed to check availability. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  validateDocPersonPassword(): boolean {
    this.docPersonPasswordErrors = [];
    const password = this.docPersonForm.password;

    if (password.length < 8) {
      this.docPersonPasswordErrors.push('Password must be at least 8 characters');
    }
    if (!/[a-zA-Z]/.test(password)) {
      this.docPersonPasswordErrors.push('Password must contain at least one letter');
    }
    if (!/[0-9]/.test(password)) {
      this.docPersonPasswordErrors.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      this.docPersonPasswordErrors.push('Password must contain at least one special character');
    }
    if (this.docPersonForm.password !== this.docPersonForm.confirmPassword) {
      this.docPersonPasswordErrors.push('Passwords do not match');
    }

    return this.docPersonPasswordErrors.length === 0;
  }

  isDocPersonFormValid(): boolean {
    return !!(
      this.docPersonForm.username.trim() &&
      this.docPersonForm.password &&
      this.docPersonForm.confirmPassword &&
      this.docPersonForm.fullName.trim() &&
      this.docPersonForm.email.trim() &&
      this.docPersonForm.contactNumber.trim() &&
      this.docPersonCanCreate &&
      !this.docPersonFormDisabled
    );
  }

  createDocPerson() {
    if (!this.validateDocPersonPassword()) {
      this.cdr.detectChanges();
      return;
    }

    if (!this.isDocPersonFormValid()) {
      return;
    }

    this.creatingDocPerson = true;
    this.cdr.detectChanges();

    const payload = {
      username: this.docPersonForm.username.trim(),
      password: this.docPersonForm.password,
      fullName: this.docPersonForm.fullName.trim(),
      email: this.docPersonForm.email.trim(),
      contactNumber: this.docPersonForm.contactNumber.trim(),
      status: 'Active'
    };

    this.http.post<any>(environment.apiUrl + '/api/doc-person', payload).subscribe({
      next: (response) => {
        this.creatingDocPerson = false;

        this.createdDocPersonInfo = {
          username: this.docPersonForm.username,
          fullName: this.docPersonForm.fullName
        };

        this.showDocPersonModal = false;
        this.showDocPersonSuccess = true;
        this.resetDocPersonForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.creatingDocPerson = false;
        console.error('Error creating Doc Person:', err);
        this.docPersonErrorMessage = err.error?.message || 'Failed to create Doc Person. Please try again.';
        this.showDocPersonError = true;
        this.cdr.detectChanges();
      }
    });
  }

  closeDocPersonSuccessModal() {
    this.showDocPersonSuccess = false;
    this.createdDocPersonInfo = null;
    this.cdr.detectChanges();
  }

  closeDocPersonErrorModal() {
    this.showDocPersonError = false;
    this.docPersonErrorMessage = '';
    this.cdr.detectChanges();
  }

  // === ACCOUNTANT CREATION SYSTEM ===
  showAccountantModal = false;
  accountantFormDisabled = false;
  accountantCanCreate = false;
  checkingAccountantAvailability = false;
  existingAccountants: any[] = [];
  accountantAvailabilityMessage = '';
  creatingAccountant = false;
  showAccountantSuccess = false;
  showAccountantError = false;
  accountantErrorMessage = '';
  createdAccountantInfo: { username: string; fullName: string } | null = null;

  accountantForm = {
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    contactNumber: ''
  };

  accountantPasswordErrors: string[] = [];

  openAccountantModal() {
    this.showAccountantModal = true;
    this.resetAccountantForm();
    this.checkAccountantAvailability();
    this.cdr.detectChanges();
  }

  closeAccountantModal() {
    this.showAccountantModal = false;
    this.resetAccountantForm();
    this.cdr.detectChanges();
  }

  resetAccountantForm() {
    this.accountantForm = {
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      email: '',
      contactNumber: ''
    };
    this.accountantFormDisabled = false;
    this.accountantCanCreate = false;
    this.existingAccountants = [];
    this.accountantAvailabilityMessage = '';
    this.accountantPasswordErrors = [];
    this.accountantErrorMessage = '';
  }

  checkAccountantAvailability() {
    this.checkingAccountantAvailability = true;
    this.cdr.detectChanges();

    this.http.get<any>(environment.apiUrl + '/api/accountant/check-availability').subscribe({
      next: (response) => {
        this.checkingAccountantAvailability = false;
        this.accountantCanCreate = response.canCreate;
        this.accountantAvailabilityMessage = response.message;
        this.existingAccountants = response.existingAccountants || [];

        if (!response.canCreate) {
          this.accountantFormDisabled = true;
        } else {
          this.accountantFormDisabled = false;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.checkingAccountantAvailability = false;
        console.error('Error checking Accountant availability:', err);
        this.accountantErrorMessage = 'Failed to check availability. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  validateAccountantPassword(): boolean {
    this.accountantPasswordErrors = [];
    const password = this.accountantForm.password;

    if (password.length < 8) {
      this.accountantPasswordErrors.push('Password must be at least 8 characters');
    }
    if (!/[a-zA-Z]/.test(password)) {
      this.accountantPasswordErrors.push('Password must contain at least one letter');
    }
    if (!/[0-9]/.test(password)) {
      this.accountantPasswordErrors.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      this.accountantPasswordErrors.push('Password must contain at least one special character');
    }
    if (this.accountantForm.password !== this.accountantForm.confirmPassword) {
      this.accountantPasswordErrors.push('Passwords do not match');
    }

    return this.accountantPasswordErrors.length === 0;
  }

  isAccountantFormValid(): boolean {
    return !!(
      this.accountantForm.username.trim() &&
      this.accountantForm.password &&
      this.accountantForm.confirmPassword &&
      this.accountantForm.fullName.trim() &&
      this.accountantForm.email.trim() &&
      this.accountantForm.contactNumber.trim() &&
      this.accountantCanCreate &&
      !this.accountantFormDisabled
    );
  }

  createAccountant() {
    if (!this.validateAccountantPassword()) {
      this.cdr.detectChanges();
      return;
    }

    if (!this.isAccountantFormValid()) {
      return;
    }

    this.creatingAccountant = true;
    this.cdr.detectChanges();

    const payload = {
      username: this.accountantForm.username.trim(),
      password: this.accountantForm.password,
      fullName: this.accountantForm.fullName.trim(),
      email: this.accountantForm.email.trim(),
      contactNumber: this.accountantForm.contactNumber.trim()
    };

    this.http.post<any>(environment.apiUrl + '/api/accountant', payload).subscribe({
      next: (response) => {
        this.creatingAccountant = false;

        this.createdAccountantInfo = {
          username: this.accountantForm.username,
          fullName: this.accountantForm.fullName
        };

        this.showAccountantModal = false;
        this.showAccountantSuccess = true;
        this.resetAccountantForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.creatingAccountant = false;
        console.error('Error creating Accountant:', err);
        this.accountantErrorMessage = err.error?.message || 'Failed to create Accountant. Please try again.';
        this.showAccountantError = true;
        this.cdr.detectChanges();
      }
    });
  }

  closeAccountantSuccessModal() {
    this.showAccountantSuccess = false;
    this.createdAccountantInfo = null;
    this.cdr.detectChanges();
  }

  closeAccountantErrorModal() {
    this.showAccountantError = false;
    this.accountantErrorMessage = '';
    this.cdr.detectChanges();
  }

  // === TELEX MAN CREATION SYSTEM ===
  showTelexManModal = false;
  loadingTelexSummary = false;
  existingTelexPersons: any[] = [];
  hasActiveTelexMan = false;
  creatingTelexMan = false;
  showTelexManSuccess = false;
  showTelexManError = false;
  telexManErrorMessage = '';
  createdTelexManInfo: { username: string; fullName: string } | null = null;

  telexManForm = {
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    contactNumber: ''
  };

  telexManPasswordErrors: string[] = [];

  openTelexManModal() {
    this.showTelexManModal = true;
    this.resetTelexManForm();
    this.loadTelexSummary();
    this.cdr.detectChanges();
  }

  closeTelexManModal() {
    this.showTelexManModal = false;
    this.resetTelexManForm();
    this.cdr.detectChanges();
  }

  resetTelexManForm() {
    this.telexManForm = {
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      email: '',
      contactNumber: ''
    };
    this.existingTelexPersons = [];
    this.hasActiveTelexMan = false;
    this.telexManPasswordErrors = [];
    this.telexManErrorMessage = '';
  }

  loadTelexSummary() {
    this.loadingTelexSummary = true;
    this.cdr.detectChanges();

    this.http.get<any[]>(environment.apiUrl + '/api/telex-man/usernames').subscribe({
      next: (response) => {
        this.loadingTelexSummary = false;
        this.existingTelexPersons = response || [];
        // If any telex persons exist, assume they're active
        this.hasActiveTelexMan = this.existingTelexPersons.length > 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingTelexSummary = false;
        console.error('Error loading Telex Man usernames:', err);
        this.existingTelexPersons = [];
        this.cdr.detectChanges();
      }
    });
  }

  validateTelexManPassword(): boolean {
    this.telexManPasswordErrors = [];
    const password = this.telexManForm.password;

    if (password.length < 8) {
      this.telexManPasswordErrors.push('Password must be at least 8 characters');
    }
    if (!/[a-zA-Z]/.test(password)) {
      this.telexManPasswordErrors.push('Password must contain at least one letter');
    }
    if (!/[0-9]/.test(password)) {
      this.telexManPasswordErrors.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      this.telexManPasswordErrors.push('Password must contain at least one special character');
    }
    if (this.telexManForm.password !== this.telexManForm.confirmPassword) {
      this.telexManPasswordErrors.push('Passwords do not match');
    }

    return this.telexManPasswordErrors.length === 0;
  }

  isTelexManFormValid(): boolean {
    return !!(
      this.telexManForm.username.trim() &&
      this.telexManForm.password &&
      this.telexManForm.confirmPassword &&
      this.telexManForm.fullName.trim() &&
      this.telexManForm.email.trim() &&
      this.telexManForm.contactNumber.trim()
    );
  }

  createTelexMan() {
    if (!this.validateTelexManPassword()) {
      this.cdr.detectChanges();
      return;
    }

    if (!this.isTelexManFormValid()) {
      return;
    }

    this.creatingTelexMan = true;
    this.cdr.detectChanges();

    const payload = {
      username: this.telexManForm.username.trim(),
      password: this.telexManForm.password,
      fullName: this.telexManForm.fullName.trim(),
      email: this.telexManForm.email.trim(),
      contactNumber: this.telexManForm.contactNumber.trim()
    };

    this.http.post<any>(environment.apiUrl + '/api/telex-man', payload).subscribe({
      next: (response) => {
        this.creatingTelexMan = false;

        // Save info BEFORE reset
        const savedUsername = this.telexManForm.username;
        const savedFullName = this.telexManForm.fullName;

        this.createdTelexManInfo = {
          username: savedUsername,
          fullName: savedFullName
        };

        this.showTelexManModal = false;
        this.cdr.detectChanges();

        // Use setTimeout to ensure modal transition completes
        setTimeout(() => {
          this.showTelexManSuccess = true;
          this.cdr.detectChanges();
        }, 100);

        this.resetTelexManForm();
      },
      error: (err) => {
        this.creatingTelexMan = false;
        console.error('Error creating Telex Man:', err);
        this.telexManErrorMessage = err.error?.message || 'Failed to create Telex Man. Please try again.';
        this.showTelexManError = true;
        this.cdr.detectChanges();
      }
    });
  }

  closeTelexManSuccessModal() {
    this.showTelexManSuccess = false;
    this.createdTelexManInfo = null;
    this.cdr.detectChanges();
  }

  closeTelexManErrorModal() {
    this.showTelexManError = false;
    this.telexManErrorMessage = '';
    this.cdr.detectChanges();
  }

  // === VISA MAN CREATION SYSTEM ===
  showVisaManModal = false;
  loadingVisaUsernames = false;
  activeVisaPersons: { username: string; studentCount: number }[] = []; // Changed from existingVisaPersons string[]
  hasActiveVisaMan = false;
  creatingVisaMan = false;
  showVisaManSuccess = false;
  showVisaManError = false;
  visaManErrorMessage = '';
  createdVisaManInfo: { username: string; fullName: string } | null = null;

  visaManForm = {
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    contactNumber: ''
  };

  visaManPasswordErrors: string[] = [];

  openVisaManModal() {
    this.showVisaManModal = true;
    this.resetVisaManForm();
    this.loadVisaUsernames();
    this.cdr.detectChanges();
  }

  closeVisaManModal() {
    this.showVisaManModal = false;
    this.resetVisaManForm();
    this.cdr.detectChanges();
  }

  resetVisaManForm() {
    this.visaManForm = {
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      email: '',
      contactNumber: ''
    };
    this.activeVisaPersons = [];
    this.hasActiveVisaMan = false;
    this.visaManPasswordErrors = [];
    this.visaManErrorMessage = '';
  }

  loadVisaUsernames() {
    this.loadingVisaUsernames = true;
    this.cdr.detectChanges();

    this.http.get<any[]>(environment.apiUrl + '/api/visa-man/usernames').subscribe({
      next: (response) => {
        this.loadingVisaUsernames = false;
        // API now returns objects: { username: "visa_john", studentCount: 5 }
        this.activeVisaPersons = response || [];
        this.hasActiveVisaMan = this.activeVisaPersons.length > 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingVisaUsernames = false;
        console.error('Error loading Visa Man usernames:', err);
        this.activeVisaPersons = [];
        this.cdr.detectChanges();
      }
    });
  }

  validateVisaManPassword(): boolean {
    this.visaManPasswordErrors = [];
    const password = this.visaManForm.password;

    if (password.length < 8) {
      this.visaManPasswordErrors.push('Password must be at least 8 characters');
    }
    if (!/[a-zA-Z]/.test(password)) {
      this.visaManPasswordErrors.push('Password must contain at least one letter');
    }
    if (!/[0-9]/.test(password)) {
      this.visaManPasswordErrors.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      this.visaManPasswordErrors.push('Password must contain at least one special character');
    }
    if (this.visaManForm.password !== this.visaManForm.confirmPassword) {
      this.visaManPasswordErrors.push('Passwords do not match');
    }

    return this.visaManPasswordErrors.length === 0;
  }

  isVisaManFormValid(): boolean {
    return !!(
      this.visaManForm.username.trim() &&
      this.visaManForm.password &&
      this.visaManForm.confirmPassword &&
      this.visaManForm.fullName.trim() &&
      this.visaManForm.email.trim() &&
      this.visaManForm.contactNumber.trim()
    );
  }

  createVisaMan() {
    if (!this.validateVisaManPassword()) {
      this.cdr.detectChanges();
      return;
    }

    if (!this.isVisaManFormValid()) {
      return;
    }

    this.creatingVisaMan = true;
    this.cdr.detectChanges();

    const payload = {
      username: this.visaManForm.username.trim(),
      password: this.visaManForm.password,
      fullName: this.visaManForm.fullName.trim(),
      email: this.visaManForm.email.trim(),
      contactNumber: this.visaManForm.contactNumber.trim()
    };

    this.http.post<any>(environment.apiUrl + '/api/visa-man', payload).subscribe({
      next: (response) => {
        this.creatingVisaMan = false;

        // Save info BEFORE reset
        const savedUsername = this.visaManForm.username;
        const savedFullName = this.visaManForm.fullName;

        this.createdVisaManInfo = {
          username: savedUsername,
          fullName: savedFullName
        };

        this.showVisaManModal = false;
        this.cdr.detectChanges();

        // Use setTimeout to ensure modal transition completes
        setTimeout(() => {
          this.showVisaManSuccess = true;
          this.cdr.detectChanges();
        }, 100);

        this.resetVisaManForm();
      },
      error: (err) => {
        this.creatingVisaMan = false;
        console.error('Error creating Visa Man:', err);
        this.visaManErrorMessage = err.error?.message || 'Failed to create Visa Man. Please try again.';
        this.showVisaManError = true;
        this.cdr.detectChanges();
      }
    });
  }

  closeVisaManSuccessModal() {
    this.showVisaManSuccess = false;
    this.createdVisaManInfo = null;
    this.cdr.detectChanges();
  }

  closeVisaManErrorModal() {
    this.showVisaManError = false;
    this.visaManErrorMessage = '';
    this.cdr.detectChanges();
  }


  // === SESSION MANAGEMENT SYSTEM ===
  sessions: Session[] = [];
  selectedSession: Session | null = null;
  showSessionUpdateModal = false;
  isUpdatingSession = false;
  sessionUpdateSuccess = false;
  sessionUpdateError = '';

  sessionForm: Session = {
    id: 0,
    sessionName: '',
    academicYear: ''
  };

  loadSessions() {
    this.loading = true;
    console.log('Loading sessions...');
    this.sessionService.getAllSessions().subscribe({
      next: (data) => {
        console.log('Sessions loaded:', data);
        this.sessions = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading sessions', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSessionClick(session: Session) {
    // Toggle selection or select
    if (this.selectedSession && this.selectedSession.id === session.id) {
      this.selectedSession = null;
    } else {
      this.selectedSession = session;
    }
    this.cdr.detectChanges();
  }

  openUpdateSessionModal() {
    if (!this.selectedSession) return;

    // Clone the session to the form
    this.sessionForm = { ...this.selectedSession };
    this.showSessionUpdateModal = true;
    this.sessionUpdateError = '';
    this.sessionUpdateSuccess = false;
    this.cdr.detectChanges();
  }

  closeUpdateSessionModal() {
    this.showSessionUpdateModal = false;
    this.cdr.detectChanges();
  }

  updateSession() {
    if (!this.sessionForm.sessionName || !this.sessionForm.academicYear) {
      alert('Please fill all fields');
      return;
    }

    this.isUpdatingSession = true;
    this.sessionService.updateSession(this.sessionForm.id, this.sessionForm).subscribe({
      next: (updatedSession) => {
        this.isUpdatingSession = false;
        this.sessionUpdateSuccess = true;

        // Update the list locally
        const index = this.sessions.findIndex(s => s.id === updatedSession.id);
        if (index !== -1) {
          this.sessions[index] = updatedSession;
        }

        // Update selected session
        this.selectedSession = updatedSession;

        this.cdr.detectChanges();

        setTimeout(() => {
          this.showSessionUpdateModal = false;
          this.sessionUpdateSuccess = false;
          this.selectedSession = null; // Hide FAB
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err) => {
        this.isUpdatingSession = false;
        this.sessionUpdateError = 'Failed to update session';
        console.error(err);
        this.cdr.detectChanges();
      }
    });
  }
}
