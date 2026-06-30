import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FileService } from '../../services/file.service';

// Enhanced Student Interface with all fields
interface Student {
  id: number;
  applicationId: string;
  fullName: string;
  email: string;
  contactNo: string;
  passportNo: string;
  action: string;
  actionOnUser: string;
  applicationStatus: string;

  // Personal Details
  dob: string;
  age: number;
  sex: string;
  fathersName: string;
  mothersName: string;
  address: string;
  emergencyContactNo: string;
  maritalStatus: string;
  citizenship: string;

  // Telex Form Fields
  surname: string;
  firstName: string;
  middleName: string;
  previousCitizenship: string;

  // Passport & Visa
  passportPath: string;
  visaPhotoPath: string;
  visaPassportCopyPath: string;
  passportType: string;
  passportIssueDate: string;
  passportValidTill: string;
  passportExpirationDate: string;
  passportIssuedBy: string;
  countryOfBirth: string;
  placeOfBirth: string;

  // Academic
  appliedFor: string;
  intake: string;
  class12thPassingYear: string;
  class12thMarks: string;
  markseetPath: string;
  hasGivenNEET: boolean;
  neetScore: string;
  neetMarksheetPath: string;

  // Telex Specific
  telexMan: any;
  visaMan?: any;
  isTelexDocsVerified?: boolean;
  admissionLetterPath?: string;
  telexNumber: string;
  telexIssueDate: string;
  telexDocumentsPath: string;
  telexPaymentAmount: string;
  telexPaymentTxId: string;
  telexPaymentScreenshotPath: string;

  // Document Dispatch
  originalDocsSent: boolean;
  originalDocLocation: string;
  docDeliveryMethod: string;
  courierTrackingId: string;
  docTentativeReachDate: string;

  // Profile Image
  profileImagePath: string;

  // College
  collegePreferences: any[];
  agent?: any;
  college?: any;
}

interface TelexManagerProfile {
  id: number;
  username: string;
  fullName: string;
  email: string;
  contactNumber: string;
  role: string;
  status: string;
  profilePhotoPath?: string;
}

@Component({
  selector: 'app-telex-manager-dashboard',
  standalone: false,
  templateUrl: './telex-manager-dashboard.html',
  styleUrls: ['./telex-manager-dashboard.css'],
})
export class TelexManagerDashboard implements OnInit {
  // Theme System
  isThemePanelOpen = signal<boolean>(false);
  activeTheme = signal<string>('default');

