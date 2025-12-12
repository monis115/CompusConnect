import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';

export interface StudentAdmissionDTO {
  applicationId: string;
  studentName: string;
  agentName: string;
  agentUserId: string;
  collegeName: string;
  applicationStatus: string;
  course: string;
  admissionLetterPath: string;
}

@Component({
  selector: 'app-student-admission-letters',
  templateUrl: './student-admission-letters.html',
  styleUrls: ['./student-admission-letters.css'],
  standalone: false
})
export class StudentAdmissionLetters implements OnInit {
  students: StudentAdmissionDTO[] = [];
  filteredStudents: StudentAdmissionDTO[] = [];
  isLoading = true;
  loadingError = false;
  searchQuery = '';
  isSearchFocused = false;

  constructor(
    private http: HttpClient,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.loadingError = false;
    this.cdr.detectChanges();

    this.http.get<StudentAdmissionDTO[]>('http://localhost:8080/students/admission-letters')
      .subscribe({
        next: (data) => {
          this.students = data;
          this.filteredStudents = data;
          this.isLoading = false;
          this.applySearch();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching admission letters:', err);
          this.isLoading = false;
          this.loadingError = true;
          this.cdr.detectChanges();
        }
      });
  }

  goBack() {
    this.location.back();
  }

  getFileUrl(path: string): string {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    return 'http://localhost:8080/' + path;
  }

  refreshData() {
    this.searchQuery = '';
    this.fetchData();
  }

  onSearchInput() {
    this.applySearch();
    this.cdr.detectChanges();
  }

  applySearch() {
    if (!this.searchQuery.trim()) {
      this.filteredStudents = this.students;
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredStudents = this.students.filter(student =>
      student.studentName.toLowerCase().includes(query) ||
      student.applicationId.toLowerCase().includes(query) ||
      student.agentUserId?.toLowerCase().includes(query)
    );
  }

  clearSearch() {
    this.searchQuery = '';
    this.filteredStudents = this.students;
    this.cdr.detectChanges();
  }

  onSearchFocus() {
    this.isSearchFocused = true;
  }

  onSearchBlur() {
    this.isSearchFocused = false;
  }

  // Copy to clipboard functionality
  copiedField: string | null = null;

  copyToClipboard(value: string, fieldId: string) {
    if (!value || value === 'N/A') return;

    navigator.clipboard.writeText(value).then(() => {
      this.copiedField = fieldId;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.copiedField = null;
        this.cdr.detectChanges();
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }
}
