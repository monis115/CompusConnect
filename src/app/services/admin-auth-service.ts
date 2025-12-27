import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, switchMap, of, map } from 'rxjs';
import { map as rxMap } from 'rxjs/operators'; // Alias to avoid conflict if needed
import { environment } from '../../environments/environment';

// --- Interface definitions remain the same ---

interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: number;
  username: string;
  password: string; // Note: Received but NOT stored for security
  role: 'admin' | 'agent' | 'student' | 'visa-manager' | 'AdmissionManager';
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
  private apiUrl = `${environment.apiUrl}/api/auth/login`;
  private agentsApiUrl = `${environment.apiUrl}/api/agents/user`;
  private storageKey = 'userData';
  private fullProfileKey = 'fullUserProfile';

  constructor(private http: HttpClient) {
    console.log('🔧 AdminAuthService initialized (using sessionStorage)');
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
          // Note: Password is received but intentionally not logged or stored
        },
        error: (error) => {
          console.error('❌ Login API Error:', error);
          console.error('📊 Error Status:', error.status);
          console.error('💬 Error Message:', error.message);
          console.error('📄 Error Details:', error.error);
        }
      }),
      switchMap((loginResponse: LoginResponse) => {
        // Store basic login data immediately in sessionStorage
        const userData = {
          id: loginResponse.id,
          username: loginResponse.username,
          role: loginResponse.role,
          loginTime: new Date().toISOString()
        };

        console.log('💾 Storing basic user data in sessionStorage:', userData);
        sessionStorage.setItem(this.storageKey, JSON.stringify(userData));
        sessionStorage.setItem('userRole', loginResponse.role);
        sessionStorage.setItem('userId', loginResponse.username);
        sessionStorage.setItem('authToken', `token_${loginResponse.id}_${Date.now()}`);
        console.log('💾 Stored in sessionStorage:');
        console.log('   - userData:', JSON.stringify(userData));
        console.log('   - userRole:', loginResponse.role);
        console.log('   - userId:', loginResponse.username);
        console.log('   - authToken: token_***');

        // This is the logic you asked for:
        // If agent role, fetch full profile using the username
        if (loginResponse.role === 'agent') {
          console.log('🎭 Agent role detected. Fetching full profile...');
          const agentsUrl = `${this.agentsApiUrl}/${loginResponse.username}`; // Using username
          console.log('📤 Sending GET request to agents API:', agentsUrl);

          return this.http.get<AgentDetailsResponse>(agentsUrl).pipe(
            tap({
              next: (agentProfile) => {
                console.log('✅ Agent profile received from API:', agentProfile);
                console.log('👤 Agent ID:', agentProfile.id);
                console.log('📛 Agent Full Name:', agentProfile.fullName);

                // Store full profile in sessionStorage
                sessionStorage.setItem(this.fullProfileKey, JSON.stringify(agentProfile));
                console.log('💾 Full agent profile stored in sessionStorage (key: fullUserProfile)');
              },
              error: (err) => {
                console.error('❌ Failed to fetch agent profile:', err);
              }
            }),
            rxMap(() => loginResponse),  // Transform to return the original LoginResponse
            tap(() => console.log('🔄 Agent profile fetch completed. Returning original login response.'))
          );
        }

        // For non-agent roles, just return the login response
        console.log('🎭 Non-agent role. Skipping full profile fetch.');
        return of(loginResponse);
      })
    );
  }

  getUserData(): any {
    console.log('🔍 AdminAuthService.getUserData() called');
    const data = sessionStorage.getItem(this.storageKey);
    console.log('📦 Retrieved userData from sessionStorage:', data);
    const parsedData = data ? JSON.parse(data) : null;
    console.log('📦 Parsed userData:', parsedData);
    return parsedData;
  }

  getFullProfile(): AgentDetailsResponse | null {
    console.log('🔍 AdminAuthService.getFullProfile() called');
    const profileStr = sessionStorage.getItem(this.fullProfileKey);
    console.log('📦 Retrieved fullUserProfile from sessionStorage:', profileStr ? 'Found' : 'Not found');
    const parsedProfile = profileStr ? JSON.parse(profileStr) : null;
    if (parsedProfile) {
      console.log('📦 Parsed full profile summary:');
      console.log('   - Full Name:', parsedProfile.fullName);
      console.log('   - User ID:', parsedProfile.userId);
    }
    return parsedProfile;
  }

  logout(): void {
    console.log('🚪 AdminAuthService.logout() called');
    console.log('🗑️ Clearing sessionStorage before logout:');
    console.log('   - Keys before clear:', Object.keys(sessionStorage));
    sessionStorage.removeItem(this.storageKey);
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem(this.fullProfileKey);
    console.log('🗑️ Cleared keys after logout:');
    console.log('   - Keys after clear:', Object.keys(sessionStorage));
    console.log('✅ Logout completed');
  }

  isLoggedIn(): boolean {
    const loggedIn = !!this.getUserData();
    console.log('🔐 isLoggedIn check:', loggedIn);
    return loggedIn;
  }

  getUserRole(): string | null {
    const role = sessionStorage.getItem('userRole');
    console.log('🎭 getUserRole():', role);
    return role;
  }
}