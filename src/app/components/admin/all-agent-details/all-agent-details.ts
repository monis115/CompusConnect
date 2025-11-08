import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';



@Component({
  selector: 'app-all-agent-details',
  standalone: false,
  templateUrl: './all-agent-details.html',
  styleUrl: './all-agent-details.css',
    changeDetection: ChangeDetectionStrategy.OnPush

})
export class AllAgentDetails    implements OnInit, OnDestroy {
 agents: any[] = [];
  selectedAgent: any = null;
  isLoading: boolean = true;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();
  private apiUrl = 'http://localhost:8080/api/agents';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.fetchAgents();
  }

  fetchAgents(): void {
    this.isLoading = true;
    this.error = null;
    
    // This is now a real API call
    this.http.get<any[]>(this.apiUrl)
      .pipe(
        takeUntil(this.destroy$), // Unsubscribe when component is destroyed
        finalize(() => {
          // This runs on both success and error
          this.isLoading = false;
          this.cdr.markForCheck(); // Trigger change detection
        }),
        catchError((err) => {
          // Handle API errors gracefully
          console.error('Failed to fetch agents:', err);
          this.error = 'Failed to load agent data. Please check the API and try again.';
          return of([]); // Return an empty array so the app doesn't crash
        })
      )
      .subscribe((data) => {
        this.agents = data;
        // No need to set isLoading or markForCheck here, finalize() handles it
      });
  }

  selectAgent(agent: any): void {
    this.selectedAgent = agent;
    this.cdr.markForCheck();
  }

  goBack(): void {
    this.selectedAgent = null;
    this.cdr.markForCheck();
  }

  getStudentCountText(agent: any): string {
    const count = agent.student?.length || 0;
    if (count > 0) {
      return `${count} student${count > 1 ? 's' : ''} registered`;
    }
    return 'No students registered yet.';
  }

  getStatusClass(status: string): string {
    if (!status) {
      return 'pending';
    }
    return status.toLowerCase().replace(/\s+/g, '-') || 'pending';
  }

  ngOnDestroy(): void {
    // This cleans up the subscription to prevent memory leaks
    this.destroy$.next();
    this.destroy$.complete();
  }
}
