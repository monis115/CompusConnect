// ==========================================
// admin-login.component.ts
// ==========================================

import { Component, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminAuthService, LoginResponse } from '../../services/admin-auth-service';

@Component({
  selector: 'app-admin-login',
  standalone: false,
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css']
})
export class AdminLogin {
  @ViewChild('loginCard') loginCard!: ElementRef<HTMLElement>;
  @ViewChild('loginContainer') loginContainer!: ElementRef<HTMLElement>;

  // Form fields
  userId = signal('');
  password = signal('');
  passwordFieldType = signal<'password' | 'text'>('password');
  showPassword = computed(() => this.passwordFieldType() === 'text');
  isLoading = signal(false);
  errorMessage = signal('');

  // Spinner states - WITH DEFAULT VALUES
  spinnerText = signal('Validating...');
  spinnerIcon = signal('shield');
  spinnerPhase = signal<'validating' | 'success' | 'error'>('validating');
  userRole = signal('');

  // Fullscreen mode
  isFullscreen = signal(false);

  // Particles for background
  particles = signal<{ x: number; y: number; size: number; duration: number; delay: number }[]>([]);

  constructor(
    private router: Router,
    private authService: AdminAuthService
  ) {
    console.log('✅ AdminLogin component initialized');
    this.generateParticles();
  }

  generateParticles() {
    const particleCount = 20;
    const newParticles = [];
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * -20
      });
    }
    this.particles.set(newParticles);
  }

  toggleFullscreen(): void {
    const elem = document.documentElement;

    if (!this.isFullscreen()) {
      // Enter fullscreen
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
      this.isFullscreen.set(true);
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      this.isFullscreen.set(false);
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.loginCard || this.isLoading()) return;

    const card = this.loginCard.nativeElement;
    const container = this.loginContainer?.nativeElement; // Use optional chaining just in case
    const rect = card.getBoundingClientRect();

    // Calculate mouse position relative to card center
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -5; // Max rotation 5deg
    const rotateY = ((x - centerX) / centerX) * 5;

    // Update CSS variables for tilt and spotlight
    card.style.setProperty('--rotate-x', `${rotateX}deg`);
    card.style.setProperty('--rotate-y', `${rotateY}deg`);
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);

    // Parallax for background
    if (container) {
      const winX = window.innerWidth / 2;
      const winY = window.innerHeight / 2;
      const mouseX = (event.clientX - winX) / winX;
      const mouseY = (event.clientY - winY) / winY;

      container.style.setProperty('--bg-x', `${mouseX * 20}px`);
      container.style.setProperty('--bg-y', `${mouseY * 20}px`);
    }
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (!this.loginCard) return;

    const card = this.loginCard.nativeElement;
    card.style.setProperty('--rotate-x', '0deg');
    card.style.setProperty('--rotate-y', '0deg');
    // Keep mouse position where it was or reset? Resetting spotlight might be abrupt.
    // Let's just reset rotation.
  }

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

  createRipple(event: MouseEvent) {
    const button = event.currentTarget as HTMLElement;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add('ripple');

    const ripple = button.getElementsByClassName('ripple')[0];

    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
  }

  onLogin() {
    console.log('🚀 Login clicked');

    if (!this.userId() || !this.password()) {
      this.errorMessage.set('Please enter both User ID and Password');
      return;
    }

    // Reset UI and show spinner
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.spinnerPhase.set('validating');
    this.spinnerText.set('Validating...');
    this.spinnerIcon.set('shield');

    console.log('🔄 Spinner state:', {
      isLoading: this.isLoading(),
      text: this.spinnerText(),
      icon: this.spinnerIcon(),
      phase: this.spinnerPhase()
    });

    const payload = { userId: this.userId(), password: this.password() };

    this.authService.login(payload).subscribe({
      next: (res: LoginResponse) => {
        console.log('✅ Login successful:', res);

        setTimeout(() => {
          this.spinnerPhase.set('success');
          this.userRole.set(res.role);

          const normalizedRole = res.role.toLowerCase();
          console.log(`🔐 Role: ${res.role} -> ${normalizedRole}`);

          // Set success message and icon based on role
          // Note: Text is cleared to hide it as per user request
          this.spinnerText.set('');

          switch (normalizedRole) {
            case 'admin':
              this.spinnerIcon.set('admin');
              break;
            case 'agent':
              this.spinnerIcon.set('agent');
              break;
            case 'visa_manager':
            case 'visa-manager':
              this.spinnerIcon.set('visa');
              break;
            case 'admissionmanager':
            case 'admission_manager':
              this.spinnerIcon.set('admission');
              break;
            case 'telex_manager':
              this.spinnerIcon.set('shield');
              break;
            case 'accountant':
              this.spinnerIcon.set('shield');
              break;
            case 'doc_manager':
              this.spinnerIcon.set('admission');
              break;
            case 'universitycoordinator':
              this.spinnerIcon.set('shield');
              break;
            case 'student':
              this.spinnerIcon.set('student');
              break;
            default:
              console.warn(`⚠️ Unhandled role: ${normalizedRole}`);
          }

          // Navigate after success animation
          setTimeout(() => {
            this.isLoading.set(false);
            console.log(`🎯 Navigating for role: ${normalizedRole}`);

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
                this.router.navigate(['/telex-manager-dashboard']);
                break;
              case 'accountant':
                this.router.navigate(['/accountant-dashboard']);
                break;
              case 'doc_manager':
                this.router.navigate(['/doc-manager-dashboard']);
                break;
              case 'universitycoordinator':
                this.router.navigate(['/university-dashboard']);
                break;
              case 'student':
                this.router.navigate(['/student-dashboard']);
                break;
              default:
                console.error(`❌ Unknown role: ${normalizedRole}`);
                this.errorMessage.set(`Unknown role: ${res.role}. Contact support.`);
            }
          }, 1500);
        }, 1000);
      },

      error: (err: HttpErrorResponse) => {
        console.error('❌ Login error:', err);

        setTimeout(() => {
          this.spinnerPhase.set('error');
          this.spinnerText.set('Failed');
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
