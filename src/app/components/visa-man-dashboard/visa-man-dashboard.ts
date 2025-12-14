import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize, catchError } from 'rxjs';
import { of } from 'rxjs';

import { PaymentRequestService, PaymentRequest } from '../../services/payment-request.service';

// Student Interface
interface Student {
  id: number;
  applicationId: string;
  fullName: string;
  email: string;
  contactNo: string;
  passportNo: string;
  passportValidTill: string;
  passportPath: string;
  telexNumber: string;
  action: string;
  actionOnUser: string;
  applicationStatus: string;
  profileImagePath: string;
  visaPaymentRequestedAmount?: number;
  visaPaymentRequestedCurrency?: string;
}

// VisaMan Profile Interface
interface VisaManProfile {
  id: number;
  username: string;
  fullName: string;
  email: string;
  contactNumber: string;
  role: string;
  status: string;
  students: Student[];
}

@Component({
  selector: 'app-visa-man-dashboard',
  standalone: false,
  templateUrl: './visa-man-dashboard.html',
  styleUrl: './visa-man-dashboard.css',
})
export class VisaManDashboard implements OnInit, OnDestroy {

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  private destroy$ = new Subject<void>();

  activeSection: 'dashboard' | 'actions' | 'pipeline' | 'students' | 'funds' = 'dashboard';
  currentUsername: string = 'VM_001';
  students: Student[] = [];
  visaManProfile: VisaManProfile | null = null;

  // Loading States
  isLoading: boolean = true;
  isRefreshing: boolean = false;
  processingId: number | null = null;

  // Modal States
  showLogoutModal: boolean = false;
  showSuccessModal: boolean = false;
  showDetailModal: boolean = false;
  showPaymentModal: boolean = false;
  selectedStudent: Student | null = null;
  paymentStudent: Student | null = null;
  successMessage: string = '';

  // Payment Form
  paymentAmount: number | null = null;
  paymentCurrency: string = 'INR';
  paymentError: string = '';

