import { Component, OnInit } from '@angular/core';
import { AdminAuthService } from '../../../services/admin-auth-service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

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
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient // <-- ADD THIS
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