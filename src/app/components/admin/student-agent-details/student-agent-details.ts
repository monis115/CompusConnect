import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, of, throwError } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';

// --- DATA INTERFACES BASED ON YOUR JSON ---

export interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
}

export interface CollegePrivilege {
  id: number;
  collegeName: string;
  city: string;
  country: string;
}

export interface AccessibleLocation {
  id: number;
  state: string;
  district: string;
}

export interface Student {
approvalDate: string|number|Date;
  id: number;
  fullName: string;
  dob: string;
  age: number;
  createdAt: string;
  applicationStatus: string;
  email: string;
  contactNo: string;
  address: string;
  emergencyContactNo: string;
  emergencyRelation: string;
  passportNo: string;
  passportValidTill: string;
  collegePreferences: College[];
  highestDegree: string;
  marks: number;
  appliedFor: string;
  presentStatus: string;
  nextStep: string;
  college: College;
  confirmationPagePath: string | null;
  admissionLetterPath: string | null;
}

export interface Agent {
  id: number;
  fullName: string;
  age: number;
  dob: string;
  email: string;
  contactNo: string;
  gender: string;
  address: string;
  identityProofType: string;
  identityProofNumber: string;
  designation: string;
  experience: string;
  status: string;
  activationDate: string | null;
  creationDate: string;
  companyName: string;
  registeredBusinessName: string;
  businessType: string;
  registrationNumber: string;
  panOrGstNumber: string;
  registeredOfficeAddress: string;
  branchOfficeAddress: string;
  companyEmail: string;
  companyContactNo: string;
  website: string;
  userId: string;
  password?: string; // Optional as it might not be needed in frontend
  role: string | null;
  collegePrivileges: CollegePrivilege[];
  accessibleLocations: AccessibleLocation[];
  student: Student[];
}

@Component({
  selector: 'app-student-agent-details',
  standalone: false,
  templateUrl: './student-agent-details.html',
  styleUrl: './student-agent-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class StudentAgentDetails  implements OnInit, OnDestroy{
  // Event emitter for the main "Back" button
@Output() back = new EventEmitter<void>();

  public agents: Agent[] = [];
  public selectedAgent: Agent | null = null;
  public isLoading: boolean = true;
  public viewState: 'list' | 'detail' = 'list';

  private dataSubscription: Subscription | undefined;

  // Mock data based on the provided JSON structure
  // --- MOCK DATA REMOVED ---

  // Inject ChangeDetectorRef for OnPush strategy
  // Inject HttpClient to fetch data (mocked here)
  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.fetchAgents();
  }

  fetchAgents(): void {
    this.isLoading = true;
    
    // In a real app, you would use HttpClient to fetch from your API:
    this.dataSubscription = this.http.get<Agent[]>('http://localhost:8080/api/agents/with-students')
      .pipe(
        catchError(err => {
          console.error("Error fetching agents:", err);
          this.isLoading = false;
          // Optionally: set an error state to show in the UI
          this.cdr.markForCheck();
          return throwError(() => new Error('Failed to load agents'));
        })
      )
      .subscribe(data => {
        this.agents = data;
        this.isLoading = false;
        // Manually trigger change detection as we are using OnPush
        this.cdr.markForCheck();
      });
  }

  // Set the selected agent and change the view
  selectAgent(agent: Agent): void {
    this.selectedAgent = agent;
    this.viewState = 'detail';
    this.cdr.markForCheck();
  }

  // Go back from detail view to list view
  goBackToList(): void {
    this.selectedAgent = null;
    this.viewState = 'list';
    this.cdr.markForCheck();
  }

  // Emit the event for the main back button
  onBack(): void {
    this.back.emit();
  }

  ngOnDestroy(): void {
    // Unsubscribe to prevent memory leaks
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  // Helper to get a status class for styling
  getStudentStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }

}
