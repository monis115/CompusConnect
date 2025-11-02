import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';

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

interface StateGroup {
  state: string;
  districts: Location[];
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
  stateGroups: StateGroup[] = [];

  selectedAgent: Agent | null = null;
  selectedCollegeIds: number[] = [];
  selectedLocationIds: number[] = [];
  expandedStates: Set<string> = new Set();
  isDetailsModalOpen = false;
  isApproveModalOpen = false;
  isSuccessModalOpen = false;
  isProcessingSpinnerOpen = false;
  isApproving = false;
  refreshRotation = 0;
  isLoading = true;

  private apiBase = 'http://localhost:8080/api';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    console.log('PendingAgents component initialized');
    this.loadData();
  }

  loadData() {
    console.log('Loading data...');
    this.isLoading = true;
    this.cdr.detectChanges();

    forkJoin({
      agents: this.http.get<Agent[]>(`${this.apiBase}/agents/pending`),
      colleges: this.http.get<College[]>(`${this.apiBase}/colleges`),
      locations: this.http.get<Location[]>(`${this.apiBase}/locations`)
    }).subscribe({
      next: (data) => {
        console.log('Data loaded successfully:', {
          agents: data.agents?.length || 0,
          colleges: data.colleges?.length || 0,
          locations: data.locations?.length || 0
        });
        
        this.pendingAgents = data.agents || [];
        this.colleges = data.colleges || [];
        this.locations = data.locations || [];
        this.groupLocationsByState();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load failed:', err);
        this.pendingAgents = [];
        this.colleges = [];
        this.locations = [];
        this.stateGroups = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  groupLocationsByState() {
    console.log('Grouping locations by state...');
    const map = new Map<string, Location[]>();
    this.locations.forEach(loc => {
      if (!map.has(loc.state)) map.set(loc.state, []);
      map.get(loc.state)!.push(loc);
    });
    this.stateGroups = Array.from(map.entries())
      .map(([state, districts]) => ({ state, districts }))
      .sort((a, b) => a.state.localeCompare(b.state));
    console.log('State groups created:', this.stateGroups.length);
  }

  showDetails(agent: Agent) {
    console.log('Showing details for agent:', agent.fullName);
    this.selectedAgent = agent;
    this.isDetailsModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDetailsModal() {
    console.log('Closing details modal');
    this.isDetailsModalOpen = false;
    setTimeout(() => {
      if (!this.isApproveModalOpen) {
        this.selectedAgent = null;
      }
    }, 300);
  }

  onDetailsOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('pa-modal-overlay')) {
      console.log('Overlay clicked - closing details modal');
      this.closeDetailsModal();
    }
  }

  startApproving(agent?: Agent) {
    console.log('startApproving called with:', agent);
    
    if (agent) {
      this.selectedAgent = agent;
    }
    
    if (!this.selectedAgent) {
      console.error('No agent provided to startApproving!');
      alert('No agent selected. Please try again.');
      return;
    }
    
    console.log('Selected agent for approval:', this.selectedAgent.fullName);
    
    this.closeDetailsModal();
    this.selectedCollegeIds = [];
    this.selectedLocationIds = [];
    this.isApproveModalOpen = true;
    
    console.log('Approve modal opened for agent:', this.selectedAgent.fullName);
    this.cdr.detectChanges();
  }

  closeApproveModal() {
    console.log('Closing approve modal');
    this.isApproveModalOpen = false;
    
    setTimeout(() => {
      this.selectedAgent = null;
      this.selectedCollegeIds = [];
      this.selectedLocationIds = [];
      console.log('Approve modal data cleared');
    }, 300);
  }

  onApproveOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('pa-modal-overlay')) {
      console.log('Overlay clicked - closing approve modal');
      this.closeApproveModal();
    }
  }

  // College Selection Functions
  toggleCollege(collegeId: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.selectedCollegeIds = this.selectedCollegeIds.includes(collegeId)
      ? this.selectedCollegeIds.filter(id => id !== collegeId)
      : [...this.selectedCollegeIds, collegeId];
    console.log(`Toggled college ${collegeId}. Selected colleges:`, this.selectedCollegeIds);
    this.cdr.detectChanges();
  }

  isAllCollegesSelected(): boolean {
    return this.colleges.length > 0 && this.selectedCollegeIds.length === this.colleges.length;
  }

  toggleAllColleges(checked: boolean, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.selectedCollegeIds = checked ? this.colleges.map(c => c.id) : [];
    console.log(`Toggled all colleges (${checked ? 'selected' : 'deselected'}):`, this.selectedCollegeIds);
    this.cdr.detectChanges();
  }

  // Location Selection Functions
  toggleLocation(locationId: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.selectedLocationIds = this.selectedLocationIds.includes(locationId)
      ? this.selectedLocationIds.filter(id => id !== locationId)
      : [...this.selectedLocationIds, locationId];
    console.log(`Toggled location ${locationId}. Selected locations:`, this.selectedLocationIds);
    this.cdr.detectChanges();
  }

  isAllLocationsSelected(): boolean {
    const allLocationIds = this.locations.map(l => l.id);
    return allLocationIds.length > 0 && this.selectedLocationIds.length === allLocationIds.length;
  }

  toggleAllLocations(checked: boolean, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const allIds = this.locations.map(l => l.id);
    if (checked) {
      this.selectedLocationIds = [...new Set([...this.selectedLocationIds, ...allIds])];
    } else {
      this.selectedLocationIds = this.selectedLocationIds.filter(id => !allIds.includes(id));
    }
    console.log(`Toggled all locations (${checked ? 'selected' : 'deselected'}):`, this.selectedLocationIds.length);
    this.cdr.detectChanges();
  }

  isAllDistrictsInStateSelected(group: StateGroup): boolean {
    return group.districts.every(d => this.selectedLocationIds.includes(d.id));
  }

  toggleAllDistrictsInState(group: StateGroup, checked: boolean, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const districtIds = group.districts.map(d => d.id);
    if (checked) {
      this.selectedLocationIds = [...new Set([...this.selectedLocationIds, ...districtIds])];
    } else {
      this.selectedLocationIds = this.selectedLocationIds.filter(id => !districtIds.includes(id));
    }
    console.log(`Toggled all districts in ${group.state} (${checked ? 'selected' : 'deselected'})`);
    this.cdr.detectChanges();
  }

  getSelectedDistrictsCount(group: StateGroup): number {
    return group.districts.filter(d => this.selectedLocationIds.includes(d.id)).length;
  }

  toggleStateExpansion(state: string, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.expandedStates.has(state)) {
      this.expandedStates.delete(state);
    } else {
      this.expandedStates.add(state);
    }
    this.cdr.detectChanges();
  }

  isStateExpanded(state: string): boolean {
    return this.expandedStates.has(state);
  }

  approveAgent() {
    console.log('=== APPROVE AGENT CALLED ===');
    console.log('selectedAgent:', this.selectedAgent);
    console.log('selectedCollegeIds:', this.selectedCollegeIds);
    console.log('selectedLocationIds:', this.selectedLocationIds);
    
    if (!this.selectedAgent) {
      console.error('Agent selection was lost!');
      alert('Agent selection was lost. Please close the modal and try again.');
      return;
    }
    
    if (this.selectedCollegeIds.length === 0 && this.selectedLocationIds.length === 0) {
      console.warn('No colleges or locations selected');
      alert('Please select at least one college or location.');
      return;
    }

    console.log('Validation passed. Starting approval process...');
    this.isApproving = true;
    this.cdr.detectChanges();

    const payload = {
      fullName: this.selectedAgent.fullName,
      gender: this.selectedAgent.gender,
      dob: this.selectedAgent.dob,
      age: this.selectedAgent.age,
      email: this.selectedAgent.email,
      contactNo: this.selectedAgent.contactNo,
      address: this.selectedAgent.address,
      identityProofType: this.selectedAgent.identityProofType,
      identityProofNumber: this.selectedAgent.identityProofNumber,
      designation: this.selectedAgent.designation,
      experience: this.selectedAgent.experience,
      status: "Active",
      companyName: this.selectedAgent.companyName,
      registeredBusinessName: this.selectedAgent.registeredBusinessName,
      businessType: this.selectedAgent.businessType,
      registrationNumber: this.selectedAgent.registrationNumber,
      panOrGstNumber: this.selectedAgent.panOrGstNumber,
      registeredOfficeAddress: this.selectedAgent.registeredOfficeAddress,
      branchOfficeAddress: this.selectedAgent.branchOfficeAddress,
      companyEmail: this.selectedAgent.companyEmail,
      companyContactNo: this.selectedAgent.companyContactNo,
      website: this.selectedAgent.website,
      approvedCollegeIds: this.selectedCollegeIds,
      collegeIds: this.selectedCollegeIds,
      locationIds: this.selectedLocationIds
    };

    console.log('Payload prepared:', payload);
    console.log('Making PUT request to:', `${this.apiBase}/admins/agents/${this.selectedAgent.id}`);

    this.http.put(`${this.apiBase}/admins/agents/${this.selectedAgent.id}`, payload).subscribe({
      next: () => {
        console.log('Agent approved successfully!');
        this.pendingAgents = this.pendingAgents.filter(a => a.id !== this.selectedAgent!.id);
        this.isApproving = false;
        this.closeApproveModal();
        
        // Show processing spinner first
        this.isProcessingSpinnerOpen = true;
        this.cdr.detectChanges();
        
        // After 1.5 seconds, show success modal
        setTimeout(() => {
          this.isProcessingSpinnerOpen = false;
          this.showSuccessModal();
        }, 1500);
      },
      error: (err) => {
        console.error('Update failed:', err);
        console.error('Error details:', err.error);
        this.isApproving = false;
        alert(`Update failed: ${err.message || 'Unknown error'}. Check console for details.`);
        this.cdr.detectChanges();
      }
    });
  }

  showSuccessModal() {
    console.log('Showing success modal');
    this.isSuccessModalOpen = true;
    this.cdr.detectChanges();
  }

  closeSuccessModal() {
    console.log('Closing success modal');
    this.isSuccessModalOpen = false;
    this.selectedAgent = null;
    this.cdr.detectChanges();
  }

  refreshData() {
    console.log('Refreshing data...');
    this.refreshRotation += 360;
    this.loadData();
  }
}