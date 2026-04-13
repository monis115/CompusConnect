import { Component, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-track-application',
  templateUrl: './track-application.html',
  styleUrls: ['./track-application.css'],
  standalone: false
})
export class TrackApplicationComponent {
  query = '';
  isLoading = false;
  result: any = null;
  error: string | null = null;
  searched = false;

  // Status pipeline order
  statusPipeline: string[] = [
    'Submitted',
    'REGISTERED',
    'UNDER_REVIEW',
    'APPROVED',
    'CONDITIONAL_OFFER_LETTER_GENERATED',
    'PENDING_ADMISSION_LETTER',
    'ADMISSION_LETTER_GENERATED',
    'ADMISSION_LETTER_APPROVED',
    'TELEX_PAYMENT_DOCS_SUBMITTED',
    'APPLIED_FOR_TELEX',
    'TELEX_FEE_RECIEVED',
    'TELEX_INITIATED',
    'TELEX_APPLICATION_SUBMITTED_TO_UNIVERSITY',
    'TELEX_APPLICATION_SUBMITTED_TO_MEA',
    'TELEX_NUMBER_ISSUED',
    'DOCS_VARIFICATION_COMPLETE',
    'FEE_RECEIVED',
    'VISA_FEE_PENDING',
    'VISA_FEE_RECEIVED',
    'VISA_APPLIED',
    'VISA_STAMPED',
    'PASSPORT_SUBMITTED_TO_EMBASSY',
    'VISA_PAYMENT_CONFIRMED',
    'PASSPORT_COLLECTED',
    'TRAVELLING',
    'COMPLETED'
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  trackApplication(): void {
    if (!this.query.trim()) return;

    this.isLoading = true;
    this.error = null;
    this.result = null;
    this.searched = true;
    this.cdr.detectChanges();

    this.http.get<any>(`${environment.apiUrl}/api/public/track-application`, {
      params: { query: this.query.trim() }
    }).subscribe({
      next: (data) => {
        this.result = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 404) {
          this.error = 'No application found. Please check your Application ID or Email and try again.';
        } else {
          this.error = 'Something went wrong. Please try again later.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  formatStatus(status: string): string {
    if (!status) return '';
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  getStatusPhase(status: string): string {
    const s = status?.toUpperCase() || '';
    if (['SUBMITTED', 'REGISTERED', 'UNDER_REVIEW', 'PENDING_APPROVAL', 'APPROVED'].includes(s)) return 'Registration';
    if (s.includes('ADMISSION') || s.includes('OFFER')) return 'Admission';
    if (s.includes('TELEX') || s.includes('DOCS_VARIFICATION') || s === 'FEE_RECEIVED') return 'Telex';
    if (s.includes('VISA') || s.includes('PASSPORT')) return 'Visa';
    if (s === 'TRAVELLING' || s === 'COMPLETED') return 'Complete';
    return 'Processing';
  }

  getPhaseIndex(status: string): number {
    const phase = this.getStatusPhase(status);
    const phases = ['Registration', 'Admission', 'Telex', 'Visa', 'Complete'];
    return phases.indexOf(phase);
  }

  getProgressPercent(): number {
    if (!this.result) return 0;
    const idx = this.statusPipeline.indexOf(this.result.currentStatus);
    if (idx === -1) return 10;
    return Math.round(((idx + 1) / this.statusPipeline.length) * 100);
  }

  isRejected(): boolean {
    return this.result?.currentStatus === 'REJECTED';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
