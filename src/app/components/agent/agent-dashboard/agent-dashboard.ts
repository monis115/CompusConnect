import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AdminAuthService } from '../../../services/admin-auth-service';
import { AgentService, AgentData, Student, College, Location as AgentLocation, DashboardStats, StatusBreakdown, DashboardActivity } from '../../../services/agent.service';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TelexApplicationService } from '../../../services/telex-application.service';
import { TelexApplicationDTO } from '../../../models/telex-application.model';
import { environment } from '../../../../environments/environment';
import { FileService } from '../../../services/file.service';

// --- Updated Enum based on your provided list ---
export enum StudentStatus {
  REGISTERED = 'REGISTERED',
  CONDITIONAL_OFFER_LETTER_GENERATED = 'CONDITIONAL_OFFER_LETTER_GENERATED',
  PENDING_ADMISSION_LETTER = 'PENDING_ADMISSION_LETTER',
  ADMISSION_LETTER_GENERATED = 'ADMISSION_LETTER_GENERATED',
  ADMISSION_LETTER_APPROVED = 'ADMISSION_LETTER_APPROVED',

  APPLIED_FOR_TELEX = 'APPLIED_FOR_TELEX',
  TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY = 'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY',
  TELEX_APPLICATION_SUBMITTED_TO_MEA = 'TELEX_APPLICATION_SUBMITTED_TO_MEA',
  TELEX_NUMBER_ISSUED = 'TELEX_NUMBER_ISSUED',

  VISA_FEE_PENDING = 'VISA_FEE_PENDING',
  VISA_FEE_RECEIVED = 'VISA_FEE_RECEIVED',
  VISA_APPLIED = 'VISA_APPLIED',
  PASSPORT_SUBMITTED_TO_EMBASSY = 'PASSPORT_SUBMITTED_TO_EMBASSY',
  VISA_STAMPED = 'VISA_STAMPED',

  READY_FOR_TRAVEL = 'READY_FOR_TRAVEL',
  REJECTED = 'REJECTED'
}

// Telex Form Data Interface
interface TelexFormData {
  passportValidationDate: string;
  telexPaymentAmount: number | null;
  telexPaymentTxId: string;
  passportNumber: string;
}

// News Item Interface
interface NewsItem {
  id: number;
  activeFrom: string;
  tillDate: string;
  heading: string;
  content: string;
  tag: string;
  username: string;
  forUser: string;
  createdAt: string;
  updatedAt: string | null;
  active: boolean;
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

@Component({
  selector: 'app-agent-dashboard',
  standalone: false,
  templateUrl: './agent-dashboard.html',
  styleUrls: ['./agent-dashboard.css'],
  animations: [listAnimation]
})
export class AgentDashboard implements OnInit {
  public readonly StudentStatus = StudentStatus;

  // --- View State ---
  currentView: 'dashboard' | 'students' | 'register' | 'profile' | 'student-detail' | 'action' | 'in-process' | 'visa-stamped' | 'reports' | 'payments' | 'messages' = 'dashboard';
  isLoading = true;
  isRefreshing = false;
  isReloadingData = false; // For floating button
  isSidebarCollapsed = false;
  error: string | null = null;

  // --- Data ---
  agentData: AgentData | null = null;
  students: Student[] = [];
  selectedStudent: Student | null = null;

  // --- News Data ---
  newsItems: NewsItem[] = [];
  isNewsModalOpen = false;

  // --- Stats & Widgets ---
  stats = { totalStudents: 0, pending: 0, approved: 0, completed: 0, rejected: 0 };

  // --- New Dashboard Data ---
  dashboardStats: DashboardStats | null = null;
  statusBreakdown: StatusBreakdown[] = [];
  recentActivities: DashboardActivity[] = [];

  dashboardTasks: any[] = [];
  collegeDistribution: any[] = [];

  // --- Filters ---
  searchQuery: string = '';
  statusFilter: string = 'all';

  // --- Modals ---
  isHistoryModalOpen = false;
  selectedStudentForHistory: any | null = null;

  // --- Telex Modal State ---
  isTelexModalOpen = false;

  isSuccessModalOpen = false;
  studentForTelex: Student | null = null;

  // --- Logout Confirmation Modal ---
  isLogoutModalOpen = false;

  // --- Logout Messages ---
  logoutMessages = [
    'Great work today! See you soon!',
    'You made a difference today! Rest well!',
    'Your dedication inspires us! Come back refreshed!',
    'Another day of excellence! Take care!',
    'Thank you for your amazing efforts! Until next time!',
    'You are a star! See you tomorrow!',
    'Mission accomplished! Time to recharge!',
    'Your hard work matters! Stay blessed!',
    'Take a moment to celebrate your wins! Bye for now!',
    'Goals achieved! You deserve a break!',
    'Your positive energy brightens our day! See you!',
    'Creativity and dedication - you have both! Rest up!',
    'Strong work ethic! Time to relax!',
    'Keep blooming! We appreciate you!',
    'You bring harmony to the team! Until next time!',
    'Champion mindset! Take a well-deserved break!',
    'Stars shine brighter because of people like you! Goodnight!',
    'Your transformation of students\' lives is beautiful! See you!',
    'You are precious to this team! Stay safe!'
  ];
  currentLogoutMessage = '';

  // --- Telex Form State ---
  telexForm!: FormGroup;
  currentStep = 1;
  totalSteps = 3;
  isSubmittingTelex = false;

