import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AgentManagerService } from '../../../services/agent-manager.service';
import { AgentSummary } from '../../../models/agent-summary';
import { Student } from '../../../models/student';
import { Subscription, EMPTY } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { FileService } from '../../../services/file.service';

@Component({
  selector: 'app-student-agent-details',
  standalone: false,
  templateUrl: './student-agent-details.html',
  styleUrl: './student-agent-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAgentDetails implements OnInit {
  @Output() back = new EventEmitter<void>();

  // Master Data
  public agents: AgentSummary[] = [];
  public filteredAgents: AgentSummary[] = [];

  // Detail Data
  public selectedAgent: AgentSummary | null = null;
  public students: Student[] = [];
  public filteredStudents: Student[] = [];

  // UI States
  public isLoadingAgents: boolean = false;
  public isLoadingStudents: boolean = false;
  public agentSearchTerm: string = '';
  public studentSearchTerm: string = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private agentService: AgentManagerService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private fileService: FileService
  ) { }

  ngOnInit(): void {
    this.fetchAgents();
  }

  fetchAgents(): void {
    this.isLoadingAgents = true;
    this.cdr.markForCheck(); // Ensure UI updates

    const sub = this.agentService.getAgentsWithStudents()
      .pipe(
        catchError(err => {
          console.error('Error fetching agents', err);
          this.isLoadingAgents = false;
          this.cdr.markForCheck();
          return EMPTY;
        }),
        finalize(() => {
          this.isLoadingAgents = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(data => {
        this.agents = data;
        this.filteredAgents = data;
      });

    this.subscriptions.push(sub);
  }

  onAgentSearch(event: any): void {
    const term = event.target.value.toLowerCase();
    this.agentSearchTerm = term;
    this.filteredAgents = this.agents.filter(a =>
      a.fullName.toLowerCase().includes(term) ||
      a.companyName.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term)
    );
  }

  selectAgent(agent: AgentSummary): void {
    if (this.selectedAgent?.id === agent.id) return; // Already selected

    this.selectedAgent = agent;
    this.students = [];
    this.filteredStudents = [];
    this.studentSearchTerm = '';
    this.isLoadingStudents = true;
    this.cdr.markForCheck();

    const sub = this.agentService.getEnrolledStudents(agent.id)
      .pipe(
        catchError(err => {
          console.error('Error fetching students', err);
          this.isLoadingStudents = false;
          this.cdr.markForCheck();
          return EMPTY;
        }),
        finalize(() => {
          this.isLoadingStudents = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(data => {
        this.students = data;
        this.filteredStudents = data;
      });

    this.subscriptions.push(sub);
  }

  onStudentSearch(event: any): void {
    const term = event.target.value.toLowerCase();
    this.studentSearchTerm = term;
    this.filteredStudents = this.students.filter(s =>
      s.fullName.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.passportNo?.toLowerCase().includes(term)
    );
  }

  onBack(): void {
    this.router.navigate(['/admin-dashboard/agents']);
  }

  getFileUrl(path: string | undefined): string {
    return this.fileService.getFileUrl(path);
  }

  // Helper to check if file exists for button state
  hasFile(path: string | undefined): boolean {
    return !!path && path.length > 0;
  }

  // Badge color logic
  getStatusClass(status: string): string {
    if (!status) return 'status-default';
    const s = status.toLowerCase();
    if (s.includes('admission') || s.includes('generated')) return 'status-success';
    if (s.includes('pending') || s.includes('process')) return 'status-warning';
    if (s.includes('reject') || s.includes('fail')) return 'status-danger';
    return 'status-info';
  }
}