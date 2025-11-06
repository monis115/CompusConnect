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
  standalone:false,
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLogin {
  userId = signal('');
  password = signal('');
  passwordFieldType = signal<'password' | 'text'>('password');
  showPassword = computed(() => this.passwordFieldType() === 'text');
  isLoading = signal(false);
  errorMessage = signal('');
  
  // Enhanced spinner states
  spinnerText = signal('Validating Credentials...');
  spinnerIcon = signal('shield');
  spinnerPhase = signal<'validating' | 'success' | 'error'>('validating');
  userRole = signal('');

  constructor(
    private router: Router, 
    private authService: AdminAuthService
  ) {}

  onUserIdInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    input.value = upper;
    this.userId.set(upper);
    this.errorMessage.set('');
  }

  onPasswordInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.password.set(input.value);
    this.errorMessage.set('');
  }

  togglePasswordVisibility() {
    this.passwordFieldType.update(t => t === 'password' ? 'text' : 'password');
  }

  onLogin() {
    if (!this.userId() || !this.password()) {
      this.errorMessage.set('Please enter both User ID and Password');
      return;
    }

    // Reset states
    this.spinnerText.set('Validating Credentials...');
    this.spinnerIcon.set('shield');
    this.spinnerPhase.set('validating');
    this.isLoading.set(true);
    this.errorMessage.set('');

    const payload = {
      userId: this.userId(),
      password: this.password()
    };

    this.authService.login(payload).subscribe({
      next: (res: LoginResponse) => {
        // Update spinner based on role
        setTimeout(() => {
          this.spinnerPhase.set('success');
          this.userRole.set(res.role);
          
          switch (res.role) {
            case 'admin':
              this.spinnerText.set('Admin Login Successful');
              this.spinnerIcon.set('admin');
              break;
            case 'agent':
              this.spinnerText.set('Agent Login Successful');
              this.spinnerIcon.set('agent');
              break;
          
            case 'visa-manager':
              this.spinnerText.set('Visa Manager Login Successful');
              this.spinnerIcon.set('visa');
              break;
            case 'admission-manager':
              this.spinnerText.set('Admission Manager Login Successful');
              this.spinnerIcon.set('admission');
              break;
          }

          // Final navigation after showing success
          setTimeout(() => {
            this.isLoading.set(false);
            
            // Store auth data
            localStorage.setItem('authToken', `token_${res.id}_${Date.now()}`);
            localStorage.setItem('userRole', res.role);
            localStorage.setItem('userId', res.username);
            localStorage.setItem('userData', JSON.stringify(res));
            
            // Navigate based on role
            switch (res.role) {
              case 'admin':
                this.router.navigate(['/admin-dashboard']);
                break;
              case 'agent':
                this.router.navigate(['/agent-dashboard']);
                break;
             
              case 'visa-manager':
                this.router.navigate(['/visa-manager-dashboard']);
                break;
              case 'admission-manager':
                this.router.navigate(['/admission-manager-dashboard']);
                break;
            }
          }, 1500);
        }, 1000);
      },
      error: (err: HttpErrorResponse) => {
        setTimeout(() => {
          this.spinnerPhase.set('error');
          this.spinnerText.set('Login Failed');
          this.spinnerIcon.set('error');
          
          setTimeout(() => {
            this.isLoading.set(false);
            
            if (err.status === 401) {
              this.errorMessage.set('Invalid credentials. Please try again.');
            } else if (err.status === 403) {
              this.errorMessage.set('Access denied. Please contact administrator.');
            } else if (err.status === 0) {
              this.errorMessage.set('Cannot connect to server. Please check your connection.');
            } else {
              this.errorMessage.set(err.error?.message || 'An error occurred. Please try again.');
            }
          }, 1500);
        }, 1000);
      }
    });
  }
}