  // File storage
  visaPhotoFile: File | null = null;
  visaPassportCopyFile: File | null = null;
  ttCopyFile: File | null = null;
  paymentConfirmationFile: File | null = null;
  visaPhotoPreviewUrl: string | ArrayBuffer | null = null;
  visaPassportCopyPreviewUrl: string | ArrayBuffer | null = null;
  isLoadingVisaPhoto = false;
  isLoadingPassportCopy = false;

  // --- Validation Modal State ---
  isValidationModalOpen = false;
  validationMessage = '';

  // --- Visa Payment Modal State ---
  showPaymentConfirmationModal = false;
  selectedPaymentStudent: any = null;
  paymentAmount: number = 0;
  paymentCurrency: string = 'USD';
  transactionId: string = '';
  confirmationFile: File | null = null;
  isSubmittingPayment = false;
  isPaymentSuccessModalOpen = false;

  // --- Toast State ---
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Standardized List of Visa Issuance Places
  visaIssuancePlaces: string[] = [
    'Vienna', 'Baku', 'Kabul', 'Brussels', 'London', 'Berlin', 'Cairo', 'Tel Aviv',
    'New-Delhi', 'Jakarta', 'Tehran', 'Madrid', 'Rome', 'Almaty', 'Beijing', 'Riyadh',
    'Kuwait', 'Bishkek', 'Riga', 'Kuala Lumpur', 'Abu Dhabi', 'Islamabad', 'Warsaw',
    'Moscow', 'Singapore', 'Washington', 'Dushanbe', 'Ashkhabad', 'Ankara', 'Kiev',
    'Paris', 'Seoul', 'Tokyo', 'Athens', 'Bangkok', 'Jeddah', 'Dubai', 'Novosibirsk',
    'New-York', 'Istanbul', 'Shanghai', 'Frankfurt am Main', 'Mazare-Sharif',
    'Tashkent (Airport)', 'Tashkent (MFA)', 'Termez', 'Samarkand', 'Bukhara',
    'Urgench', 'Nukus', 'Saint-Petersburg', 'Minsk', 'Astana', 'Vladivostok',
    'Ekaterinburg', 'Kazan', 'Muscat', 'Rostov on Don', 'Aktau', 'Guangzhou',
    'Stockholm', 'Budapest', 'Qatar', 'Fergana (Airport)', 'Osh'
  ].sort();

  // Countries by Continent
  countriesByContinent = [
    {
      continent: 'Africa',
      countries: [
        'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde (Cape Verde)', 'Cameroon',
        'Central African Republic', 'Chad', 'Comoros', 'Congo, Democratic Republic of the', 'Congo, Republic of the',
        "Côte d'Ivoire (Ivory Coast)", 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini (formerly Swaziland)',
        'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya',
        'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
        'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan',
        'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'
      ]
    },
    {
      continent: 'Asia',
      countries: [
        'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei', 'Cambodia', 'China', 'Cyprus',
        'Georgia', 'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan',
        'Laos', 'Lebanon', 'Malaysia', 'Maldives', 'Mongolia', 'Myanmar (Burma)', 'Nepal', 'North Korea', 'Oman', 'Pakistan',
        'Palestine', 'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea', 'Sri Lanka', 'Syria', 'Tajikistan',
        'Thailand', 'Timor-Leste (East Timor)', 'Turkey (Türkiye)', 'Turkmenistan', 'United Arab Emirates (UAE)', 'Uzbekistan',
        'Vietnam', 'Yemen'
      ]
    },
    {
      continent: 'Europe',
      countries: [
        'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia',
        'Czechia (Czech Republic)', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Holy See (Vatican City)',
        'Hungary', 'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova',
        'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia',
        'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom'
      ]
    },
    {
      continent: 'North America',
      countries: [
        'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Canada', 'Costa Rica', 'Cuba', 'Dominica',
        'Dominican Republic', 'El Salvador', 'Grenada', 'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua',
        'Panama', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago',
        'United States of America'
      ]
    },
    {
      continent: 'Oceania',
      countries: [
        'Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru', 'New Zealand', 'Palau',
        'Papua New Guinea', 'Samoa', 'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu'
      ]
    },
    {
      continent: 'South America',
      countries: [
        'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana', 'Paraguay', 'Peru', 'Suriname',
        'Uruguay', 'Venezuela'
      ]
    }
  ];

  // Courier Partners List
  courierPartners = [
    {
      category: 'International',
      partners: ['DHL Express', 'FedEx', 'UPS', 'Aramex', 'USPS']
    },
    {
      category: 'Indian Domestic',
      partners: ['Blue Dart', 'Delhivery', 'DTDC', 'Gati', 'Xpressbees', 'Ecom Express', 'Shadowfax', 'India Post']
    },
    {
      category: 'Aggregators (All-in-One)',
      partners: ['Shiprocket', 'NimbusPost', 'ClickPost', 'Pickrr']
    }
  ];

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private authService: AdminAuthService,
    private agentService: AgentService,
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private telexService: TelexApplicationService,
    private fileService: FileService
  ) { }

  private readonly API_URL = environment.apiUrl + '/api';

  showToastMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  ngOnInit(): void {
    this.loadAgentData();
    this.fetchNews();
  }

  // --- Core Data Loading ---


  refreshDashboard(): void {
    this.isReloadingData = true;
    this.cdr.detectChanges();

    // 1.9 second delay as requested
    setTimeout(() => {
      this.loadAgentData();
    }, 1900);
  }

