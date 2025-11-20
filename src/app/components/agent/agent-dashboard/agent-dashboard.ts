import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AdminAuthService } from '../../../services/admin-auth-service';
import { AgentService, AgentData, Student, CollegeAccess, College, Location as AgentLocation } from '../../../services/agent.service';

// --- Enums ---
// Updated to match the provided Java Enum exactly
export enum StudentStatus {
  Submitted = 'Submitted',
  REGISTERED = 'REGISTERED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  FORWARDED_TO_UNI = 'FORWARDED_TO_UNI',

  // New Admission Steps
  CONDITIONAL_OFFER_LETTER_ISSUED = 'CONDITIONAL_OFFER_LETTER_ISSUED',
  PENDING_ADMISSION_LETTER = 'PENDING_ADMISSION_LETTER',
  ADMISSION_LETTER_RECEIVED = 'ADMISSION_LETTER_RECEIVED',

  // Telex Process
  APPLIED_FOR_TELEX = 'APPLIED_FOR_TELEX',
  TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY = 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY',
  TELEX_APPLICATION_SUBMITTED_TO_MEA = 'TELEX_APPLICATION_SUBMITTED_TO_MEA',
  TELEX_NUMBER_ISSUED = 'TELEX_NUMBER_ISSUED',

  // Visa Process
  VISA_FEE_PENDING = 'VISA_FEE_PENDING',
  VISA_FEE_RECEIVED = 'VISA_FEE_RECEIVED',
  VISA_APPLIED = 'VISA_APPLIED',
  PASSPORT_SUBMITTED_TO_EMBASSY = 'PASSPORT_SUBMITTED_TO_EMBASSY',
  VISA_STAMPED = 'VISA_STAMPED',

