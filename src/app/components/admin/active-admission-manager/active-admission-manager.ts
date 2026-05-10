import { Component, OnInit, ChangeDetectorRef, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { trigger, transition, style, animate, query, stagger, state } from '@angular/animations';
import { environment } from '../../../../environments/environment';

// --- Strict Typing Interfaces ---

export interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
}

export interface Student {
  affidavitPath?: string;
  neetMarksheetPath?: string;
  id: number;
  applicationId?: string; // PRIMARY IDENTIFIER per API spec
  fullName: string;
  dob: string;
  age: number;
  createdAt: string;
  applicationStatus: string;
  email: string;
  contactNo: string;
  address: string;
  emergencyContactNo: string;
  emergencyRelation: string;
  passportNo: string;
  passportValidTill: string;
  collegePreferences: College[];
  highestDegree: string;
  marks: number;
  appliedFor: string;
  presentStatus: string;
  nextStep: string;
  college: College;
  confirmationPagePath: string | null;
  admissionLetterPath: string | null;
  actionOnUser?: 'agent' | 'admission_manager'; // For action tracking
  action?: string; // Next step action (e.g., 'INITIATE_TELEX')
}

export interface AdmissionManager {
  id: number;
  fullName: string;
  email: string;
  contactNumber: string;
  role: string;
  status: string;
  username: string;
  password: string;
  colleges: College[];
  students: Student[];
}

@Component({
  selector: 'app-active-admission-manager',
  standalone: false,
  templateUrl: './active-admission-manager.html',
  styleUrl: './active-admission-manager.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    // Premium fade-in-up for individual elements
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('500ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    // Staggered list animation for cards/rows
    trigger('staggerList', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('60ms', [
            animate('450ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    // View transition for switching between grid/list
    trigger('viewTransition', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('350ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0, 0.6, 1)', style({ opacity: 0 }))
      ])
    ]),
    // Slide in from right for detail view
    trigger('slideInRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(30px)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class ActiveAdmissionManager implements OnInit, OnDestroy {
  managers: AdmissionManager[] = [];
  selectedManager: AdmissionManager | null = null;

  // Loading & State
  isLoading = true;
  error: string | null = null;

  // View State: 'grid' (Executive Overview) | 'list' (Student Intelligence)
  viewMode: 'grid' | 'list' = 'grid';

  totalStudents = 0;
  totalColleges = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadManagers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadManagers(): void {
    this.isLoading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.http.get<AdmissionManager[]>(environment.apiUrl + '/api/managers/with-students')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.managers = data;
          this.calculateStats();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'Unable to synchronize manager data. Please try again.';
          this.isLoading = false;
          console.error('Error loading managers:', err);
          this.cdr.markForCheck();
        }
      });
  }

  private calculateStats(): void {
    this.totalStudents = this.managers.reduce((sum, m) => sum + m.students.length, 0);
    this.totalColleges = this.managers.reduce((sum, m) => sum + m.colleges.length, 0);
  }

  selectManager(manager: AdmissionManager): void {
    this.selectedManager = manager;
    this.viewMode = 'list';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.markForCheck();
  }

  backToGrid(): void {
    this.viewMode = 'grid';
    this.selectedManager = null;
    this.cdr.markForCheck();
  }

  // --- Utility Methods ---

  /**
   * Generate gradient style for avatar based on name
   */
  getAvatarGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #e0e7ff 0%, #fae8ff 100%)',
      'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
      'linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)',
      'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
      'linear-gradient(135deg, #fce7f3 0%, #fae8ff 100%)',
      'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)'
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  }

  /**
   * Get status badge class based on status string
   */
  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase().replace(/_/g, ' ');
    if (s.includes('approved') || s.includes('active') || s.includes('completed') || s.includes('stamped')) {
      return 'status-success';
    }
    if (s.includes('reject') || s.includes('inactive') || s.includes('denied')) {
      return 'status-danger';
    }
    if (s.includes('pending') || s.includes('review') || s.includes('waiting') || s.includes('initiated')) {
      return 'status-warning';
    }
    return 'status-info';
  }

  /**
   * Format status string for display (e.g., VISA_STAMPED -> Visa Stamped)
   */
  formatStatus(status: string): string {
    if (!status) return '--';
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Get action label based on actionOnUser field
   */
  getActionLabel(student: Student): { label: string; type: 'urgent' | 'waiting' | 'neutral' } {
    const actionOn = student.actionOnUser || '';

    if (actionOn === 'admission_manager') {
      return { label: 'Action Required', type: 'urgent' };
    }
    if (actionOn === 'agent') {
      return { label: 'Waiting for Agent', type: 'waiting' };
    }

    // Fallback logic based on status
    const status = (student.presentStatus || '').toLowerCase();
    if (status.includes('pending') || status.includes('review')) {
      return { label: 'Action Required', type: 'urgent' };
    }
    if (status.includes('initiated') || status.includes('processing')) {
      return { label: 'In Progress', type: 'waiting' };
    }
    return { label: 'View Details', type: 'neutral' };
  }

  /**
   * Get CSS class for action user badge
   */
  getActionUserClass(actionOnUser: string | undefined): string {
    const user = (actionOnUser || '').toLowerCase();

    if (user === 'admission_manager' || user === 'admissionmanager') {
      return 'action-user-manager'; // Red/highlighted
    }
    if (user === 'agent') {
      return 'action-user-agent'; // Blue
    }
    if (user === 'student') {
      return 'action-user-student'; // Green
    }
    if (user === 'college' || user === 'university') {
      return 'action-user-college'; // Purple
    }
    if (user === 'visa_office' || user === 'embassy') {
      return 'action-user-visa'; // Amber
    }
    return 'action-user-default'; // Gray
  }

  /**
   * Format action user for display
   */
  formatActionUser(actionOnUser: string | undefined): string {
    if (!actionOnUser) return 'Pending';

    const userMap: Record<string, string> = {
      'admission_manager': 'Admission Manager',
      'admissionmanager': 'Admission Manager',
      'agent': 'Agent',
      'student': 'Student',
      'college': 'College',
      'university': 'University',
      'visa_office': 'Visa Office',
      'embassy': 'Embassy'
    };

    return userMap[actionOnUser.toLowerCase()] ||
      actionOnUser.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Format the action/next step for display
   */
  formatAction(action: string): string {
    if (!action) return '--';
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Get display ID - prefer applicationId, fallback to id
   */
  getDisplayId(student: Student): string {
    return student.applicationId || `#${student.id}`;
  }

  /**
   * TrackBy function for ngFor performance
   */
  trackByManagerId(index: number, manager: AdmissionManager): number {
    return manager.id;
  }

  trackByStudentId(index: number, student: Student): number | string {
    return student.applicationId || student.id;
  }
}