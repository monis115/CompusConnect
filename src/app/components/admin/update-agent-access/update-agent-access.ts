
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location as BrowserLocation } from '@angular/common';

// --- Interfaces ---

interface Location {
  id: number;
  state: string;
  district: string;
}

interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
}

// Interface for API GET /api/agents/all-details response items
interface AgentProfile {
  id: number;
  fullName: string;
  email: string;
  contactNo: string;
  status: string;
  userId: string;
  companyName: string;
  registeredBusinessName: string;
  businessType: string;
  registrationNumber: string;
  panOrGstNumber: string;
  registeredOfficeAddress: string;
  companyEmail: string;
  companyContactNo: string;
  collegeAccessList: {
    collegeId: number;
    collegeName: string;
    accessAllLocations: boolean;
    locationDetails: Location[]; // The API returns details here
  }[];
  // ... other fields present in profile but not critical for this specific update, 
  // we will preserve them if we send full object back, but usually we map specific fields.
  // The user says "Include other required fields". We will assume the profile has enough.
  [key: string]: any;
}

// Interface for our local editing state
interface CollegeAccessEntry {
  collegeId: number;
  collegeName: string;
  city?: string;
  accessAllLocations: boolean;
  locationIds: number[];
}

@Component({
  selector: 'app-update-agent-access',
  standalone: false,
  templateUrl: './update-agent-access.html',
  styleUrl: './update-agent-access.css',
})
export class UpdateAgentAccess implements OnInit {

  // Data Source
  agents: AgentProfile[] = [];
  filteredAgents: AgentProfile[] = [];
  colleges: College[] = [];
  locations: Location[] = [];

  // Helper Maps
  districtsByState: { [state: string]: Location[] } = {};
  states: string[] = [];

  // UI State
  searchQuery: string = '';
  loading = false;
  saving = false;
  error = '';
  successMessage = '';

  // Selection / Editing
  selectedAgent: AgentProfile | null = null;

  // Editing Form State
  editStatus: string = '';
  editCollegeAccessList: CollegeAccessEntry[] = [];
  selectedCollegeToAdd: string = ''; // Stores ID as string from select
  expandedStates: { [key: string]: boolean } = {}; // key: "collegeId-stateName"

