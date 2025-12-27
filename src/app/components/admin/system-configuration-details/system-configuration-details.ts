import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CollegeService, CollegeWithCoordinator } from '../../../services/college.service';
import { environment } from '../../../../environments/environment';

interface RoleStatus {
  roleName: string;
  activeCount: number;
  required: boolean;
  minRequired: number;
  maxAllowed: number | null;
  status: 'compliant' | 'warning' | 'error';
  message: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-system-configuration-details',
  standalone: false,
  templateUrl: './system-configuration-details.html',
  styleUrl: './system-configuration-details.css',
})
export class SystemConfigurationDetails implements OnInit {
  isLoading = true;
  error = '';

  roleStatuses: RoleStatus[] = [
    {
      roleName: 'Visa Officers',
      activeCount: 0,
      required: true,
      minRequired: 1,
      maxAllowed: null,
      status: 'error',
      message: 'Loading...',
      icon: 'plane',
      color: '#3b82f6'
    },
    {
      roleName: 'Telex Officers',
      activeCount: 0,
      required: true,
      minRequired: 1,
      maxAllowed: null,
      status: 'error',
      message: 'Loading...',
      icon: 'send',
      color: '#8b5cf6'
    },
    {
      roleName: 'Document Verification Person',
      activeCount: 0,
      required: true,
      minRequired: 1,
      maxAllowed: 1,
      status: 'error',
      message: 'Loading...',
      icon: 'file-check',
      color: '#10b981'
    },
    {
      roleName: 'Accountant',
      activeCount: 0,
      required: true,
      minRequired: 1,
      maxAllowed: 1,
      status: 'error',
      message: 'Loading...',
      icon: 'calculator',
      color: '#f59e0b'
    }
  ];

  systemCompliant = false;

