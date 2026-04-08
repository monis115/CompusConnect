import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-agent-apply',
  templateUrl: './agent-apply.html',
  standalone: false,
  styleUrls: ['./agent-apply.css'],
  encapsulation: ViewEncapsulation.None
})
export class AgentApply implements OnInit {
  form!: FormGroup;

  loading = false;
  error = '';
  success = false;

  // Self-registration endpoint - creates agent with Pending status
  private apiUrl = environment.apiUrl + '/api/agents/register';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.initForm();
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

    const payload: any = {
      ...this.form.getRawValue(),
      fullName: this.form.value.fullName?.trim() || '',
      email: this.form.value.email?.trim() || '',
      companyEmail: this.form.value.companyEmail?.trim() || '',
      address: personalAddr,
      registeredOfficeAddress: regAddr,
    };

    // Clean up internal non-backend fields
    delete payload.hasCompanyDetails;

    // Remove split fields
    ['street', 'city', 'landmark', 'state', 'pin', 'regStreet', 'regCity', 'regLandmark', 'regState', 'regPin'].forEach(f => delete payload[f]);

    this.loading = true;
    this.error = '';
    this.success = false;
    this.cdr.detectChanges();

    console.log('Submitting payload:', payload);

    // TODO: You will tell me the actual endpoint/method later
    this.http.post(this.apiUrl, payload).subscribe({
      next: (res) => {
        this.success = true;
        this.loading = false;
        console.log('Application submitted successfully:', res);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Submission failed:', err);
        this.error = err.error?.message || 'Submission failed. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  resetForm() {
    this.form.reset();
    this.form.get('age')?.setValue('');
    this.success = false;
    this.error = '';
  }

  get f() {
    return this.form.controls;
  }

  private showToast(msg: string) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:20px;right:20px;background:#225062;color:white;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:10000;animation:slideIn .3s ease-out;`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2300);
  }
}
