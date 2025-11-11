// src/app/components/admin-login/admin-login.component.ts

import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminAuthService, LoginResponse } from '../../services/admin-auth-service'; // <-- IMPORTED

@Component({
  selector: 'app-admin-login',
  standalone: false,
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

  // Spinner states
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

    // Reset UI
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.spinnerPhase.set('validating');
    this.spinnerText.set('Validating Credentials...');
    this.spinnerIcon.set('shield');

    const payload = { userId: this.userId(), password: this.password() };

    // The 'res: LoginResponse' now correctly uses the imported interface
    this.authService.login(payload).subscribe({
      next: (res: LoginResponse) => {
        setTimeout(() => {
          this.spinnerPhase.set('success');
          this.userRole.set(res.role);

          // Success message based on role
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
            case 'AdmissionManager':
              this.spinnerText.set('Admission Manager Login Successful');
              this.spinnerIcon.set('admission');
              break;
            // The 'student' case is now valid because of the correct interface
            case 'student':
              this.spinnerText.set('Student Login Successful');
              this.spinnerIcon.set('student'); // Assuming you have a 'student' icon
              break;
          }

          // Navigate after success animation
          setTimeout(() => {
            this.isLoading.set(false);

            // -----------------------------------------------------------------
            // 🛑 IMPORTANT: Removed redundant localStorage calls.
            // Your AdminAuthService already saves everything to sessionStorage.
            // Rely on the service as the single source of truth.
            // -----------------------------------------------------------------

            // Navigate to correct dashboard
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
              case 'AdmissionManager':
                this.router.navigate(['/admission-manager-dashboard']);
                break;
              case 'student':
                 this.router.navigate(['/student-dashboard']); // Example for student
                 break;
              default:
                // This logic handles any role not explicitly defined in the switch
                console.warn(`Unknown role encountered: ${res.role}`);
                this.errorMessage.set('Unknown role. Contact support.');
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
              this.errorMessage.set('Invalid User ID or Password');
            } else if (err.status === 403) {
              this.errorMessage.set('Access denied. Contact administrator.');
            } else if (err.status === 0) {
              this.errorMessage.set('No internet. Check your connection.');
            } else {
              this.errorMessage.set(err.error?.message || 'Login failed. Try again.');
            }
          }, 1500);
        }, 1000);
      }
    });
  }
}