  // College Coordinator Status
  colleges: CollegeWithCoordinator[] = [];
  collegesLoading = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private collegeService: CollegeService
  ) { }

  ngOnInit() {
    this.loadSystemStatus();
    this.loadCollegesWithCoordinators();
  }

  loadSystemStatus() {
    this.isLoading = true;
    this.error = '';

    // API endpoints for each role type
    const endpoints = {
      visa: environment.apiUrl + '/api/visa-man/usernames',      // Returns active only
      telex: environment.apiUrl + '/api/telex-man/usernames',    // Returns active only
      doc: environment.apiUrl + '/api/doc-person/all',           // Returns all, filter on frontend
      accountant: environment.apiUrl + '/api/accountant/all'     // Returns all, filter on frontend
    };

    // Fetch all role counts
    Promise.all([
      this.http.get<any[]>(endpoints.visa).toPromise(),
      this.http.get<any[]>(endpoints.telex).toPromise(),
      this.http.get<any[]>(endpoints.doc).toPromise(),
      this.http.get<any[]>(endpoints.accountant).toPromise()
    ]).then(([visaData, telexData, docData, accountantData]) => {
      // Update Visa Officers - endpoint returns active only
      this.roleStatuses[0].activeCount = visaData?.length || 0;
      this.updateRoleStatus(this.roleStatuses[0]);

      // Update Telex Officers - endpoint returns active only
      this.roleStatuses[1].activeCount = telexData?.length || 0;
      this.updateRoleStatus(this.roleStatuses[1]);

      // Update Document Verification Person - filter for active status
      const activeDoc = docData?.filter((user: any) => user.status?.toLowerCase() === 'active') || [];
      this.roleStatuses[2].activeCount = activeDoc.length;
      this.updateRoleStatus(this.roleStatuses[2]);

      // Update Accountant - filter for active status
      const activeAccountant = accountantData?.filter((user: any) => user.status?.toLowerCase() === 'active') || [];
      this.roleStatuses[3].activeCount = activeAccountant.length;
      this.updateRoleStatus(this.roleStatuses[3]);

      // Check overall system compliance
      this.checkSystemCompliance();

      this.isLoading = false;
      this.cdr.detectChanges();
    }).catch(err => {
      console.error('Error loading system status:', err);
      this.error = 'Failed to load system configuration status. Please try again.';
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  updateRoleStatus(role: RoleStatus) {
    if (role.activeCount === 0) {
      role.status = 'error';
      role.message = `No active ${role.roleName.toLowerCase()}. System requires at least ${role.minRequired}.`;
    } else if (role.activeCount < role.minRequired) {
      role.status = 'error';
      role.message = `Insufficient ${role.roleName.toLowerCase()}. At least ${role.minRequired} required.`;
    } else if (role.maxAllowed !== null && role.activeCount > role.maxAllowed) {
      role.status = 'error';
      role.message = `Too many active users. Only ${role.maxAllowed} allowed.`;
    } else if (role.activeCount === role.minRequired && role.maxAllowed === null) {
      role.status = 'warning';
      role.message = `Minimum requirement met. Consider adding more for workload distribution.`;
    } else {
      role.status = 'compliant';
      role.message = role.maxAllowed === null
        ? `${role.activeCount} active ${role.roleName.toLowerCase()}. System operational.`
        : `Exactly 1 active. System compliant.`;
    }
  }

  checkSystemCompliance() {
    this.systemCompliant = this.roleStatuses.every(role => role.status !== 'error');
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'compliant': return 'check-circle';
      case 'warning': return 'alert-circle';
      case 'error': return 'x-circle';
      default: return 'circle';
    }
  }



  refreshStatus() {
    this.loadSystemStatus();
    this.loadCollegesWithCoordinators();
  }

  loadCollegesWithCoordinators() {
    this.collegesLoading = true;

    // First, get all college IDs
    this.http.get<number[]>(environment.apiUrl + '/api/colleges/ids')
      .subscribe({
        next: (collegeIds) => {
          // For each college ID, check coordinator status
          const validationRequests = collegeIds.map(id =>
            this.collegeService.checkCanForwardStudents(id).toPromise()
          );

          Promise.all(validationRequests)
            .then(validations => {
              // Map validation responses to CollegeWithCoordinator format
              // Filter out any undefined validations
              this.colleges = validations
                .filter((v): v is NonNullable<typeof v> => v != null)
                .map((validation, index) => ({
                  collegeId: collegeIds[index],
                  collegeName: validation.collegeName || 'Unknown College',
                  city: '', // Not provided by API
                  country: '', // Not provided by API
                  hasCoordinator: validation.canForward,
                  coordinator: validation.coordinatorUsername ? {
                    id: 0,
                    username: validation.coordinatorUsername,
                    status: validation.coordinatorStatus || 'Unknown',
                    studentCount: 0
                  } : null
                }));

              this.collegesLoading = false;
              this.cdr.detectChanges();
            })
            .catch(err => {
              console.error('Error validating colleges:', err);
              this.collegesLoading = false;
              this.cdr.detectChanges();
            });
        },
        error: (err) => {
          console.error('Error loading college IDs:', err);
          this.collegesLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  getCollegeStatusClass(college: CollegeWithCoordinator): string {
    if (!college.hasCoordinator) return 'error';
    if (college.coordinator?.status.toLowerCase() === 'active') return 'compliant';
    return 'warning';
  }

  getCollegeStatusIcon(college: CollegeWithCoordinator): string {
    if (!college.hasCoordinator) return 'alert-triangle';
    if (college.coordinator?.status.toLowerCase() === 'active') return 'check-circle';
    return 'alert-circle';
  }

  getCollegeStatusMessage(college: CollegeWithCoordinator): string {
    if (!college.hasCoordinator) return 'Admission Managers cannot forward students to this university';
    if (college.coordinator?.status.toLowerCase() === 'active') {
      return `Coordinator: ${college.coordinator.username}`;
    }
    return `Coordinator inactive: ${college.coordinator?.username}`;
  }

  getStatusColor(statusClass: string): string {
    switch (statusClass) {
      case 'compliant': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#f59e0b'; // Orange for warnings
      default: return '#64748b';
    }
  }

  getOverallFeedback(): { status: string; message: string; icon: string; class: string } {
    const totalColleges = this.colleges.length;
    const collegesWithCoordinators = this.colleges.filter(c => c.hasCoordinator && c.coordinator?.status.toLowerCase() === 'active').length;
    const collegesNeedingCoordinators = totalColleges - collegesWithCoordinators;

    // Check role compliance
    const rolesCompliant = this.roleStatuses.every(role => role.status === 'compliant');

    if (rolesCompliant && collegesNeedingCoordinators === 0) {
      return {
        status: 'Excellent',
        message: 'All systems operational. All roles are properly configured and all colleges have active coordinators.',
        icon: 'check-circle-2',
        class: 'success'
      };
    } else if (rolesCompliant && collegesNeedingCoordinators <= 2) {
      return {
        status: 'Good',
        message: `System is mostly configured. ${collegesNeedingCoordinators} college(s) need coordinator assignment.`,
        icon: 'alert-circle',
        class: 'warning'
      };
    } else if (!rolesCompliant && collegesNeedingCoordinators > 0) {
      return {
        status: 'Action Required',
        message: 'Critical configuration needed. Some operational roles are missing and colleges need coordinators.',
        icon: 'alert-triangle',
        class: 'error'
      };
    } else if (!rolesCompliant) {
      return {
        status: 'Configuration Required',
        message: 'Some operational roles need attention to ensure system compliance.',
        icon: 'alert-triangle',
        class: 'warning'
      };
    } else {
      return {
        status: 'Needs Attention',
        message: `${collegesNeedingCoordinators} college(s) need coordinator assignment before students can be forwarded.`,
        icon: 'alert-circle',
        class: 'warning'
      };
    }
  }
}
