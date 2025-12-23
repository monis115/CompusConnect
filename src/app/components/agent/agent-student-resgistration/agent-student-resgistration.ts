import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { NgForm } from '@angular/forms';
import { CollegeAccess, College, Location } from '../../../services/agent.service';

interface StudentRegistrationResponse {
  id: number;
  applicationId: string;
  confirmationPagePath?: string;
}

// Interface for Session
interface Session {
  id: number;
  sessionName: string;
  academicYear: string;
}

// Internal interface for merging logic
interface MergedCollegeAccess {
  college: College;
  accessAll: boolean;
  locations: Location[];
}

@Component({
  selector: 'app-agent-student-resgistration',
  templateUrl: './agent-student-resgistration.html',
  standalone: false,
  styleUrls: ['./agent-student-resgistration.css']
})
export class AgentStudentResgistration implements OnInit, OnChanges {

  @ViewChild('step1Form') step1Form!: NgForm;
  @ViewChild('step2Form') step2Form!: NgForm;
  @ViewChild('step3Form') step3Form!: NgForm;

  @Input() collegeAccess: CollegeAccess[] = [];
  @Input() agentUserName: string = ''; // Passed from session in parent component

  @Output() onRegistrationSuccess = new EventEmitter<StudentRegistrationResponse>();
  @Output() onCancel = new EventEmitter<void>();

  // Processed Data
  uniqueColleges: College[] = [];
  private mergedAccessMap = new Map<number, MergedCollegeAccess>();

  // Location Logic
  availableStates: string[] = [];
  filteredDistricts: Location[] = [];
  private currentLocationMap = new Map<string, Location[]>();
  private allLocationsCache: Location[] = [];

  currentStep: number = 1;
  totalSteps: number = 3;

  // --- Mock Data for Fallback (If API fails) ---
  private readonly MOCK_ALL_LOCATIONS: Location[] = [
    { id: 101, state: 'Assam', district: 'Golaghat' },
    { id: 102, state: 'Uttar Pradesh', district: 'Prayagraj' },
    { id: 103, state: 'Uttar Pradesh', district: 'Rae Bareli' },
    { id: 104, state: 'Uttar Pradesh', district: 'Rampur' },
    { id: 105, state: 'Uttar Pradesh', district: 'Auraiya' },
    { id: 106, state: 'Uttar Pradesh', district: 'Maharajganj' },
    { id: 107, state: 'Bihar', district: 'Madhubani' },
    { id: 108, state: 'Bihar', district: 'Nawada' },
    { id: 109, state: 'Delhi', district: 'New Delhi' },
    { id: 110, state: 'Maharashtra', district: 'Mumbai' }
  ];

  // Step 1 Data
  intakes = [
    { value: 'Sept 2024', label: 'September 2024' },
    { value: 'Feb 2025', label: 'February 2025' }
  ];
  selectedIntake: string = '';
  selectedCollegeId: number | null = null;

  // Session Data
  sessions: Session[] = [];
  selectedSessionId: number | null = null;
  isLoadingSessions = false;

  // Step 2 Data
  student = {
    fullName: '',
    dob: '',
    age: null as number | null,
    email: '',
    contactNo: '',
    address: '',
    districtId: null as number | null,
    selectedState: '',
    mothersName: '',
    fathersName: '',
    emergencyContactNo: '',
    emergencyRelation: '',
    passportNo: '',
    passportValidTill: '',
    adhaarCardNo: '',
    class12thPassingYear: '',
    baords: '',
    class12thMarks: null as number | null,
    maxMarks: null as number | null,
    hasGivenNEET: false,
    neetYear: '',
    neetScore: null as number | null,
    appliedFor: 'MBBS'
  };

  // Step 3 Data
  documents = {
    adhaar: null as File | null,
    class12thMarksheet: null as File | null,
    photograph: null as File | null,
    neetMarksheet: null as File | null,
    passport: null as File | null
  };

