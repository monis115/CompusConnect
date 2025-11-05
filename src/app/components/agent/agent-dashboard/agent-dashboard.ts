import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// --- Enums ---
export enum StudentStatus {
  REGISTERED = 'REGISTERED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ADMISSION_LETTER_WAITING = 'ADMISSION_LETTER_WAITING',
  ADMISSION_LETTER_GENERATED = 'ADMISSION_LETTER_GENERATED',
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
interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
}

interface Location {
  id: number;
  state: string;
  district: string;
}

interface Student {
  id: number;
  fullName: string;
  dob: string;
  age: number;
  email: string;
  contactNo: string;
  address: string;
  emergencyContactNo: string;
  emergencyRelation: string;
  passportNo: string;
  passportValidTill: string;
  highestDegree: string;
  marks: number;
  appliedFor: string;
  presentStatus: StudentStatus;
  nextStep: StudentStatus;
  college: College;
  createdAt: string; 
  applicationStatus: string;
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;
  confirmationPagePath?: string; 
}

interface AgentData {
  id: number;
  fullName: string;
  age: number;
  dob: string;
  email: string;
  contactNo: string;
  gender: string;
  address: string;
  identityProofType: string;
  identityProofNumber: string;
  designation: string;
  experience: string;
  status: string;
  creationDate: string;
  companyName: string;
  registeredBusinessName: string;
  businessType: string;
  registrationNumber: string;
  panOrGstNumber: string;
  registeredOfficeAddress: string;
  branchOfficeAddress: string;
  companyEmail: string;
  companyContactNo: string;
  website: string;
  userId: string;
  collegePrivileges: College[];
  accessibleLocations: Location[];
  student: Student[];
}

interface DashboardTask {
  studentName: string;
  studentId: number;
  message: string;
  status: StudentStatus;
}

interface CollegeDistribution {
  collegeName: string;
  count: number;
  percentage: number;
  color: string;
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

  public allStatuses: StudentStatus[] = [
    StudentStatus.REGISTERED,
    StudentStatus.UNDER_REVIEW,
    StudentStatus.PENDING_APPROVAL,
    StudentStatus.APPROVED,
    StudentStatus.ADMISSION_LETTER_WAITING,
    StudentStatus.ADMISSION_LETTER_GENERATED,
    StudentStatus.TELEX_INITIATED,
    StudentStatus.TELEX_APPROVED,
    StudentStatus.VISA_INITIATED,
    StudentStatus.VISA_APPROVED,
    StudentStatus.COMPLETED
  ];

  private statusIcons: { [key: string]: string } = {
    [StudentStatus.REGISTERED]: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line>',
    [StudentStatus.UNDER_REVIEW]: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
    [StudentStatus.PENDING_APPROVAL]: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    [StudentStatus.APPROVED]: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    [StudentStatus.ADMISSION_LETTER_WAITING]: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>',
    [StudentStatus.ADMISSION_LETTER_GENERATED]: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline><polyline points="9 14 11 16 15 12"></polyline>',
    [StudentStatus.TELEX_INITIATED]: '<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>',
    [StudentStatus.TELEX_APPROVED]: '<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path><polyline points="9 14 11 16 15 12"></polyline>',
    [StudentStatus.VISA_INITIATED]: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>',
    [StudentStatus.VISA_APPROVED]: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path><polyline points="9 14 11 16 15 12"></polyline>',
    [StudentStatus.COMPLETED]: '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path>',
    [StudentStatus.REJECTED]: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
  };
  public safeStatusIcons = new Map<StudentStatus, SafeHtml>();

  currentView: 'dashboard' | 'students' | 'register' | 'profile' | 'student-detail' | 'payments' | 'admission-letters' = 'dashboard';
  
  agentData: AgentData | null = null;
  students: Student[] = [];
  selectedStudent: Student | null = null;
  agentApiUrl = 'http://localhost:8080/api/agents/user/R1025398681';
  isLoading = true;
  error: string | null = null;

  isHistoryModalOpen = false;
  selectedStudentForHistory: Student | null = null;
  
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
  
