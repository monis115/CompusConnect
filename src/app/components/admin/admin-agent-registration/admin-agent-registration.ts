import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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

@Component({
  selector: 'app-admin-agent-registration',
  templateUrl: './admin-agent-registration.html',
  standalone: false,
  styleUrls: ['./admin-agent-registration.css'],
})
export class AdminAgentRegistration implements OnInit {
  form!: FormGroup;
  colleges: College[] = [];
  locations: Location[] = [];
  states: string[] = [];
  districtsByState: { [state: string]: Location[] } = {};

  // Selection
  selectedColleges: number[] = [];
  selectAllColleges = false;
  selectedDistricts: number[] = [];
  selectAllDistrictsByState: { [state: string]: boolean } = {};
  selectAllStates = false;
  expandedStates: { [state: string]: boolean } = {}; // Tracks which states are open

  loading = false;
  error = '';
  success = false;
  agentCredentials: { userId: string; password: string } | null = null;
  dataLoaded = false; // Controls form visibility

  private apiUrl = 'http://localhost:8080/api/admins/agents/register';
  private collegesUrl = 'http://localhost:8080/api/colleges';
  private locationsUrl = 'http://localhost:8080/api/locations';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadData();
  }

  /* --------------------------------------------------------------------- */
  /* --------------------------- LOAD DATA ------------------------------- */
  /* --------------------------------------------------------------------- */
  loadData() {
    this.loading = true;
    this.dataLoaded = false;

    const colleges$ = this.http.get<College[]>(this.collegesUrl);
    const locations$ = this.http.get<Location[]>(this.locationsUrl);

    Promise.all([
      colleges$.toPromise(),
      locations$.toPromise(),
    ])
      .then(([colleges, locations]) => {
        this.colleges = colleges || [];
        this.locations = locations || [];
        this.buildStateDistrictMap();
        this.dataLoaded = true;
        this.loading = false;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.error = 'Failed to load required data. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      });
  }

  private buildStateDistrictMap() {
    const map: { [s: string]: Location[] } = {};
    const set = new Set<string>();

    this.locations.forEach(l => {
      set.add(l.state);
      if (!map[l.state]) map[l.state] = [];
      map[l.state].push(l);
    });

    this.states = Array.from(set).sort();
    this.districtsByState = map;
  }

  /* --------------------------------------------------------------------- */
  /* ------------------------------ FORM --------------------------------- */
  /* --------------------------------------------------------------------- */
  initForm() {
    this.form = this.fb.group({
      // Company
      companyName: ['', Validators.required],
      registeredBusinessName: ['', Validators.required],
      businessType: ['', Validators.required],
      registrationNumber: ['', Validators.required],
      panOrGstNumber: ['', Validators.required],
      companyEmail: ['', [Validators.required, Validators.email]],
      companyContactNo: ['', [Validators.required, Validators.pattern(/^\d{10,12}$/)]],
      website: ['', Validators.required],

      // Registered Office Address
      regStreet: ['', Validators.required],
      regCity: ['', Validators.required],
      regLandmark: [''],
      regState: ['', Validators.required],
      regPin: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],

      branchOfficeAddress: [''],

      // Personal
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      gender: ['', Validators.required],
      dob: ['', Validators.required],
      age: [{ value: '', disabled: true }],
      email: ['', [Validators.required, Validators.email]],
      contactNo: ['', [Validators.required, Validators.pattern(/^\d{10,12}$/)]], // <-- FIX 1

      // Personal Address
      street: ['', Validators.required],
      city: ['', Validators.required],
      landmark: [''],
      state: ['', Validators.required],
      pin: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],

      identityProofType: ['', Validators.required],
      identityProofNumber: ['', Validators.required],
      designation: ['', Validators.required],
      experience: ['', Validators.required],
      status: ['Active', Validators.required],
    });

    this.form.get('dob')?.valueChanges.subscribe(dob => {
      if (dob) this.calculateAge(dob);
      else this.form.get('age')?.setValue('');
    });

    // FIX 2: Clear the main server error message as soon as the user starts correcting the form
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
  /* --------------------------- COLLEGES -------------------------------- */
  /* --------------------------------------------------------------------- */
  toggleSelectAllColleges() {
    this.selectAllColleges = !this.selectAllColleges;
    this.selectedColleges = this.selectAllColleges ? this.colleges.map(c => c.id) : [];
  }

  toggleCollege(id: number) {
    const i = this.selectedColleges.indexOf(id);
    i === -1 ? this.selectedColleges.push(id) : this.selectedColleges.splice(i, 1);
    this.selectAllColleges = this.selectedColleges.length === this.colleges.length;
  }

  isCollegeSelected(id: number) {
    return this.selectedColleges.includes(id);
  }

  /* --------------------------------------------------------------------- */
  /* -------------------------- LOCATIONS -------------------------------- */
  /* --------------------------------------------------------------------- */
  
  // FIX 3: Add function to toggle state expansion
  toggleStateExpansion(state: string) {
    this.expandedStates[state] = !this.expandedStates[state];
  }

  toggleSelectAllStates() {
    this.selectAllStates = !this.selectAllStates;
    this.selectedDistricts = this.selectAllStates ? this.locations.map(l => l.id) : [];
    this.states.forEach(s => (this.selectAllDistrictsByState[s] = this.selectAllStates));
  }

  toggleSelectAllDistricts(state: string) {
    const current = this.selectAllDistrictsByState[state] ?? false;
    const newVal = !current;
    this.selectAllDistrictsByState[state] = newVal;

    this.districtsByState[state].forEach(d => {
      const i = this.selectedDistricts.indexOf(d.id);
      if (newVal && i === -1) this.selectedDistricts.push(d.id);
      else if (!newVal && i !== -1) this.selectedDistricts.splice(i, 1);
    });
    this.updateGlobalSelectAllState();
  }

  toggleDistrict(id: number) {
    const i = this.selectedDistricts.indexOf(id);
    i === -1 ? this.selectedDistricts.push(id) : this.selectedDistricts.splice(i, 1);

    const loc = this.locations.find(l => l.id === id)!;
    const all = this.districtsByState[loc.state].every(d => this.selectedDistricts.includes(d.id));
    this.selectAllDistrictsByState[loc.state] = all;
    this.updateGlobalSelectAllState();
  }

  isDistrictSelected(id: number) {
    return this.selectedDistricts.includes(id);
  }

  private updateGlobalSelectAllState() {
    this.selectAllStates = this.locations.length > 0 && this.selectedDistricts.length === this.locations.length;
  }

  /* --------------------------------------------------------------------- */
  /* ------------------------------ SUBMIT -------------------------------- */
  /* --------------------------------------------------------------------- */
 onSubmit() {
  this.form.markAllAsTouched(); // Critical!

  // Debug invalid fields
  const invalidFields: string[] = [];
  Object.keys(this.form.controls).forEach(key => {
    const control = this.form.get(key);
    if (control && control.invalid && control.touched) {
      invalidFields.push(key);
    }
  });

  if (this.form.invalid || !this.selectedColleges.length || !this.selectedDistricts.length) {
    let msg = 'Please complete all required fields';
    if (invalidFields.length > 0) {
      msg += `: ${invalidFields.join(', ')}`;
    }
    if (!this.selectedColleges.length) msg += ', select at least one college';
    if (!this.selectedDistricts.length) msg += ', select at least one district';
    this.error = msg + '.';
    return;
  }

  // Proceed with submission...
  const personalAddr = [this.form.value.street, this.form.value.landmark, this.form.value.city, this.form.value.state, this.form.value.pin]
    .filter(Boolean).join(', ');
  const regAddr = [this.form.value.regStreet, this.form.value.regLandmark, this.form.value.regCity, this.form.value.regState, this.form.value.regPin]
    .filter(Boolean).join(', ');

  const payload: any = {
    ...this.form.getRawValue(),
    fullName: this.form.value.fullName.trim(),
    email: this.form.value.email.trim(),
    companyEmail: this.form.value.companyEmail.trim(),
    address: personalAddr,
    registeredOfficeAddress: regAddr,
    collegeIds: this.selectedColleges,
    locationIds: this.selectedDistricts,
  };

  // Remove split fields
  ['street','city','landmark','state','pin','regStreet','regCity','regLandmark','regState','regPin'].forEach(f => delete payload[f]);

  this.loading = true;
  this.error = '';
  this.success = false;

  this.http.post<AgentResponse>(this.apiUrl, payload).subscribe({
    next: (res) => {
      this.agentCredentials = { userId: res.userId, password: res.password };
      this.success = true;
      this.loading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      this.error = err.error?.message || 'Registration failed.';
      this.loading = false;
      this.cdr.detectChanges();
    },
  });
}

  resetForm() {
    this.form.reset({ status: 'Active' });
    this.form.get('age')?.setValue('');
    this.selectedColleges = [];
    this.selectAllColleges = false;
    this.selectedDistricts = [];
    this.selectAllDistrictsByState = {};
    this.selectAllStates = false;
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
}