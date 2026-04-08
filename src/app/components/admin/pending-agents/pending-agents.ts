import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';
import { environment } from '../../../../environments/environment';

interface Agent {
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
  password: string;
  collegePrivileges: any[];
  accessibleLocations: any[];
  student: any[];
}

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

// Per-college location access entry (same as admin-agent-registration)
interface CollegeAccessEntry {
  collegeId: number;
  collegeName: string;
  city: string;
  accessAllLocations: boolean;
  locationIds: number[];
}

@Component({
  selector: 'app-pending-agents',
  templateUrl: './pending-agents.html',
  standalone: false,
  styleUrls: ['./pending-agents.css'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('200ms ease-in', style({ height: '0', opacity: 0 }))
      ])
    ])
  ]
})
export class PendingAgents implements OnInit {
  pendingAgents: Agent[] = [];
  colleges: College[] = [];
  locations: Location[] = [];
  states: string[] = [];
  districtsByState: { [state: string]: Location[] } = {};

  selectedAgent: Agent | null = null;

  // Per-college access (replaces flat selectedCollegeIds/selectedLocationIds)
  collegeAccessList: CollegeAccessEntry[] = [];
  selectedCollegeToAdd: string = '';
  expandedStates: { [key: string]: boolean } = {};

  isDetailsModalOpen = false;
  isApproveModalOpen = false;
  isSuccessModalOpen = false;
  isProcessingSpinnerOpen = false;
  isApproving = false;
  refreshRotation = 0;
  isLoading = true;

