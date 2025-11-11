// src/app/services/manager-data-service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/* ──────────────────────────────────────────────────────────────
   INTERFACES – keep them inside the service (no shared file)
   ────────────────────────────────────────────────────────────── */
export interface College {
  id?: number;
  collegeName: string;
  city?: string;
  country?: string;
}

/** Student – the **only** definition used everywhere */
export interface Student {
  id: number;
  fullName: string;
  email?: string;
  contactNo?: string;
  dob?: string;
  address?: string;
  passportNo?: string;
  passportValidTill?: string;
  highestDegree?: string;
  marks?: number;
  appliedFor?: string;
  presentStatus: string;
  nextStep?: string;
  createdAt: string;
  /** Flexible – API may return string, number (timestamp) or Date */
  approvalDate?: string | number | Date;
  admissionLetterPath?: string | null;
  confirmationPagePath?: string | null;
  college: College;
}

/* ──────────────────────────────────────────────────────────────
   OTHER DTOs
   ────────────────────────────────────────────────────────────── */
export interface ManagerData {
  id: number;
  fullName: string;
  email: string;
  contactNumber: string;
  role: string;
  status: string;
  username: string;
  colleges: College[];
  students: Student[];
}

export interface StatusUpdateRequest {
  studentId: number;
  newStatus: string;
  nextStep?: string;
}

export interface UploadLetterResponse {
  success: boolean;
  message: string;
  filePath?: string;
}

/* ──────────────────────────────────────────────────────────────
   SERVICE
   ────────────────────────────────────────────────────────────── */
@Injectable({ providedIn: 'root' })
export class ManagerDataService {
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  getManagerData(username = 'M2501287'): Observable<ManagerData> {
    return this.http
      .get<ManagerData>(`${this.baseUrl}/managers/userName/${username}`)
      .pipe(catchError(this.handleError));
  }

  updateStudentStatus(req: StatusUpdateRequest): Observable<Student> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http
      .put<Student>(
        `${this.baseUrl}/students/${req.studentId}/status`,
        {
          presentStatus: req.newStatus,
          nextStep: req.nextStep ?? this.getNextStepForStatus(req.newStatus)
        },
        { headers }
      )
      .pipe(catchError(this.handleError));
  }

  uploadAdmissionLetter(studentId: number, file: File): Observable<UploadLetterResponse> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('studentId', studentId.toString());

    return this.http
      .post<UploadLetterResponse>(`${this.baseUrl}/students/${studentId}/admission-letter`, fd)
      .pipe(catchError(this.handleError));
  }

  private getNextStepForStatus(status: string): string {
    const map: Record<string, string> = {
      REGISTERED: 'UNDER_REVIEW',
      PENDING_APPROVAL: 'AWAITING_APPROVAL',
      APPROVED: 'UPLOAD_ADMISSION_LETTER',
      TELEX_APPROVED: 'INITIATE_VISA',
      VISA_APPROVED: 'FINAL_DOCUMENTATION',
      COMPLETED: 'ENROLLED'
    };
    return map[status] ?? 'PENDING';
  }

  private handleError(err: any): Observable<never> {
    console.error('API Error:', err);
    const msg =
      err.error instanceof ErrorEvent
        ? `Client Error: ${err.error.message}`
        : `Server Error (${err.status}): ${err.message}`;
    return throwError(() => new Error(msg));
  }
}