import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
  showTemplates = false;

  // Animation Properties
  isAnimatingTemplate = false;
  animatingSubject = '';
  animatingContent = '';
  selectedTemplateId = '';

  // AI Generative Properties
  aiPrompt = '';
  isGeneratingAI = false;

  // Email Templates
  emailTemplates = [
    {
      id: 'welcome',
      title: 'Welcome & Onboarding',
      description: 'Warm welcome message for newly registered students',
      icon: 'sparkles',
      color: 'purple',
      subject: 'Welcome to Rare Education - Your Journey Begins! 🎓',
      content: `Dear {{studentName}},

Welcome to Rare Education! We are thrilled to have you join our community of aspiring medical professionals.

Your application has been received at our end and our team is now reviewing your documents. Here's what happens next:

1. Document Verification - Our team will verify all submitted documents
2. University Processing - Your application will be forwarded to the university
3. Admission Letter - Once approved, you'll receive your official admission letter

If you have any questions or need assistance, please don't hesitate to reach out. We're here to support you every step of the way.

Best regards,
Rare Education Team`
    },
    {
      id: 'documents',
      title: 'Document Request',
      description: 'Request for missing or additional documents',
      icon: 'file-warning',
      color: 'orange',
      subject: 'Action Required: Please Submit Your Documents',
      content: `Dear {{studentName}},

We hope this message finds you well. Upon reviewing your application, we noticed that some documents are still pending or require updates.

Please submit the following at your earliest convenience:
• [Document 1]
• [Document 2]
• [Document 3]

Important Guidelines:
- All documents should be clear and legible
- Please ensure documents are in PDF format
- Upload within the next 5 business days to avoid delays

If you have any questions about the requirements, please reply to this email.

Best regards,
Rare Education Team`
    },
    {
      id: 'status',
      title: 'Status Update',
      description: 'Inform students about application progress',
      icon: 'bell-ring',
      color: 'green',
      subject: 'Important Update on Your Application Status',
      content: `Dear {{studentName}},

We are pleased to provide you with an update on your application status.

Current Status: [STATUS]

What's Next:
[Describe the next steps in the process]

Timeline:
The next phase is expected to be completed within [X] business days.

If you have any questions or concerns, please don't hesitate to contact us. We appreciate your patience and look forward to assisting you further.

Best regards,
Rare Education Team`
    },
    {
      id: 'admission',
      title: 'Admission Letter',
      description: 'Congratulate on admission letter issuance',
      icon: 'scroll',
      color: 'blue',
      subject: '🎉 Congratulations! Your Admission Letter is Ready',
      content: `Dear {{studentName}},

Congratulations! 🎓

We are delighted to inform you that your Admission Letter has been issued by the university. This is a significant milestone in your academic journey, and we are proud to be part of it.

Your Admission Details:
• University: [UNIVERSITY NAME]
• Course: [COURSE NAME]
• Academic Session: [SESSION]

Next Steps:
1. Download your Admission Letter from your portal
2. Verify all details for accuracy
3. Proceed with the Telex/Visa process as guided by our team

Important: Please keep this admission letter safe as it will be required for your visa application.

If you have any questions, our team is here to assist you.

Congratulations once again!

Best regards,
Rare Education Team`
    },
    {
      id: 'visa-stamped',
      title: 'Visa Stamped',
      description: 'Congratulate on successful visa stamping',
      icon: 'plane',
      color: 'teal',
      subject: '✈️ Congratulations! Your Visa Has Been Stamped!',
      content: `Dear {{studentName}},

Wonderful news! 🎉

We are thrilled to inform you that your visa has been successfully stamped! This marks the final major milestone before you begin your exciting journey abroad.

What's Next:
1. Collect your passport with the stamped visa
2. Review your visa validity dates carefully
3. Start preparing for your travel arrangements
4. Connect with our team for pre-departure orientation

Travel Preparation Checklist:
• Book your flight tickets (we recommend booking at least 2 weeks before departure)
• Arrange airport pickup at your destination
• Prepare necessary documents for immigration
• Pack according to weather conditions at your destination

Our team will be in touch shortly with detailed travel guidelines and pre-departure information.

Congratulations on this achievement! We wish you all the best for your studies abroad.

Best regards,
Rare Education Team`
    },
    {
      id: 'travel',
      title: 'Travel Information',
      description: 'Pre-departure travel guidelines and checklist',
      icon: 'luggage',
      color: 'cyan',
      subject: '🧳 Important: Your Pre-Departure Travel Information',
      content: `Dear {{studentName}},

As your departure date approaches, we want to ensure you have all the information you need for a smooth journey.

Travel Details:
• Departure Date: [DATE]
• Destination: [CITY, COUNTRY]
• University Reporting Date: [DATE]

Essential Documents to Carry:
□ Valid Passport with Visa
□ Admission Letter (Original + Copies)
□ Academic Certificates (Original + Copies)
□ Financial Documents
□ Travel Insurance
□ Passport-size Photos (10-12 copies)
□ Medical Reports/Prescriptions (if any)

Airport Guidelines:
• Arrive at least 4 hours before international departure
• Keep all important documents in your carry-on bag
• Follow airline baggage weight limits

Upon Arrival:
• Our representative will meet you at the airport (details to follow)
• Keep emergency contact numbers saved in your phone

Emergency Contact: [PHONE NUMBER]

Safe travels! We're excited for this new chapter in your life.

Best regards,
Rare Education Team`
    },
    {
      id: 'rejection',
      title: 'Application Update',
      description: 'Inform about application status (rejection)',
      icon: 'alert-circle',
      color: 'red',
      subject: 'Important Update Regarding Your Application',
      content: `Dear {{studentName}},

We hope this message finds you well.

After careful consideration and review of your application, we regret to inform you that we are unable to proceed with your application at this time.

Reason: [SPECIFY REASON]

Please note that this decision does not reflect on your potential or abilities. There are several factors that influence application outcomes.

What You Can Do:
• Review the eligibility criteria and requirements
• Strengthen any areas mentioned in the feedback
• Consider reapplying for the next intake after addressing the concerns
• Reach out to our counseling team for guidance on alternative paths

We encourage you not to be disheartened. Many successful students have faced initial setbacks before achieving their goals. Our team is available to discuss your options and help you plan your next steps.

For any clarification or assistance, please contact our support team.

We wish you the very best in your future endeavors.

Warm regards,
Rare Education Team`
    }
  ];

  // Backend base URL for documents
  private readonly DOC_BASE_URL = 'http://localhost:8080/';
  private readonly EMAIL_API_URL = 'http://localhost:8080/api/email/send';

  constructor(
    private studentService: StudentService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadStudents();
  }

  // Navigation
  goBackToDashboard(): void {
    this.router.navigate(['/admin-dashboard/students']);
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
    this.showTemplates = false;
    this.cdr.detectChanges();
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.emailSubject = '';
    this.emailContent = '';
    this.emailSent = false;
    this.isSendingEmail = false;
    this.showTemplates = false;
    this.cdr.detectChanges();
  }

  // Template Methods
  toggleTemplates(): void {
    this.showTemplates = !this.showTemplates;
    this.cdr.detectChanges();
  }

  selectTemplate(template: any): void {
    // Replace placeholder with actual student name
    const studentName = this.selectedStudent?.fullName || 'Student';
    this.emailSubject = template.subject;
    this.emailContent = template.content.replace(/\{\{studentName\}\}/g, studentName);
    this.showTemplates = false;
    this.selectedTemplateId = template.id;
    this.cdr.detectChanges();
  }

  // Select template with flying animation
  selectTemplateWithAnimation(template: any, index: number): void {
    const studentName = this.selectedStudent?.fullName || 'Student';

    // Set animation content
    this.animatingSubject = template.subject;
    this.animatingContent = template.content.replace(/\{\{studentName\}\}/g, studentName);
    this.selectedTemplateId = template.id;

    // Start animation
    this.isAnimatingTemplate = true;
    this.cdr.detectChanges();

    // After animation completes, fill the form
    setTimeout(() => {
      this.emailSubject = this.animatingSubject;
      this.emailContent = this.animatingContent;
      this.isAnimatingTemplate = false;
      this.cdr.detectChanges();
    }, 600);
  }

  // AI Generative Email - Disabled as per user request
  generateAIEmail(): void {
    if (!this.aiPrompt) return;

    // AI Integration currently disabled
    console.log('AI Generation is currently disabled. Please use templates.');

    // Optional: Show a friendly toast or just do nothing
    // alert('AI features are currently disabled.');

    return;
  }

  /* 
  private generateSubjectFromPrompt(prompt: string): string {
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('document') || promptLower.includes('submit')) {
      return 'Action Required: Document Submission';
    } else ...
  }

  private handleAIError(): void {
    this.isGeneratingAI = false;
    this.cdr.detectChanges();
  }
  */

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