  searchQuery: string = '';
  statusFilter: StudentStatus | 'all' = 'all';
  
  // NEW: For new success modal
  isSuccessModalOpen: boolean = false; 
  newlyRegisteredStudent: Student | null = null; 

  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef // <-- 2. Inject ChangeDetectorRef
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
    this.cdr.detectChanges(); // <-- Tell Angular "we are loading"

    this.http.get<AgentData>(this.agentApiUrl).pipe(
      catchError((err): Observable<null> => {
        console.error('Error loading agent data:', err);
        this.error = 'Failed to load agent data. Please try again later.';
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false; 
        this.cdr.detectChanges(); // <-- Tell Angular "we are done loading"
      })
    ).subscribe((data: AgentData | null) => {
      if (data) {
        this.agentData = data;
        this.students = data.student || [];
        
        if (this.agentData) {
          this.generateDummyStudents(this.agentData.collegePrivileges);
        }
        
        this.calculateStats();
        this.generateDashboardTasks();
        this.generateActionableStudents(); 
        this.generateCollegeDistribution();
        
        this.cdr.detectChanges(); // <-- Tell Angular "all data is processed"
      }
    });
  }

  generateDummyStudents(colleges: College[]): void {
    const dummyStudents: Student[] = [
      {
        id: 1001, fullName: "Priya Sharma", dob: "2002-03-15", age: 23, createdAt: "2025-10-28",
        applicationStatus: "Approved", email: "priya.sharma@example.com", contactNo: "9876543210",
        address: "123, MG Road, Mumbai", emergencyContactNo: "9876543211", emergencyRelation: "Father",
        passportNo: "R1234567", passportValidTill: "2030-05-20", highestDegree: "12th Standard (CBSE)",
        marks: 92.5, appliedFor: "MBBS", presentStatus: StudentStatus.ADMISSION_LETTER_GENERATED,
        nextStep: StudentStatus.TELEX_INITIATED, college: colleges[1] || colleges[0], 
        confirmationPagePath: 'uploads/confirmation-pages/confirmation_1001_p_sharma.pdf'
      },
      {
        id: 1002, fullName: "Amit Patel", dob: "2001-07-22", age: 24, createdAt: "2025-10-25",
        applicationStatus: "Pending", email: "amit.patel@example.com", contactNo: "9123456780",
        address: "45, Satellite, Ahmedabad", emergencyContactNo: "9123456781", emergencyRelation: "Mother",
        passportNo: "S7654321", passportValidTill: "2029-11-10", highestDegree: "B.Sc. Biology",
        marks: 88.0, appliedFor: "MBBS", presentStatus: StudentStatus.PENDING_APPROVAL,
        nextStep: StudentStatus.APPROVED, college: colleges[0],
        confirmationPagePath: 'uploads/confirmation-pages/confirmation_1002_a_patel.pdf'
      },
      {
        id: 1003, fullName: "Sunita Singh", dob: "2000-11-05", age: 24, createdAt: "2025-10-22",
        applicationStatus: "Completed", email: "sunita.singh@example.com", contactNo: "9988776655",
        address: "B-10, Sector 15, Noida", emergencyContactNo: "9988776650", emergencyRelation: "Husband",
        passportNo: "T2345678", passportValidTill: "2032-01-30", highestDegree: "M.Sc. Biotechnology",
        marks: 75.2, appliedFor: "MD", presentStatus: StudentStatus.COMPLETED,
        nextStep: StudentStatus.COMPLETED, college: colleges[2] || colleges[0],
        confirmationPagePath: 'uploads/confirmation-pages/confirmation_1003_s_singh.pdf'
      },
      {
        id: 1004, fullName: "Deepak Kumar", dob: "2003-01-30", age: 22, createdAt: "2025-10-20",
        applicationStatus: "In Progress", email: "deepak.kumar@example.com", contactNo: "9001234567",
        address: "78, Kormangala, Bangalore", emergencyContactNo: "9001234560", emergencyRelation: "Father",
        passportNo: "U8765432", passportValidTill: "2033-08-15", highestDegree: "12th Standard (HSC)",
        marks: 95.8, appliedFor: "MBBS", presentStatus: StudentStatus.TELEX_APPROVED,
        nextStep: StudentStatus.VISA_INITIATED, college: colleges[1] || colleges[0]
      },
      {
        id: 1005, fullName: "Anjali Mishra", dob: "2002-09-12", age: 23, createdAt: "2025-10-19",
        applicationStatus: "Rejected", email: "anjali.mishra@example.com", contactNo: "9112233445",
        address: "11, Boring Road, Patna", emergencyContactNo: "9112233440", emergencyRelation: "Mother",
        passportNo: "V3456789", passportValidTill: "2028-02-25", highestDegree: "12th Standard (BSEB)",
        marks: 82.0, appliedFor: "MBBS", presentStatus: StudentStatus.REJECTED,
        nextStep: StudentStatus.REJECTED, college: colleges[0]
      }
    ];
    this.students.push(...dummyStudents);
    this.students.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  calculateStats(): void {
    if (!this.students) return; // Defensive check
    this.stats.totalStudents = this.students.length;
    this.stats.pending = this.students.filter(s => 
      [StudentStatus.REGISTERED, StudentStatus.UNDER_REVIEW, StudentStatus.PENDING_APPROVAL].includes(s.presentStatus)
    ).length;
    this.stats.approved = this.students.filter(s => 
      [StudentStatus.APPROVED, StudentStatus.ADMISSION_LETTER_WAITING, StudentStatus.ADMISSION_LETTER_GENERATED, StudentStatus.TELEX_INITIATED, StudentStatus.TELEX_APPROVED, StudentStatus.VISA_INITIATED, StudentStatus.VISA_APPROVED].includes(s.presentStatus)
    ).length;
    this.stats.completed = this.students.filter(s => s.presentStatus === StudentStatus.COMPLETED).length;
  }

  generateDashboardTasks(): void {
    this.dashboardTasks = this.students
      .filter(s => s.presentStatus === StudentStatus.PENDING_APPROVAL)
      .map(s => ({
          studentName: s.fullName,
          studentId: s.id,
          message: 'Needs admission approval.',
          status: s.presentStatus
      }))
      .slice(0, 5);
  }

  generateActionableStudents(): void {
    this.actionableStudents = this.students.filter(s =>
      s.presentStatus === StudentStatus.ADMISSION_LETTER_GENERATED ||
      s.presentStatus === StudentStatus.TELEX_APPROVED
    ).slice(0, 5);
  }

  generateCollegeDistribution(): void {
    if (!this.students || this.students.length === 0) {
      this.collegeDistribution = [];
      return;
    }

    const countMap = new Map<string, number>();
    for (const student of this.students) {
      const name = student.college.collegeName;
      countMap.set(name, (countMap.get(name) || 0) + 1);
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
  
  navigateTo(view: 'dashboard' | 'students' | 'register' | 'profile' | 'student-detail' | 'payments' | 'admission-letters'): void {
    this.currentView = view;
    if (view !== 'student-detail') {
      this.selectedStudent = null;
    }
    this.cdr.detectChanges(); // Force update on view change
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
    
  updateStudent(student: Student): void {
    const index = this.students.findIndex(s => s.id === student.id);
    if (index !== -1) {
      this.students[index] = { ...student };
      if (this.selectedStudent) {
        this.selectedStudent = { ...student };
      }
      this.calculateStats();
      this.generateDashboardTasks();
      this.generateActionableStudents();
      this.generateCollegeDistribution();
      
      this.cdr.detectChanges(); // Force update
    }
  }
    
  canInitiateTelex(status: StudentStatus): boolean {
    return status === StudentStatus.ADMISSION_LETTER_GENERATED;
  }
  
  canInitiateVisa(status: StudentStatus): boolean {
    return status === StudentStatus.TELEX_APPROVED;
  }
  
  initiateTelex(student: Student): void {
    if (confirm(`Are you sure you want to initiate the telex process for ${student.fullName}?`)) {
      student.presentStatus = StudentStatus.TELEX_INITIATED;
      student.nextStep = StudentStatus.TELEX_APPROVED;
      this.updateStudent(student);
    }
  }
  
  initiateVisa(student: Student): void {
    if (confirm(`Are you sure you want to initiate the visa process for ${student.fullName}?`)) {
      student.presentStatus = StudentStatus.VISA_INITIATED;
      student.nextStep = StudentStatus.VISA_APPROVED;
      this.updateStudent(student);
    }
  }
  
  openHistoryModal(student: Student): void {
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

    if (this.selectedStudentForHistory.presentStatus === StudentStatus.REJECTED) {
      return stepStatus === StudentStatus.REJECTED ? 'active-rejected' : 'pending';
    }

    const allStatuses = this.allStatuses;
    const currentStepIndex = allStatuses.indexOf(this.selectedStudentForHistory.presentStatus);
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
        s.college.collegeName.toLowerCase().includes(query)
      );
    }
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(s => s.presentStatus === this.statusFilter);
    }
    return filtered;
  }
  
  formatStatus(status: string): string {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').toLowerCase();
  }

  getStatusColor(status: StudentStatus | string): string {
    const colors: { [key: string]: string } = {
      [StudentStatus.REGISTERED]: '#3B82F6', // Blue 500
      [StudentStatus.UNDER_REVIEW]: '#A855F7', // Purple 500
      [StudentStatus.PENDING_APPROVAL]: '#F59E0B', // Amber 500
      [StudentStatus.APPROVED]: '#10B981', // Emerald 500
      [StudentStatus.ADMISSION_LETTER_WAITING]: '#06B6D4', // Cyan 500
      [StudentStatus.ADMISSION_LETTER_GENERATED]: '#10B981', // Emerald 500
      [StudentStatus.TELEX_INITIATED]: '#3B82F6', // Blue 500
      [StudentStatus.TELEX_APPROVED]: '#10B981', // Emerald 500
      [StudentStatus.VISA_INITIATED]: '#3B82F6', // Blue 500
      [StudentStatus.VISA_APPROVED]: '#10B981', // Emerald 500
      [StudentStatus.COMPLETED]: '#22C55E', // Green 500
      [StudentStatus.REJECTED]: '#EF4444' // Red 500
    };
    return colors[status] || '#64748B'; // Slate 500
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
      console.log('Logging out...');
      window.location.href = '/login';
    }
  }


  onStudentRegistered(newStudent?: Student): void { // <--- FIXED: Made parameter optional
    
    // 1. Set the data for the success modal
    // Only show the modal if student data is provided (the new student component emitted it)
    this.navigateTo('students'); 
    
    // 2. Reload all agent data. 
    // This will show the loading spinner while the new student list is fetched,
    // which is the correct behavior.
    this.cdr.detectChanges(); 
    
    // 2. Reload all agent data 
    this.loadAgentData(); 
  }
  
  closeSuccessModal(): void { 
    this.isSuccessModalOpen = false;
    this.navigateTo('dashboard'); 
    this.newlyRegisteredStudent = null;
    this.cdr.detectChanges();
  }
  
// ... (keep all existing code, only replace the downloadFile method)

/**
 * Downloads a file (confirmation page or admission letter) from the server
 * @param path - Relative path to the file (e.g., 'uploads/confirmation-pages/confirmation_25_xxx.pdf')
 */
downloadFile(path: string | undefined): void { 
  if (!path) {
    console.error('File path is missing.');
    alert('Error: File path is missing. Cannot download.');
    return;
  }

  // Construct full URL
  const baseUrl = 'http://localhost:8080';
  const fullUrl = `${baseUrl}/${path}`;
  
  console.log(`Downloading file from: ${fullUrl}`);

  // Create a temporary anchor element to trigger download
  const link = document.createElement('a');
  link.href = fullUrl;
  link.target = '_blank'; // Open in new tab as fallback
  
  // Extract filename from path
  const fileName = path.split('/').pop() || 'download.pdf';
  link.download = fileName;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log(`Download initiated for: ${fileName}`);
}

// ... (keep all other existing code)
}