import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { NgForm } from '@angular/forms';

// --- Interfaces from Parent ---
interface College {
  id: number;
  collegeName: string;
}
interface Location {
  id: number;
  state: string;
  district: string;
}

// --- Form Model (based on your POST JSON) ---
class StudentRegistration {
  fullName: string = '';
  dob: string = '';
  email: string = '';
  contactNo: string = '';
  address: string = '';
  districtId: number | null = null;
  emergencyContactNo: string = '';
  emergencyRelation: string = '';
  passportNo: string = '';
  passportValidTill: string = '';
  highestDegree: string = '';
  marks: number | null = null;
  appliedFor: string = 'MBBS'; // Default value
  collegeIds: number[] = [];
  userNameAgent: string = '';
  
  // These are not in the POST, just for the form
  age: number | null = null;
  selectedState: string = '';
  selectedCollege: number | null = null;
}

@Component({
  selector: 'app-agent-student-resgistration',
  templateUrl: './agent-student-resgistration.html',
  standalone: false,
  styleUrls: ['./agent-student-resgistration.css']
})
export class AgentStudentResgistration implements OnInit {
  
  @ViewChild('regForm') regForm!: NgForm;

  // --- Data from Parent Component ---
  @Input() colleges: College[] = [];
  @Input() locations: Location[] = [];
  @Input() agentUserName: string = '';

  // --- Events to Parent Component ---
  @Output() onRegistrationSuccess = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  // --- Form & State Management ---
  public student = new StudentRegistration();
  public groupedLocations = new Map<string, Location[]>();
  public availableStates: string[] = [];
  public filteredDistricts: Location[] = [];
  
  public isLoading = false;
  public isSuccess = false;
  public errorMessage: string | null = null;
  
  private registrationApiUrl = 'http://localhost:8080/students/add';

  constructor(
    private http: HttpClient,
    private changeDetectorRef: ChangeDetectorRef // Added for manual change detection
  ) { }

  ngOnInit(): void {
    this.student.userNameAgent = this.agentUserName;
    this.groupLocationsByState();
  }

  groupLocationsByState(): void {
    for (const loc of this.locations) {
      if (!this.groupedLocations.has(loc.state)) {
        this.groupedLocations.set(loc.state, []);
      }
      this.groupedLocations.get(loc.state)?.push(loc);
    }
    this.availableStates = [...this.groupedLocations.keys()].sort();
  }

  onStateChange(): void {
    this.student.districtId = null;
    this.filteredDistricts = this.groupedLocations.get(this.student.selectedState) || [];
    this.filteredDistricts.sort((a, b) => a.district.localeCompare(b.district));
  }
  
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

  registerStudent(): void {
    if (this.regForm.invalid) {
      // Mark all fields as "touched" to show validation errors
      Object.values(this.regForm.controls).forEach(control => {
        control.markAsTouched();
      });
      this.errorMessage = "Please fill in all required fields correctly.";
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = null;

    // --- Prepare Payload ---
    if (this.student.selectedCollege) {
      this.student.collegeIds = [this.student.selectedCollege];
    }
    
    const payload = { ...this.student };
    delete (payload as any).age;
    delete (payload as any).selectedState;
    delete (payload as any).selectedCollege;
    (payload as any).applicationStatus = "Submitted";
    (payload as any).age = this.student.age;

    console.log('Sending payload:', payload);

    this.http.post(this.registrationApiUrl, payload)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.changeDetectorRef.detectChanges(); // Ensure change detection
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Registration successful:', response);
          this.isSuccess = true;
          this.changeDetectorRef.detectChanges(); // Critical fix for modal display
        },
        error: (err: HttpErrorResponse) => {
          console.error('Registration failed:', err);
          this.errorMessage = `Failed to register student. ${err.error?.message || err.message}`;
          this.changeDetectorRef.detectChanges(); // Ensure error message displays
        }
      });
  }
  
  cancel(): void {
    if (confirm('Are you sure you want to cancel? All unsaved data will be lost.')) {
      this.onCancel.emit();
    }
  }
  
  closeSuccessModal(): void {
    this.isSuccess = false;
    
    // --- Reset the form to its initial state ---
    this.regForm.resetForm();
    this.student = new StudentRegistration();
    this.student.userNameAgent = this.agentUserName; // Re-apply the agent username
    this.filteredDistricts = []; // Clear district dropdown
    
    // Tell parent to refresh and navigate away
    this.onRegistrationSuccess.emit(); 
  }
}