  private agentsUrl = 'http://localhost:8080/api/agents/all-details';
  private collegesUrl = 'http://localhost:8080/api/colleges';
  private locationsUrl = 'http://localhost:8080/api/locations';
  private updateUrlBase = 'http://localhost:8080/api/admins/agents';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private location: BrowserLocation
  ) { }

  ngOnInit() {
    this.loadInitialData();
  }

  goBack() {
    if (this.selectedAgent) {
      this.selectedAgent = null;
      this.searchQuery = '';
      this.filterAgents();
    } else {
      this.location.back();
    }
  }

  // --- Data Loading ---

  loadInitialData() {
    this.loading = true;
    Promise.all([
      this.http.get<AgentProfile[]>(this.agentsUrl).toPromise(),
      this.http.get<College[]>(this.collegesUrl).toPromise(),
      this.http.get<Location[]>(this.locationsUrl).toPromise()
    ]).then(([agents, colleges, locations]) => {
      this.agents = agents || [];
      this.colleges = colleges || [];
      this.locations = locations || [];

      this.filteredAgents = [...this.agents];
      this.buildStateDistrictMap();
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(err => {
      console.error('Error loading data', err);
      this.error = 'Failed to load initial data.';
      this.loading = false;
      this.cdr.detectChanges();
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

  // --- Search ---

  onSearchChange() {
    this.filterAgents();
  }

  filterAgents() {
    if (!this.searchQuery.trim()) {
      this.filteredAgents = [...this.agents];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredAgents = this.agents.filter(a =>
        (a.fullName && a.fullName.toLowerCase().includes(q)) ||
        (a.userId && a.userId.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
      );
    }
  }

  // --- Selection & Edit Init ---

  selectAgent(agent: AgentProfile) {
    this.selectedAgent = agent;
    this.editStatus = agent.status;

    // Map existing access list to editable structure
    this.editCollegeAccessList = (agent.collegeAccessList || []).map(access => ({
      collegeId: access.collegeId,
      collegeName: access.collegeName,
      city: this.getCollegeCity(access.collegeId),
      accessAllLocations: access.accessAllLocations,
      locationIds: (access.locationDetails || []).map(l => l.id)
    }));

    this.expandedStates = {};
    this.selectedCollegeToAdd = '';
    this.error = '';
    this.successMessage = '';
  }

  getCollegeCity(id: number): string {
    const c = this.colleges.find(col => col.id === id);
    return c ? c.city : '';
  }

  getAvailableColleges(): College[] {
    const addedIds = this.editCollegeAccessList.map(e => e.collegeId);
    return this.colleges.filter(c => !addedIds.includes(c.id));
  }

  // --- Access Management Logic ---

  addCollegeAccess() {
    const cid = parseInt(this.selectedCollegeToAdd, 10);
    if (!cid) return;

    const college = this.colleges.find(c => c.id === cid);
    if (!college) return;

    if (this.editCollegeAccessList.some(e => e.collegeId === cid)) return;

    this.editCollegeAccessList.push({
      collegeId: college.id,
      collegeName: college.collegeName,
      city: college.city,
      accessAllLocations: false,
      locationIds: []
    });

    this.selectedCollegeToAdd = '';
  }

  removeCollegeAccess(collegeId: number) {
    this.editCollegeAccessList = this.editCollegeAccessList.filter(e => e.collegeId !== collegeId);
    // Cleanup expanded states
    Object.keys(this.expandedStates).forEach(key => {
      if (key.startsWith(collegeId + '-')) delete this.expandedStates[key];
    });
  }

  toggleAccessAllLocations(collegeId: number) {
    const entry = this.editCollegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;

    entry.accessAllLocations = !entry.accessAllLocations;
    if (entry.accessAllLocations) {
      entry.locationIds = this.locations.map(l => l.id);
    } else {
      entry.locationIds = [];
    }
  }

  // State Expansion
  toggleStateExpansion(collegeId: number, state: string) {
    const key = `${collegeId} -${state} `;
    this.expandedStates[key] = !this.expandedStates[key];
  }

  isStateExpanded(collegeId: number, state: string): boolean {
    return !!this.expandedStates[`${collegeId} -${state} `];
  }

  // Location Toggles
  isLocationSelected(collegeId: number, locationId: number): boolean {
    const entry = this.editCollegeAccessList.find(e => e.collegeId === collegeId);
    return entry ? entry.locationIds.includes(locationId) : false;
  }

  toggleLocation(collegeId: number, locationId: number) {
    const entry = this.editCollegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;

    const idx = entry.locationIds.indexOf(locationId);
    if (idx > -1) {
      entry.locationIds.splice(idx, 1);
    } else {
      entry.locationIds.push(locationId);
    }

    // Auto-update accessAllLocations
    entry.accessAllLocations = entry.locationIds.length === this.locations.length;
  }

  // Bulk State Toggle
  isAllStateSelected(collegeId: number, state: string): boolean {
    const entry = this.editCollegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return false;
    const stateLocs = this.districtsByState[state] || [];
    if (stateLocs.length === 0) return false;
    return stateLocs.every(l => entry.locationIds.includes(l.id));
  }

  toggleStateLocations(collegeId: number, state: string) {
    const entry = this.editCollegeAccessList.find(e => e.collegeId === collegeId);
    if (!entry) return;

    const stateLocs = this.districtsByState[state] || [];
    const allSelected = this.isAllStateSelected(collegeId, state);

    if (allSelected) {
      // Deselect all
      stateLocs.forEach(l => {
        const idx = entry.locationIds.indexOf(l.id);
        if (idx > -1) entry.locationIds.splice(idx, 1);
      });
    } else {
      // Select all
      stateLocs.forEach(l => {
        if (!entry.locationIds.includes(l.id)) entry.locationIds.push(l.id);
      });
    }

    entry.accessAllLocations = entry.locationIds.length === this.locations.length;
  }

  // Helpers for View
  getSelectedCount(collegeId: number): number {
    const entry = this.editCollegeAccessList.find(e => e.collegeId === collegeId);
    return entry ? entry.locationIds.length : 0;
  }

  // --- Save ---

  saveChanges() {
    if (!this.selectedAgent) return;

    this.saving = true;
    this.error = '';
    this.successMessage = '';

    // Construct Payload
    // The user requirement says: "Include other required fields".
    // We will clone the selectedAgent and override status and collegeAccessList.
    // We need to map editCollegeAccessList to the structure required by the DTO.
    // The DTO format in user example: { collegeId: 1, accessAllLocations: false, locationIds: [10, 11] }

    // Note: The example included all fields like fullName, email etc. 
    // We'll rely on our selectedAgent having them.

    const payload = {
      ...this.selectedAgent,
      status: this.editStatus,
      collegeAccessList: this.editCollegeAccessList.map(e => ({
        collegeId: e.collegeId,
        accessAllLocations: e.accessAllLocations,
        locationIds: e.locationIds
      }))
    };

    // Remove fields that might not be in the DTO or are read-only if necessary, 
    // but usually sending back the same object is fine. 
    // Just in case, removing 'collegeAccessList' from the spread wasn't necessary as we overrode it.
    // But typically 'student' array or huge nested objects might cause issues if backend doesn't expect them or if they are lazy loaded (not here).
    // The user example shows basic fields. I'll send what is in AgentProfile + new lists.

    // NOTE: accessAllLocations might be boolean or what? boolean in interface.

    console.log('Sending Update Payload:', payload);

    this.http.put(`${this.updateUrlBase}/${this.selectedAgent.id}`, payload).subscribe({
      next: (res) => {
        console.log('Update success', res);
        this.successMessage = 'Agent access updated successfully!';
        this.saving = false;

        // Update the local list to reflect changes
        const index = this.agents.findIndex(a => a.id === this.selectedAgent!.id);
        if (index > -1) {
          // We should ideally reload to get fresh data, but we can patch locally
          // Be careful: res might be the updated object.
          this.agents[index] = { ...this.agents[index], status: this.editStatus, collegeAccessList: (res as any).collegeAccessList || [] }; // simple patch
          // Actually, reloading is safer to get the correct collegeAccessList structure with details
          this.loadInitialData();
        }

        // Don't close immediately so they see success? Or navigate back?
        // Let's scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        console.error('Update failed', err);
        this.error = 'Failed to update agent access. Please try again.';
        this.saving = false;
      }
    });
  }
}
