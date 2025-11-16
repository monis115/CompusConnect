import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ... (Interfaces keep same as previous) ...
// Ensure Student interface has all fields:
export interface College { id: number; collegeName: string; city: string; country: string; }
export interface Student {
  id: number; fullName: string; dob: string; age: number; email: string; contactNo: string; address: string;
  emergencyContactNo: string; emergencyRelation: string; passportNo: string; passportValidTill: string;
  highestDegree: string; marks: number; appliedFor: string; presentStatus: string; nextStep: string;
  college: College; confirmationPagePath: string | null; admissionLetterPath: string | null;
}
export interface Agent {
  id: number; fullName: string; email: string; contactNo: string; companyName: string;
  registeredOfficeAddress: string; student: Student[];
}

@Component({
  selector: 'app-student-agent-details',
  standalone: false, // Ensure this matches your module setup
  templateUrl: './student-agent-details.html',
  styleUrl: './student-agent-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAgentDetails implements OnInit, OnDestroy {
  @Output() back = new EventEmitter<void>();

  public agents: Agent[] = [];
  public selectedAgent: Agent | null = null;
  
  public filteredStudents: Student[] = [];
  public searchTerm: string = '';
  public statusFilter: string = '';
  
  public selectedStudent: Student | null = null;
  public isModalOpen: boolean = false;

  public isLoading: boolean = true;
  public viewState: 'list' | 'detail' = 'list';
  private dataSubscription: Subscription | undefined;

  public availableStatuses: string[] = [];

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchAgents();
  }

  fetchAgents(): void {
    this.isLoading = true;
    this.dataSubscription = this.http.get<Agent[]>('http://localhost:8080/api/agents/with-students')
      .pipe(catchError(err => {
          this.isLoading = false;
          this.cdr.markForCheck();
          return throwError(() => new Error('Failed to load agents'));
      }))
      .subscribe(data => {
        this.agents = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  selectAgent(agent: Agent): void {
    this.selectedAgent = agent;
    this.viewState = 'detail';
    this.searchTerm = '';
    this.statusFilter = '';
    
    const statuses = new Set(agent.student.map(s => s.presentStatus));
    this.availableStatuses = Array.from(statuses);

    this.filterStudents();
    window.scrollTo(0,0);
    this.cdr.markForCheck();
  }

  filterStudents(): void {
    if (!this.selectedAgent) return;

    this.filteredStudents = this.selectedAgent.student.filter(student => {
      const term = this.searchTerm.toLowerCase();
      const matchesSearch = 
        (student.fullName && student.fullName.toLowerCase().includes(term)) ||
        (student.email && student.email.toLowerCase().includes(term)) ||
        (student.contactNo && student.contactNo.includes(term)) ||
        (student.id.toString().includes(term));

      const matchesStatus = this.statusFilter ? student.presentStatus === this.statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.target.value;
    this.filterStudents();
  }

  onStatusChange(event: any): void {
    this.statusFilter = event.target.value;
    this.filterStudents();
  }

  getFileUrl(path: string | null): string {
    if (!path) return '#';
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `http://localhost:8080/${cleanPath}`;
  }

  goBackToList(): void {
    this.selectedAgent = null;
    this.viewState = 'list';
    this.cdr.markForCheck();
  }

  onBack(): void { this.back.emit(); }

  openStudentModal(student: Student): void {
    this.selectedStudent = student;
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  closeStudentModal(): void {
    this.isModalOpen = false;
    setTimeout(() => {
      this.selectedStudent = null;
      this.cdr.markForCheck();
    }, 200);
  }

  getStudentStatusClass(status: string): string {
    if(!status) return '';
    return status.toLowerCase().replace(/_/g, '-');
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }
}