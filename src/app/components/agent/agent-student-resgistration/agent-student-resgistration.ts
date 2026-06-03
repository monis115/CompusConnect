import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { NgForm } from '@angular/forms';
import { CollegeAccess, College, Location } from '../../../services/agent.service';
import { environment } from '../../../../environments/environment';

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
  @Input() editMode: boolean = false;
  @Input() studentToEdit: any = null;

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
    passport: null as File | null,
    affidavit: null as File | null
  };

  documentPreviews = {
    adhaar: null as string | null,
    class12thMarksheet: null as string | null,
    photograph: null as string | null,
    neetMarksheet: null as string | null,
    passport: null as string | null,
    affidavit: null as string | null
  };

  boardOptions = [
    // National Boards
    'CBSE (Central Board of Secondary Education)',
    'CISCE (Council for the Indian School Certificate Examinations)',
    'NIOS (National Institute of Open Schooling)',
    // International Boards
    'IB (International Baccalaureate)',
    'CAIE (Cambridge Assessment International Education)',
    // State Boards
    'Andhra Pradesh (BSEAP / BIEAP)',
    'Assam (SEBA / AHSEC)',
    'Bihar (BSEB)',
    'Chhattisgarh (CGBSE)',
    'Goa (GBSHSE)',
    'Gujarat (GSEB)',
    'Haryana (BSEH / HBSE)',
    'Himachal Pradesh (HPBOSE)',
    'Jammu & Kashmir (JKBOSE)',
    'Jharkhand (JAC)',
    'Karnataka (KSEAB / DPUE)',
    'Kerala (KBPE / DHSE)',
    'Madhya Pradesh (MPBSE)',
    'Maharashtra (MSBSHSE)',
    'Manipur (BOSEM / COHSEM)',
    'Meghalaya (MBOSE)',
    'Mizoram (MBSE)',
    'Nagaland (NBSE)',
    'Odisha (BSE / CHSE)',
    'Punjab (PSEB)',
    'Rajasthan (BSER / RBSE)',
    'Tamil Nadu State Board',
    'Telangana (BSETS / TSBIE)',
    'Tripura (TBSE)',
    'Uttar Pradesh (UPMSP / UP Board)',
    'Uttarakhand (UBSE)',
    'West Bengal (WBBSE / WBCHSE)',
    // State Open Schooling Boards
    'APOSS (Andhra Pradesh Open School)',
    'ASOS (Assam State Open School)',
    'BBOSE (Bihar Board of Open Schooling)',
    'CGSOS (Chhattisgarh State Open School)',
    'GSOS (Gujarat State Open School)',
    'HOS (Haryana Open School)',
    'HPSOS (Himachal Pradesh State Open School)',
    'JKSOS (J&K State Open School)',
    'KSOS (Karnataka State Open School)',
    'SCOLE-Kerala (State Council for Open and Lifelong Education)',
    'MPSOS (Madhya Pradesh State Open School)',
    'MSOS (Maharashtra State Open School)',
    'POS (Punjab Open School)',
    'RSOS (Rajasthan State Open School)',
    'TOSS (Telangana Open School Society)',
    'UPSOS (UP State Open School)',
    'WBCROS (West Bengal Council of Rabindra Open Schooling)',
    // University & Specialized Boards
    'AMU Board of Secondary & Senior Secondary Education',
    'BHU Board (Central Hindu School exams)',
    'JMI Board of Secondary & Senior Secondary Education',
    'Visva-Bharati University Board',
    'Rajiv Gandhi University of Knowledge Technologies (RGUKT)',
    // Sanskrit and Madrasa Education Boards
    'Uttar Pradesh Board of Madrasa Education',
    'Bihar State Madrasa Education Board',
    'West Bengal Board of Madrasa Education',
    'Assam State Madrasa Education Board',
    'Uttarakhand Sanskrit Shiksha Parishad',
    'Bihar Sanskrit Shiksha Board',
    'Chhattisgarh Madrasa Board',
    'Madhya Pradesh Madrasa Board',
    'Other'
  ];

  hasPassport: boolean = true;

  isLoading = false;
  isSuccess = false;
  errorMessage: string | null = null;
  registeredStudentData: StudentRegistrationResponse | null = null;

  // Adjust base URL if needed, matches your controller
  private baseUrl = environment.apiUrl + '';
  private registrationApiUrl = `${this.baseUrl}/students/add`;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.processCollegeAccess();
    this.loadSessions();
    if (this.editMode && this.studentToEdit) {
      this.prefillEditData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collegeAccess']) {
      this.processCollegeAccess();
    }
    if (changes['studentToEdit'] && this.editMode && this.studentToEdit) {
      this.prefillEditData();
    }
  }

  prefillEditData(): void {
    const s = this.studentToEdit;
    // Basic fields
    this.student.fullName = s.fullName || '';
    this.student.dob = s.dob || '';
    this.student.age = s.age || null;
    this.student.email = s.email || '';
    this.student.contactNo = s.contactNo || '';

    // Address & selections
    if (s.isDraft) {
      this.student.address = s.address || '';
      this.selectedCollegeId = s.selectedCollegeId || null;
      this.selectedSessionId = s.selectedSessionId || null;
      this.currentStep = s.currentStep || 1;
      this.hasPassport = s.hasPassport !== false;

      // Restore files if any
      if (s.serializedDocs) {
        for (const key of Object.keys(s.serializedDocs)) {
          const docData = s.serializedDocs[key];
          if (docData && docData.base64) {
            try {
              const fileObj = this.base64ToFile(docData.base64, docData.name, docData.type);
              this.documents[key as keyof typeof this.documents] = fileObj;

              if (docData.type.startsWith('image/')) {
                this.documentPreviews[key as keyof typeof this.documentPreviews] = docData.base64;
              } else {
                this.documentPreviews[key as keyof typeof this.documentPreviews] = 'pdf-icon';
              }
            } catch (e) {
              console.error('Error restoring file from draft:', e);
            }
          }
        }
      }
    } else {
      this.student.address = s.address ? s.address.split(',')[0] : '';
      this.selectedCollegeId = s.college?.id || null;
      if (s.intake) {
        const match = this.sessions.find(session => `${session.sessionName} (${session.academicYear})` === s.intake);
        if (match) this.selectedSessionId = match.id;
      }
    }

    this.student.selectedState = s.selectedState || '';
    this.student.mothersName = s.mothersName || '';
    this.student.fathersName = s.fathersName || '';
    this.student.emergencyContactNo = s.emergencyContactNo || '';
    this.student.emergencyRelation = s.emergencyRelation || '';
    this.student.passportNo = s.passportNo || '';
    this.student.passportValidTill = s.passportValidTill || '';
    this.student.adhaarCardNo = s.adhaarCardNo || '';
    this.student.class12thPassingYear = s.class12thPassingYear || '';
    this.student.baords = s.baords || '';
    this.student.class12thMarks = s.class12thMarks || null;
    this.student.maxMarks = s.maxMarks || null;
    this.student.hasGivenNEET = s.hasGivenNEET || false;
    this.student.neetYear = s.neetYear || '';
    this.student.neetScore = s.neetScore || null;
    this.student.appliedFor = s.appliedFor || 'MBBS';

    // Load locations for selected college and restore state/district selections
    if (this.selectedCollegeId) {
      const collegeId = Number(this.selectedCollegeId);
      const state = s.selectedState || '';
      const districtId = s.districtId || null;

      this.loadCollegeLocations(collegeId, () => {
        if (state) {
          this.student.selectedState = state;
          const districts = this.currentLocationMap.get(state) || [];
          this.filteredDistricts = districts.sort((a, b) => a.district.localeCompare(b.district));
          if (districtId) {
            this.student.districtId = Number(districtId);
          }
        }
      });
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
    this.http.get<Session[]>(`${this.baseUrl}/api/sessions/active`).subscribe({
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

  isSelectedCollegeInactive(): boolean {
    if (!this.selectedCollegeId) return false;
    const college = this.uniqueColleges.find(c => c.id === this.selectedCollegeId);
    return college?.active === false;
  }

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

    this.loadCollegeLocations(Number(this.selectedCollegeId));
  }

  loadCollegeLocations(collegeId: number, callback?: () => void): void {
    const access = this.mergedAccessMap.get(collegeId);
    console.log('Access found for college:', collegeId, access);

    if (!access) return;

    // 3. Fetch Locations based on access type
    if (access.locations && access.locations.length > 0) {
      console.log('Using locations from agent profile:', access.locations.length);
      this.processLocations(access.locations);
      if (callback) callback();
    } else if (access.accessAll) {
      console.log('Access All true but no locations in profile. Fetching from API...');
      this.fetchAllLocationsFromApi(callback);
    } else {
      console.warn('No locations found for this college access.');
      this.errorMessage = 'No locations assigned to this college.';
    }
  }

  fetchAllLocationsFromApi(callback?: () => void): void {
    // Use cache if already fetched
    if (this.allLocationsCache.length > 0) {
      this.processLocations(this.allLocationsCache);
      if (callback) callback();
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
        if (callback) callback();
        this.cdr.detectChanges();
      },
      error: (err) => {
        // Fallback to MOCK data if API fails (likely due to no backend running)
        console.warn('Failed to fetch locations from API, using fallback data.', err);
        this.isLoading = false;
        this.allLocationsCache = this.MOCK_ALL_LOCATIONS;
        this.processLocations(this.allLocationsCache);
        if (callback) callback();
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
    // Check if selected college is inactive
    const selectedCollege = this.uniqueColleges.find(c => c.id === this.selectedCollegeId);
    if (selectedCollege && selectedCollege.active === false) {
      this.errorMessage = 'This college has been deactivated by admin. You cannot register students for this college.';
      this.selectedCollegeId = null;
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
    if (!this.student.hasGivenNEET && !this.documents.affidavit) {
      this.errorMessage = 'Please upload the required Affidavit since NEET is not given';
      return false;
    }
    if (!this.hasPassport && !this.documents.adhaar) {
      this.errorMessage = 'Please upload Aadhaar card document since Passport is not available';
      return false;
    }
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

      passportNo: this.hasPassport ? this.student.passportNo : null,
      passportValidTill: this.hasPassport ? this.student.passportValidTill : null,
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
    if (!this.student.hasGivenNEET && this.documents.affidavit) formData.append('affidavitFile', this.documents.affidavit);

    const startTime = Date.now();
    const requestObs = (this.editMode && !this.studentToEdit?.isDraft)
      ? this.http.put<StudentRegistrationResponse>(`${this.baseUrl}/students/update/${this.studentToEdit.id}`, formData)
      : this.http.post<StudentRegistrationResponse>(this.registrationApiUrl, formData);

    requestObs
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
          if (this.editMode && this.studentToEdit?.isDraft) {
            this.deleteDraft(this.studentToEdit.id);
          }
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
      passport: null,
      affidavit: null
    };

    this.documentPreviews = {
      adhaar: null,
      class12thMarksheet: null,
      photograph: null,
      neetMarksheet: null,
      passport: null,
      affidavit: null
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

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  base64ToFile(base64: string, filename: string, mimeType: string): File {
    const arr = base64.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mimeType });
  }

  async saveAsDraft(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.detectChanges();

    try {
      const serializedDocs: { [key: string]: { name: string; type: string; base64: string } } = {};
      for (const key of Object.keys(this.documents)) {
        const file = this.documents[key as keyof typeof this.documents];
        if (file) {
          const base64 = await this.fileToBase64(file);
          serializedDocs[key] = {
            name: file.name,
            type: file.type,
            base64: base64
          };
        }
      }

      const draftId = this.editMode && this.studentToEdit?.isDraft ? this.studentToEdit.id : 'draft_' + Date.now();
      const draftData = {
        id: draftId,
        isDraft: true,
        currentStep: this.currentStep,
        hasPassport: this.hasPassport,
        selectedSessionId: this.selectedSessionId,
        selectedCollegeId: this.selectedCollegeId,

        fullName: this.student.fullName || '',
        dob: this.student.dob || '',
        age: this.student.age || null,
        email: this.student.email || '',
        contactNo: this.student.contactNo || '',
        address: this.student.address || '',
        selectedState: this.student.selectedState || '',
        districtId: this.student.districtId || null,
        mothersName: this.student.mothersName || '',
        fathersName: this.student.fathersName || '',
        emergencyContactNo: this.student.emergencyContactNo || '',
        emergencyRelation: this.student.emergencyRelation || '',
        passportNo: this.student.passportNo || '',
        passportValidTill: this.student.passportValidTill || '',
        adhaarCardNo: this.student.adhaarCardNo || '',
        class12thPassingYear: this.student.class12thPassingYear || '',
        baords: this.student.baords || '',
        class12thMarks: this.student.class12thMarks || null,
        maxMarks: this.student.maxMarks || null,
        hasGivenNEET: this.student.hasGivenNEET || false,
        neetYear: this.student.neetYear || '',
        neetScore: this.student.neetScore || null,
        appliedFor: this.student.appliedFor || 'MBBS',
        createdAt: this.editMode && this.studentToEdit?.isDraft ? (this.studentToEdit.createdAt || new Date().toISOString()) : new Date().toISOString(),

        serializedDocs
      };

      const draftsStr = localStorage.getItem('agent_student_drafts') || '[]';
      let drafts = JSON.parse(draftsStr);
      if (!Array.isArray(drafts)) drafts = [];

      const existingIdx = drafts.findIndex((d: any) => d.id === draftId);
      if (existingIdx > -1) {
        drafts[existingIdx] = draftData;
      } else {
        drafts.push(draftData);
      }

      localStorage.setItem('agent_student_drafts', JSON.stringify(drafts));
      this.isLoading = false;
      this.cdr.detectChanges();
      this.onCancel.emit();
    } catch (e: any) {
      console.error('Failed to save draft:', e);
      this.isLoading = false;
      this.errorMessage = 'Failed to save draft. Storage quota might be exceeded.';
      this.cdr.detectChanges();
    }
  }

  deleteDraft(draftId: string): void {
    const draftsStr = localStorage.getItem('agent_student_drafts') || '[]';
    let drafts = JSON.parse(draftsStr);
    if (Array.isArray(drafts)) {
      drafts = drafts.filter((d: any) => d.id !== draftId);
      localStorage.setItem('agent_student_drafts', JSON.stringify(drafts));
    }
  }
}