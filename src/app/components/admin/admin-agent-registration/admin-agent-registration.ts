import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
}

interface Location {
  id: number;
  state: string;
  district: string;
}

interface AgentResponse {
  userId: string;
  password: string;
}

// New Commission Slab Interface
export interface CommissionSlab {
  minStudents: number;
  maxStudents: number | null;
  dealPricePerStudent: number;
}

// New interface for college-wise location access
interface CollegeAccessEntry {
  collegeId: number;
  collegeName: string;
  city: string;
  accessAllLocations: boolean;
  locationIds: number[];

  // Dynamic Commission Slabs Settings
  dealPrice: number | null;
  isSlabApplicable: boolean;
  slabs: CommissionSlab[];
}

@Component({
  selector: 'app-admin-agent-registration',
  templateUrl: './admin-agent-registration.html',
  standalone: false,
  styleUrls: ['./admin-agent-registration.css'],
  encapsulation: ViewEncapsulation.None
})
export class AdminAgentRegistration implements OnInit {
  form!: FormGroup;
  colleges: College[] = [];
  locations: Location[] = [];
  states: string[] = [];
  districtsByState: { [state: string]: Location[] } = {};

  // New college access list structure
  collegeAccessList: CollegeAccessEntry[] = [];
  selectedCollegeToAdd: string = '';
  expandedStates: { [key: string]: boolean } = {};

  loading = false;
  error = '';
  success = false;
  agentCredentials: { userId: string; password: string } | null = null;
  dataLoaded = false;

  private apiUrl = environment.apiUrl + '/api/admins/agents/register';
  private collegesUrl = environment.apiUrl + '/api/colleges';
  private locationsUrl = environment.apiUrl + '/api/locations';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit() {
    this.initForm();
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard/agents']);
  }