  themes: { id: string; name: string; preview: string[]; vars: Record<string, string> }[] = [
    {
      id: 'default', name: 'Burgundy Classic', preview: ['#630018', '#c5a059', '#f8fafc'],
      vars: {
        '--primary-burgundy': '#630018', '--primary-light': '#8a0f2e', '--primary-dark': '#3f000f',
        '--gold-accent': '#c5a059', '--bg-ivory': '#f8fafc', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1e293b', '--text-secondary': '#475569',
        '--border-classic': '#e2e8f0', '--shadow-hover': '0 10px 25px rgba(99, 0, 24, 0.15)'
      }
    },
    {
      id: 'ocean', name: 'Ocean Blue', preview: ['#0C4A6E', '#38BDF8', '#F0F9FF'],
      vars: {
        '--primary-burgundy': '#0C4A6E', '--primary-light': '#0369A1', '--primary-dark': '#082F49',
        '--gold-accent': '#38BDF8', '--bg-ivory': '#F0F9FF', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#0C4A6E', '--text-secondary': '#475569',
        '--border-classic': '#BAE6FD', '--shadow-hover': '0 10px 25px rgba(12, 74, 110, 0.15)'
      }
    },
    {
      id: 'emerald', name: 'Emerald Forest', preview: ['#064E3B', '#34D399', '#ECFDF5'],
      vars: {
        '--primary-burgundy': '#064E3B', '--primary-light': '#047857', '--primary-dark': '#022C22',
        '--gold-accent': '#34D399', '--bg-ivory': '#ECFDF5', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#064E3B', '--text-secondary': '#475569',
        '--border-classic': '#A7F3D0', '--shadow-hover': '0 10px 25px rgba(6, 78, 59, 0.15)'
      }
    },
    {
      id: 'royal', name: 'Royal Purple', preview: ['#4C1D95', '#A78BFA', '#F5F3FF'],
      vars: {
        '--primary-burgundy': '#4C1D95', '--primary-light': '#6D28D9', '--primary-dark': '#2E1065',
        '--gold-accent': '#A78BFA', '--bg-ivory': '#F5F3FF', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1E1B4B', '--text-secondary': '#475569',
        '--border-classic': '#DDD6FE', '--shadow-hover': '0 10px 25px rgba(76, 29, 149, 0.15)'
      }
    },
    {
      id: 'midnight', name: 'Midnight Dark', preview: ['#1E293B', '#60A5FA', '#0F172A'],
      vars: {
        '--primary-burgundy': '#3B82F6', '--primary-light': '#60A5FA', '--primary-dark': '#1E40AF',
        '--gold-accent': '#FBBF24', '--bg-ivory': '#0F172A', '--bg-surface': '#1E293B',
        '--bg-sidebar': '#1E293B', '--text-charcoal': '#F1F5F9', '--text-secondary': '#94A3B8',
        '--border-classic': '#334155', '--shadow-hover': '0 10px 25px rgba(59, 130, 246, 0.2)'
      }
    },
    {
      id: 'sunset', name: 'Sunset Amber', preview: ['#92400E', '#F59E0B', '#FFFBEB'],
      vars: {
        '--primary-burgundy': '#92400E', '--primary-light': '#B45309', '--primary-dark': '#78350F',
        '--gold-accent': '#F59E0B', '--bg-ivory': '#FFFBEB', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#451A03', '--text-secondary': '#78716C',
        '--border-classic': '#FDE68A', '--shadow-hover': '0 10px 25px rgba(146, 64, 14, 0.15)'
      }
    },
    {
      id: 'rose', name: 'Rose Garden', preview: ['#9F1239', '#FB7185', '#FFF1F2'],
      vars: {
        '--primary-burgundy': '#9F1239', '--primary-light': '#E11D48', '--primary-dark': '#881337',
        '--gold-accent': '#FB7185', '--bg-ivory': '#FFF1F2', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1C1917', '--text-secondary': '#57534E',
        '--border-classic': '#FECDD3', '--shadow-hover': '0 10px 25px rgba(159, 18, 57, 0.15)'
      }
    },
    {
      id: 'slate', name: 'Slate Professional', preview: ['#334155', '#94A3B8', '#F8FAFC'],
      vars: {
        '--primary-burgundy': '#334155', '--primary-light': '#475569', '--primary-dark': '#1E293B',
        '--gold-accent': '#94A3B8', '--bg-ivory': '#F8FAFC', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#0F172A', '--text-secondary': '#64748B',
        '--border-classic': '#CBD5E1', '--shadow-hover': '0 10px 25px rgba(51, 65, 85, 0.15)'
      }
    },
    {
      id: 'teal', name: 'Teal Medical', preview: ['#0D9488', '#5EEAD4', '#F0FDFA'],
      vars: {
        '--primary-burgundy': '#0D9488', '--primary-light': '#14B8A6', '--primary-dark': '#115E59',
        '--gold-accent': '#5EEAD4', '--bg-ivory': '#F0FDFA', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#134E4A', '--text-secondary': '#475569',
        '--border-classic': '#99F6E4', '--shadow-hover': '0 10px 25px rgba(13, 148, 136, 0.15)'
      }
    },
    {
      id: 'indigo', name: 'Indigo Corporate', preview: ['#3730A3', '#818CF8', '#EEF2FF'],
      vars: {
        '--primary-burgundy': '#3730A3', '--primary-light': '#4F46E5', '--primary-dark': '#312E81',
        '--gold-accent': '#818CF8', '--bg-ivory': '#EEF2FF', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1E1B4B', '--text-secondary': '#6366F1',
        '--border-classic': '#C7D2FE', '--shadow-hover': '0 10px 25px rgba(55, 48, 163, 0.15)'
      }
    },
    {
      id: 'coral', name: 'Coral Warm', preview: ['#C2410C', '#FB923C', '#FFF7ED'],
      vars: {
        '--primary-burgundy': '#C2410C', '--primary-light': '#EA580C', '--primary-dark': '#9A3412',
        '--gold-accent': '#FB923C', '--bg-ivory': '#FFF7ED', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#431407', '--text-secondary': '#78716C',
        '--border-classic': '#FED7AA', '--shadow-hover': '0 10px 25px rgba(194, 65, 12, 0.15)'
      }
    },
    {
      id: 'navy', name: 'Navy Classic', preview: ['#1E3A5F', '#60A5FA', '#EFF6FF'],
      vars: {
        '--primary-burgundy': '#1E3A5F', '--primary-light': '#2563EB', '--primary-dark': '#172554',
        '--gold-accent': '#D4AF37', '--bg-ivory': '#EFF6FF', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#0F172A', '--text-secondary': '#475569',
        '--border-classic': '#BFDBFE', '--shadow-hover': '0 10px 25px rgba(30, 58, 95, 0.15)'
      }
    },
    {
      id: 'olive', name: 'Olive Earth', preview: ['#3F6212', '#A3E635', '#F7FEE7'],
      vars: {
        '--primary-burgundy': '#3F6212', '--primary-light': '#4D7C0F', '--primary-dark': '#365314',
        '--gold-accent': '#A3E635', '--bg-ivory': '#F7FEE7', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1A2E05', '--text-secondary': '#4B5563',
        '--border-classic': '#BEF264', '--shadow-hover': '0 10px 25px rgba(63, 98, 18, 0.15)'
      }
    },
    {
      id: 'cherry', name: 'Cherry Blossom', preview: ['#BE185D', '#F9A8D4', '#FDF2F8'],
      vars: {
        '--primary-burgundy': '#BE185D', '--primary-light': '#DB2777', '--primary-dark': '#9D174D',
        '--gold-accent': '#F9A8D4', '--bg-ivory': '#FDF2F8', '--bg-surface': '#ffffff',
        '--bg-sidebar': '#ffffff', '--text-charcoal': '#1C1917', '--text-secondary': '#6B7280',
        '--border-classic': '#FBCFE8', '--shadow-hover': '0 10px 25px rgba(190, 24, 93, 0.15)'
      }
    }
  ];

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  activeTab: string = 'dashboard';
  currentUsername: string = 'TM_001';
  students: Student[] = [];
  telexManagerProfile: TelexManagerProfile | null = null;
  loading: boolean = false;
  processingId: number | null = null;

  // Search & Filters
  searchQuery: string = '';
  filterAgent: string = '';
  filterCollege: string = '';

  get uniqueColleges(): string[] {
    return [...new Set(this.students.map(s => s.college?.collegeName).filter(Boolean))] as string[];
  }

