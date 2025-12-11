import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';
import { StudentService } from '../../../services/student.service';
import { Student } from '../../../models/student.model';

@Component({
  selector: 'app-student-dashboard',
  standalone: false,
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.css',
})
export class StudentDashboard implements OnInit {
  students: Student[] = [];
  allStudents: Student[] = []; // Store all students for local filtering
  totalStudents = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];
  isLoading = true; // Start with loading state

  // Search functionality
  searchQuery = '';

  viewMode: 'LIST' | 'DETAIL' = 'LIST';
  selectedStudent: Student | null = null;

  // Design element: Completeness Score calculation
  completenessScore = 0;

  // Email Modal Properties
  showEmailModal = false;
  emailSubject = '';
  emailContent = '';
  emailSent = false;
  isSendingEmail = false;

  // Backend base URL for documents
  private readonly DOC_BASE_URL = 'http://localhost:8080/';
  private readonly EMAIL_API_URL = 'http://localhost:8080/api/email/send';

  constructor(
    private studentService: StudentService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.isLoading = true;
    this.cdr.detectChanges(); // Force UI update to show loading

    this.studentService.getAllStudentsPaginated(this.pageIndex, this.pageSize).subscribe({
      next: (response) => {
        this.students = response.content;
        this.allStudents = response.content; // Store for search filtering
        this.totalStudents = response.totalElements;
        this.isLoading = false;
        this.cdr.detectChanges(); // Force UI update after data loads
      },
      error: (err) => {
        console.error('Failed to load students', err);
        this.isLoading = false;
        this.cdr.detectChanges(); // Force UI update on error
      }
    });
  }

  handlePageEvent(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadStudents();
  }

  // Search functionality
  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.students = [...this.allStudents];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.students = this.allStudents.filter(student =>
      student.fullName?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.applicationId?.toLowerCase().includes(query)
    );
    this.cdr.detectChanges();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.students = [...this.allStudents];
    this.cdr.detectChanges();
  }

  viewStudentDetails(student: Student): void {
    this.selectedStudent = student;
    this.calculateCompleteness(student);
    this.viewMode = 'DETAIL';
  }

  backToList(): void {
    this.selectedStudent = null;
    this.viewMode = 'LIST';
  }

  calculateCompleteness(student: Student): void {
    let score = 0;

    // Basic fields - 15%
    if (student.fullName) score += 3;
    if (student.email) score += 3;
    if (student.contactNo) score += 3;
    if (student.dob) score += 3;
    if (student.address) score += 3;

    // Identity - 15%
    if (student.passportNo) score += 5;
    if (student.passportValidTill) score += 5;
    if (student.adhaarCardNo) score += 5;

    // Academic - 15%
    if (student.class12thMarks) score += 5;
    if (student.class12thPassingYear) score += 5;
    if (student.baords) score += 5;

    // Documents - 25%
    if (student.passportPath) score += 5;
    if (student.markseetPath) score += 5;
    if (student.adhaarPath) score += 5;
    if (student.admissionLetterPath) score += 5;
    if (student.confirmationPagePath) score += 5;

    // Status/Process - 15%
    if (student.applicationStatus) score += 5;
    if (student.college) score += 5;
    if (student.paymentStatus === 'Paid') score += 5;

    // Team Assignment - 15%
    if (student.agent) score += 5;
    if (student.admissionManager) score += 5;
    if (student.universityPerson) score += 5;

    this.completenessScore = Math.min(score, 100);
  }

  getInitials(name: string): string {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
  }

  // Open document in new tab at localhost:8080
  openDocument(path: string | undefined): void {
    if (!path) return;

    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const fullUrl = this.DOC_BASE_URL + cleanPath;
    window.open(fullUrl, '_blank');
  }

  // Copy text to clipboard
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard:', text);
    });
  }

  // Get document count for the vault
  getDocumentCount(): number {
    if (!this.selectedStudent) return 0;

    const docs = [
      this.selectedStudent.passportPath,
      this.selectedStudent.adhaarPath,
      this.selectedStudent.markseetPath,
      this.selectedStudent.neetMarksheetPath,
      this.selectedStudent.confirmationPagePath,
      this.selectedStudent.admissionLetterPath,
      this.selectedStudent.conditionalOfferLetterPath,
      this.selectedStudent.telexDocumentsPath,
      this.selectedStudent.telexPaymentScreenshotPath,
      this.selectedStudent.visaPhotoPath,
      this.selectedStudent.visaPassportCopyPath,
      this.selectedStudent.visaPaymentConfirmationPath,
      this.selectedStudent.ttCopyPath,
      this.selectedStudent.paymentConfirmationPath
    ];

    return docs.filter(doc => !!doc).length;
  }

  // Check if passport is expiring soon (within 6 months)
  isPassportExpiringSoon(date: string | undefined): boolean {
    if (!date) return false;
    const expiryDate = new Date(date);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    return expiryDate <= sixMonthsFromNow;
  }

  // Check if payment is overdue
  isPaymentOverdue(dueDate: string | undefined): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  // Get circle dash array for marks visualization
  getCircleDashArray(marks: number, maxMarks: number): string {
    const percentage = (marks / maxMarks) * 100;
    const circumference = 2 * Math.PI * 45; // radius is 45
    const dashArray = (percentage / 100) * circumference;
    return `${dashArray} ${circumference}`;
  }

  // Calculate days since registration
  getDaysInProcess(): number {
    if (!this.selectedStudent?.createdAt) return 0;
    const created = new Date(this.selectedStudent.createdAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate stage progress percentage
  getStageProgress(): number {
    if (!this.selectedStudent?.applicationStatus) return 0;

    const stages = [
      'REGISTERED',
      'UNDER_REVIEW',
      'APPROVED',
      'FORWARDED_TO_UNI',
      'ADMISSION_LETTER_GENERATED',
      'ADMISSION_LETTER_APPROVED',
      'APPLIED_FOR_TELEX',
      'TELEX_INITIATED',
      'TELEX_NUMBER_ISSUED',
      'VISA_APPLIED',
      'VISA_STAMPED',
      'COMPLETED'
    ];

    const currentIndex = stages.indexOf(this.selectedStudent.applicationStatus);
    if (currentIndex === -1) return 0;
    return Math.round(((currentIndex + 1) / stages.length) * 100);
  }

  // Email Modal Methods
  openEmailModal(): void {
    this.showEmailModal = true;
    this.emailSubject = '';
    this.emailContent = '';
    this.emailSent = false;
    this.isSendingEmail = false;
    this.cdr.detectChanges();
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.emailSubject = '';
    this.emailContent = '';
    this.emailSent = false;
    this.isSendingEmail = false;
    this.cdr.detectChanges();
  }

  sendEmail(): void {
    if (!this.selectedStudent?.email || !this.emailSubject || !this.emailContent) {
      return;
    }

    this.isSendingEmail = true;
    this.cdr.detectChanges();

    const emailPayload = {
      to: this.selectedStudent.email,
      subject: this.emailSubject,
      content: this.emailContent
    };

    this.http.post(this.EMAIL_API_URL, emailPayload).subscribe({
      next: (response: any) => {
        console.log('Email sent successfully:', response);
        this.isSendingEmail = false;
        this.emailSent = true;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        // Double-ensure UI updates
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 50);
      },
      error: (error) => {
        console.error('Failed to send email:', error);
        this.isSendingEmail = false;
        this.cdr.detectChanges();
        alert('Failed to send email. Please try again.');
      }
    });
  }
}
