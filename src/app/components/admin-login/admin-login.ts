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
  ) { }

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
          // Normalize role to handle case sensitivity (e.g. AGENT vs agent)
          const normalizedRole = res.role.toLowerCase();
          console.log(`🔐 Role normalized: ${res.role} -> ${normalizedRole}`);

          // Success message based on role
          switch (normalizedRole) {
            case 'admin':
              this.spinnerText.set('Admin Login Successful');
              this.spinnerIcon.set('admin');
              break;
            case 'agent':
              this.spinnerText.set('Agent Login Successful');
              this.spinnerIcon.set('agent');
              break;
            case 'visa_manager':
            case 'visa-manager': // Handle both potential formats
              this.spinnerText.set('Visa Manager Login Successful');
              this.spinnerIcon.set('visa');
              break;
            case 'admissionmanager':
            case 'admission_manager':
              this.spinnerText.set('Admission Manager Login Successful');
              this.spinnerIcon.set('admission');
              break;
            case 'telex_manager':
              this.spinnerText.set('Telex Manager Login Successful');
              this.spinnerIcon.set('telex'); // Ensure icon exists or use default
              break;
            case 'accountant':
              this.spinnerText.set('Accountant Login Successful');
              this.spinnerIcon.set('accountant');
              break;
            case 'doc_manager':
              this.spinnerText.set('Doc Manager Login Successful');
              this.spinnerIcon.set('doc');
              break;
            case 'universitycoordinator':
              this.spinnerText.set('University Coordinator Login Successful');
              this.spinnerIcon.set('university');
              break;
            case 'student':
              this.spinnerText.set('Student Login Successful');
              this.spinnerIcon.set('student');
              break;
            default:
              console.warn(`⚠️ Unhandled role for spinner: ${normalizedRole}`);
              this.spinnerText.set('Login Successful');
          }

          // Navigate after success animation
          setTimeout(() => {
            this.isLoading.set(false);

            console.log(`🚀 Navigating for role: ${normalizedRole}`);

            // Navigate to correct dashboard
            switch (normalizedRole) {
              case 'admin':
                this.router.navigate(['/admin-dashboard']);
                break;
              case 'agent':
                this.router.navigate(['/agent-dashboard']);
                break;
              case 'visa_manager':
              case 'visa-manager':
                this.router.navigate(['/visa-manager-dashboard']);
                break;
              case 'admissionmanager':
              case 'admission_manager':
                this.router.navigate(['/admission-manager-dashboard']);
                break;
              case 'telex_manager':
                this.router.navigate(['/telex-manager-dashboard']); // Assuming route exists
                break;
              case 'accountant':
                this.router.navigate(['/accountant-dashboard']); // Assuming route exists
                break;
              case 'doc_manager':
                this.router.navigate(['/doc-manager-dashboard']); // Assuming route exists
                break;
              case 'universitycoordinator':
                this.router.navigate(['/university-dashboard']); // Assuming route exists
                break;
              case 'student':
                this.router.navigate(['/student-dashboard']);
                break;
              default:
                console.error(`❌ Unknown role encountered during navigation: ${normalizedRole}`);
                this.errorMessage.set(`Unknown role: ${res.role}. Contact support.`);
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