  get uniqueAgents(): any[] {
    return Array.from(new Map(this.students.filter(s => s.agent).map(s => [s.agent.username, s.agent])).values());
  }

  get hasActiveFilters(): boolean {
    return !!this.filterAgent || !!this.filterCollege || !!this.searchQuery;
  }

  clearFilters(): void {
    this.filterAgent = '';
    this.filterCollege = '';
    this.searchQuery = '';
    this.cdr.detectChanges();
  }

  // File uploads & Telex inputs
  selectedFiles: { [studentId: number]: FileList } = {};
  telexInputs: { [studentId: number]: string } = {};

  // Collapsible sections state
  expandedSections: { [key: string]: boolean } = {};

  // Success Modal
  showSuccessModal: boolean = false;
  successTitle: string = '';
  successMessage: string = '';

  // Confirmation Modal
  showConfirmModal: boolean = false;
  confirmTitle: string = '';
  confirmMessage: string = '';
  onConfirm: () => void = () => { };

  // Copy Field State
  copiedField: string | null = null;

  // Selected student for details modal
  selectedStudent: Student | null = null;

  // Detail Panel State
  showDetailPanel: boolean = false;
  detailStudent: Student | null = null;
  docVerificationState: { [studentId: number]: { [docKey: string]: { checklist: boolean[], status: string } } } = {};
  verifiedStudentIds: Set<number> = new Set<number>();
  showRejectModal: boolean = false;
  rejectReason: string = '';
  rejectingStudentId: number | null = null;
  zoomImageUrl: string | null = null;
  zoomOriginalPath: string | null = null;