  // --- Data Loading Internal ---
  private loadDataInternal(username: string): void {
    this.agentService.getAgentProfile(username).subscribe({
      next: (data: AgentData) => {
        this.agentData = data;
        this.students = data.student || [];

        this.calculateStats();
        this.generateDashboardTasks();
        this.generateCollegeDistribution();

        // Fetch new dashboard data
        this.fetchDashboardData(username);

        this.isLoading = false;
        this.isRefreshing = false;
        this.isReloadingData = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch agent profile:', err);
        this.error = 'Failed to load data.';
        this.isLoading = false;
        this.isRefreshing = false;
        this.isReloadingData = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadAgentData(): void {
    // If it's a full reload (not refresh), show main loader
    if (!this.isReloadingData && !this.isRefreshing) {
      this.isLoading = true;
    }
    this.cdr.detectChanges();

    const authUser = this.authService.getUserData();

    if (authUser && authUser.username) {
      this.loadDataInternal(authUser.username);
    } else {
      this.error = 'Not authenticated.';
      this.isLoading = false;
      this.isReloadingData = false;
      this.cdr.detectChanges();
    }
  }

  fetchDashboardData(username: string): void {
    this.agentService.getDashboardStats(username).subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch dashboard stats', err)
    });

    this.agentService.getStatusBreakdown(username).subscribe({
      next: (breakdown) => {
        this.statusBreakdown = breakdown;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch status breakdown', err)
    });

    this.agentService.getRecentActivities(username).subscribe({
      next: (activities) => {
        this.recentActivities = activities;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch recent activities', err)
    });
  }

  // --- Fetch News ---
  fetchNews(): void {
    this.http.get<NewsItem[]>(environment.apiUrl + '/api/news').subscribe({
      next: (news) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day

        // Filter news by active status and date range
        this.newsItems = news.filter(item => {
          if (!item.active) return false;

          const activeFrom = new Date(item.activeFrom);
          const tillDate = new Date(item.tillDate);
          activeFrom.setHours(0, 0, 0, 0);
          tillDate.setHours(23, 59, 59, 999); // End of day

          return today >= activeFrom && today <= tillDate;
        });

        // Sort by createdAt (most recent first)
        this.newsItems.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch news', err)
    });
  }

  // Get note color class based on index
  getNoteColorClass(index: number): string {
    const colors = ['note-blue', 'note-green', 'note-amber', 'note-purple', 'note-pink'];
    return colors[index % colors.length];
  }

  // Format date for display
  formatNewsDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Get icon for news based on tag
  getNewsIcon(tag: string): string {
    switch (tag?.toLowerCase()) {
      case 'admission':
        return 'clock';
      case 'general':
        return 'info';
      case 'holiday':
        return 'calendar';
      case 'visa':
        return 'stamp';
      default:
        return 'document';
    }
  }

  // Format tag for display
  formatTag(tag: string): string {
    return tag ? tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase() : 'General';
  }

  // --- Logic ---
  calculateStats(): void {
    if (!this.students) return;
    this.stats.totalStudents = this.students.length;
    this.stats.pending = this.students.filter(s =>
      ['REGISTERED', 'PENDING_ADMISSION_LETTER'].includes(s.applicationStatus)
    ).length;
    this.stats.approved = this.students.filter(s =>
      ['VISA_STAMPED', 'ADMISSION_LETTER_APPROVED', 'TELEX_NUMBER_ISSUED'].includes(s.applicationStatus)
    ).length;
    this.stats.completed = this.students.filter(s => s.applicationStatus === 'READY_FOR_TRAVEL').length;
    this.stats.rejected = this.students.filter(s => s.applicationStatus === 'REJECTED').length;
  }

  getDocReturnEligibleStudents(): Student[] {
    if (!this.students) return [];
    return this.students.filter(s =>
      s.applicationStatus === 'VISA_STAMPED' && s.canRequestDocReturn === true
    );
  }

  generateDashboardTasks(): void {
    // Show students where Action is required by Agent or those with ADMISSION_LETTER_APPROVED status
    // EXCLUDING those eligible for Doc Return (displayed in separate section)
    this.dashboardTasks = this.students
      .filter(s => {
        const isDocReturnEligible = s.applicationStatus === 'VISA_STAMPED' && s.canRequestDocReturn === true;
        if (isDocReturnEligible) return false;

        return (
          s['actionOnUser'] === 'AGENT' ||
          s['actionOnUser'] === 'agent' ||
          s.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED ||
          (s['action'] === 'INITIATE_TELEX' && s['actionOnUser'] === 'agent') ||
          (s['action'] === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT' && (s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT'))
        );
      })
      .sort((a, b) => {
        // Sort by registration date (latest first)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 10); // Show top 10 action items
  }

  generateCollegeDistribution(): void {
    // Use agent's collegeAccess to show all colleges the agent has access to
    // along with the student count for each college
    if (!this.agentData?.collegeAccess) return;

    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    this.collegeDistribution = this.agentData.collegeAccess.map((access: any, idx: number) => {
      const collegeName = access.college?.collegeName || 'Unknown College';
      // Count students enrolled in this college
      const studentCount = this.students.filter(s =>
        s.college?.id === access.college?.id ||
        s.college?.collegeName === collegeName
      ).length;

      return {
        collegeName: collegeName,
        count: studentCount,
        color: colors[idx % colors.length]
      };
    });
  }

  // --- Navigation & Views ---
  navigateTo(view: any): void {
    this.currentView = view;
    if (view !== 'student-detail') this.selectedStudent = null;
    this.cdr.detectChanges();
  }

  viewStudentDetails(student: Student): void {
    this.selectedStudent = student;
    this.currentView = 'student-detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  get filteredStudents(): Student[] {
    let filtered = this.students;

    // 1. View Filtering
    if (this.currentView === 'visa-stamped') {
      filtered = filtered.filter(s => s.applicationStatus === 'VISA_STAMPED');
    } else if (this.currentView === 'action') {
      // Show students where Action is required by Agent or those with ADMISSION_LETTER_APPROVED status
      filtered = filtered.filter(s =>
        s['actionOnUser'] === 'AGENT' ||
        s['actionOnUser'] === 'agent' ||
        s.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED ||
        (s['action'] === 'INITIATE_TELEX' && s['actionOnUser'] === 'agent')
      );
    } else if (this.currentView === 'in-process') {
      // "put all student in m process section" - User Request
      // We will show all students here as requested, but EXCLUDE VISA_STAMPED
      filtered = this.students.filter(s => s.applicationStatus !== 'VISA_STAMPED');
    }

    // 2. Search Filtering
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.fullName.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.college?.collegeName || '').toLowerCase().includes(query)
      );
    }

    // 3. Sort by registration date (createdAt) - Latest first
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (latest first)
    });

    return filtered;
  }

