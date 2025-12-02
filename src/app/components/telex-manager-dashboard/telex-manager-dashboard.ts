import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Interface matching your JSON structure roughly
interface Student {
  email: any;
  contactNo: any;
  telexNumber: any;
  appliedFor: any;
  id: number;
  fullName: string;
  applicationId: string;
  passportNo: string;
  action: string;
  actionOnUser: string;
  applicationStatus: string;
  collegePreferences: any[];
  telexMan?: any;
  // ... other fields
}

@Component({
  selector: 'app-telex-manager-dashboard',
  standalone: false, // As requested
  templateUrl: './telex-manager-dashboard.html',
  styleUrls: ['./telex-manager-dashboard.css'],
})
export class TelexManagerDashboard implements OnInit {

  // State
  activeTab: string = 'dashboard';
  currentUsername: string = 'TM_001'; // Default Fallback
  students: Student[] = [];
  loading: boolean = false;
  processingId: number | null = null; // To show loader per card

  // Selected files for upload logic
  selectedFiles: { [studentId: number]: FileList } = {};
  // Inputs for telex number
  telexInputs: { [studentId: number]: string } = {};

  // API Base
  private readonly BASE_URL = 'http://localhost:8080/api/telex';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // 1. Get Username from Session
    const sessionUser = sessionStorage.getItem('username');
    if (sessionUser) {
      this.currentUsername = sessionUser;
    }

    // 2. Load Data
    this.loadDashboardData();
  }

  // --- Data Fetching ---
  loadDashboardData() {
    this.loading = true;
    // Hitting the endpoint provided
    this.http.get<any>(`${this.BASE_URL}-man/username/${this.currentUsername}`)
      .subscribe({
        next: (response) => {
          // Handling if response is a single object or array
          if (Array.isArray(response)) {
            this.students = response;
          } else if (response) {
            this.students = [response];
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load dashboard', err);
          this.loading = false;
        }
      });
  }

  // --- Filtering Logic ---

  get actionRequiredStudents() {
    return this.students.filter(s =>
      s.actionOnUser === 'telex_manager' &&
      s.action !== null &&
      !['VISA_STAMPED'].includes(s.action)
    );
  }

  get pipelineStudents() {
    return this.students.filter(s => s.actionOnUser !== 'telex_manager' && s.applicationStatus !== 'VISA_STAMPED');
  }

  get visaStampedStudents() {
    return this.students.filter(s => s.applicationStatus === 'VISA_STAMPED'); // Assuming status logic
  }

  get profileData() {
    // Just taking the first student's telexMan info for the profile view
    // Or you could make a separate API call for user profile
    return this.students.length > 0 ? this.students[0].telexMan : null;
  }

  // --- Actions ---

  // 1. File Selection Handler
  onFileSelected(event: any, studentId: number) {
    this.selectedFiles[studentId] = event.target.files;
  }

  // Action: UPLOAD_TELEX_DOCS -> Then Submit Uni
  async handleUploadDocs(student: Student) {
    const files = this.selectedFiles[student.id];
    if (!files || files.length === 0) return;

    this.processingId = student.id;

    try {
      // Step 1: Upload Docs
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      formData.append('managerUsername', this.currentUsername);

      await firstValueFrom(this.http.post(`${this.BASE_URL}/upload-documents/${student.id}`, formData));

      // Step 2: Auto-trigger Submit to University as per requirements
      await this.handleSubmitToUniversity(student, true); // true = called internally

    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload documents.');
      this.processingId = null;
    }
  }

  // Action: SUBMIT_TELEX_TO_UNIVERSITY
  async handleSubmitToUniversity(student: Student, isChained = false) {
    if (!isChained) this.processingId = student.id;

    const body = { managerUsername: this.currentUsername };

    try {
      await firstValueFrom(this.http.post(`${this.BASE_URL}/submit-university/${student.id}`, body));
      if (!isChained) alert('Successfully submitted to University');
      this.refreshData();
    } catch (err) {
      console.error('University submit failed', err);
      if (!isChained) alert('Failed to submit to University');
    } finally {
      this.processingId = null;
    }
  }

  // Action: SUBMIT_TELEX_TO_MEA
  async handleSubmitToMEA(student: Student) {
    this.processingId = student.id;
    const body = { managerUsername: this.currentUsername };

    try {
      await firstValueFrom(this.http.post(`${this.BASE_URL}/submit-mea/${student.id}`, body));
      alert('Successfully submitted to MEA');
      this.refreshData();
    } catch (err) {
      console.error('MEA submit failed', err);
      alert('Failed to submit to MEA');
    } finally {
      this.processingId = null;
    }
  }

  // Action: NEED_TO_ISSUE_TELEX
  async handleIssueTelex(student: Student) {
    const telexNum = this.telexInputs[student.id];
    if (!telexNum) {
      alert('Please enter a Telex Number');
      return;
    }

    this.processingId = student.id;
    const body = {
      telexNumber: telexNum,
      managerUsername: this.currentUsername
    };

    try {
      await firstValueFrom(this.http.post(`${this.BASE_URL}/issue-number/${student.id}`, body));
      alert('Telex Number Issued Successfully');
      this.refreshData();
    } catch (err) {
      console.error('Issue number failed', err);
      alert('Failed to issue Telex Number');
    } finally {
      this.processingId = null;
    }
  }

  refreshData() {
    this.loadDashboardData();
    this.processingId = null;
    this.selectedFiles = {};
    this.telexInputs = {};
  }
}