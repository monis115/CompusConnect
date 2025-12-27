import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface LocationDetail {
  id: number;
  state: string;
  district: string;
}

export interface CollegeAccess {
  collegeId: number;
  collegeName: string;
  accessAllLocations: boolean;
  locationDetails: LocationDetail[];
  locationIds: number[];
}

export interface AgentProfile {
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
  activationDate: string;
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
  role: string | null;
  collegeAccessList: CollegeAccess[];
  // Helper property for UI state
  isExpanded?: boolean;
}

@Component({
  selector: 'app-all-agent-details',
  standalone: false,
  templateUrl: './all-agent-details.html',
  styleUrl: './all-agent-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AllAgentDetails implements OnInit, OnDestroy {
  agents: AgentProfile[] = [];
  selectedAgent: AgentProfile | null = null;
  isLoading: boolean = true;
  error: string | null = null;

  // Search functionality
  searchQuery: string = '';
  showFloatingSearch: boolean = false;
  isSearchFocused: boolean = false;

  // Reference to search section for scroll detection
  @ViewChild('searchSection') searchSection!: ElementRef;

  // Track which states are expanded for click-to-reveal districts
  expandedStates: Map<string, boolean> = new Map();

  private destroy$ = new Subject<void>();
  private apiUrl = environment.apiUrl + '/api/agents/all-details';

  /**
   * Get filtered agents based on search query
   * Filters by name, userId, and email
   */
  get filteredAgents(): AgentProfile[] {
    if (!this.searchQuery.trim()) {
      return this.agents;
    }

    const query = this.searchQuery.toLowerCase().trim();
    return this.agents.filter(agent =>
      (agent.fullName && agent.fullName.toLowerCase().includes(query)) ||
      (agent.userId && agent.userId.toLowerCase().includes(query)) ||
      (agent.email && agent.email.toLowerCase().includes(query))
    );
  }

  /**
   * Handle search input changes
   */
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.cdr.markForCheck();
  }

  /**
   * Clear search query
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.cdr.markForCheck();
  }

  /**
   * Handle window scroll for floating search button
   */
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (this.searchSection?.nativeElement) {
      const rect = this.searchSection.nativeElement.getBoundingClientRect();
      this.showFloatingSearch = rect.bottom < 0;
      this.cdr.markForCheck();
    }
  }

  /**
   * Scroll to search and focus
   */
  scrollToSearch(): void {
    if (this.searchSection?.nativeElement) {
      this.searchSection.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus the input after scrolling
      setTimeout(() => {
        const input = this.searchSection.nativeElement.querySelector('.search-input');
        if (input) {
          input.focus();
        }
      }, 500);
    }
  }

  /**
   * Toggle floating search panel
   */
  toggleFloatingSearch(): void {
    this.isSearchFocused = !this.isSearchFocused;
    this.cdr.markForCheck();
  }

  /**
   * Navigate back to agents dashboard
   */
  goToAgentsDashboard(): void {
    this.router.navigate(['/admin-dashboard/agents']);
  }

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.fetchAgents();
  }

  fetchAgents(): void {
    this.isLoading = true;
    this.error = null;

    this.http.get<AgentProfile[]>(this.apiUrl)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
        catchError((err) => {
          console.error('Failed to fetch agents:', err);
          this.error = 'Failed to load agent data. Please check the API and try again.';
          return of([]);
        })
      )
      .subscribe((data) => {
        this.agents = data;
      });
  }

  selectAgent(agent: AgentProfile): void {
    this.selectedAgent = agent;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.markForCheck();
  }

  goBack(): void {
    this.selectedAgent = null;
    this.cdr.markForCheck();
  }

  // Modal State
  showDistrictModal = false;
  modalStateName = '';
  modalDistricts: string[] = [];

  openDistrictModal(stateName: string, districts: string[]) {
    this.modalStateName = stateName;
    this.modalDistricts = districts;
    this.showDistrictModal = true;
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
  }

  closeDistrictModal() {
    this.showDistrictModal = false;
    this.modalStateName = '';
    this.modalDistricts = [];
    // Restore background scrolling
    document.body.style.overflow = '';
  }

  // --- Helper Methods ---

  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getStatusClass(status: string): string {
    if (!status) return 'inactive';
    switch (status.toLowerCase()) {
      case 'active': return 'active';
      case 'pending': return 'pending';
      case 'inactive': return 'inactive';
      default: return 'inactive';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getLocationsCount(access: CollegeAccess): number {
    return access.accessAllLocations ? -1 : access.locationDetails?.length || 0;
  }

  /**
   * Groups location details by state for cleaner display.
   * Returns a map of state -> district[]
   */
  getLocationsByState(locations: LocationDetail[]): Map<string, string[]> {
    const stateMap = new Map<string, string[]>();

    if (!locations) return stateMap;

    locations.forEach(loc => {
      if (!stateMap.has(loc.state)) {
        stateMap.set(loc.state, []);
      }
      if (loc.district) {
        stateMap.get(loc.state)?.push(loc.district);
      }
    });

    return stateMap;
  }

  /**
   * Checks if agent has too many locations to display individually
   */
  hasLargeLocationList(access: CollegeAccess): boolean {
    return !access.accessAllLocations && (access.locationDetails?.length || 0) > 20;
  }

  /**
   * Toggle state expansion to show/hide districts
   */
  toggleState(collegeId: number, stateName: string, event: Event): void {
    event.stopPropagation();
    const key = `${collegeId}-${stateName}`;
    this.expandedStates.set(key, !this.expandedStates.get(key));
    this.cdr.markForCheck();
  }

  /**
   * Check if a state is expanded
   */
  isStateExpanded(collegeId: number, stateName: string): boolean {
    const key = `${collegeId}-${stateName}`;
    return this.expandedStates.get(key) || false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