  /* --------------------------------------------------------------------- */
  /* --------------------------- LOAD DATA ------------------------------- */
  /* --------------------------------------------------------------------- */
  loadData() {
    this.loading = true;
    this.dataLoaded = false;
    this.error = '';

    console.log('Fetching colleges and locations...');

    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        colleges: this.http.get<College[]>(this.collegesUrl),
        locations: this.http.get<Location[]>(this.locationsUrl)
      }).subscribe({
        next: (data) => {
          this.colleges = data.colleges || [];
          this.locations = data.locations || [];

          console.log('Colleges loaded:', this.colleges.length);
          console.log('Locations loaded:', this.locations.length);

          this.buildStateDistrictMap();

          this.dataLoaded = true;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading data:', err);
          this.error = 'Failed to load required data. Please try again.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    });
  }

  private buildStateDistrictMap() {
    const map: { [s: string]: Location[] } = {};
    const set = new Set<string>();

    this.locations.forEach(l => {
      if (!l.state || !l.district) return; // Skip invalid entries
      set.add(l.state);
      if (!map[l.state]) map[l.state] = [];
      map[l.state].push(l);
    });

    this.states = Array.from(set).sort();
    this.districtsByState = map;

    // DEBUG: Log the states
    console.log('States loaded:', this.states);
    console.log('Districts by state keys:', Object.keys(this.districtsByState));
    console.log('Total valid locations processed:', Object.values(this.districtsByState).reduce((acc, val) => acc + val.length, 0));
  }

  /* --------------------------------------------------------------------- */
  /* ------------------------------ FORM --------------------------------- */
  /* --------------------------------------------------------------------- */
  initForm() {
    this.form = this.fb.group({
      // --------------------------------------------------------------------------------
      // SMART TOGGLE
      // --------------------------------------------------------------------------------
      hasCompanyDetails: [false], // Toggle to reveal company section

      // Company
      companyName: [''],
      registeredBusinessName: [''],
      businessType: [''],
      registrationNumber: [''],
      panOrGstNumber: [''],
      companyEmail: ['', [Validators.email]],
      companyContactNo: ['', [Validators.pattern(/^(\s*|\d{10,12})$/)]],
      website: [''],

      // Registered Office Address
      regStreet: [''],
      regCity: [''],
      regLandmark: [''],
      regState: [''],
      regPin: ['', [Validators.pattern(/^(\s*|\d{6})$/)]],

      branchOfficeAddress: [''],

      // Personal
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      gender: ['', Validators.required],
      dob: ['', Validators.required],
      age: [{ value: '', disabled: true }],
      email: ['', [Validators.required, Validators.email]],
      contactNo: ['', [Validators.required, Validators.pattern(/^\d{10,12}$/)]],

      // Personal Address
      street: [''],
      city: [''],
      landmark: [''],
      state: [''],
      pin: ['', [Validators.pattern(/^(\s*|\d{6})$/)]],

      identityProofType: ['', Validators.required],
      identityProofNumber: ['', Validators.required],
      designation: [''],
      experience: [''],
      status: ['Active', Validators.required],
    });

    this.form.get('dob')?.valueChanges.subscribe(dob => {
      if (dob) this.calculateAge(dob);
      else this.form.get('age')?.setValue('');
    });

    this.form.valueChanges.subscribe(() => {
      if (this.error) {
        this.error = '';
      }
    });
  }

  calculateAge(dob: string) {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    this.form.get('age')?.setValue(age);
  }

  /* --------------------------------------------------------------------- */
  /* -------------------- COLLEGE ACCESS MANAGEMENT ---------------------- */
  /* --------------------------------------------------------------------- */

  // Get colleges that haven't been added yet
  getAvailableColleges(): College[] {
    const addedIds = this.collegeAccessList.map(e => e.collegeId);
    return this.colleges.filter(c => !addedIds.includes(c.id));
  }

  // Add a college to the access list
  addCollegeAccess() {
    const collegeId = parseInt(this.selectedCollegeToAdd, 10);
    if (!collegeId) return;

    const college = this.colleges.find(c => c.id === collegeId);
    if (!college) return;

    // Check if already added
    if (this.collegeAccessList.some(e => e.collegeId === collegeId)) return;

    this.collegeAccessList.push({
      collegeId: college.id,
      collegeName: college.collegeName,
      city: college.city,
      accessAllLocations: false,
      locationIds: [],
      dealPrice: null,
      isSlabApplicable: false,
      slabs: []
    });

    console.log(`Added college access: ${college.collegeName}`);

    this.selectedCollegeToAdd = '';
    this.cdr.detectChanges();
  }

  // Remove a college from the access list
  removeCollegeAccess(collegeId: number) {
    this.collegeAccessList = this.collegeAccessList.filter(e => e.collegeId !== collegeId);
    // Clean up expanded states for this college
    Object.keys(this.expandedStates).forEach(key => {
      if (key.endsWith('_' + collegeId)) {
        delete this.expandedStates[key];
      }
    });
    this.cdr.detectChanges();
  }

  // --- Dynamic Commission Slabs Handlers ---

  toggleSlabApplicable(collegeId: number, event: Event) {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;
    const checked = (event.target as HTMLInputElement).checked;
    entry.isSlabApplicable = checked;
    
    // Automatically add a default first slab if toggled ON and empty
    if (checked && entry.slabs.length === 0) {
      this.addSlab(collegeId);
    }
    this.cdr.detectChanges();
  }

  addSlab(collegeId: number) {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;
    
    // Default slab starts from the max of the previous slab + 1
    let nextMin = 1;
    if (entry.slabs.length > 0) {
      const lastMax = entry.slabs[entry.slabs.length - 1].maxStudents;
      nextMin = lastMax ? lastMax + 1 : 1;
    }

    entry.slabs.push({
      minStudents: nextMin,
      maxStudents: null, // null means N+
      dealPricePerStudent: entry.dealPrice || 0
    });
    this.cdr.detectChanges();
  }

  removeSlab(collegeId: number, index: number) {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;
    entry.slabs.splice(index, 1);
    this.cdr.detectChanges();
  }


  // Toggle "Access All Locations" for a college
  toggleAccessAllLocations(collegeId: number) {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;

    entry.accessAllLocations = !entry.accessAllLocations;

    if (entry.accessAllLocations) {
      // Select all location IDs
      entry.locationIds = this.locations.map(l => l.id);
    } else {
      // Clear all selections
      entry.locationIds = [];
    }

    console.log(`Access all locations for college ${collegeId}: ${entry.accessAllLocations}`);
    this.cdr.detectChanges();
  }

  // Toggle state expansion (per college)
  toggleStateExpansion(key: string) {
    this.expandedStates[key] = !this.expandedStates[key];
    console.log(`Toggling expansion for ${key}: ${this.expandedStates[key]}`);
  }

  // Check if location is selected for a specific college
  isLocationSelectedForCollege(collegeId: number, locationId: number): boolean {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    return entry ? entry.locationIds.includes(locationId) : false;
  }

  // Toggle a specific location for a college
  toggleLocationForCollege(collegeId: number, locationId: number) {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;

    const idx = entry.locationIds.indexOf(locationId);
    if (idx === -1) {
      entry.locationIds.push(locationId);
    } else {
      entry.locationIds.splice(idx, 1);
    }

    // Update accessAllLocations flag
    entry.accessAllLocations = entry.locationIds.length === this.locations.length;
    this.cdr.detectChanges();
  }

  // Check if all districts of a state are selected for a college
  isAllDistrictsSelectedForCollege(collegeId: number, state: string): boolean {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return false;

    const stateLocations = this.districtsByState[state] || [];
    return stateLocations.length > 0 && stateLocations.every(loc => entry.locationIds.includes(loc.id));
  }

  // Toggle all districts of a state for a college
  toggleAllDistrictsForCollege(collegeId: number, state: string) {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;

    const stateLocations = this.districtsByState[state] || [];
    const allSelected = this.isAllDistrictsSelectedForCollege(collegeId, state);

    if (allSelected) {
      // Deselect all districts of this state
      stateLocations.forEach(loc => {
        const idx = entry.locationIds.indexOf(loc.id);
        if (idx !== -1) {
          entry.locationIds.splice(idx, 1);
        }
      });
    } else {
      // Select all districts of this state
      stateLocations.forEach(loc => {
        if (!entry.locationIds.includes(loc.id)) {
          entry.locationIds.push(loc.id);
        }
      });
    }

    // Update accessAllLocations flag
    entry.accessAllLocations = entry.locationIds.length === this.locations.length;
    this.cdr.detectChanges();
  }

  // Get count of selected locations for display
  getSelectedLocationCount(collegeId: number): number {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    return entry ? entry.locationIds.length : 0;
  }

  // Get district count for a state
  getDistrictCountForState(state: string): number {
    return this.districtsByState[state]?.length || 0;
  }

  // Check if any district of a state is selected for a college
  hasAnyDistrictSelectedForCollege(collegeId: number, state: string): boolean {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return false;

    const stateLocations = this.districtsByState[state] || [];
    return stateLocations.some(loc => entry.locationIds.includes(loc.id));
  }

  // Get count of selected districts for a college in a specific state
  getSelectedDistrictCountForCollege(collegeId: number, state: string): number {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return 0;

    const stateLocations = this.districtsByState[state] || [];
    return stateLocations.filter(loc => entry.locationIds.includes(loc.id)).length;
  }

  // Validation: Check if at least one college with locations exists
  hasValidCollegeAccess(): boolean {
    return this.collegeAccessList.length > 0 &&
      this.collegeAccessList.every(e => e.locationIds.length > 0);
  }

  /* --------------------------------------------------------------------- */
  /* ------------------------------ SUBMIT -------------------------------- */
  /* --------------------------------------------------------------------- */
  onSubmit() {
    this.form.markAllAsTouched();

    // Debug invalid fields
    const invalidFields: string[] = [];
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control && control.invalid && control.touched) {
        invalidFields.push(key);
      }
    });

    if (invalidFields.length > 0) {
      console.warn('Form validation failed:', invalidFields);
    }

    // Validate college access list
    if (this.collegeAccessList.length === 0) {
      this.error = 'Please add at least one college with location access.';
      return;
    }

    const collegeWithNoLocations = this.collegeAccessList.find(e => e.locationIds.length === 0);
    if (collegeWithNoLocations) {
      this.error = `Please select at least one location for ${collegeWithNoLocations.collegeName}.`;
      return;
    }

    if (this.form.invalid) {
      let msg = 'Please complete all required fields';
      if (invalidFields.length > 0) {
        msg += `: ${invalidFields.join(', ')}`;
      }
      this.error = msg + '.';
      return;
    }

    // Build addresses
    const personalAddr = [this.form.value.street, this.form.value.landmark, this.form.value.city, this.form.value.state, this.form.value.pin]
      .filter(val => val && val.trim().length > 0).join(', ');
    const regAddr = [this.form.value.regStreet, this.form.value.regLandmark, this.form.value.regCity, this.form.value.regState, this.form.value.regPin]
      .filter(val => val && val.trim().length > 0).join(', ');

    // Build collegeAccessList for the new structure
    const collegeAccessListPayload = this.collegeAccessList.map(entry => ({
      collegeId: entry.collegeId,
      accessAllLocations: entry.accessAllLocations,
      locationIds: entry.locationIds,
      dealPrice: entry.dealPrice,
      isSlabApplicable: entry.isSlabApplicable,
      commissionSlabs: entry.slabs
    }));

    // Also build flat arrays for backward compatibility
    const allCollegeIds = this.collegeAccessList.map(e => e.collegeId);
    const allLocationIds = [...new Set(this.collegeAccessList.flatMap(e => e.locationIds))];

    const payload: any = {
      ...this.form.getRawValue(),
      fullName: this.form.value.fullName?.trim() || '',
      email: this.form.value.email?.trim() || '',
      companyEmail: this.form.value.companyEmail?.trim() || '',
      address: personalAddr,
      registeredOfficeAddress: regAddr,
      // New structure
      collegeAccessList: collegeAccessListPayload,
      // Backward compatible flat arrays
      collegeIds: allCollegeIds,
      locationIds: allLocationIds,
    };

    // Clean up internal non-backend fields
    delete payload.hasCompanyDetails;

    // Remove split fields
    ['street', 'city', 'landmark', 'state', 'pin', 'regStreet', 'regCity', 'regLandmark', 'regState', 'regPin'].forEach(f => delete payload[f]);

    this.loading = true;
    this.error = '';
    this.success = false;
    this.cdr.detectChanges(); // Force UI update to show spinner immediately

    console.log('Submitting payload:', payload);

    this.http.post<AgentResponse>(this.apiUrl, payload).subscribe({
      next: (res) => {
        this.agentCredentials = { userId: res.userId, password: res.password };
        this.success = true;
        this.loading = false;
        console.log('Registration successful:', res);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Registration failed:', err);
        this.error = err.error?.message || 'Registration failed.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  resetForm() {
    this.form.reset({ status: 'Active' });
    this.form.get('age')?.setValue('');
    this.collegeAccessList = [];
    this.selectedCollegeToAdd = '';
    this.expandedStates = {};
    this.success = false;
    this.agentCredentials = null;
    this.error = '';
  }

  closeModalAndNavigate() {
    this.resetForm();
    this.router.navigate(['/admin-dashboard/agents']);
  }

  get f() {
    return this.form.controls;
  }

  copyToClipboard(text: string | undefined, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => this.showToast(`${label} copied!`));
  }

  private showToast(msg: string) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:20px;right:20px;background:#225062;color:white;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:10000;animation:slideIn .3s ease-out;`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2300);
  }

  copyAgentApplyLink() {
    const origin = window.location.origin;
    const applyLink = `${origin}/agent-apply`;
    navigator.clipboard.writeText(applyLink).then(() => {
      this.showToast('Public Agent Registration Link copied!');
    }).catch(err => {
      console.error('Failed to copy link', err);
      prompt('Copy the link below:', applyLink);
    });
  }
}