  getViewTitle(): string {
    switch (this.currentView) {
      case 'dashboard': return 'Dashboard';
      case 'students': return 'All Students';
      case 'in-process': return 'In Process';
      case 'visa-stamped': return 'Visa Stamped';
      case 'action': return 'Action Required';
      case 'reports': return 'Reports';
      case 'payments': return 'Payments';
      case 'register': return 'Register New';
      case 'profile': return 'My Profile';
      case 'messages': return 'Messages';
      default: return 'Dashboard';
    }
  }

  // --- Helper Methods ---
  getStatusColor(status: string): string {
    if (!status) return '#64748B';
    if (status.includes('APPROVED') || status.includes('STAMPED') || status === 'READY_FOR_TRAVEL') return '#10B981';
    if (status.includes('PENDING') || status.includes('REGISTERED')) return '#F59E0B';
    if (status.includes('REJECTED')) return '#EF4444';
    if (status.includes('TELEX') || status.includes('VISA')) return '#6366F1';
    return '#64748B';
  }

  formatStatus(status: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  }

  getCurrentDate(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date().toLocaleDateString('en-US', options);
  }

  // --- Additional Stats Methods ---
  getAllStudentsCount(): number {
    return this.students ? this.students.length : 0;
  }

  getActionRequiredCount(): number {
    return this.dashboardTasks ? this.dashboardTasks.length : 0;
  }

  getMessagesCount(): number {
    return 0; // Placeholder
  }

  getInProcessCount(): number {
    return this.students ? this.students.filter(s => s.applicationStatus !== 'VISA_STAMPED').length : 0;
  }

  getVisaStampedCount(): number {
    return this.students.filter(s => s.applicationStatus === 'VISA_STAMPED').length;
  }

  getTelexPendingCount(): number {
    return this.students.filter(s =>
      s.applicationStatus === 'ADMISSION_LETTER_APPROVED' ||
      s.applicationStatus === 'APPLIED_FOR_TELEX'
    ).length;
  }

  getDocsPendingCount(): number {
    return this.students.filter(s =>
      s.applicationStatus === 'REGISTERED' ||
      s.applicationStatus === 'PENDING_ADMISSION_LETTER'
    ).length;
  }

  getRejectedStudents(): Student[] {
    return this.students.filter(s => s.applicationStatus === 'REJECTED');
  }

  // --- TELEX OPERATIONS ---
  showInitiateTelexButton(student: any): boolean {
    // Check if action field indicates INITIATE_TELEX
    if (student.action === 'INITIATE_TELEX' && student.actionOnUser === 'agent') return true;
    // Fallback to status check
    if (student.applicationStatus === StudentStatus.ADMISSION_LETTER_APPROVED) return true;
    return false;
  }





  // --- History & Docs ---
  openTelexModal(student: Student): void {
    this.studentForTelex = student;
    this.currentStep = 1;
    this.initTelexForm();
    this.prefillData(student);
    this.isTelexModalOpen = true;
    this.cdr.detectChanges();
  }

  initTelexForm(): void {
    this.telexForm = this.fb.group({
      // Step 1: Document Dispatch Confirmation
      originalDocsSent: [null, Validators.required],
      docDeliveryMethod: [null],
      courierPartner: [null], // Changed to null for dropdown
      otherCourierDetails: [''], // New field for 'Other'
      courierTrackingNumber: [''],
      courierTrackingId: [''],
      selfPersonContact: [''],
      docTentativeReachDate: [null],

      // Step 2: Payment Status
      hasPaid: [null, Validators.required],
      paidAmount: [null],
      paidTo: [null],
      paymentType: [null],
      paymentDueDate: [null],

      // Step 2: Personal Details (Mandatory)
      surname: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      sex: ['', Validators.required],
      countryOfBirth: ['India', Validators.required],
      dateOfBirth: ['', Validators.required],
      placeOfBirth: ['', Validators.required],
      maritalStatus: ['SINGLE', Validators.required],
      citizenship: ['India', Validators.required],
      previousCitizenship: [null],
      passportType: ['ORDINARY', Validators.required],
      passportNumber: ['', Validators.required],
      passportIssueDate: ['', Validators.required],
      passportExpirationDate: ['', Validators.required],

      // New Fields & Removed IssuedBy
      durationOfVisaProcedure: [null, Validators.required],
      placeOfVisaIssuance: [null, Validators.required],
    });
    this.setupConditionalValidation();
  }

