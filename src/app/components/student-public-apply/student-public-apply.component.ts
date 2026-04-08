import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-student-public-apply',
  templateUrl: './student-public-apply.html',
  styleUrls: ['./student-public-apply.css'],
  standalone: false
})
export class StudentPublicApplyComponent implements OnInit {
  agentId: string = '';
  agentProfile: any = null;
  isLoading = true;
  error: string | null = null;
  isSuccess = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.agentId = this.route.snapshot.paramMap.get('agentId') || '';
    if (this.agentId) {
      this.fetchAgentProfile(this.agentId);
    } else {
      this.error = 'Invalid referral link. No Agent ID provided.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  fetchAgentProfile(userId: string): void {
    const url = `${environment.apiUrl}/api/agents/public/${userId}`;
    this.http.get(url).subscribe({
      next: (profile: any) => {
        if (profile && profile.collegeAccessList) {
          profile.collegeAccessList = profile.collegeAccessList.map((access: any) => ({
            id: access.collegeId,
            college: {
              id: access.collegeId,
              collegeName: access.collegeName,
              city: '',
              country: ''
            },
            accessAllLocations: access.accessAllLocations,
            allowedLocations: access.locationDetails ? access.locationDetails.map((loc: any) => ({
              id: loc.id,
              state: loc.state,
              district: loc.district
            })) : []
          }));
        }
        this.agentProfile = profile;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch agent profile:', err);
        // Note: Returning '404' from our backend means not found
        if (err.status === 404 || err.error?.includes('not found')) {
          this.error = 'Agent not found. Please check your referral link.';
        } else {
          this.error = 'Failed to load Agent details. Please try again later.';
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onRegistrationSuccess(eventData: any): void {
    // Hide the form and show the success message
    this.isSuccess = true;
    this.cdr.detectChanges();
  }
}