  documentPreviews = {
    adhaar: null as string | null,
    class12thMarksheet: null as string | null,
    photograph: null as string | null,
    neetMarksheet: null as string | null,
    passport: null as string | null
  };

  boardOptions = ['CBSE', 'ICSE', 'State Board', 'IB', 'Other'];

  hasPassport: boolean = true;

  isLoading = false;
  isSuccess = false;
  errorMessage: string | null = null;
  registeredStudentData: StudentRegistrationResponse | null = null;

  // Adjust base URL if needed, matches your controller
  private baseUrl = 'http://localhost:8080';
  private registrationApiUrl = `${this.baseUrl}/students/add`;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.processCollegeAccess();
    this.loadSessions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collegeAccess']) {
      this.processCollegeAccess();
    }
  }

  /**
   * Merges the raw collegeAccess array to handle duplicates and flags.
   * If any entry for a college has accessAllLocations=true, the merged entry gets it.
   */
  processCollegeAccess(): void {
    if (!this.collegeAccess) return;
    console.log('Processing College Access Data:', this.collegeAccess);

    const merged = new Map<number, MergedCollegeAccess>();

    for (const item of this.collegeAccess) {
      const cid = item.college.id;

      if (!merged.has(cid)) {
        merged.set(cid, {
          college: item.college,
          accessAll: false,
          locations: []
        });
      }

      const entry = merged.get(cid)!;

      // 1. Check for global access flag
      if (item.accessAllLocations) {
        entry.accessAll = true;
      }

      // 2. Aggregate specific locations
      if (item.allowedLocations && item.allowedLocations.length > 0) {
        // Avoid duplicates in the specific list
        const existingIds = new Set(entry.locations.map(l => l.id));
        item.allowedLocations.forEach(loc => {
          if (!existingIds.has(loc.id)) {
            entry.locations.push(loc);
            existingIds.add(loc.id);
          }
        });
      }
    }

    this.mergedAccessMap = merged;
    this.uniqueColleges = Array.from(merged.values()).map(v => v.college);
  }

  // ==================== LOAD SESSIONS ====================

  loadSessions(): void {
    this.isLoadingSessions = true;
    this.http.get<Session[]>(`${this.baseUrl}/api/sessions`).subscribe({
      next: (data) => {
        console.log('Sessions loaded:', data);
        this.sessions = data || [];
        this.isLoadingSessions = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading sessions:', err);
        this.sessions = [];
        this.isLoadingSessions = false;
        this.cdr.detectChanges();
      }
    });
  }

  getSelectedSessionDisplay(): string {
    const session = this.sessions.find(s => s.id === this.selectedSessionId);
    if (session) {
      return `${session.sessionName} (${session.academicYear})`;
    }
    return '';
  }

  // ==================== NAVIGATION ====================

  nextStep(): void {
    if (this.currentStep === 1 && this.validateStep1()) {
      this.currentStep++;
    } else if (this.currentStep === 2 && this.validateStep2()) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step <= this.currentStep) {
      this.currentStep = step;
    }
  }

  // ==================== STEP 1: COLLEGE & LOCATION LOGIC ====================

  onIntakeChange(): void {
    // Logic for intake change if needed
  }

  onCollegeChange(): void {
    console.log('Selected College ID:', this.selectedCollegeId, 'Type:', typeof this.selectedCollegeId);

    // 1. Reset Location selections
    this.student.selectedState = '';
    this.student.districtId = null;
    this.availableStates = [];
    this.filteredDistricts = [];
    this.currentLocationMap.clear();
    this.errorMessage = null;

    if (!this.selectedCollegeId) return;

    // 2. Get access rules
    // Ensure ID is a number for Map lookup
    const collegeId = Number(this.selectedCollegeId);
    const access = this.mergedAccessMap.get(collegeId);

    console.log('Access found for college:', collegeId, access);

    if (!access) return;

    // 3. Fetch Locations based on access type
    // If we have locations in the access object (even if accessAll is true), use them first.
    // This avoids unnecessary API calls if the backend already sent the data.
    if (access.locations && access.locations.length > 0) {
      console.log('Using locations from agent profile:', access.locations.length);
      this.processLocations(access.locations);
    } else if (access.accessAll) {
      // Access ALL locations but list is empty -> Fetch from API
      console.log('Access All true but no locations in profile. Fetching from API...');
      this.fetchAllLocationsFromApi();
    } else {
      // Restricted Access and no locations found (shouldn't happen if data is correct)
      console.warn('No locations found for this college access.');
      this.errorMessage = 'No locations assigned to this college.';
    }
  }

  fetchAllLocationsFromApi(): void {
    // Use cache if already fetched
    if (this.allLocationsCache.length > 0) {
      this.processLocations(this.allLocationsCache);
      return;
    }

    this.isLoading = true;
    // Try fetching from backend
    this.http.get<Location[]>(`${this.baseUrl}/api/locations`).subscribe({
      next: (locations) => {
        this.isLoading = false;
        // If API returns empty, try fallback
        if (!locations || locations.length === 0) {
          console.warn('API returned 0 locations, using mock data.');
          this.allLocationsCache = this.MOCK_ALL_LOCATIONS;
        } else {
          this.allLocationsCache = locations;
        }
        this.processLocations(this.allLocationsCache);
        this.cdr.detectChanges();
      },
      error: (err) => {
        // Fallback to MOCK data if API fails (likely due to no backend running)
        console.warn('Failed to fetch locations from API, using fallback data.', err);
        this.isLoading = false;
        this.allLocationsCache = this.MOCK_ALL_LOCATIONS;
        this.processLocations(this.allLocationsCache);
        this.cdr.detectChanges();
      }
    });
  }

  processLocations(locations: Location[]): void {
    const grouped = new Map<string, Location[]>();

    for (const loc of locations) {
      if (!grouped.has(loc.state)) {
        grouped.set(loc.state, []);
      }
      grouped.get(loc.state)!.push(loc);
    }

    this.currentLocationMap = grouped;
    this.availableStates = Array.from(grouped.keys()).sort();

    if (this.availableStates.length === 0) {
      this.errorMessage = 'No allowed locations found for this college.';
    }
  }

  onStateChange(): void {
    this.student.districtId = null;
    const districts = this.currentLocationMap.get(this.student.selectedState) || [];

    // Sort districts alphabetically
    this.filteredDistricts = districts.sort((a, b) => a.district.localeCompare(b.district));
  }

  validateStep1(): boolean {
    if (!this.selectedSessionId) {
      this.errorMessage = 'Please select an intake period';
      return false;
    }
    if (!this.selectedCollegeId) {
      this.errorMessage = 'Please select a college';
      return false;
    }
    this.errorMessage = null;
    return true;
  }

  // ==================== STEP 2: PERSONAL INFO ====================

  calculateAge(): void {
    if (this.student.dob) {
      const birthDate = new Date(this.student.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      this.student.age = age;
    } else {
      this.student.age = null;
    }
  }

  onNEETToggle(): void {
    if (!this.student.hasGivenNEET) {
      this.student.neetYear = '';
      this.student.neetScore = null;
    }
  }

  validateStep2(): boolean {
    if (!this.student.fullName || !this.student.dob || !this.student.email ||
      !this.student.contactNo || !this.student.address || !this.student.selectedState || !this.student.districtId ||
      !this.student.mothersName || !this.student.fathersName ||
      !this.student.emergencyContactNo || !this.student.emergencyRelation ||
      !this.student.class12thPassingYear ||
      !this.student.baords || !this.student.class12thMarks || !this.student.maxMarks) {
      this.errorMessage = 'Please fill all required fields marked with *';
      return false;
    }

    if (this.hasPassport) {
      if (!this.student.passportNo || !this.student.passportValidTill) {
        this.errorMessage = 'Please enter valid Passport Number and Expiry Date';
        return false;
      }

      const passportExpiry = new Date(this.student.passportValidTill);
      const today = new Date();
      if (passportExpiry <= today) {
        this.errorMessage = 'Passport must be valid (not expired)';
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.student.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return false;
    }

    if (this.student.adhaarCardNo && (this.student.adhaarCardNo.length !== 12 || !/^\d+$/.test(this.student.adhaarCardNo))) {
      this.errorMessage = 'Aadhaar card number must be exactly 12 digits';
      return false;
    }

    const passportExpiry = new Date(this.student.passportValidTill);
    // const today = new Date(); // Moved up
    // if (passportExpiry <= today) {
    //   this.errorMessage = 'Passport must be valid (not expired)';
    //   return false;
    // }

    if (this.student.hasGivenNEET) {
      if (!this.student.neetYear || !this.student.neetScore) {
        this.errorMessage = 'Please provide NEET year and score';
        return false;
      }
    }

    this.errorMessage = null;
    return true;
  }

  // ==================== STEP 3: DOCUMENTS & SUBMIT ====================

  onFileSelect(event: any, documentType: keyof typeof this.documents): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        this.errorMessage = `File ${file.name} is too large. Maximum size is 1MB`;
        event.target.value = ''; // Reset input
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = `File ${file.name} has invalid format. Only JPG, PNG, and PDF allowed`;
        event.target.value = ''; // Reset input
        return;
      }

      this.documents[documentType] = file;

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.documentPreviews[documentType] = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        this.documentPreviews[documentType] = 'pdf-icon';
      }
      this.errorMessage = null;
    }
  }

  removeDocument(documentType: keyof typeof this.documents): void {
    this.documents[documentType] = null;
    this.documentPreviews[documentType] = null;
  }

  getFileName(documentType: keyof typeof this.documents): string {
    return this.documents[documentType]?.name || '';
  }

  validateStep3(): boolean {
    // Adhaar is now optional
    // if (!this.documents.adhaar) {
    //   this.errorMessage = 'Please upload Aadhaar card document';
    //   return false;
    // }
    if (this.hasPassport && !this.documents.passport) {
      this.errorMessage = 'Please upload Passport document';
      return false;
    }
    if (!this.documents.class12thMarksheet) {
      this.errorMessage = 'Please upload 12th marksheet';
      return false;
    }
    // Photograph is now optional
    // if (!this.documents.photograph) {
    //   this.errorMessage = 'Please upload photograph';
    //   return false;
    // }
    if (this.student.hasGivenNEET && !this.documents.neetMarksheet) {
      this.errorMessage = 'Please upload NEET marksheet';
      return false;
    }
    this.errorMessage = null;
    return true;
  }

  submitRegistration(): void {
    if (!this.validateStep3()) return;

    this.isLoading = true;
    this.errorMessage = null;

    const formData = new FormData();

    const studentPayload = {
      intake: this.getSelectedSessionDisplay(), // Session name with academic year
      collegeIds: this.selectedCollegeId ? [this.selectedCollegeId] : [],

      fullName: this.student.fullName,
      dob: this.student.dob,
      age: this.student.age,
      email: this.student.email,
      contactNo: this.student.contactNo,
      // Append State and District to address
      address: `${this.student.address}, ${this.student.selectedState}, ${this.getDistrictName(this.student.districtId)}`,
      districtId: this.student.districtId,

      mothersName: this.student.mothersName,
      fathersName: this.student.fathersName,
      emergencyContactNo: this.student.emergencyContactNo,
      emergencyRelation: this.student.emergencyRelation,

      passportNo: this.hasPassport ? this.student.passportNo : '',
      passportValidTill: this.hasPassport ? this.student.passportValidTill : '',
      adhaarCardNo: this.student.adhaarCardNo,

      class12thPassingYear: this.student.class12thPassingYear,
      baords: this.student.baords,
      class12thMarks: this.student.class12thMarks,
      maxMarks: this.student.maxMarks,

      hasGivenNEET: this.student.hasGivenNEET,
      neetYear: this.student.hasGivenNEET ? this.student.neetYear : undefined,
      neetScore: this.student.hasGivenNEET ? this.student.neetScore : undefined,

      appliedFor: this.student.appliedFor,
      applicationStatus: 'REGISTERED',

      // Use the username passed from parent component
      userNameAgent: this.agentUserName
    };

    formData.append('student', JSON.stringify(studentPayload));

    if (this.documents.adhaar) formData.append('adhaarFile', this.documents.adhaar);
    if (this.documents.class12thMarksheet) formData.append('marksheetFile', this.documents.class12thMarksheet);
    if (this.documents.photograph) formData.append('profileImage', this.documents.photograph);
    if (this.documents.neetMarksheet) formData.append('neetMarksheetFile', this.documents.neetMarksheet);
    if (this.hasPassport && this.documents.passport) formData.append('passportFile', this.documents.passport);

    const startTime = Date.now();

    this.http.post<StudentRegistrationResponse>(this.registrationApiUrl, formData)
      .pipe(
        finalize(() => {
          const elapsedTime = Date.now() - startTime;
          const minDuration = 1900; // 1.9 seconds
          const delay = Math.max(0, minDuration - elapsedTime);

          setTimeout(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          }, delay);
        })
      )
      .subscribe({
        next: (response) => {
          this.registeredStudentData = response;
          this.isSuccess = true;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Registration failed:', err);
          this.errorMessage = `Failed to register student. ${err.error?.message || err.message}`;
        }
      });
  }

  downloadConfirmation(): void {
    if (!this.registeredStudentData || !this.registeredStudentData.confirmationPagePath) {
      this.errorMessage = 'Confirmation page is not available.';
      return;
    }
    const filePath = this.registeredStudentData.confirmationPagePath;
    // Ensure baseUrl doesn't have double slash if path already has leading slash
    const fullUrl = `${this.baseUrl}/${filePath.replace(/^\//, '')}`;

    const link = document.createElement('a');
    link.href = fullUrl;
    link.target = '_blank';
    const fileName = filePath.split('/').pop() || `confirmation_${this.registeredStudentData.id}.pdf`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  closeSuccessModal(): void {
    this.isSuccess = false;
    this.resetForm();
    if (this.registeredStudentData) {
      this.onRegistrationSuccess.emit(this.registeredStudentData);
    }
    this.registeredStudentData = null;
  }

  resetForm(): void {
    this.currentStep = 1;
    this.selectedIntake = '';
    this.selectedCollegeId = null;
    this.selectedSessionId = null;
    this.availableStates = [];
    this.filteredDistricts = [];
    this.filteredDistricts = [];
    this.currentLocationMap.clear();
    this.hasPassport = true;

    this.student = {
      fullName: '',
      dob: '',
      age: null,
      email: '',
      contactNo: '',
      address: '',
      districtId: null,
      selectedState: '',
      mothersName: '',
      fathersName: '',
      emergencyContactNo: '',
      emergencyRelation: '',
      passportNo: '',
      passportValidTill: '',
      adhaarCardNo: '',
      class12thPassingYear: '',
      baords: '',
      class12thMarks: null,
      maxMarks: null,
      hasGivenNEET: false,
      neetYear: '',
      neetScore: null,
      appliedFor: 'MBBS'
    };

    this.documents = {
      adhaar: null,
      class12thMarksheet: null,
      photograph: null,
      neetMarksheet: null,
      passport: null
    };

    this.documentPreviews = {
      adhaar: null,
      class12thMarksheet: null,
      photograph: null,
      neetMarksheet: null,
      passport: null
    };

    this.errorMessage = null;
  }

  cancel(): void {
    this.onCancel.emit();
  }

  private getDistrictName(districtId: number | null): string {
    if (!districtId) return '';
    const district = this.filteredDistricts.find(d => d.id === districtId);
    return district ? district.district : '';
  }
}