  setupConditionalValidation(): void {
    // Document Tracking Logic
    // Document Tracking Logic
    this.telexForm.get('originalDocsSent')?.valueChanges.subscribe(sent => {
      const methodControl = this.telexForm.get('docDeliveryMethod');
      const dateControl = this.telexForm.get('docTentativeReachDate');
      const partnerControl = this.telexForm.get('courierPartner');
      const trackingNumControl = this.telexForm.get('courierTrackingNumber');
      const contactControl = this.telexForm.get('selfPersonContact');

      if (sent === true || sent === 'true') {
        methodControl?.setValidators(Validators.required);
        dateControl?.setValidators(Validators.required);
      } else {
        methodControl?.clearValidators();
        methodControl?.setValue(null);

        // Also clear children of method
        partnerControl?.clearValidators();
        trackingNumControl?.clearValidators();
        contactControl?.clearValidators();
        partnerControl?.setValue('');
        trackingNumControl?.setValue('');
        contactControl?.setValue('');

        dateControl?.clearValidators(); // Changed from setValidators(Validators.required)
        dateControl?.setValue(null); // Added
      }
      methodControl?.updateValueAndValidity();
      dateControl?.updateValueAndValidity();
      partnerControl?.updateValueAndValidity();
      trackingNumControl?.updateValueAndValidity();
      contactControl?.updateValueAndValidity();
    });

    this.telexForm.get('docDeliveryMethod')?.valueChanges.subscribe(method => {
      const partnerControl = this.telexForm.get('courierPartner');
      const otherPartnerControl = this.telexForm.get('otherCourierDetails'); // New
      const trackingNumControl = this.telexForm.get('courierTrackingNumber');
      const contactControl = this.telexForm.get('selfPersonContact');

      if (method === 'COURIER') {
        partnerControl?.setValidators(Validators.required);
        trackingNumControl?.setValidators(Validators.required);
        contactControl?.clearValidators();
        contactControl?.setValue('');
      } else if (method === 'SELF_PERSON') {
        contactControl?.setValidators(Validators.required);
        partnerControl?.clearValidators();
        otherPartnerControl?.clearValidators(); // Clear other
        trackingNumControl?.clearValidators();
        partnerControl?.setValue(null); // Reset select
        otherPartnerControl?.setValue('');
        trackingNumControl?.setValue('');
      } else {
        partnerControl?.clearValidators();
        otherPartnerControl?.clearValidators();
        trackingNumControl?.clearValidators();
        contactControl?.clearValidators();
        partnerControl?.setValue(null);
        otherPartnerControl?.setValue('');
        trackingNumControl?.setValue('');
        contactControl?.setValue('');
      }
      partnerControl?.updateValueAndValidity();
      otherPartnerControl?.updateValueAndValidity();
      trackingNumControl?.updateValueAndValidity();
      contactControl?.updateValueAndValidity();
    });

    // Watch for "OTHER" selection in Courier Partner
    this.telexForm.get('courierPartner')?.valueChanges.subscribe(value => {
      const otherControl = this.telexForm.get('otherCourierDetails');
      if (value === 'OTHER') {
        otherControl?.setValidators(Validators.required);
      } else {
        otherControl?.clearValidators();
        otherControl?.setValue('');
      }
      otherControl?.updateValueAndValidity();
    });

    // Payment Logic
    this.telexForm.get('hasPaid')?.valueChanges.subscribe(paid => {
      const amountControl = this.telexForm.get('paidAmount');
      const paidToControl = this.telexForm.get('paidTo');
      const typeControl = this.telexForm.get('paymentType');
      const dueDateControl = this.telexForm.get('paymentDueDate');

      if (paid === true || paid === 'true') {
        amountControl?.setValidators(Validators.required);
        paidToControl?.setValidators(Validators.required);
        typeControl?.clearValidators();
        dueDateControl?.clearValidators();

        typeControl?.setValue(null);
        dueDateControl?.setValue(null);
      } else {
        amountControl?.clearValidators();
        paidToControl?.clearValidators();
        amountControl?.setValue(null);
        paidToControl?.setValue(null);

        typeControl?.setValidators(Validators.required);
        dueDateControl?.setValidators(Validators.required);
      }
      amountControl?.updateValueAndValidity();
      paidToControl?.updateValueAndValidity();
      typeControl?.updateValueAndValidity();
      dueDateControl?.updateValueAndValidity();
    });
  }

  // --- RETURN DOCUMENTS WORKFLOW ---
  isRequestDocsModalOpen = false;
  requestDocsForm!: FormGroup;
  selectedDocsStudent: Student | null = null;
  fileTicket: File | null = null;
  isSubmittingDocs = false;

  initRequestDocsForm(): void {
    this.requestDocsForm = this.fb.group({
      contactPersonName: ['', Validators.required],
      contactPhone: ['', Validators.required],
      alternativePhone: [''],
      addressWithZip: ['', Validators.required],
      needBeforeDate: [null],
      travelDate: [null],
      fromCountry: [''],
      fromAirport: [''],
      toCountry: [''],
      toAirport: [''],
      pnrNumber: ['']
    });
  }

