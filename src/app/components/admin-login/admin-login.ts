import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminAuthService } from '../../services/admin-auth-service';

interface LoginResponse {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'agent' | 'student' | 'visa-manager' | 'admission-manager';
}

@Component({
  selector: 'app-admin-login',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css']
})
export class AdminLogin {
  userId = signal('');
  password = signal('');
  passwordFieldType = signal<'password' | 'text'>('password');
  showPassword = computed(() => this.passwordFieldType() === 'text');
  isLoading = signal(false);
  errorMessage = signal('');

  // NEW: Signal to control the spinner text
  spinnerText = signal('Validating Credentials...');

  constructor(
    private router: Router, 
    private authService: AdminAuthService
  ) {
    console.log('🎬 AdminLogin Component initialized');
  }

  onUserIdInput(event: Event) {
    console.log('⌨️ onUserIdInput triggered');
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    input.value = upper;
    this.userId.set(upper);
    this.errorMessage.set('');
    console.log('📝 User ID updated:', upper);
  }

  onPasswordInput(event: Event) {
    console.log('⌨️ onPasswordInput triggered');
    const input = event.target as HTMLInputElement;
    this.password.set(input.value);
    this.errorMessage.set('');
    console.log('📝 Password updated (hidden for security)');
  }

  togglePasswordVisibility() {
    console.log('👁️ Toggle password visibility');
    this.passwordFieldType.update(t => t === 'password' ? 'text' : 'password');
    console.log('👁️ Password field type:', this.passwordFieldType());
  }

  onLogin() {
    console.log('🚀 ============================================');
    console.log('🚀 LOGIN PROCESS STARTED');
    console.log('🚀 ============================================');
    console.log('📋 Step 1: Validating inputs...');

    // Validate inputs
    if (!this.userId() || !this.password()) {
      console.error('❌ Validation Failed: Missing credentials');
      this.errorMessage.set('Please enter both User ID and Password');
      return;
    }

    console.log('✅ Step 1 Complete: Inputs validated');
    console.log('📋 Step 2: Setting loading state...');
    
    // NEW: Set initial spinner text
    this.spinnerText.set('Validating Credentials...');
    this.isLoading.set(true);
    this.errorMessage.set('');
    console.log('✅ Step 2 Complete: Loading = true, Spinner = "Validating..."');

    const payload = {
      userId: this.userId(),
      password: this.password()
    };

    console.log('📋 Step 3: Preparing API call...');
    console.log('📋 Step 4: Calling authService.login()...');
    
    this.authService.login(payload).subscribe({
      next: (res: LoginResponse) => {
        console.log('');
        console.log('✅ ============================================');
        console.log('✅ LOGIN API CALL SUCCESSFUL');
        console.log('✅ ============================================');
        console.log('📥 Response Data:', res);

        // NEW: Set dynamic spinner text based on role IMMEDIATELY
        switch (res.role) {
          case 'admin':
            this.spinnerText.set('Admin Login: Success');
            break;
          case 'agent':
            this.spinnerText.set('Agent Login: Success');
            break;
          case 'student':
            this.spinnerText.set('Student Login: Success');
            break;
          case 'visa-manager':
            this.spinnerText.set('Visa Manager Login: Success');
            break;
          case 'admission-manager':
            this.spinnerText.set('Admission Login: Success');
            break;
          default:
            this.spinnerText.set('Login Successful');
        }
        console.log('✅ Spinner text updated:', this.spinnerText());

        console.log('📋 Step 5: Processing response (1.5s delay)...');
        setTimeout(() => {
          console.log('⏰ Timeout completed, processing...');
          console.log('📋 Step 6: Stopping loading spinner...');
          this.isLoading.set(false);
          console.log('✅ Loading = false');
          
          console.log('📋 Step 7: Checking response data...');
          if (res && res.role) {
            console.log('✅ Response valid, role detected:', res.role);
            
            console.log('📋 Step 8: Storing user data in localStorage...');
            localStorage.setItem('authToken', `token_${res.id}_${Date.now()}`);
            localStorage.setItem('userRole', res.role);
            localStorage.setItem('userId', res.username);
            localStorage.setItem('userData', JSON.stringify(res));
            console.log('✅ Step 8 Complete: Data stored');
            
            console.log('');
            console.log('📋 Step 9: Role-based routing...');
            
            // Navigate based on role
            switch (res.role) {
              case 'admin':
                console.log('🔀 Routing to: /admin-dashboard');
                this.router.navigate(['/admin-dashboard']);
                break;
              case 'agent':
                console.log('🔀 Routing to: /agent-dashboard');
                this.router.navigate(['/agent-dashboard']);
                break;
              case 'student':
                console.log('🔀 Routing to: /student-dashboard');
                this.router.navigate(['/student-dashboard']);
                break;
              case 'visa-manager':
                console.log('🔀 Routing to: /visa-manager-dashboard');
                this.router.navigate(['/visa-manager-dashboard']);
                break;
              case 'admission-manager':
                console.log('🔀 Routing to: /admission-manager-dashboard');
                this.router.navigate(['/admission-manager-dashboard']);
                break;
              default:
                console.error('❌ Unknown role received:', res.role);
                this.errorMessage.set('Invalid role received from server');
            }
            
            console.log('');
            console.log('✅ ============================================');
            console.log('✅ LOGIN PROCESS COMPLETED SUCCESSFULLY');
            console.log('✅ ============================================');
          } else {
            console.error('❌ Invalid response: Missing role or data');
            this.errorMessage.set('Login failed. Invalid response from server.');
          }
        }, 1500);
      },
      error: (err: HttpErrorResponse) => {
        console.log('');
        console.error('❌ ============================================');
        console.error('❌ LOGIN API CALL FAILED');
        console.error('❌ ============================================');
        console.error('🔴 Error Object:', err);

        // NEW: Set spinner text to "Login Failed"
        this.spinnerText.set('Login Failed');
        console.log('✅ Spinner text updated: Login Failed');

        setTimeout(() => {
          console.log('⏰ Error timeout completed');
          console.log('📋 Stopping loading spinner...');
          this.isLoading.set(false);
          console.log('✅ Loading = false');
          
          console.log('📋 Determining error message...');
          if (err.status === 401) {
            this.errorMessage.set('Invalid credentials. Please try again.');
          } else if (err.status === 403) {
            this.errorMessage.set('Access denied. Please contact administrator.');
          } else if (err.status === 0) {
            this.errorMessage.set('Cannot connect to server. Please check your connection.');
          } else if (err.status === 404) {
            this.errorMessage.set('Login endpoint not found. Please contact support.');
          } else {
            this.errorMessage.set(err.error?.message || 'An error occurred. Please try again.');
          }
          
          console.log('💬 Error message set:', this.errorMessage());
          console.error('❌ ============================================');
          console.error('❌ LOGIN PROCESS FAILED');
          console.error('❌ ============================================');
        }, 1500);
      }
    });

    console.log('✅ Step 4 Complete: API call initiated');
    console.log('⏳ Waiting for API response...');
    console.log('');
  }
}