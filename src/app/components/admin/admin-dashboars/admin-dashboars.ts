import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AdminAuthService } from '../../../services/admin-auth-service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-dashboars',
  standalone: false,
  templateUrl: './admin-dashboars.html',
  styleUrls: ['./admin-dashboars.css'],
})
export class AdminDashboars implements OnInit {
  sidebarCollapsed: boolean = false;
  admin: any;
  activeSection: string = 'overview';
  isLoggingOut: boolean = false;

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
    { id: 'reports', label: 'System Configuration', icon: 'bar-chart' },
    { id: 'performance', label: 'Performance', icon: 'trending-up' }
  ];

  constructor(
    private authService: AdminAuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.admin = this.authService.getUserData();
    console.log('Logged-in Admin:', this.admin);

    // Subscribe to route changes to update activeSection
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const childRoute = this.route.firstChild;
      if (!childRoute) return;
      const section = childRoute.snapshot.data['section'] ||
        (childRoute.snapshot.url.length > 0 ? childRoute.snapshot.url[0].path : null);

      // 🚀 FIX: Changed 'admission' to 'addmission' here as well
      this.activeSection = section === 'agent-registration' ? 'agents' :
        section === 'addmission-manager-registration' ? 'admission-managers' :
          (section || 'overview');
      console.log('Updated activeSection to:', this.activeSection, 'from section:', section);
    });
  }

  navigateTo(section: string) {
    // 🚀 REMOVED: this.activeSection = section;  // Let subscription handle to avoid flash
    this.router.navigate([`/admin-dashboard/${section}`]);
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  get pageTitle(): string {
    const item = this.menuItems.find(m => m.id === this.activeSection);
    return item ? item.label : 'Admin Panel';
  }

  // System Configuration Menu Logic
  isConfigOpen = false;
  showSystemActivitySpinner = false; // Controls the premium spinner overlay
  showSystemDashboard = false; // Controls the System Dashboard modal

  toggleConfigMenu() {
    this.isConfigOpen = !this.isConfigOpen;
  }

  handleOption(option: string) {
    console.log('Selected option:', option);
    if (option === 'Application Restart') {
      window.location.reload();
    } else if (option === 'System Activity') {
      // Close menu
      this.isConfigOpen = false;
      // Show spinner
      this.showSystemActivitySpinner = true;

      // Simulate premium loading delay
      setTimeout(() => {
        this.showSystemActivitySpinner = false;
        this.navigateTo('system-activity');
      }, 1500);
    } else if (option === 'System Dashboard') {
      // Close menu and open dashboard modal
      this.isConfigOpen = false;
      this.showSystemDashboard = true;
    } else if (option === 'Sessions') {
      // Close menu and open session modal
      this.isConfigOpen = false;
      this.openSessionModal();
    }
  }

  closeSystemDashboard(): void {
    this.showSystemDashboard = false;
  }

  // === SESSION MODAL LOGIC ===
  showSessionModal = false;
  sessions: any[] = [];
  selectedSession: any = null;
  isLoadingSessions = false;
  isUpdatingSession = false;
  sessionUpdateSuccess = false;
  sessionUpdateError = '';

  sessionForm = {
    id: 0,
    sessionName: '',
    academicYear: ''
  };

  openSessionModal() {
    this.showSessionModal = true;
    this.loadSessions();
  }

  closeSessionModal() {
    this.showSessionModal = false;
    this.selectedSession = null;
    this.sessionUpdateError = '';
    this.sessionUpdateSuccess = false;
  }

  loadSessions() {
    this.isLoadingSessions = true;
    console.log('Loading sessions...');
    this.cdr.detectChanges();
    this.http.get<any[]>(environment.apiUrl + '/api/sessions').subscribe({
      next: (data) => {
        console.log('Sessions loaded:', data);
        this.sessions = data || [];
        this.isLoadingSessions = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading sessions:', err);
        this.sessions = [];
        this.isLoadingSessions = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectSession(session: any) {
    this.selectedSession = session;
    this.sessionForm = { ...session };
    this.sessionUpdateError = '';
    this.sessionUpdateSuccess = false;
    this.cdr.detectChanges(); // Immediately show update form
  }

  updateSession() {
    if (!this.sessionForm.sessionName || !this.sessionForm.academicYear) {
      alert('Please fill all fields');
      return;
    }

    this.isUpdatingSession = true;
    this.cdr.detectChanges();
    this.http.put<any>(`${environment.apiUrl}/api/sessions/${this.sessionForm.id}`, this.sessionForm).subscribe({
      next: (updatedSession) => {
        this.isUpdatingSession = false;
        this.sessionUpdateSuccess = true;
        this.cdr.detectChanges(); // Immediately show success message

        // Update in list
        const index = this.sessions.findIndex(s => s.id === updatedSession.id);
        if (index !== -1) {
          this.sessions[index] = updatedSession;
        }

        // Reset form after short delay
        setTimeout(() => {
          this.sessionUpdateSuccess = false;
          this.selectedSession = null;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        this.isUpdatingSession = false;
        this.sessionUpdateError = 'Failed to update session. Please try again.';
        this.cdr.detectChanges();
        console.error('Error updating session:', err);
      }
    });
  }

  logout() {
    this.isLoggingOut = true;

    // Show overlay for 1.9 seconds
    setTimeout(() => {
      // Clear all session data
      sessionStorage.clear();
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Clear auth service data if available
      this.authService.logout?.();

      // Navigate to admin login
      this.router.navigate(['/admin-login']);
    }, 1900);
  }
}