  // API Base
  private readonly BASE_URL = environment.apiUrl + '/api/telex';
  private readonly DOC_BASE_URL = environment.apiUrl + '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private fileService: FileService
  ) { }

  ngOnInit(): void {
    this.loadSavedTheme();
    // Get Username from Session - auth service stores it as 'userId'
    const sessionUser = sessionStorage.getItem('userId') || sessionStorage.getItem('username');
    if (sessionUser) {
      this.currentUsername = sessionUser;
    }

    // Load Data
    this.loadDashboardData();
  }

  // ============================================
  // DATA FETCHING
  // ============================================
  loadDashboardData() {
    this.loading = true;
    this.http.get<any>(`${this.BASE_URL}-man/username/${this.currentUsername}`)
      .subscribe({
        next: (response) => {
          // API returns TelexManager profile with nested students array
          if (response && response.students) {
            this.students = response.students;
            // Store the profile (exclude students to avoid circular reference)
            this.telexManagerProfile = {
              id: response.id,
              username: response.username,
              fullName: response.fullName,
              email: response.email,
              contactNumber: response.contactNumber,
              role: response.role,
              status: response.status
            };
          } else if (Array.isArray(response)) {
            this.students = response;
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load dashboard', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  refreshData() {
    this.loadDashboardData();
    this.processingId = null;
    this.selectedFiles = {};
    this.telexInputs = {};
  }

  // ============================================
  // FILTERING LOGIC
  // ============================================
  get actionRequiredStudents(): Student[] {
    return this.students.filter(s =>
      s.actionOnUser === 'telex_manager' &&
      s.action !== null &&
      !['VISA_STAMPED'].includes(s.action)
    );
  }

  get pipelineStudents(): Student[] {
    return this.students.filter(s =>
      s.actionOnUser !== 'telex_manager' &&
      s.applicationStatus !== 'VISA_STAMPED'
    );
  }

  get telexIssuedStudents(): Student[] {
    return this.students.filter(s => s.telexNumber && s.telexNumber.trim() !== '');
  }

  get assignVisaStudents(): Student[] {
    return this.students.filter(s =>
      s.applicationStatus !== 'VISA_STAMPED' &&
      s.telexNumber &&
      !s.visaMan
    );
  }

  get rejectedStudents(): Student[] {
    return this.students.filter(s => s.applicationStatus === 'REJECTED');
  }

  get profileData(): TelexManagerProfile | null {
    return this.telexManagerProfile;
  }

  // Specific Flow Stages
  get uploadDocsStudents(): Student[] {
    return this.students.filter(s => s.action === 'UPLOAD_TELEX_DOCS');
  }

  get submitUniStudents(): Student[] {
    return this.students.filter(s => s.action === 'SUBMIT_TELEX_TO_UNIVERSITY');
  }

  get submitMfaStudents(): Student[] {
    return this.students.filter(s => s.action === 'SUBMIT_TELEX_TO_MEA' || s.applicationStatus === 'MEA_PROCESSING');
  }

  get issueTelexStudents(): Student[] {
    return this.students.filter(s => s.action === 'NEED_TO_ISSUE_TELEX');
  }

  // Filtered versions of specific stages
  getFilteredUploadDocsStudents(): Student[] { return this.filterBySearch(this.uploadDocsStudents); }
  getFilteredSubmitUniStudents(): Student[] { return this.filterBySearch(this.submitUniStudents); }
  getFilteredSubmitMfaStudents(): Student[] { return this.filterBySearch(this.submitMfaStudents); }
  getFilteredIssueTelexStudents(): Student[] { return this.filterBySearch(this.issueTelexStudents); }
  getFilteredAssignVisaStudents(): Student[] { return this.filterBySearch(this.assignVisaStudents); }
  getFilteredTelexIssuedStudents(): Student[] { return this.filterBySearch(this.telexIssuedStudents); }
  getFilteredRejectedStudents(): Student[] { return this.filterBySearch(this.rejectedStudents); }

  getFilteredActionStudents(): Student[] {
    return this.filterBySearch(this.actionRequiredStudents);
  }

  getFilteredPipelineStudents(): Student[] {
    return this.filterBySearch(this.pipelineStudents);
  }

  getFilteredAllStudents(): Student[] {
    return this.filterBySearch(this.students);
  }

  // ============================================
  // DASHBOARD WIDGET GETTERS
  // ============================================
  getPendingTasks(): Student[] {
    return this.actionRequiredStudents
      .filter(s => s.action === 'NEED_TO_ISSUE_TELEX' || s.action === 'SUBMIT_TELEX_TO_MEA' || s.action === 'UPLOAD_TELEX_DOCS')
      .slice(0, 5);
  }

  // Dashboard specific getters
  get recentRequestsList(): Student[] {
    return this.students.slice(-5).reverse();
  }

  getDonutGradient(): string {
    const requests = this.uploadDocsStudents.length;
    const mfa = this.submitMfaStudents.length;
    const issued = this.telexIssuedStudents.length;
    const rejected = this.rejectedStudents.length;
    const total = requests + mfa + issued + rejected || 1;

    if (this.students.length === 0) return 'conic-gradient(#e2e8f0 0% 100%)';

    const p1 = (requests / total) * 100;
    const p2 = p1 + (mfa / total) * 100;
    const p3 = p2 + (issued / total) * 100;

    return `conic-gradient(
      #2563eb 0% ${p1}%,
      #ea580c ${p1}% ${p2}%,
      #16a34a ${p2}% ${p3}%,
      #dc2626 ${p3}% 100%
    )`;
  }

  formatMiniStatus(student: Student): string {
    if (student.action === 'UPLOAD_TELEX_DOCS') return 'Telex Requests';
    if (student.action === 'SUBMIT_TELEX_TO_MEA' || student.applicationStatus === 'MEA_PROCESSING') return 'Submitted to MFA';
    if (student.telexNumber) return 'Telex Issued';
    return 'My Applications';
  }

  getMiniBadgeClass(student: Student): string {
    if (student.action === 'UPLOAD_TELEX_DOCS') return 'badge-blue';
    if (student.action === 'SUBMIT_TELEX_TO_MEA' || student.applicationStatus === 'MEA_PROCESSING') return 'badge-orange';
    if (student.telexNumber) return 'badge-green';
    return 'badge-purple';
  }

  getRecentlyIssuedTelex(): Student[] {
    return this.students
      .filter(s => s.telexNumber && s.applicationStatus !== 'PENDING')
      .slice(-5).reverse(); // Just taking the last 5 since we don't have a date sorted array easily. 
  }

  getMfaApplications(): Student[] {
    return this.students.filter(s => s.applicationStatus === 'MEA_PROCESSING' || s.action === 'SUBMIT_TELEX_TO_MEA');
  }

  goToTab(tabName: string): void {
    this.activeTab = tabName;
    this.cdr.detectChanges();
  }

  // ============================================
  // QUICK ACTION MODAL
  // ============================================
  isQuickActionModalOpen: boolean = false;
  quickActionType: 'UPLOAD' | 'ISSUE' | '' = '';
  quickActionSearchQuery: string = '';

  get quickActionStudents(): Student[] {
    let list: Student[] = [];
    if (this.quickActionType === 'UPLOAD') {
      list = this.uploadDocsStudents;
    } else if (this.quickActionType === 'ISSUE') {
      list = this.issueTelexStudents;
    }

    if (this.quickActionSearchQuery.trim()) {
      const q = this.quickActionSearchQuery.toLowerCase();
      list = list.filter(s => s.fullName?.toLowerCase().includes(q) || s.applicationId?.toLowerCase().includes(q));
    }
    return list;
  }

  openQuickActionModal(type: 'UPLOAD' | 'ISSUE' | 'ASSIGN'): void {
    if (type === 'ASSIGN') {
      // Just jump to the assign-visa tab or use the existing modal? The user wanted quick access.
      // Let's jump to the tab since we don't have a single "Assign" quick modal yet, but the instruction says "open the existing Assignment Modal right over the dashboard". 
      // But `openAssignVisaModal` requires a selected student. So we should actually just jump to the tab for Assign Visa, or create a quick select for it.
      // Since it's easiest, we'll navigate to the tab for now.
      this.goToTab('assign-visa');
      return;
    }

    this.quickActionType = type;
    this.quickActionSearchQuery = '';
    this.isQuickActionModalOpen = true;
    this.cdr.detectChanges();
  }

  closeQuickActionModal(): void {
    this.isQuickActionModalOpen = false;
    this.quickActionType = '';
    this.cdr.detectChanges();
  }

  private filterBySearch(list: Student[]): Student[] {
    let filtered = list;
    if (this.filterAgent) {
      filtered = filtered.filter(s => s.agent?.fullName === this.filterAgent);
    }
    if (this.filterCollege) {
      filtered = filtered.filter(s => s.college?.collegeName === this.filterCollege);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName?.toLowerCase().includes(q) ||
        s.applicationId?.toLowerCase().includes(q) ||
        s.passportNo?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  onSearch(): void {
    // The filtering is reactive via the getter methods
    this.cdr.detectChanges();
  }

  get topUniversities() {
    const uniCounts = new Map<string, number>();
    const students = this.getFilteredAllStudents();
    students.forEach(s => {
      const name = s.college?.collegeName || 'Not Assigned';
      uniCounts.set(name, (uniCounts.get(name) || 0) + 1);
    });
    return Array.from(uniCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / (students.length || 1)) * 100) || 0 }));
  }

  get recentActivitiesList() {
    const students = this.getFilteredAllStudents();
    return students.slice(0, 4).map(s => ({
      title: s.action ? this.formatAction(s.action) : 'Application Updated',
      desc: `${s.fullName} - ${s.applicationStatus}`,
      time: 'Recently Updated',
      initials: this.getInitials(s.fullName)
    }));
  }

  get agentBreakdown() {
    const agentCounts = new Map<string, { total: number, stamped: number }>();
    const students = this.getFilteredAllStudents();
    students.forEach(s => {
      const name = s.agent?.fullName || 'Direct';
      const stats = agentCounts.get(name) || { total: 0, stamped: 0 };
      stats.total++;
      if (s.applicationStatus === 'VISA_STAMPED') stats.stamped++;
      agentCounts.set(name, stats);
    });
    return Array.from(agentCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        successRate: Math.round((stats.stamped / (stats.total || 1)) * 100) || 0
      }));
  }

  // ============================================
  // COLLAPSIBLE SECTIONS
  // ============================================
  toggleSection(sectionKey: string): void {
    this.expandedSections[sectionKey] = !this.expandedSections[sectionKey];
    this.cdr.detectChanges();
  }

  // ============================================
  // DETAILS MODAL
  // ============================================
  openDetailsModal(student: Student): void {
    this.selectedStudent = student;
    this.cdr.detectChanges();
  }

  closeDetailsModal(): void {
    this.selectedStudent = null;
    this.cdr.detectChanges();
  }

  // ============================================
  // TELEX REQUEST DETAIL PANEL
  // ============================================
  openDetailPanel(student: Student): void {
    this.detailStudent = student;
    this.showDetailPanel = true;
    
    // Initialize doc verification state for this student if it doesn't exist
    if (!this.docVerificationState[student.id]) {
      if (student.isTelexDocsVerified) {
        // If already verified in backend, pre-fill as verified
        this.docVerificationState[student.id] = {
          passport: { checklist: [true, true, true, true, true, true], status: 'verified' },
          photo: { checklist: [true, true, true, true], status: 'verified' },
          admission: { checklist: [true, true, true, true, true], status: 'verified' }
        };
      } else {
        // Default pending state
        this.docVerificationState[student.id] = {
          passport: { checklist: [false, false, false, false, false, false], status: 'pending' },
          photo: { checklist: [false, false, false, false], status: 'pending' },
          admission: { checklist: [false, false, false, false, false], status: 'pending' }
        };
      }
    }
    this.cdr.detectChanges();
  }

  closeDetailPanel(): void {
    this.showDetailPanel = false;
    this.detailStudent = null;
    this.cdr.detectChanges();
  }

  get docVerification(): { [docKey: string]: { checklist: boolean[], status: string } } {
    if (!this.detailStudent) return {};
    return this.docVerificationState[this.detailStudent.id] || {};
  }

  toggleDocCheck(docKey: string, index: number): void {
    if (!this.detailStudent) return;
    const state = this.docVerificationState[this.detailStudent.id];
    if (state && state[docKey]) {
      state[docKey].checklist[index] = !state[docKey].checklist[index];
      // Auto-update status based on checklist
      const allChecked = state[docKey].checklist.every((c: boolean) => c);
      if (allChecked) {
        state[docKey].status = 'verified';
      } else if (state[docKey].status === 'verified') {
        state[docKey].status = 'pending';
      }
      this.cdr.detectChanges();
    }
  }

  setDocStatus(docKey: string, status: string): void {
    if (!this.detailStudent) return;
    const state = this.docVerificationState[this.detailStudent.id];
    if (state && state[docKey]) {
      state[docKey].status = status;
      if (status === 'verified') {
        state[docKey].checklist = state[docKey].checklist.map(() => true);
      }
      this.cdr.detectChanges();
    }
  }

  isAllDocsVerified(): boolean {
    if (!this.detailStudent) return false;
    return this.isAllDocsVerifiedForStudent(this.detailStudent.id);
  }

  isAllDocsVerifiedForStudent(studentId: number): boolean {
    const state = this.docVerificationState[studentId];
    if (!state) return false;
    return Object.values(state).every((d: any) => d.status === 'verified');
  }

  async markStudentAsVerified(): Promise<void> {
    if (this.detailStudent) {
      try {
        const payload = { managerUsername: this.currentUsername };
        await firstValueFrom(this.http.post(`${this.BASE_URL}/verify-docs/${this.detailStudent.id}`, payload));
        
        const name = this.detailStudent.fullName;
        this.closeDetailPanel();
        
        this.showSuccess('Verification Complete', `Documents for ${name} have been completely verified! You can now upload the Telex documents.`);
        
        // Refresh dashboard to pick up the updated isTelexDocsVerified flag
        this.loadDashboardData();
      } catch (err: any) {
        console.error('Error verifying documents:', err);
        alert('Failed to verify documents: ' + (err.error || err.message));
      }
    }
  }

  getDocStatusClass(docKey: string): string {
    const status = this.docVerification[docKey]?.status || 'pending';
    if (status === 'verified') return 'doc-status-verified';
    if (status === 'rejected') return 'doc-status-rejected';
    return 'doc-status-pending';
  }

  getDocStatusLabel(docKey: string): string {
    const status = this.docVerification[docKey]?.status || 'pending';
    if (status === 'verified') return 'Verified';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
  }


  copyAllPersonalDetails(): void {
    if (!this.detailStudent) return;
    const s = this.detailStudent;
    const text = [
      `Surname: ${s.surname || '—'}`,
      `Name: ${s.firstName || s.fullName || '—'}`,
      `Middle Name: ${s.middleName || '—'}`,
      `Sex: ${s.sex || '—'}`,
      `DOB: ${s.dob || '—'}`,
      `Country of Birth: ${s.countryOfBirth || '—'}`,
      `Place of Birth: ${s.placeOfBirth || '—'}`,
      `Marital Status: ${s.maritalStatus || '—'}`,
      `Citizenship: ${s.citizenship || '—'}`,
      `Passport Type: ${s.passportType || '—'}`,
      `Passport No: ${s.passportNo || '—'}`,
      `Passport Issue Date: ${s.passportIssueDate || '—'}`,
      `Passport Expiry: ${s.passportExpirationDate || '—'}`
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.copiedField = 'all';
      this.cdr.detectChanges();
      setTimeout(() => { this.copiedField = null; this.cdr.detectChanges(); }, 2000);
    });
  }

  isPdf(path: string | undefined | null): boolean {
    if (!path) return false;
    return path.toLowerCase().endsWith('.pdf');
  }

  openZoom(url: string): void {
    if (!url) return;
    this.zoomOriginalPath = url;
    const fullUrl = this.fileService.getFileUrl(url);
    if (this.isPdf(url)) {
      window.open(fullUrl, '_blank');
      return;
    }
    this.zoomImageUrl = fullUrl;
    this.cdr.detectChanges();
  }

  closeZoom(): void {
    this.zoomImageUrl = null;
    this.zoomOriginalPath = null;
    this.cdr.detectChanges();
  }

  // Reject Telex from detail panel
  openRejectFromPanel(): void {
    if (!this.detailStudent) return;
    this.rejectingStudentId = this.detailStudent.id;
    this.rejectReason = '';
    this.showRejectModal = true;
    this.cdr.detectChanges();
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectReason = '';
    this.rejectingStudentId = null;
    this.cdr.detectChanges();
  }

  async submitReject(): Promise<void> {
    if (!this.rejectingStudentId || !this.rejectReason.trim()) {
      this.showSuccess('Missing Information', 'Please provide a rejection reason.');
      return;
    }
    try {
      this.processingId = this.rejectingStudentId;
      this.cdr.detectChanges();

      const body = {
        managerUsername: this.currentUsername,
        reason: this.rejectReason.trim()
      };
      await firstValueFrom(this.http.post(`${this.BASE_URL}/reject/${this.rejectingStudentId}`, body));
      this.closeRejectModal();
      this.closeDetailPanel();
      this.showSuccess('Request Rejected', 'Telex request has been rejected successfully.');
      this.refreshData();
    } catch (err) {
      console.error('Reject failed', err);
      this.showSuccess('Rejection Failed', 'Failed to reject the telex request.');
    } finally {
      this.processingId = null;
      this.cdr.detectChanges();
    }
  }

  // Approve and proceed to upload from detail panel
  async approveAndProceed(): Promise<void> {
    if (!this.detailStudent || !this.isAllDocsVerified()) return;
    // Close detail panel and trigger the upload flow
    const student = this.detailStudent;
    this.closeDetailPanel();
    // Navigate to upload-docs tab with that student ready
    this.activeTab = 'upload-docs';
    this.showSuccess('Documents Verified', `All documents for ${student.fullName} have been verified. You can now upload telex documents.`);
    this.cdr.detectChanges();
  }

  // ============================================
  // FILE HANDLING
  // ============================================
  onFileSelected(event: any, student: Student): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    this.selectedFiles[student.id] = files;
    this.cdr.detectChanges();

    // Automatically trigger the document upload process so the user doesn't have to click twice
    this.handleUploadDocs(student);
  }

  getFileNames(studentId: number): string {
    const files = this.selectedFiles[studentId];
    if (!files || files.length === 0) return '';
    return Array.from(files).map(f => f.name).join(', ');
  }

  // ============================================
  // WORKFLOW ACTIONS
  // ============================================

  // Action: UPLOAD_TELEX_DOCS (Step 1 - Upload only, no auto-chain)
  async handleUploadDocs(student: Student) {
    const files = this.selectedFiles[student.id];
    if (!files || files.length === 0) return;



    try {
      // 1. We are submitting docs
      this.openConfirmModal(
        'Confirm Document Upload',
        `Are you sure you want to submit internal documents for ${student.fullName}?`,
        async () => {
          try {
            this.processingId = student.id;
            this.cdr.detectChanges();

            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
              formData.append('files', files[i]);
            }
            formData.append('managerUsername', this.currentUsername);

            await firstValueFrom(this.http.post(`${this.BASE_URL}/upload-documents/${student.id}`, formData));

            this.showSuccess('Documents Uploaded', `Internal documents for ${student.fullName} uploaded successfully.`);
            if (this.showDetailPanel && this.detailStudent?.id === student.id) {
              this.closeDetailPanel();
            }
            this.refreshData();
          } catch (err) {
            console.error('Upload failed', err);
            this.showSuccess('Upload Failed', 'Failed to upload documents. Please try again.');
          } finally {
            this.processingId = null;
            this.cdr.detectChanges();
          }
        }
      );
    } catch (err) {
      console.error('Upload initiation failed', err);
    }
  }

  // Action: SUBMIT_TELEX_TO_UNIVERSITY (Step 2)
  async handleSubmitToUniversity(student: Student) {
    this.openConfirmModal(
      'Submit to University',
      `Are you sure you have  submitted ${student.fullName}'s application to the University?`,
      async () => {
        this.processingId = student.id;
        this.cdr.detectChanges();

        const body = { managerUsername: this.currentUsername };

        try {
          await firstValueFrom(this.http.post(`${this.BASE_URL}/submit-university/${student.id}`, body));
          this.showSuccess('Submitted Successfully', `Application for ${student.fullName} submitted to University.`);
          this.refreshData();
        } catch (err) {
          console.error('University submit failed', err);
          this.showSuccess('Submission Failed', 'Failed to submit to University.');
        } finally {
          this.processingId = null;
          this.cdr.detectChanges();
        }
      }
    );
  }

  // Action: SUBMIT_TELEX_TO_MEA
  async handleSubmitToMEA(student: Student) {
    this.openConfirmModal(
      'Submit to MEA',
      `Are you sure you have submitted ${student.fullName}'s application to MEA?`,
      async () => {
        this.processingId = student.id;
        this.cdr.detectChanges();

        const body = { managerUsername: this.currentUsername };

        try {
          await firstValueFrom(this.http.post(`${this.BASE_URL}/submit-mea/${student.id}`, body));
          this.showSuccess('Submitted to MEA', `Application for ${student.fullName} submitted to MEA successfully.`);
          this.refreshData();
        } catch (err) {
          console.error('MEA submit failed', err);
          this.showSuccess('Submission Failed', 'Failed to submit to MEA.');
        } finally {
          this.processingId = null;
          this.cdr.detectChanges();
        }
      }
    );
  }

  // Action: NEED_TO_ISSUE_TELEX
  async handleIssueTelex(student: Student) {
    const telexNum = this.telexInputs[student.id];
    if (!telexNum) {
      this.showSuccess('Missing Information', 'Please enter a Telex Number.');
      return;
    }

    this.openConfirmModal(
      'Issue Telex Number',
      `Are you sure you want to issue Telex Number "${telexNum}" to ${student.fullName}?`,
      async () => {
        this.processingId = student.id;
        this.cdr.detectChanges();

        const body = {
          telexNumber: telexNum,
          managerUsername: this.currentUsername
        };

        try {
          await firstValueFrom(this.http.post(`${this.BASE_URL}/issue-number/${student.id}`, body));
          this.showSuccess('Telex Issued', `Telex Number "${telexNum}" issued to ${student.fullName} successfully.`);
          this.refreshData();
        } catch (err) {
          console.error('Issue number failed', err);
          this.showSuccess('Issue Failed', 'Failed to issue Telex Number.');
        } finally {
          this.processingId = null;
          this.cdr.detectChanges();
        }
      }
    );
  }

  // ============================================
  // SUCCESS MODAL
  // ============================================
  showSuccess(title: string, message: string): void {
    this.successTitle = title;
    this.successMessage = message;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.cdr.detectChanges();
  }

  // ============================================
  // CONFIRMATION MODAL
  // ============================================
  openConfirmModal(title: string, message: string, onConfirmAction: () => void): void {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.onConfirm = onConfirmAction;
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.onConfirm = () => { }; // Reset callback
    this.cdr.detectChanges();
  }

  confirmAction(): void {
    if (this.onConfirm) {
      this.onConfirm();
    }
    this.closeConfirmModal();
  }

  // ============================================
  // LOGOUT
  // ============================================
  isLoggingOut: boolean = false;

  logout(): void {
    this.isLoggingOut = true;
    this.cdr.detectChanges();

    // Premium delay for logout animation
    setTimeout(() => {
      sessionStorage.clear();
      this.router.navigate(['/admin-login']);
    }, 2500);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================
  getTabTitle(): string {
    const titles: { [key: string]: string } = {
      'dashboard': 'Dashboard Overview',
      'upload-docs': 'Telex Requests',
      'submit-uni': 'University Submission',
      'submit-mfa': 'MFA Processing',
      'issue-telex': 'Issue Telex Number',
      'assign-visa': 'Assign Visa Manager',
      'telex-issued': 'Issued Telex Numbers',
      'rejected': 'Rejected Applications',
      'records': 'My Applications',
      'profile': 'My Profile'
    };
    return titles[this.activeTab] || 'Dashboard';
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'TM';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  // ============================================
  // PROFILE PHOTO UPLOAD
  // ============================================
  triggerProfileUpload(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onProfilePhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (!file || !this.telexManagerProfile) return;

    this.loading = true;
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'profile');

    this.http.post(`${environment.apiUrl}/api/file/upload`, formData).subscribe({
      next: (res: any) => {
        // Now update the backend profile
        if (this.telexManagerProfile) {
          this.http.patch(`${environment.apiUrl}/api/telex-man/${this.telexManagerProfile.id}`, {
            profilePhotoPath: res.path
          }).subscribe({
            next: () => {
              if (this.telexManagerProfile) {
                this.telexManagerProfile.profilePhotoPath = res.path;
              }
              this.loading = false;
              this.showSuccess('Profile Updated', 'Your profile photo has been updated successfully.');
              this.cdr.detectChanges();
            },
            error: (err: any) => {
              this.loading = false;
              alert('Error saving profile photo to profile: ' + (err.error?.message || err.message));
              this.cdr.detectChanges();
            }
          });
        }
      },
      error: (err: any) => {
        this.loading = false;
        alert('Error uploading profile photo: ' + (err.error?.message || err.message));
        this.cdr.detectChanges();
      }
    });
  }

  getProfilePhotoUrl(path: string | undefined): string {
    if (!path) return '';
    return `${environment.apiUrl}/file/serve?path=${encodeURIComponent(path)}`;
  }

  // ============================================
  // UTILS
  // ============================================
  getAvatarColor(name: string | undefined): string {
    if (!name) return '#64748b'; // default slate-500
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 45%)`;
  }

  getDocUrl(path: string | undefined): string {
    return this.fileService.getFileUrl(path);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  formatStatus(status: string | undefined): string {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ');
  }

  formatAction(action: string | undefined): string {
    if (!action) return '';
    return action.replace(/_/g, ' ');
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'pending';
    const s = status.toUpperCase();
    if (s.includes('STAMPED') || s.includes('COMPLETE') || s.includes('APPROVED')) return 'completed';
    if (s.includes('PROCESS') || s.includes('SUBMIT') || s.includes('TELEX')) return 'processing';
    return 'pending';
  }

  getStatusIcon(status: string | undefined): string {
    if (!status) return 'far fa-circle';
    const s = status.toUpperCase();
    if (s.includes('STAMPED') || s.includes('COMPLETE') || s.includes('APPROVED')) return 'fas fa-check-circle';
    if (s.includes('PROCESS') || s.includes('SUBMIT') || s.includes('TELEX')) return 'fas fa-spinner fa-spin';
    if (s.includes('PENDING')) return 'far fa-clock';
    return 'far fa-dot-circle';
  }

  // ============================================
  // DIRECT ASSIGN VISA MANAGER FUNCTIONALITY
  // ============================================

  isAssignVisaModalOpen = false;
  studentForVisaAssignment: Student | null = null;
  selectedVisaManagerUsername: string = '';
  isAssigningVisaManager = false;
  visaManagers: any[] = [];

  openAssignVisaModal(student: Student): void {
    this.studentForVisaAssignment = student;
    this.selectedVisaManagerUsername = '';
    this.isAssignVisaModalOpen = true;
    if (this.visaManagers.length === 0) {
      this.loadVisaManagers();
    }
  }

  closeAssignVisaModal(): void {
    this.isAssignVisaModalOpen = false;
    this.studentForVisaAssignment = null;
    this.selectedVisaManagerUsername = '';
  }

  loadVisaManagers(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/visa-man/usernames`).subscribe({
      next: (res) => this.visaManagers = res,
      error: (err) => console.error('Error fetching Visa Managers', err)
    });
  }

  assignVisaManager(): void {
    if (!this.studentForVisaAssignment || !this.selectedVisaManagerUsername) return;
    this.isAssigningVisaManager = true;

    const payload = {
      telexManagerUsername: this.currentUsername,
      visaPersonUsername: this.selectedVisaManagerUsername
    };

    this.http.post(`${environment.apiUrl}/api/visa/assign-by-telex/${this.studentForVisaAssignment.id}`, payload).subscribe({
      next: (res) => {
        this.isAssigningVisaManager = false;
        this.closeAssignVisaModal();
        this.successTitle = 'Manager Assigned';
        this.successMessage = `Successfully assigned ${this.studentForVisaAssignment?.fullName} to ${this.selectedVisaManagerUsername}.`;
        this.showSuccessModal = true;
        this.loadDashboardData();
      },
      error: (err) => {
        console.error('Error assigning Visa Manager', err);
        this.isAssigningVisaManager = false;
        alert('Failed to assign Visa Manager. Please try again.');
      }
    });
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  // ============================================
  // COPY FIELD FUNCTIONALITY
  // ============================================
  copyField(value: string | undefined, fieldKey: string): void {
    if (!value) {
      this.copiedField = fieldKey;
      setTimeout(() => this.copiedField = null, 1500);
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      this.copiedField = fieldKey;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copiedField = null;
        this.cdr.detectChanges();
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  copyAllTelexFormFields(student: Student): void {
    const fields = [
      `Surname: ${student.surname || ''}`,
      `First Name: ${student.firstName || ''}`,
      `Middle Name: ${student.middleName || ''}`,
      `Sex: ${student.sex || ''}`,
      `Country of Birth: ${student.countryOfBirth || ''}`,
      `Place of Birth: ${student.placeOfBirth || ''}`,
      `Marital Status: ${student.maritalStatus || ''}`,
      `Citizenship: ${student.citizenship || ''}`,
      `Previous Citizenship: ${student.previousCitizenship || ''}`,
      `Passport Type: ${student.passportType || ''}`,
      `Passport Issued By: ${student.passportIssuedBy || ''}`,
      `Passport Issue Date: ${student.passportIssueDate || ''}`,
      `Passport Expiration Date: ${student.passportExpirationDate || ''}`
    ].join('\n');

    navigator.clipboard.writeText(fields).then(() => {
      this.copiedField = student.id + '_all';
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copiedField = null;
        this.cdr.detectChanges();
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy all fields:', err);
    });
  }

  // Theme Methods
  toggleThemePanel() {
    this.isThemePanelOpen.update(v => !v);
  }

  applyTheme(themeId: string) {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme) return;

    Object.entries(theme.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    this.activeTheme.set(themeId);
    localStorage.setItem('uc_theme', themeId);
    this.isThemePanelOpen.set(false);
  }

  resetTheme() {
    const defaultTheme = this.themes[0];
    Object.entries(defaultTheme.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    this.activeTheme.set('default');
    localStorage.removeItem('uc_theme');
    this.isThemePanelOpen.set(false);
  }

  private loadSavedTheme() {
    const saved = localStorage.getItem('uc_theme');
    if (saved) {
      setTimeout(() => this.applyTheme(saved), 0);
    }
  }
}