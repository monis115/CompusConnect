// admission-manager-registration.component.ts
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
  admissionManager: any;
}

interface RegistrationResponse {
  password: string;
  role: string;
  contactNumber: string;
  fullName: string;
  id: number;
  email: string;
  username: string;
  status: string;
}

@Component({
  selector: 'app-addmission-manager-registration',
  standalone: false,
  templateUrl: './addmission-manager-registration.html',
  styleUrl: './addmission-manager-registration.css',
})
export class AddmissionManagerRegistration implements OnInit {
  registrationForm: FormGroup;
  colleges: College[] = [];
  selectedColleges: number[] = [];
  isLoading = false;
  isLoadingColleges = false;
  registrationSuccess = false;
  registeredUsername = '';
  errorMessage = '';
  showCollegeDropdown = false;

  private readonly API_BASE_URL = 'http://localhost:8080/api';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
      private router: Router,

    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.registrationForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    });
  }

  ngOnInit(): void {
    this.loadColleges();
  }

  loadColleges(): void {
    this.isLoadingColleges = true;
    this.http.get<College[]>(`${this.API_BASE_URL}/colleges`).subscribe({
      next: (data) => {
        this.colleges = data;
        this.isLoadingColleges = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading colleges:', error);
        this.errorMessage = 'Failed to load colleges. Please try again.';
        this.isLoadingColleges = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleCollegeSelection(collegeId: number): void {
    const index = this.selectedColleges.indexOf(collegeId);
    if (index > -1) {
      this.selectedColleges.splice(index, 1);
    } else {
      this.selectedColleges.push(collegeId);
    }
    this.errorMessage = ''; // Clear error when selection changes
  }

  isCollegeSelected(collegeId: number): boolean {
    return this.selectedColleges.includes(collegeId);
  }

  removeCollege(collegeId: number): void {
    const index = this.selectedColleges.indexOf(collegeId);
    if (index > -1) {
      this.selectedColleges.splice(index, 1);
    }
    this.errorMessage = ''; // Clear error when selection changes
  }

  getSelectedCollegeNames(): string[] {
    return this.colleges
      .filter(college => this.selectedColleges.includes(college.id))
      .map(college => `${college.collegeName} (${college.city})`);
  }

  getCollegeName(collegeId: number): string {
    const college = this.colleges.find(c => c.id === collegeId);
    return college ? college.collegeName : '';
  }

  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    if (this.selectedColleges.length === 0) {
      this.errorMessage = 'Please select at least one college.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      ...this.registrationForm.value,
      collegeIds: this.selectedColleges
    };

    console.log('Submitting payload:', payload); // Debug log

    this.http.post<RegistrationResponse>(`${this.API_BASE_URL}/managers/create`, payload)
      .subscribe({
        next: (response) => {
          console.log('✅ Success response received:', response);
          
          // Use setTimeout to ensure the state updates are processed
          setTimeout(() => {
            this.zone.run(() => {
              this.registrationSuccess = true;
              this.registeredUsername = response.username;
              this.isLoading = false;
              this.cdr.detectChanges();
              console.log('✅ State updated:', {
                registrationSuccess: this.registrationSuccess,
                isLoading: this.isLoading,
                registeredUsername: this.registeredUsername
              });
            });
          }, 0);
        },
        error: (error) => {
          console.error('❌ Registration error:', error);
          setTimeout(() => {
            this.zone.run(() => {
              this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
              this.isLoading = false;
              this.cdr.detectChanges();
            });
          }, 0);
        }
      });
  }

  resetForm(): void {
    this.registrationForm.reset();
    this.selectedColleges = [];
    this.registrationSuccess = false;
    this.registeredUsername = '';
    this.errorMessage = '';
    this.showCollegeDropdown = false;
    this.cdr.detectChanges();
  }

  closeSuccessModal(): void {
    this.resetForm();
  }

  onClose(): void {
  this.router.navigate(['/admin-dashboard/admission-managers']);
}
}