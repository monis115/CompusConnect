import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, TrackByFunction } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface College { id: number; collegeName: string; city: string; country: string; }
interface Location { id: number; state: string; district: string; }

interface Agent {
  id: number;
  fullName: string;
  email: string;
  contactNo: string;
  companyName: string;
  status: string;
  userId: string;
  collegeAccessCount: number;
  locationAccessCount: number;
  collegePrivileges?: College[];
  accessibleLocations?: Location[];
  designation?: string; // Optional as it was in old code but not in new JSON
}

@Component({
  selector: 'app-active-agents',
  standalone: false,
  templateUrl: './active-agents.html',
  styleUrl: './active-agents.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActiveAgents implements OnInit {
  agents: Agent[] = [];
  filteredAgents: Agent[] = [];
  displayedColumns: string[] = ['fullName', 'email', 'contactNo', 'company', 'colleges', 'locations', 'status'];
  loading = true;
  error: string | null = null;

  // Modal
  showModal = false;
  modalTitle = '';
  modalColleges: College[] = [];
  modalLocations: Location[] = [];
  modalType: 'college' | 'location' = 'college';

  // Search
  globalSearch = '';
  modalSearch = '';
  filteredColleges: College[] = [];
  filteredLocations: Location[] = [];

  trackByAgentId: TrackByFunction<Agent> = (index: number, agent: Agent) => agent.id;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents() {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.http.get<Agent[]>(environment.apiUrl + '/api/agents/active').subscribe({
      next: (data) => {
        this.agents = data;
        this.filteredAgents = [...data];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading agents:', err);
        // Fallback or just show error
        this.error = 'Failed to load agents. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin-dashboard/agents']);
  }

  // GLOBAL SEARCH
  onGlobalSearch() {
    const query = this.globalSearch.toLowerCase().trim();
    this.filteredAgents = this.agents.filter(agent =>
      agent.fullName.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query) ||
      agent.contactNo.includes(query.replace(/[- ]/g, '')) ||
      (agent.companyName && agent.companyName.toLowerCase().includes(query))
    );
    this.cdr.markForCheck();
  }

  clearGlobalSearch() {
    this.globalSearch = '';
    this.onGlobalSearch();
  }

  // MODAL SEARCH
  onModalSearch() {
    const query = this.modalSearch.toLowerCase().trim();
    if (this.modalType === 'college') {
      this.filteredColleges = this.modalColleges.filter(c =>
        c.collegeName.toLowerCase().includes(query) ||
        c.city.toLowerCase().includes(query) ||
        c.country.toLowerCase().includes(query)
      );
    } else {
      this.filteredLocations = this.modalLocations.filter(l =>
        l.district.toLowerCase().includes(query) ||
        l.state.toLowerCase().includes(query)
      );
    }
    this.cdr.markForCheck();
  }

  clearModalSearch() {
    this.modalSearch = '';
    this.onModalSearch();
  }

  openCollegesModal(agent: Agent, event: Event) {
    event.stopPropagation();
    if (!agent.collegePrivileges || agent.collegePrivileges.length === 0) return;

    this.modalType = 'college';
    this.modalTitle = `${agent.fullName} - College Access`;
    this.modalColleges = agent.collegePrivileges;
    this.filteredColleges = [...this.modalColleges];
    this.modalSearch = '';
    this.showModal = true;
    this.cdr.markForCheck();
  }

  openLocationsModal(agent: Agent, event: Event) {
    event.stopPropagation();
    if (!agent.accessibleLocations || agent.accessibleLocations.length === 0) return;

    this.modalType = 'location';
    this.modalTitle = `${agent.fullName} - Location Access`;
    this.modalLocations = agent.accessibleLocations;
    this.filteredLocations = [...this.modalLocations];
    this.modalSearch = '';
    this.showModal = true;
    this.cdr.markForCheck();
  }

  closeModal() {
    this.showModal = false;
    this.modalSearch = '';
    this.cdr.markForCheck();
  }
}