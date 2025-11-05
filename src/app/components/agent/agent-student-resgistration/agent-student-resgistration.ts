import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { NgForm } from '@angular/forms';
import { StudentStatus } from '../agent-dashboard/agent-dashboard';

// --- Interfaces from Parent ---
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

// --- API Response Interface ---
interface StudentRegistrationResponse {
  id: number;
  fullName: string;
  dob: string;
  age: number;
  email: string;
  contactNo: string;
  address: string;
  emergencyContactNo: string;
  emergencyRelation: string;
  passportNo: string;
  passportValidTill: string;
  highestDegree: string;
  marks: number;
  appliedFor: string;
  presentStatus: StudentStatus;
  nextStep: StudentStatus;
  college: College;
  createdAt: string;
  applicationStatus: string;
  confirmationPagePath?: string;
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
  appliedFor: string = 'MBBS';
  collegeIds: number[] = [];
  userNameAgent: string = '';
  
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

  @Input() colleges: College[] = [];
  @Input() locations: Location[] = [];
  @Input() agentUserName: string = '';

  @Output() onRegistrationSuccess = new EventEmitter<StudentRegistrationResponse>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onDownloadConfirmation = new EventEmitter<string>();

  public student = new StudentRegistration();
  public groupedLocations = new Map<string, Location[]>();
  public availableStates: string[] = [];
  public filteredDistricts: Location[] = [];
  
  public isLoading = false;
  public isSuccess = false;
  public errorMessage: string | null = null;
  
  public registeredStudentData: StudentRegistrationResponse | null = null;
  
  private registrationApiUrl = 'http://localhost:8080/students/add';
  private baseUrl = 'http://localhost:8080'; // Base URL for file downloads

  constructor(
    private http: HttpClient,
    private changeDetectorRef: ChangeDetectorRef
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
      Object.values(this.regForm.controls).forEach(control => {
        control.markAsTouched();
      });
      this.errorMessage = "Please fill in all required fields correctly.";
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = null;

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

    this.http.post<StudentRegistrationResponse>(this.registrationApiUrl, payload)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: (response: StudentRegistrationResponse) => {
          console.log('Registration successful:', response);
          
          this.registeredStudentData = response;
          this.isSuccess = true;
          this.changeDetectorRef.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          console.error('Registration failed:', err);
          this.errorMessage = `Failed to register student. ${err.error?.message || err.message}`;
          this.changeDetectorRef.detectChanges();
        }
      });
  }
  
  cancel(): void {
    this.onCancel.emit();
  }
  
  /**
   * Downloads the confirmation PDF for the registered student
   */
  downloadConfirmation(): void {
    if (!this.registeredStudentData || !this.registeredStudentData.confirmationPagePath) {
      console.error('No confirmation page path available for download.');
      this.errorMessage = 'Confirmation page is not available for download.';
      return;
    }

    const filePath = this.registeredStudentData.confirmationPagePath;
    const fullUrl = `${this.baseUrl}/${filePath}`;
    
    console.log('Downloading confirmation from:', fullUrl);

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = fullUrl;
    link.target = '_blank'; // Open in new tab as fallback
    
    // Extract filename from path
    const fileName = filePath.split('/').pop() || `confirmation_${this.registeredStudentData.id}.pdf`;
    link.download = fileName;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  closeSuccessModal(): void {
    this.isSuccess = false;
    
    this.regForm.resetForm();
    this.student = new StudentRegistration();
    this.student.userNameAgent = this.agentUserName;
    this.filteredDistricts = [];
    
    if (this.registeredStudentData) {
      this.onRegistrationSuccess.emit(this.registeredStudentData);
    } else {
      this.onRegistrationSuccess.emit({} as StudentRegistrationResponse);
    }
    
    this.registeredStudentData = null;
  }
}