  // Legacy/Existing
  ADMISSION_LETTER_WAITING = 'ADMISSION_LETTER_WAITING',
  ADMISSION_LETTER_GENERATED = 'ADMISSION_LETTER_GENERATED',
  ADMISSION_LETTER_APPROVED = 'ADMISSION_LETTER_APPROVED',
  TELEX_INITIATED = 'TELEX_INITIATED',
  TELEX_APPROVED = 'TELEX_APPROVED',
  VISA_INITIATED = 'VISA_INITIATED',
  VISA_APPROVED = 'VISA_APPROVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// --- Interfaces ---
interface DashboardTask {
  studentName: string;
  studentId: number;
  message: string;
  status: string;
}

interface CollegeDistribution {
  collegeName: string;
  count: number;
  percentage: number;
  color: string;
}

// New interfaces for College Grouping
interface StateGroup {
  stateName: string;
  districts: string[];
}

interface GroupedCollegeAccess {
  college: College;
  accessAllLocations: boolean;
  locationsByState: StateGroup[];
}

interface StudentHistory {
  status: string;
  timestamp: string;
  remarks?: string;
  updatedBy?: string;
}

// --- Animations ---
const listAnimation = trigger('listAnimation', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(15px)' }),
      stagger('50ms', [
        animate('300ms 150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

const modalListAnimation = trigger('modalListAnimation', [
  transition('* => *', [
    query('li.timeline-step', [
      style({ opacity: 0, transform: 'translateX(-20px)' }),
      stagger('50ms', [
        animate('350ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ], { optional: true })
  ])
]);


@Component({
  selector: 'app-agent-dashboard',
  standalone: false,
  templateUrl: './agent-dashboard.html',
  styleUrls: ['./agent-dashboard.css'],
  animations: [listAnimation, modalListAnimation]
})
export class AgentDashboard implements OnInit {
  public readonly PaymentStatus = PaymentStatus;
  public readonly StudentStatus = StudentStatus;
  public otherCollegesCount: number = 0;

  // Updated status list for the visual timeline (simplified view)
  public allStatuses: StudentStatus[] = [
    StudentStatus.REGISTERED,
    StudentStatus.FORWARDED_TO_UNI,
    StudentStatus.ADMISSION_LETTER_GENERATED,
    StudentStatus.ADMISSION_LETTER_APPROVED,
    StudentStatus.APPLIED_FOR_TELEX,
    StudentStatus.TELEX_NUMBER_ISSUED,
    StudentStatus.VISA_APPLIED,
    StudentStatus.VISA_STAMPED
  ];

  // Extended icon mapping to handle new statuses
  private statusIcons: { [key: string]: string } = {
    [StudentStatus.REGISTERED]: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line>',
    [StudentStatus.UNDER_REVIEW]: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
    [StudentStatus.PENDING_APPROVAL]: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    [StudentStatus.APPROVED]: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',

    // Admission
    [StudentStatus.FORWARDED_TO_UNI]: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>',
    [StudentStatus.ADMISSION_LETTER_GENERATED]: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>',
    [StudentStatus.ADMISSION_LETTER_APPROVED]: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',

    // Telex
    [StudentStatus.APPLIED_FOR_TELEX]: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>',
    [StudentStatus.TELEX_NUMBER_ISSUED]: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>',
    [StudentStatus.TELEX_APPROVED]: '<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path><polyline points="9 14 11 16 15 12"></polyline>',

    // Visa
    [StudentStatus.VISA_APPLIED]: '<path d="M2 12h20M2 12l5-5m-5 5 5 5"></path>',
    [StudentStatus.VISA_STAMPED]: '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path>',
    [StudentStatus.VISA_APPROVED]: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path><polyline points="9 14 11 16 15 12"></polyline>',

    [StudentStatus.COMPLETED]: '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path>',
    [StudentStatus.REJECTED]: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
  };
  public safeStatusIcons = new Map<StudentStatus, SafeHtml>();

  currentView: 'dashboard' | 'students' | 'register' | 'profile' | 'student-detail' | 'payments' | 'admission-letters' = 'dashboard';

  agentData: AgentData | null = null;
  students: Student[] = [];
  selectedStudent: Student | null = null;
  isLoading = true;
  error: string | null = null;

  isHistoryModalOpen = false;
  selectedStudentForHistory: any | null = null; // Changed type to any to accept json structure easily or define strict interface

  isSidebarCollapsed = false;

  stats = {
    totalStudents: 0,
    pending: 0,
    approved: 0,
    completed: 0
  };

  dashboardTasks: DashboardTask[] = [];
  actionableStudents: Student[] = [];
  collegeDistribution: CollegeDistribution[] = [];
  groupedCollegeAccess: GroupedCollegeAccess[] = [];

  searchQuery: string = '';
  statusFilter: StudentStatus | 'all' = 'all';

  isSuccessModalOpen: boolean = false;
  newlyRegisteredStudent: Student | null = null;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private authService: AdminAuthService,
    private agentService: AgentService
  ) {
    for (const [key, value] of Object.entries(this.statusIcons)) {
      this.safeStatusIcons.set(key as StudentStatus, this.sanitizer.bypassSecurityTrustHtml(value));
    }
  }

  ngOnInit(): void {
    this.loadAgentData();
  }

  loadAgentData(): void {
    this.isLoading = true;
    this.error = null;
    this.cdr.detectChanges();

    const authUser = this.authService.getUserData();

    if (authUser && authUser.username) {
      this.agentService.getAgentProfile(authUser.username).subscribe({
        next: (data: AgentData) => {
          this.agentData = data;
          this.students = data.student || [];
          this.generateDummyStudents();

          this.calculateStats();
          this.generateDashboardTasks();
          this.generateActionableStudents();
          this.generateCollegeDistribution();
          this.groupCollegeAccess(); // New Grouping Logic

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to fetch agent profile:', err);
          this.error = 'Failed to load agent data. Please try again.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      console.error('No auth user found.');
      this.error = 'Not authenticated. Please login.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  generateDummyStudents(): void {
    this.students = this.students.map(s => ({
      ...s,
      applicationStatus: s.applicationStatus,
      nextStep: s.nextStep || StudentStatus.UNDER_REVIEW
    }));

    this.students.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  calculateStats(): void {
    if (!this.students) return;
    this.stats.totalStudents = this.students.length;
    this.stats.pending = this.students.filter(s =>
      [StudentStatus.REGISTERED, StudentStatus.UNDER_REVIEW, StudentStatus.PENDING_APPROVAL].includes(s.applicationStatus as StudentStatus)
    ).length;
    this.stats.approved = this.students.filter(s =>
      [StudentStatus.APPROVED, StudentStatus.ADMISSION_LETTER_GENERATED, StudentStatus.ADMISSION_LETTER_APPROVED, StudentStatus.TELEX_NUMBER_ISSUED, StudentStatus.VISA_STAMPED].includes(s.applicationStatus as StudentStatus)
    ).length;
    this.stats.completed = this.students.filter(s => s.applicationStatus === StudentStatus.COMPLETED).length;
  }

  generateDashboardTasks(): void {
    this.dashboardTasks = this.students
      .filter(s => s.applicationStatus === StudentStatus.PENDING_APPROVAL)
      .map(s => ({
        studentName: s.fullName,
        studentId: s.id,
        message: 'Needs admission approval.',
        status: s.applicationStatus
      }))
      .slice(0, 5);
  }

  generateActionableStudents(): void {
    this.actionableStudents = this.students.filter(s =>
      s.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED ||
      s.applicationStatus === StudentStatus.TELEX_NUMBER_ISSUED
    ).slice(0, 5);
  }

  generateCollegeDistribution(): void {
    if (!this.students || this.students.length === 0) {
      this.collegeDistribution = [];
      return;
    }

    const countMap = new Map<string, number>();
    for (const student of this.students) {
      if (student.college) {
        const name = student.college.collegeName;
        countMap.set(name, (countMap.get(name) || 0) + 1);
      }
    }

    const total = this.students.length;
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#A855F7'];

    const allDistribution = Array.from(countMap.entries()).map(([name, count], index) => ({
      collegeName: name,
      count: count,
      percentage: (count / total) * 100,
      color: colors[index % colors.length]
    })).sort((a, b) => b.count - a.count);

    this.collegeDistribution = allDistribution;

    if (allDistribution.length > 4) {
      this.otherCollegesCount = allDistribution.slice(4).reduce((acc, i) => acc + i.count, 0);
    } else {
      this.otherCollegesCount = 0;
    }
  }

  // --- UPDATED COLLEGE GROUPING LOGIC ---
  groupCollegeAccess(): void {
    if (!this.agentData || !this.agentData.collegeAccess) {
      this.groupedCollegeAccess = [];
      return;
    }

    const collegeMap = new Map<number, {
      college: College,
      accessAllLocations: boolean,
      locations: AgentLocation[]
    }>();

    // 1. Consolidate duplicate college entries
    for (const access of this.agentData.collegeAccess) {
      const collegeId = access.college.id;

      if (!collegeMap.has(collegeId)) {
        collegeMap.set(collegeId, {
          college: access.college,
          accessAllLocations: access.accessAllLocations,
          locations: [...(access.allowedLocations || [])]
        });
      } else {
        const existing = collegeMap.get(collegeId)!;
        if (access.accessAllLocations) {
          existing.accessAllLocations = true;
        }
        // Append locations
        if (access.allowedLocations) {
          existing.locations.push(...access.allowedLocations);
        }
      }
    }

    // 2. Transform into grouped structure (College -> State -> Districts)
    this.groupedCollegeAccess = Array.from(collegeMap.values()).map(group => {
      const stateMap = new Map<string, Set<string>>();

      if (!group.accessAllLocations) {
        // Deduplicate locations first by ID
        const uniqueLocs = new Map<number, AgentLocation>();
        group.locations.forEach(loc => uniqueLocs.set(loc.id, loc));

        // Group by State
        uniqueLocs.forEach(loc => {
          if (!stateMap.has(loc.state)) {
            stateMap.set(loc.state, new Set());
          }
          stateMap.get(loc.state)!.add(loc.district);
        });
      }

      // Convert Map to Array
      const locationsByState: StateGroup[] = [];
      stateMap.forEach((districts, state) => {
        locationsByState.push({
          stateName: state,
          districts: Array.from(districts).sort()
        });
      });

      return {
        college: group.college,
        accessAllLocations: group.accessAllLocations,
        locationsByState: locationsByState.sort((a, b) => a.stateName.localeCompare(b.stateName))
      };
    });
  }

  navigateTo(view: any): void {
    this.currentView = view;
    if (view !== 'student-detail') {
      this.selectedStudent = null;
    }
    this.cdr.detectChanges();
  }

  viewStudentDetails(student: Student): void {
    this.selectedStudent = student;
    this.currentView = 'student-detail';
  }

  viewStudentFromTask(studentId: number): void {
    const student = this.students.find(s => s.id === studentId);
    if (student) {
      this.viewStudentDetails(student);
    }
  }

  canInitiateTelex(status: string): boolean {
    return status === StudentStatus.ADMISSION_LETTER_APPROVED;
  }

  canInitiateVisa(status: string): boolean {
    return status === StudentStatus.TELEX_NUMBER_ISSUED;
  }

  initiateTelex(student: Student): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf, .jpg, .jpeg, .png';
    fileInput.style.display = 'none';

    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        if (confirm(`Are you sure you want to upload ${file.name} and initiate the telex process for ${student.fullName}?`)) {
          this.isLoading = true;
          this.cdr.detectChanges();
          const agentUsername = this.agentData?.userId || '';

          this.agentService.initiateTelex(student.id, file, agentUsername).subscribe({
            next: (response) => {
              console.log('Telex initiated successfully', response);
              alert('Telex process initiated successfully!');
              this.loadAgentData();
            },
            error: (err) => {
              console.error('Error initiating telex', err);
              alert('Failed to initiate telex. Please try again.');
              this.isLoading = false;
              this.cdr.detectChanges();
            }
          });
        }
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  initiateVisa(student: Student): void {
    if (confirm(`Are you sure you want to initiate the visa process for ${student.fullName}?`)) {
      alert('Visa initiation API not yet integrated.');
    }
  }

  openHistoryModal(student: any): void {
    this.selectedStudentForHistory = student;
    this.isHistoryModalOpen = true;
    this.cdr.detectChanges();
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.selectedStudentForHistory = null;
    }, 300);
  }

  getHistoryStepClass(stepStatus: StudentStatus): string {
    if (!this.selectedStudentForHistory) return 'pending';
    const currentStatus = this.selectedStudentForHistory.applicationStatus as StudentStatus;

    if (currentStatus === StudentStatus.REJECTED) {
      return stepStatus === StudentStatus.REJECTED ? 'active-rejected' : 'pending';
    }

    const allStatuses = this.allStatuses;
    const currentStepIndex = allStatuses.indexOf(currentStatus);
    const thisStepIndex = allStatuses.indexOf(stepStatus);

    if (thisStepIndex < 0) return 'pending';
    if (thisStepIndex < currentStepIndex) return 'completed';
    if (thisStepIndex === currentStepIndex) return 'active';
    return 'pending';
  }

  calculateAge(dob: string): number {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  getFilteredStudents(): Student[] {
    let filtered = [...this.students];
    const query = this.searchQuery.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(s =>
        s.fullName.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.contactNo.includes(query) ||
        (s.college && s.college.collegeName.toLowerCase().includes(query))
      );
    }
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(s => s.applicationStatus === this.statusFilter);
    }
    return filtered;
  }

  formatStatus(status: string): string {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').toLowerCase();
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      [StudentStatus.REGISTERED]: '#3B82F6',
      [StudentStatus.UNDER_REVIEW]: '#A855F7',
      [StudentStatus.PENDING_APPROVAL]: '#F59E0B',
      [StudentStatus.APPROVED]: '#10B981',
      [StudentStatus.ADMISSION_LETTER_GENERATED]: '#10B981',
      [StudentStatus.ADMISSION_LETTER_APPROVED]: '#10B981',
      [StudentStatus.TELEX_NUMBER_ISSUED]: '#3B82F6',
      [StudentStatus.VISA_STAMPED]: '#22C55E',
      [StudentStatus.COMPLETED]: '#22C55E',
      [StudentStatus.REJECTED]: '#EF4444'
    };
    return colors[status] || '#64748B';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return dateString;
    }
  }

  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      window.location.href = '/login';
    }
  }

  onStudentRegistered(newStudent?: any): void {
    this.navigateTo('students');
    this.cdr.detectChanges();
    this.loadAgentData();
  }

  closeSuccessModal(): void {
    this.isSuccessModalOpen = false;
    this.navigateTo('dashboard');
    this.newlyRegisteredStudent = null;
    this.cdr.detectChanges();
  }

  downloadFile(path: string | undefined): void {
    if (!path) {
      alert('Error: File path is missing. Cannot download.');
      return;
    }
    const baseUrl = 'http://localhost:8080';
    const fullUrl = `${baseUrl}/${path}`;
    const link = document.createElement('a');
    link.href = fullUrl;
    link.target = '_blank';
    const fileName = path.split('/').pop() || 'download.pdf';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}