  openRequestDocsModal(student: Student): void {
    this.selectedDocsStudent = student;
    this.fileTicket = null;
    this.initRequestDocsForm();
    this.isRequestDocsModalOpen = true;
    this.cdr.detectChanges();
  }

  closeRequestDocsModal(): void {
    this.isRequestDocsModalOpen = false;
    this.selectedDocsStudent = null;
    this.cdr.detectChanges();
  }

  showRequestDocsButton(student: Student): boolean {
    return student.applicationStatus === 'VISA_STAMPED' && student.canRequestDocReturn === true;
  }

  onTicketFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.showToastMessage('Only PDF files are allowed for tickets.', 'error');
        return;
      }
      this.fileTicket = file;
    }
  }

  submitRequestDocs(): void {
    if (this.requestDocsForm.invalid) {
      this.requestDocsForm.markAllAsTouched();
      this.showToastMessage('Please fill all required fields.', 'error');
      return;
    }

    if (!this.selectedDocsStudent) return;

    this.isSubmittingDocs = true;
    const formValue = this.requestDocsForm.value;

    // Construct FormData
    const formData = new FormData();
    const agentUsername = this.agentData?.userId || this.authService.getUserData()?.username || '';

    formData.append('agentUsername', agentUsername);
    formData.append('requestDetails', JSON.stringify(formValue));

    if (this.fileTicket) {
      formData.append('ticketPdf', this.fileTicket);
    }

    this.http.post(`${this.API_URL}/agents/request-docs/${this.selectedDocsStudent.id}`, formData)
      .subscribe({
        next: (res: any) => {
          this.isSubmittingDocs = false;
          this.showToastMessage('Document return request submitted successfully!', 'success');
          this.closeRequestDocsModal();
          this.refreshDashboard();
        },
        error: (err) => {
          this.isSubmittingDocs = false;
          console.error('Failed to submit doc return request', err);
          this.showToastMessage('Failed to submit request. Please try again.', 'error');
        }
      });
  }

  prefillData(student: Student): void {
    if (!student) return;

    this.telexForm.patchValue({
      firstName: student.fullName.split(' ')[0] || '',
      surname: student.fullName.split(' ').slice(1).join(' ') || '',
      passportNumber: student.passportNo || '',
      // Add other mappings as needed
    });
  }

  openHistoryModal(student: any): void {
    this.selectedStudentForHistory = student;
    this.isHistoryModalOpen = true;
    this.cdr.detectChanges();
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen = false;
    this.selectedStudentForHistory = null;
  }

  downloadFile(path: string | undefined): void {
    if (!path) {
      alert('File not found');
      return;
    }
    const url = this.fileService.getFileUrl(path);
    window.open(url, '_blank');
  }

  isLoggingOut = false;

  openLogoutModal(): void {
    this.isLogoutModalOpen = true;
    this.cdr.detectChanges();
  }

  cancelLogout(): void {
    this.isLogoutModalOpen = false;
    this.cdr.detectChanges();
  }

  confirmLogout(): void {
    this.isLogoutModalOpen = false;
    this.currentLogoutMessage = this.getRandomLogoutMessage();
    this.isLoggingOut = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.authService.logout();
      this.router.navigate(['/AdminLogin']);
    }, 2900);
  }

  logout(): void {
    this.openLogoutModal();
  }

  getRandomLogoutMessage(): string {
    const randomIndex = Math.floor(Math.random() * this.logoutMessages.length);
    return this.logoutMessages[randomIndex];
  }

  // --- Navigation ---
  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep++;
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  validateCurrentStep(): boolean {
    const controls = this.telexForm.controls;
    let isValid = true;
    let fieldsToValidate: string[] = [];

    if (this.currentStep === 1) {
      fieldsToValidate = ['originalDocsSent'];
      if (controls['originalDocsSent'].value === true) {
        fieldsToValidate.push('docDeliveryMethod', 'docTentativeReachDate');
        if (controls['docDeliveryMethod'].value === 'COURIER') {
          fieldsToValidate.push('courierPartner', 'courierTrackingNumber');
        } else if (controls['docDeliveryMethod'].value === 'SELF_PERSON') {
          fieldsToValidate.push('selfPersonContact');
        }
      } else {
        fieldsToValidate.push('docTentativeReachDate');
      }
    } else if (this.currentStep === 2) {
      fieldsToValidate = [
        'hasPaid', 'surname', 'firstName', 'sex', 'countryOfBirth',
        'dateOfBirth', 'placeOfBirth', 'maritalStatus', 'citizenship',
        'passportType', 'passportNumber', 'passportIssueDate',
        'passportExpirationDate', 'durationOfVisaProcedure', 'placeOfVisaIssuance'
      ];

      if (controls['hasPaid'].value === true) {
        fieldsToValidate.push('paidAmount', 'paidTo');
      } else {
        fieldsToValidate.push('paymentType', 'paymentDueDate');
      }
    }

    for (const field of fieldsToValidate) {
      const control = controls[field];
      if (control && control.invalid) {
        control.markAsTouched();
        isValid = false;
      }
    }

    // File validation for Step 2
    if (this.currentStep === 2) {
      if (!this.visaPhotoFile) {
        this.validationMessage = 'Visa Photo is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      } else if (!this.visaPassportCopyFile) {
        this.validationMessage = 'Passport Copy is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      } else if (controls['hasPaid'].value === true && controls['paidTo'].value === 'UNIVERSITY' && !this.ttCopyFile) {
        this.validationMessage = 'TT Copy is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      } else if (controls['hasPaid'].value === true && controls['paidTo'].value === 'COMPANY' && !this.paymentConfirmationFile) {
        this.validationMessage = 'Payment Confirmation is required.';
        this.isValidationModalOpen = true;
        isValid = false;
      }
    }

    return isValid;
  }

  goToStep(step: number): void {
    // Allow going back or to next immediate step
    if (step <= this.currentStep + 1) {
      this.currentStep = step;
    }
  }

  // --- File Handling ---
  onFileSelected(event: any, type: string): void {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const fileSizeKB = file.size / 1024;
      const fileSizeMB = fileSizeKB / 1024;

      let isValid = true;
      let errorMessage = '';

      switch (type) {
        case 'visaPhoto':
          if (fileSizeKB > 128) {
            isValid = false;
            errorMessage = 'Photo must be less than 128KB.';
          } else {
            this.visaPhotoFile = file;
            this.isLoadingVisaPhoto = true;
            this.cdr.detectChanges();
            // Create preview
            const reader = new FileReader();
            reader.onload = () => {
              this.visaPhotoPreviewUrl = reader.result;
              this.isLoadingVisaPhoto = false;
              this.cdr.detectChanges();
            };
            reader.onerror = () => {
              this.isLoadingVisaPhoto = false;
              this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);
          }
          break;
        case 'visaPassportCopy':
          if (fileSizeKB > 256) {
            isValid = false;
            errorMessage = 'Passport copy must be less than 256KB.';
          } else {
            this.visaPassportCopyFile = file;
            // Create preview for image files
            if (file.type.startsWith('image/')) {
              this.isLoadingPassportCopy = true;
              this.visaPassportCopyPreviewUrl = null; // Clear previous preview
              this.cdr.detectChanges();
              const reader = new FileReader();
              reader.onload = () => {
                this.visaPassportCopyPreviewUrl = reader.result;
                this.isLoadingPassportCopy = false;
                this.cdr.detectChanges();
              };
              reader.onerror = () => {
                this.isLoadingPassportCopy = false;
                this.cdr.detectChanges();
              };
              reader.readAsDataURL(file);
            } else {
              // PDF files - no preview
              this.visaPassportCopyPreviewUrl = null;
            }
          }
          break;
        case 'ttCopy':
          if (fileSizeMB > 5) {
            isValid = false;
            errorMessage = 'File must be less than 5MB.';
          } else {
            this.ttCopyFile = file;
          }
          break;
        case 'paymentConfirmation':
          if (fileSizeMB > 5) {
            isValid = false;
            errorMessage = 'File must be less than 5MB.';
          } else {
            this.paymentConfirmationFile = file;
          }
          break;
      }

      if (!isValid) {
        this.validationMessage = errorMessage;
        this.isValidationModalOpen = true;
        this.cdr.detectChanges();
        event.target.value = ''; // Clear the input
      }
    }
  }

  removeFile(type: string): void {
    switch (type) {
      case 'visaPhoto':
        this.visaPhotoFile = null;
        this.visaPhotoPreviewUrl = null;
        break;
      case 'visaPassportCopy':
        this.visaPassportCopyFile = null;
        this.visaPassportCopyPreviewUrl = null;
        break;
      case 'ttCopy':
        this.ttCopyFile = null;
        break;
      case 'paymentConfirmation':
        this.paymentConfirmationFile = null;
        break;
    }
  }

  closeValidationModal(): void {
    this.isValidationModalOpen = false;
    this.validationMessage = '';
    this.cdr.detectChanges();
  }

  closeNewsModal() {
    this.isNewsModalOpen = false;
  }

  // --- Referral Link Logic ---
  get referralLink(): string {
    if (!this.agentData || !this.agentData.userId) return '';
    const currentUrl = window.location.href;
    const basePath = currentUrl.split('/agent-dashboard')[0];
    return `${basePath}/apply/${this.agentData.userId}`;
  }

  copyReferralLink(): void {
    const link = this.referralLink;
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        // Find a way to show a toast, or simply alert for now
        alert('Referral link copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy link.');
      });
    }
  }

  closeTelexModal(): void {
    this.isTelexModalOpen = false;
    this.studentForTelex = null;
    this.currentStep = 1;
    this.telexForm.reset();
    this.visaPhotoFile = null;
    this.visaPhotoPreviewUrl = null;
    this.visaPassportCopyFile = null;
    this.visaPassportCopyPreviewUrl = null;
    this.ttCopyFile = null;
    this.paymentConfirmationFile = null;
  }

  // --- Submission ---
  submitTelexApplication(): void {
    if (!this.studentForTelex || !this.agentData) return;

    // Final Validation Check
    // Final Validation Check
    if (this.telexForm.invalid) {
      this.telexForm.markAllAsTouched();

      // Identify invalid fields for better feedback
      const invalidFields: string[] = [];
      const controls = this.telexForm.controls;
      for (const name in controls) {
        if (controls[name].invalid) {
          // Convert camelCase to Title Case for display
          const display = name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          invalidFields.push(display);
        }
      }

      this.validationMessage = `Please fill the following required fields: ${invalidFields.join(', ')}`;
      this.isValidationModalOpen = true;
      return;
    }

    this.isSubmittingTelex = true;
    this.cdr.detectChanges();

    const formValues = this.telexForm.value;

    // Handle Courier Partner mapping
    let finalCourierPartner = formValues.courierPartner;
    if (finalCourierPartner === 'OTHER') {
      finalCourierPartner = formValues.otherCourierDetails;
    }

    // Construct DTO
    const telexData: TelexApplicationDTO = {
      ...formValues,
      courierPartner: finalCourierPartner, // Use mapped value
      // Map form control 'courierTrackingNumber' to DTO 'courierTrackingId'
      courierTrackingId: formValues.courierTrackingNumber,
      agentUsername: this.agentData.userId
    };

    this.telexService.submitTelexApplication(
      this.studentForTelex.id,
      telexData,
      {
        visaPhoto: this.visaPhotoFile || undefined,
        visaPassportCopy: this.visaPassportCopyFile || undefined,
        ttCopy: this.ttCopyFile || undefined,
        paymentConfirmation: this.paymentConfirmationFile || undefined
      }
    ).subscribe({
      next: (res) => {
        this.isSubmittingTelex = false;
        this.onTelexSuccess();
      },
      error: (err) => {
        console.error('Submission Error', err);
        this.isSubmittingTelex = false;
        alert('Failed to submit application. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  onTelexSuccess(): void {
    this.isTelexModalOpen = false;
    this.studentForTelex = null;
    this.isSuccessModalOpen = true; // Ensure this is set to true
    this.cdr.detectChanges(); // Trigger change detection to show modal

    // Delay refresh to allow user to see/close modal, OR just refresh data in background
    // We'll refresh data but keep modal open.
    // this.refreshDashboard(); // This might have been causing conflicts if it resets 'isSuccessModalOpen' or re-renders too hard.

    // Instead of full refresh that might glitch UI, just re-fetch data silently or wait.
    // Let's rely on the user closing the modal to refresh, OR refresh now but ensure modal stays.
    if (this.agentData) {
      this.fetchDashboardData(this.agentData.userId); // Background refresh
      this.loadDataInternal(this.agentData.userId); // Reload list
    }
  }

  // ======================= VISA PAYMENT FUNCTIONS =======================

  /**
   * Open payment confirmation modal
   * Called when student.action === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT'
   */
  openPaymentConfirmationModal(student: any): void {
    this.selectedPaymentStudent = student;
    this.paymentAmount = (student.visaPaymentRequestedAmount || 0) + (student.visaManServiceCharge || 0);
    this.paymentCurrency = student.visaPaymentRequestedCurrency || 'USD';
    this.transactionId = '';
    this.confirmationFile = null;
    this.showPaymentConfirmationModal = true;
    this.cdr.detectChanges();
  }

  closePaymentConfirmationModal(): void {
    this.showPaymentConfirmationModal = false;
    this.selectedPaymentStudent = null;
    this.cdr.detectChanges();
  }

  /**
   * Handle file selection for payment confirmation screenshot
   */
  onConfirmationFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.confirmationFile = input.files[0];
      this.cdr.detectChanges();
    }
  }

  /**
   * Submit payment confirmation to Accountant
   */
  async submitPaymentConfirmation(): Promise<void> {
    if (!this.selectedPaymentStudent || !this.agentData) return;

    this.isSubmittingPayment = true;
    this.cdr.detectChanges();

    try {
      let confirmationPagePath = '';

      // Upload confirmation file if provided
      if (this.confirmationFile) {
        const formData = new FormData();
        formData.append('file', this.confirmationFile);
        formData.append('studentId', this.selectedPaymentStudent.id.toString());
        formData.append('type', 'visa-payment-confirmation');

        const uploadResponse = await this.http.post<any>(
          environment.apiUrl + '/api/file/upload',
          formData
        ).toPromise();

        confirmationPagePath = uploadResponse?.path || '';
      }

      // Submit payment confirmation
      const body = {
        agentUsername: this.agentData.userId,
        amount: this.paymentAmount,
        currency: this.paymentCurrency,
        transactionId: this.transactionId || null,
        confirmationPagePath: confirmationPagePath || null
      };

      await this.http.post(
        `${environment.apiUrl}/api/visa/submit-payment-confirmation/${this.selectedPaymentStudent.id}`,
        body
      ).toPromise();

      this.closePaymentConfirmationModal();
      this.isPaymentSuccessModalOpen = true;
      this.cdr.detectChanges();
      this.refreshStudents();

    } catch (error: any) {
      this.showErrorToast('Failed to submit confirmation: ' + (error?.message || 'Unknown error'));
    } finally {
      this.isSubmittingPayment = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Filter students needing visa payment action
   */
  getVisaPaymentStudents(): any[] {
    return this.students.filter(s =>
      (s['actionOnUser'] === 'agent' || s['actionOnUser'] === 'AGENT') &&
      s['action'] === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT'
    );
  }

  /**
   * Show visa payment button
   */
  showVisaPaymentButton(student: any): boolean {
    return (student['actionOnUser'] === 'agent' || student['actionOnUser'] === 'AGENT') &&
      student['action'] === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT';
  }

  /**
   * Refresh students list
   */
  refreshStudents(): void {
    if (this.agentData) {
      this.loadDataInternal(this.agentData.userId);
    }
  }

  /**
   * Copy text to clipboard
   */
  copyToClipboard(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showSuccessToast('📋 Copied to clipboard!');
    }).catch(() => {
      this.showErrorToast('Failed to copy');
    });
  }

  /**
   * Show success toast message
   */
  showSuccessToast(message: string): void {
    this.toastMessage = message;
    this.toastType = 'success';
    this.showToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  /**
   * Show error toast message
   */
  showErrorToast(message: string): void {
    this.toastMessage = message;
    this.toastType = 'error';
    this.showToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 4000);
  }
}