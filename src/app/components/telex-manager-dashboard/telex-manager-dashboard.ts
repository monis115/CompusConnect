import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
}

@Component({
  selector: 'app-telex-manager-dashboard',
  standalone: false,
  templateUrl: './telex-manager-dashboard.html',
  styleUrls: ['./telex-manager-dashboard.css'],
})
export class TelexManagerDashboard implements OnInit {

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

  get visaStampedStudents(): Student[] {
    return this.students.filter(s => s.applicationStatus === 'VISA_STAMPED');
  }

  get profileData(): TelexManagerProfile | null {
    return this.telexManagerProfile;
  }

  // Filtered by search
  getFilteredActionStudents(): Student[] {
    return this.filterBySearch(this.actionRequiredStudents);
  }

  getFilteredPipelineStudents(): Student[] {
    return this.filterBySearch(this.pipelineStudents);
  }

  getFilteredVisaStudents(): Student[] {
    return this.filterBySearch(this.visaStampedStudents);
  }

  getFilteredAllStudents(): Student[] {
    return this.filterBySearch(this.students);
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
  // FILE HANDLING
  // ============================================
  onFileSelected(event: any, studentId: number): void {
    this.selectedFiles[studentId] = event.target.files;
    this.cdr.detectChanges();
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
      'dashboard': 'Dashboard',
      'actions': 'Action Required',
      'pipeline': 'In Pipeline',
      'visa': 'Visa Stamped',
      'records': 'All Students',
      'profile': 'My Profile'
    };
    return titles[this.activeTab] || 'Dashboard';
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

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
}