  private apiBase = environment.apiUrl + '/api';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadData();
  }

  /* --------------------------------------------------------------------- */
  /* ----------------------------- LOAD DATA ----------------------------- */
  /* --------------------------------------------------------------------- */
  loadData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    forkJoin({
      agents: this.http.get<Agent[]>(`${this.apiBase}/agents/pending`),
      colleges: this.http.get<College[]>(`${this.apiBase}/colleges`),
      locations: this.http.get<Location[]>(`${this.apiBase}/locations`)
    }).subscribe({
      next: (data) => {
        this.pendingAgents = data.agents || [];
        this.colleges = data.colleges || [];
        this.locations = data.locations || [];
        this.buildStateDistrictMap();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load failed:', err);
        this.pendingAgents = [];
        this.colleges = [];
        this.locations = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private buildStateDistrictMap() {
    const map: { [s: string]: Location[] } = {};
    const set = new Set<string>();

    this.locations.forEach(l => {
      if (!l.state || !l.district) return;
      set.add(l.state);
      if (!map[l.state]) map[l.state] = [];
      map[l.state].push(l);
    });

    this.states = Array.from(set).sort();
    this.districtsByState = map;
  }

  /* --------------------------------------------------------------------- */
  /* ----------------------- DETAILS MODAL ------------------------------ */
  /* --------------------------------------------------------------------- */
  showDetails(agent: Agent) {
    this.selectedAgent = agent;
    this.isDetailsModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    setTimeout(() => {
      if (!this.isApproveModalOpen) {
        this.selectedAgent = null;
      }
    }, 300);
  }

  onDetailsOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('pa-modal-overlay')) {
      this.closeDetailsModal();
    }
  }

  /* --------------------------------------------------------------------- */
  /* ----------------------- APPROVE MODAL ------------------------------ */
  /* --------------------------------------------------------------------- */
  startApproving(agent?: Agent) {
    if (agent) {
      this.selectedAgent = agent;
    }
    if (!this.selectedAgent) {
      alert('No agent selected. Please try again.');
      return;
    }

    this.closeDetailsModal();
    this.collegeAccessList = [];
    this.selectedCollegeToAdd = '';
    this.expandedStates = {};
    this.isApproveModalOpen = true;
    this.cdr.detectChanges();
  }

  closeApproveModal() {
    this.isApproveModalOpen = false;
    setTimeout(() => {
      this.selectedAgent = null;
      this.collegeAccessList = [];
      this.selectedCollegeToAdd = '';
      this.expandedStates = {};
    }, 300);
  }

  onApproveOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('pa-modal-overlay')) {
      this.closeApproveModal();
    }
  }

  /* --------------------------------------------------------------------- */
  /* --------------- COLLEGE ACCESS MANAGEMENT (per-college) ------------- */
  /* --------------------------------------------------------------------- */

  // Get colleges not yet added
  getAvailableColleges(): College[] {
    const addedIds = this.collegeAccessList.map(e => e.collegeId);
    return this.colleges.filter(c => !addedIds.includes(c.id));
  }

  // Add a college to the access list
  addCollegeAccess() {
    const collegeId = parseInt(this.selectedCollegeToAdd, 10);
    if (!collegeId) return;

    const college = this.colleges.find(c => c.id === collegeId);
    if (!college) return;
    if (this.collegeAccessList.some(e => e.collegeId === collegeId)) return;

    this.collegeAccessList.push({
      collegeId: college.id,
      collegeName: college.collegeName,
      city: college.city,
      accessAllLocations: false,
      locationIds: []
    });

    this.selectedCollegeToAdd = '';
    this.cdr.detectChanges();
  }

  // Remove a college
  removeCollegeAccess(collegeId: number) {
    this.collegeAccessList = this.collegeAccessList.filter(e => e.collegeId !== collegeId);
    Object.keys(this.expandedStates).forEach(key => {
      if (key.endsWith('_' + collegeId)) {
        delete this.expandedStates[key];
      }
    });
    this.cdr.detectChanges();
  }

  // Toggle "All India Access" for a college
  toggleAccessAllLocations(collegeId: number) {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;

    entry.accessAllLocations = !entry.accessAllLocations;
    if (entry.accessAllLocations) {
      entry.locationIds = this.locations.map(l => l.id);
    } else {
      entry.locationIds = [];
    }
    this.cdr.detectChanges();
  }

  // Toggle state expansion (per college)
  toggleStateExpansion(key: string) {
    this.expandedStates[key] = !this.expandedStates[key];
  }

  // Check if location is selected for a specific college
  isLocationSelectedForCollege(collegeId: number, locationId: number): boolean {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    return entry ? entry.locationIds.includes(locationId) : false;
  }

  // Toggle a specific location for a college
  toggleLocationForCollege(collegeId: number, locationId: number) {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;

    const idx = entry.locationIds.indexOf(locationId);
    if (idx === -1) {
      entry.locationIds.push(locationId);
    } else {
      entry.locationIds.splice(idx, 1);
    }

    entry.accessAllLocations = entry.locationIds.length === this.locations.length;
    this.cdr.detectChanges();
  }

  // Check if all districts of a state are selected for a college
  isAllDistrictsSelectedForCollege(collegeId: number, state: string): boolean {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return false;

    const stateLocations = this.districtsByState[state] || [];
    return stateLocations.length > 0 && stateLocations.every(loc => entry.locationIds.includes(loc.id));
  }

  // Toggle all districts of a state for a college
  toggleAllDistrictsForCollege(collegeId: number, state: string) {
    const entry = this.collegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;

    const stateLocations = this.districtsByState[state] || [];
    const allSelected = this.isAllDistrictsSelectedForCollege(collegeId, state);

    if (allSelected) {
      stateLocations.forEach(loc => {
        const idx = entry.locationIds.indexOf(loc.id);
        if (idx !== -1) entry.locationIds.splice(idx, 1);
      });
    } else {
      stateLocations.forEach(loc => {
        if (!entry.locationIds.includes(loc.id)) entry.locationIds.push(loc.id);
      });
    }

    entry.accessAllLocations = entry.locationIds.length === this.locations.length;
    this.cdr.detectChanges();
  }

  // Get district count for a state
  getDistrictCountForState(state: string): number {
    return this.districtsByState[state]?.length || 0;
  }

  // Check if any valid college access exists
  hasValidCollegeAccess(): boolean {
    return this.collegeAccessList.length > 0 &&
      this.collegeAccessList.every(e => e.locationIds.length > 0);
  }

  approvedAgentCredentials: { userId: string, password?: string } | null = null;

  /* --------------------------------------------------------------------- */
  /* ----------------------------- APPROVE ------------------------------- */
  /* --------------------------------------------------------------------- */
  approveAgent() {
    if (!this.selectedAgent) {
      alert('Agent selection was lost. Please close the modal and try again.');
      return;
    }

    if (this.collegeAccessList.length === 0) {
      alert('Please add at least one college with location access.');
      return;
    }

    const collegeWithNoLocations = this.collegeAccessList.find(e => e.locationIds.length === 0);
    if (collegeWithNoLocations) {
      alert(`Please select at least one location for ${collegeWithNoLocations.collegeName}.`);
      return;
    }

    this.isApproving = true;
    this.cdr.detectChanges();

    // Build per-college access list payload
    const collegeAccessListPayload = this.collegeAccessList.map(entry => ({
      collegeId: entry.collegeId,
      accessAllLocations: entry.accessAllLocations,
      locationIds: entry.locationIds
    }));

    const payload = {
      collegeAccessList: collegeAccessListPayload,
      // Also send flat arrays for backward compatibility
      collegeIds: this.collegeAccessList.map(e => e.collegeId),
      locationIds: [...new Set(this.collegeAccessList.flatMap(e => e.locationIds))]
    };

    this.http.post<Agent>(`${this.apiBase}/agents/approve/${this.selectedAgent.id}`, payload).subscribe({
      next: (res) => {
        this.approvedAgentCredentials = { userId: res.userId, password: res.password };
        this.pendingAgents = this.pendingAgents.filter(a => a.id !== this.selectedAgent!.id);
        this.isApproving = false;
        this.closeApproveModal();

        this.isProcessingSpinnerOpen = true;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.isProcessingSpinnerOpen = false;
          this.showSuccessModal();
        }, 1500);
      },
      error: (err) => {
        console.error('Approval failed:', err);
        this.isApproving = false;
        alert(`Approval failed: ${err.error?.message || err.message || 'Unknown error'}`);
        this.cdr.detectChanges();
      }
    });
  }

  showSuccessModal() {
    this.isSuccessModalOpen = true;
    this.cdr.detectChanges();
  }

  closeSuccessModal() {
    this.isSuccessModalOpen = false;
    this.selectedAgent = null;
    this.approvedAgentCredentials = null;
    this.cdr.detectChanges();
  }

  refreshData() {
    this.refreshRotation += 360;
    this.loadData();
  }
}