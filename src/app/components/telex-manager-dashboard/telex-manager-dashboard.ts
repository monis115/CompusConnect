import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

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

  // Search
  searchQuery: string = '';

  // File uploads & Telex inputs
  selectedFiles: { [studentId: number]: FileList } = {};
  telexInputs: { [studentId: number]: string } = {};

  // Collapsible sections state
  expandedSections: { [key: string]: boolean } = {};

  // Success Modal
  showSuccessModal: boolean = false;
  successTitle: string = '';
  successMessage: string = '';

  // Copy Field State
  copiedField: string | null = null;

  // Selected student for details modal
  selectedStudent: Student | null = null;

  // API Base
  private readonly BASE_URL = 'http://localhost:8080/api/telex';
  private readonly DOC_BASE_URL = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Get Username from Session
    const sessionUser = sessionStorage.getItem('username');
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
    if (!this.searchQuery.trim()) return list;
    const q = this.searchQuery.toLowerCase();
    return list.filter(s =>
      s.fullName?.toLowerCase().includes(q) ||
      s.applicationId?.toLowerCase().includes(q) ||
      s.passportNo?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }

  onSearch(): void {
    // The filtering is reactive via the getter methods
    this.cdr.detectChanges();
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

    this.processingId = student.id;
    this.cdr.detectChanges();

    try {
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

  // Action: SUBMIT_TELEX_TO_UNIVERSITY (Step 2)
  async handleSubmitToUniversity(student: Student) {
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

  // Action: SUBMIT_TELEX_TO_MEA
  async handleSubmitToMEA(student: Student) {
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

  // Action: NEED_TO_ISSUE_TELEX
  async handleIssueTelex(student: Student) {
    const telexNum = this.telexInputs[student.id];
    if (!telexNum) {
      this.showSuccess('Missing Information', 'Please enter a Telex Number.');
      return;
    }

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
    if (!name) return 'TM';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getDocUrl(path: string | undefined): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${this.DOC_BASE_URL}/${cleanPath}`;
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