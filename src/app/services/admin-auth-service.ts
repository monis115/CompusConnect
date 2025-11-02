// Updated AdminAuthService (from previous context) - complete version for reference
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, switchMap, of, map } from 'rxjs';
import { map as rxMap } from 'rxjs/operators'; // Alias to avoid conflict if needed

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'agent' | 'student' | 'visa-manager' | 'admission-manager';
}

interface AgentDetailsResponse {
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
  role: string | null;
  collegePrivileges: Array<{
    id: number;
    collegeName: string;
    city: string;
    country: string;
  }>;
  accessibleLocations: Array<{
    id: number;
    state: string;
    district: string;
  }>;
  student: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private apiUrl = 'http://localhost:8080/api/auth/login';
  private agentsApiUrl = 'http://localhost:8080/api/agents/user';
  private storageKey = 'userData';
  private fullProfileKey = 'fullUserProfile';

  constructor(private http: HttpClient) {
    console.log('🔧 AdminAuthService initialized');
    console.log('📡 API URL:', this.apiUrl);
    console.log('📡 Agents API URL:', this.agentsApiUrl);
  }

  login(credentials: { userId: string; password: string }): Observable<LoginResponse> {
    console.log('📤 AdminAuthService.login() called');
    console.log('📋 Credentials received:', { userId: credentials.userId, password: '***' });

    const payload: LoginRequest = {
      username: credentials.userId,
      password: credentials.password
    };

    console.log('📤 Sending payload to login API:', { username: payload.username, password: '***' });
    console.log('🌐 Making POST request to:', this.apiUrl);

    return this.http.post<LoginResponse>(this.apiUrl, payload).pipe(
      tap({
        next: (response) => {
          console.log('✅ Login API Response received:', response);
          console.log('👤 Received User ID:', response.id);
          console.log('📧 Received Username (UserId):', response.username);
          console.log('🎭 Received Role:', response.role);
          console.log('🔑 Received Password (hidden):', '***');
        },
        error: (error) => {
          console.error('❌ Login API Error:', error);
          console.error('📊 Error Status:', error.status);
          console.error('💬 Error Message:', error.message);
          console.error('📄 Error Details:', error.error);
        }
      }),
      switchMap((loginResponse: LoginResponse) => {
        // Store basic login data immediately
        const userData = {
          id: loginResponse.id,
          username: loginResponse.username,
          role: loginResponse.role,
          loginTime: new Date().toISOString()
        };
        
        console.log('💾 Storing basic user data in localStorage:', userData);
        localStorage.setItem(this.storageKey, JSON.stringify(userData));
        localStorage.setItem('userRole', loginResponse.role);
        localStorage.setItem('userId', loginResponse.username);
        localStorage.setItem('authToken', `token_${loginResponse.id}_${Date.now()}`);
        console.log('💾 Stored in localStorage:');
        console.log('   - userData:', JSON.stringify(userData));
        console.log('   - userRole:', loginResponse.role);
        console.log('   - userId:', loginResponse.username);
        console.log('   - authToken: token_***');

        // If agent role, fetch full profile
        if (loginResponse.role === 'agent') {
          console.log('🎭 Agent role detected. Fetching full profile...');
          const agentsUrl = `${this.agentsApiUrl}/${loginResponse.username}`;
          console.log('📤 Sending GET request to agents API:', agentsUrl);
          return this.http.get<AgentDetailsResponse>(agentsUrl).pipe(
            tap({
              next: (agentProfile) => {
                console.log('✅ Agent profile received from API:', agentProfile);
                console.log('👤 Agent ID:', agentProfile.id);
                console.log('📛 Agent Full Name:', agentProfile.fullName);
                console.log('📧 Agent Email:', agentProfile.email);
                console.log('🏢 Agent Company Name:', agentProfile.companyName);
                console.log('🏫 Agent College Privileges Count:', agentProfile.collegePrivileges?.length || 0);
                console.log('📍 Agent Accessible Locations Count:', agentProfile.accessibleLocations?.length || 0);
                console.log('👥 Agent Students Count:', agentProfile.student?.length || 0);
                // Store full profile
                localStorage.setItem(this.fullProfileKey, JSON.stringify(agentProfile));
                console.log('💾 Full agent profile stored in localStorage (key: fullUserProfile)');
                console.log('💾 Stored full profile size:', JSON.stringify(agentProfile).length, 'characters');
              },
              error: (err) => {
                console.error('❌ Failed to fetch agent profile:', err);
                console.error('📊 Agent API Error Status:', err.status);
                console.error('💬 Agent API Error Message:', err.message);
              }
            }),
            rxMap(() => loginResponse),  // Transform to return the original LoginResponse
            tap(() => console.log('🔄 Agent profile fetch completed. Returning original login response:', loginResponse))
          );
        }
        // For non-agent roles, just return the login response
        console.log('🎭 Non-agent role. Skipping full profile fetch. Returning login response:', loginResponse);
        return of(loginResponse);
      })
    );
  }

  getUserData(): any {
    console.log('🔍 AdminAuthService.getUserData() called');
    const data = localStorage.getItem(this.storageKey);
    console.log('📦 Retrieved userData from localStorage:', data);
    const parsedData = data ? JSON.parse(data) : null;
    console.log('📦 Parsed userData:', parsedData);
    return parsedData;
  }

  getFullProfile(): AgentDetailsResponse | null {
    console.log('🔍 AdminAuthService.getFullProfile() called');
    const profileStr = localStorage.getItem(this.fullProfileKey);
    console.log('📦 Retrieved fullUserProfile from localStorage:', profileStr ? 'Found (length: ' + profileStr.length + ')' : 'Not found');
    const parsedProfile = profileStr ? JSON.parse(profileStr) : null;
    if (parsedProfile) {
      console.log('📦 Parsed full profile summary:');
      console.log('   - Full Name:', parsedProfile.fullName);
      console.log('   - User ID:', parsedProfile.userId);
      console.log('   - College Privileges:', parsedProfile.collegePrivileges?.length || 0);
      console.log('   - Accessible Locations:', parsedProfile.accessibleLocations?.length || 0);
    }
    return parsedProfile;
  }

  logout(): void {
    console.log('🚪 AdminAuthService.logout() called');
    console.log('🗑️ Clearing localStorage before logout:');
    console.log('   - Keys before clear:', Object.keys(localStorage));
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('authToken');
    localStorage.removeItem(this.fullProfileKey);
    console.log('🗑️ Cleared keys after logout:');
    console.log('   - Keys after clear:', Object.keys(localStorage));
    console.log('✅ Logout completed');
  }

  isLoggedIn(): boolean {
    const loggedIn = !!this.getUserData();
    console.log('🔐 isLoggedIn check:', loggedIn);
    return loggedIn;
  }

  getUserRole(): string | null {
    const role = localStorage.getItem('userRole');
    console.log('🎭 getUserRole():', role);
    return role;
  }
}