  // Currency Options
  currencies: { code: string; name: string; symbol: string }[] = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },

    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' }
  ];

  // Search
  searchQuery: string = '';

  // Sidebar Mobile Toggle
  sidebarOpen: boolean = false;

  // Stats with animated counters
  stats = {
    pendingApplications: 0,
    awaitingPassport: 0,
    atEmbassy: 0,
    visasIssued: 0
  };

  // Display values for counter animation
  displayStats = {
    pendingApplications: 0,
    awaitingPassport: 0,
    atEmbassy: 0,
    visasIssued: 0
  };

  // API Base URL
  private readonly API_URL = 'http://localhost:8080/api';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private paymentRequestService: PaymentRequestService
  ) { }

  ngOnInit(): void {
    // Get username from session
    const storedUsername = sessionStorage.getItem('userId');
    if (storedUsername) {
      this.currentUsername = storedUsername;
    }
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // DATA LOADING
  // ============================================
  loadDashboardData(): void {
    this.isLoading = true;

    this.http.get<VisaManProfile>(`${this.API_URL}/visa-man/username/${this.currentUsername}`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        }),
        catchError(err => {
          console.error('Failed to load visa manager data:', err);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.visaManProfile = response;
          this.students = response.students || [];
          this.calculateStats();
          this.animateStats();
        }
        this.cdr.detectChanges();
      });
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.loadDashboardData();
  }

  // ============================================
  // STATS CALCULATION
  // ============================================
  calculateStats(): void {
    this.stats = {
      pendingApplications: this.students.filter(s => s.action === 'NEED_APPLY_VISA').length,
      awaitingPassport: this.students.filter(s => s.action === 'NEED_SUBMIT_PASSPORT_TO_EMBASSY').length,
      atEmbassy: this.students.filter(s => s.applicationStatus === 'PASSPORT_SUBMITTED_TO_EMBASSY').length,
      visasIssued: this.students.filter(s => s.applicationStatus === 'VISA_STAMPED').length
    };
  }

  animateStats(): void {
    this.animateCounter('pendingApplications', this.stats.pendingApplications);
    this.animateCounter('awaitingPassport', this.stats.awaitingPassport);
    this.animateCounter('atEmbassy', this.stats.atEmbassy);
    this.animateCounter('visasIssued', this.stats.visasIssued);
  }

  animateCounter(key: keyof typeof this.displayStats, target: number, duration: number = 1500): void {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      this.displayStats[key] = Math.floor(current);
      this.cdr.detectChanges();
    }, 16);
  }

  // ============================================
  // FILTERING
  // ============================================
  get actionRequiredStudents(): Student[] {
    return this.filterBySearch(
      this.students.filter(s => s.actionOnUser === 'visa_manager')
    );
  }

  get pipelineStudents(): Student[] {
    return this.filterBySearch(this.students);
  }

  get allFilteredStudents(): Student[] {
    return this.filterBySearch(this.students);
  }

  filterBySearch(list: Student[]): Student[] {
    if (!this.searchQuery.trim()) return list;
    const q = this.searchQuery.toLowerCase();
    return list.filter(s =>
      s.fullName?.toLowerCase().includes(q) ||
      s.applicationId?.toLowerCase().includes(q) ||
      s.telexNumber?.toLowerCase().includes(q) ||
      s.passportNo?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }

  // Pipeline Stage Filters
  get feePendingStudents(): Student[] {
    return this.students.filter(s =>
      s.action === 'REQUEST_FOR_VISA_PAYMENT_TO_ACCOUNTANT' ||
      s.applicationStatus === 'VISA_PAYMENT_REQUESTED'
    );
  }

  get visaAppliedStudents(): Student[] {
    return this.students.filter(s =>
      s.applicationStatus === 'VISA_APPLIED' ||
      s.action === 'NEED_SUBMIT_PASSPORT_TO_EMBASSY'
    );
  }

  get atEmbassyStudents(): Student[] {
    return this.students.filter(s =>
      s.applicationStatus === 'PASSPORT_SUBMITTED_TO_EMBASSY'
    );
  }

  get visaIssuedStudents(): Student[] {
    return this.students.filter(s =>
      s.applicationStatus === 'VISA_STAMPED'
    );
  }

  // ============================================
  // NAVIGATION
  // ============================================
  setActiveSection(section: 'dashboard' | 'actions' | 'pipeline' | 'students' | 'funds'): void {
    this.activeSection = section;
    this.sidebarOpen = false;
    if (section === 'funds') {
      this.loadMyRequests();
    }
    this.cdr.detectChanges();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.cdr.detectChanges();
  }

  // ============================================
  // ACTIONS - API CALLS
  // ============================================

  // ============================================
  // PAYMENT REQUEST MODAL
  // ============================================
  openPaymentModal(student: Student): void {
    this.paymentStudent = student;
    this.paymentAmount = null;
    this.paymentCurrency = 'INR';
    this.paymentError = '';
    this.showPaymentModal = true;
    this.cdr.detectChanges();
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.paymentStudent = null;
    this.paymentAmount = null;
    this.paymentError = '';
    this.cdr.detectChanges();
  }

  submitPaymentRequest(): void {
    // Validate
    if (!this.paymentAmount || this.paymentAmount <= 0) {
      this.paymentError = 'Please enter a valid amount';
      return;
    }
    if (!this.paymentCurrency) {
      this.paymentError = 'Please select a currency';
      return;
    }
    if (!this.paymentStudent) {
      this.paymentError = 'No student selected';
      return;
    }

    this.paymentError = '';
    this.processingId = this.paymentStudent.id;

    const payload = {
      visaManUsername: this.currentUsername,
      amount: this.paymentAmount,
      currency: this.paymentCurrency
    };

    this.http.post(`${this.API_URL}/visa/request-payment/${this.paymentStudent.id}`, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingId = null;
          this.cdr.detectChanges();
        }),
        catchError(err => {
          console.error('Failed to request payment:', err);
          this.paymentError = 'Failed to submit payment request. Please try again.';
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          const currencySymbol = this.currencies.find(c => c.code === this.paymentCurrency)?.symbol || '';
          this.closePaymentModal();
          this.showSuccess(`Payment request of ${currencySymbol}${this.paymentAmount} ${this.paymentCurrency} sent for ${this.paymentStudent?.fullName}`);
          this.refreshData();
        }
      });
  }

  // Request Payment from Accountant (opens modal)
  requestPayment(student: Student): void {
    this.openPaymentModal(student);
  }

  // Apply for Visa
  applyForVisa(student: Student): void {
    this.processingId = student.id;

    const payload = { managerUsername: this.currentUsername };

    this.http.post(`${this.API_URL}/visa/apply/${student.id}`, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingId = null;
          this.cdr.detectChanges();
        }),
        catchError(err => {
          console.error('Failed to apply for visa:', err);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.showSuccess(`Visa application submitted for ${student.fullName}`);
          this.refreshData();
        }
      });
  }

  // Submit Passport to Embassy
  submitToEmbassy(student: Student): void {
    this.processingId = student.id;

    const payload = { managerUsername: this.currentUsername };

    this.http.post(`${this.API_URL}/visa/passport-submitted/${student.id}`, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingId = null;
          this.cdr.detectChanges();
        }),
        catchError(err => {
          console.error('Failed to submit passport:', err);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.showSuccess(`Passport submitted to embassy for ${student.fullName}`);
          this.refreshData();
        }
      });
  }

  // Mark Visa Stamped
  markVisaStamped(student: Student): void {
    this.processingId = student.id;

    const payload = { managerUsername: this.currentUsername };

    this.http.post(`${this.API_URL}/visa/stamped/${student.id}`, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingId = null;
          this.cdr.detectChanges();
        }),
        catchError(err => {
          console.error('Failed to mark visa stamped:', err);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.showSuccess(`Visa successfully issued for ${student.fullName}! 🎉`);
          this.refreshData();
        }
      });
  }

  // ============================================
  // MODALS
  // ============================================
  openDetailModal(student: Student): void {
    this.selectedStudent = student;
    this.showDetailModal = true;
    this.cdr.detectChanges();
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    setTimeout(() => {
      this.selectedStudent = null;
      this.cdr.detectChanges();
    }, 200);
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  openLogoutModal(): void {
    this.showLogoutModal = true;
    this.cdr.detectChanges();
  }

  closeLogoutModal(): void {
    this.showLogoutModal = false;
    this.cdr.detectChanges();
  }

  // ============================================
  // LOGOUT
  // ============================================
  confirmLogout(): void {
    sessionStorage.clear();
    this.router.navigate(['/admin-login']);
  }

  // ============================================
  // HELPERS
  // ============================================
  getImageUrl(path: string | undefined): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.API_URL.replace('/api', '')}/${path}`;
  }

  getInitials(name: string): string {
    if (!name) return 'N/A';
    return name.split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  getStatusClass(status: string): string {
    if (!status) return 'pending';

    const statusLower = status.toLowerCase();

    if (statusLower.includes('stamped') || statusLower.includes('approved') || statusLower.includes('completed')) {
      return 'success';
    }
    if (statusLower.includes('submitted') || statusLower.includes('embassy')) {
      return 'gold';
    }
    if (statusLower.includes('applied') || statusLower.includes('processing')) {
      return 'processing';
    }
    return 'pending';
  }

  formatStatus(status: string): string {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  formatAction(action: string): string {
    if (!action) return 'No Action Required';

    const actionMap: { [key: string]: string } = {
      'NEED_APPLY_VISA': 'Apply for Visa',
      'NEED_SUBMIT_PASSPORT_TO_EMBASSY': 'Submit Passport to Embassy',
      'NEED_TO_ISSUE_VISA': 'Mark Visa Stamped',
      'REQUEST_FOR_VISA_PAYMENT_TO_ACCOUNTANT': 'Request Payment'
    };

    return actionMap[action] || action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  getActionButton(student: Student): { label: string; action: () => void; icon: string } | null {
    switch (student.action) {
      case 'NEED_APPLY_VISA':
        return { label: 'Apply for Visa', action: () => this.applyForVisa(student), icon: '🎫' };
      case 'NEED_SUBMIT_PASSPORT_TO_EMBASSY':
        return { label: 'Submit to Embassy', action: () => this.submitToEmbassy(student), icon: '📤' };
      case 'NEED_TO_ISSUE_VISA':
        return { label: 'Mark Visa Stamped', action: () => this.markVisaStamped(student), icon: '✅' };
      case 'REQUEST_FOR_VISA_PAYMENT_TO_ACCOUNTANT':
        return { label: 'Request Payment', action: () => this.requestPayment(student), icon: '💳' };
      default:
        return null;
    }
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Open passport document in new tab
  openPassportDocument(path: string | undefined): void {
    if (!path) return;
    const url = `http://localhost:8080/${path}`;
    window.open(url, '_blank');
  }

  // Format date for display
  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  // ============================================
  // FUND REQUESTS (Ported from DocPerson)
  // ============================================
  fundRequestForm = {
    amount: null,
    purpose: '',
    paymentMode: 'UPI',
    upiId: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: '',
    bankDetails: '',
    qrCodeBase64: ''
  };
  qrCodePreview: string | ArrayBuffer | null = null;
  myFundRequests: any[] = [];
  isFundSubmitting: boolean = false;

  // History Modal State
  showHistoryModal: boolean = false;
  selectedHistoryRequest: any = null;
  showFundRequestModal: boolean = false;

  openHistoryModal(req: any): void {
    this.selectedHistoryRequest = req;
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.selectedHistoryRequest = null;
  }

  getPendingAmount(req: any): number {
    return (req.remainingAmount !== undefined) ? req.remainingAmount : Math.max(0, (req.requestedAmount || 0) - (req.amountPaid || 0));
  }

  isQrUploading: boolean = false;

  onQrCodeSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Max 5MB allowed.');
        return;
      }

      this.isQrUploading = true;
      this.resizeImage(file, 800, 800).then(
        (resizedBase64: string) => {
          this.qrCodePreview = resizedBase64;
          this.fundRequestForm.qrCodeBase64 = resizedBase64;
          this.isQrUploading = false;
          this.cdr.detectChanges();
        },
        (err) => {
          console.error('Image resize error', err);
          alert('Failed to process image.');
          this.isQrUploading = false;
          this.cdr.detectChanges();
        }
      );
    }
  }

  private resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const elem = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
          elem.width = width;
          elem.height = height;
          const ctx = elem.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(elem.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  }

  submitFundRequest(): void {
    if (!this.fundRequestForm.amount || !this.fundRequestForm.purpose) {
      alert('Please fill in amount and purpose.');
      return;
    }

    let detailsString = '';

    if (this.fundRequestForm.paymentMode === 'UPI') {
      if (!this.fundRequestForm.upiId) {
        alert('Please enter UPI ID.');
        return;
      }
      detailsString = `UPI ID: ${this.fundRequestForm.upiId}`;
    } else {
      if (!this.fundRequestForm.accountNumber || !this.fundRequestForm.accountHolderName || !this.fundRequestForm.ifscCode || !this.fundRequestForm.branchName) {
        alert('Please fill all bank details.');
        return;
      }
      if (this.fundRequestForm.accountNumber !== this.fundRequestForm.confirmAccountNumber) {
        alert('Account numbers do not match.');
        return;
      }
      detailsString = `Bank Transfer
Account Holder: ${this.fundRequestForm.accountHolderName}
Account No: ${this.fundRequestForm.accountNumber}
IFSC: ${this.fundRequestForm.ifscCode}
Branch: ${this.fundRequestForm.branchName}`;
    }

    const request: PaymentRequest = {
      requesterUsername: this.currentUsername,
      requesterFullName: this.visaManProfile?.fullName || this.currentUsername,
      requesterRole: 'VisaMan',
      purpose: this.fundRequestForm.purpose,
      requestedAmount: this.fundRequestForm.amount,
      requesterPaymentMode: this.fundRequestForm.paymentMode,
      bankDetails: detailsString,
      qrCode: this.fundRequestForm.qrCodeBase64
    };

    this.isFundSubmitting = true;
    this.paymentRequestService.createRequest(request)
      .subscribe({
        next: (res) => {
          this.isFundSubmitting = false;
          this.showSuccess('Fund request submitted successfully!');
          this.resetFundForm();
          this.loadMyRequests();
        },
        error: (err) => {
          this.isFundSubmitting = false;
          console.error('Error submitting fund request', err);
          this.showSuccess('Failed to submit request.');
        }
      });
  }

  resetFundForm(): void {
    this.fundRequestForm = {
      amount: null,
      purpose: '',
      paymentMode: 'UPI',
      upiId: '',
      accountNumber: '',
      confirmAccountNumber: '',
      accountHolderName: '',
      ifscCode: '',
      branchName: '',
      bankDetails: '',
      qrCodeBase64: ''
    };
    this.qrCodePreview = null;
  }

  loadMyRequests(): void {
    this.isLoading = true;
    this.paymentRequestService.getRequestsByUsername(this.currentUsername)
      .subscribe({
        next: (requests) => {
          this.myFundRequests = requests;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading fund requests', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  getFundStatusClass(status: string | undefined): string {
    if (!status) return 'status-default';
    switch (status) {
      case 'PENDING': return 'status-warning';
      case 'PAID': return 'status-success';
      case 'PARTIAL': return 'status-info';
      case 'REJECTED': return 'status-danger';
      default: return 'status-default';
    }
  }

  // Count of paid or partially paid fund requests
  get paidFundRequestsCount(): number {
    return this.myFundRequests.filter(r => r.status === 'PAID' || r.status === 'PARTIAL').length;
  }
}