import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { UniversityService, DashboardStats, StatusBreakdown, AdmittedStudent } from '../../services/university.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { environment } from '../../../environments/environment';
import { FileService } from '../../services/file.service';
import * as XLSX from 'xlsx';

// Interfaces
interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
  logoUrl?: string;
}

interface Student {
  id: number;
  applicationId: string;
  fullName: string;
  applicationStatus: string;
  passportNo: string;
  dob: string;
  age: number;
  email: string;
  contactNo: string;
  appliedFor: string;
  intake: string;
  action?: string | null;
  actionOnUser?: string | null;
  createdAt: string;
  passportPath?: string;
  adhaarPath?: string;
  adhaarCardNo?: string;
  markseetPath?: string;
  confirmationPagePath?: string;
  admissionLetterPath?: string;
  conditionalOfferLetterPath?: string;
  profileImagePath?: string;
  class12thMarks?: number;
  maxMarks?: number;
  class12thPassingYear?: string;
  baords?: string;
  neetScore?: number;
  neetYear?: number;
  mothersName?: string;
  fathersName?: string;
  address?: string;
  emergencyContactNo?: string;
  emergencyRelation?: string;
  hasGivenNEET?: boolean;
}

interface UniversityPerson {
  id: number;
  userName: string;
  role: string;
  status: string;
  college: College;
  students: Student[];
}

@Component({
  selector: 'app-university-person-dashbaord',
  standalone: false,
  templateUrl: './university-person-dashbaord.html',
  styleUrls: ['./university-person-dashbaord.css']
})
export class UniversityPersonDashboard implements OnInit {
  // Data Signals
  universityData = signal<UniversityPerson | null>(null);
  isLoading = signal<boolean>(true);
  isRefreshing = signal<boolean>(false);

  // UI State
  activeSection = signal<string>('dashboard');
  sidebarCollapsed = signal<boolean>(false);
  searchQuery = signal<string>('');

  // Modal States
  isModalOpen = signal<boolean>(false);
  isUploadModalOpen = signal<boolean>(false);
  isSuccessModalOpen = signal<boolean>(false);
  isDocViewModalOpen = signal<boolean>(false);
  isLoggingOut = signal<boolean>(false);

  selectedStudent = signal<Student | null>(null);
  selectedStudentForUpload = signal<Student | null>(null);
  selectedStudentForDocs = signal<Student | null>(null);
  selectedFile = signal<File | null>(null);
  isUploading = signal<boolean>(false);
  uploadSuccess = signal<boolean>(false);
  uploadMessage = signal<string>('');

  // Analytics Signals
  dashboardStats = signal<DashboardStats | null>(null);
  statusBreakdown = signal<StatusBreakdown[]>([]);
  admittedStudentsList = signal<AdmittedStudent[]>([]);
  admittedStudentsSearch = signal<string>('');

  // Reports State
  reportStartDate = signal<string>('');
  reportEndDate = signal<string>('');
  reportStatus = signal<string>('ALL');

  uniqueStatuses = computed(() => {
    const students = this.universityData()?.students || [];
    const statuses = new Set(students.map(s => s.applicationStatus).filter(s => s));
    return Array.from(statuses).sort();
  });

  filteredReportStudents = computed(() => {
    let students = this.universityData()?.students || [];

    const start = this.reportStartDate();
    const end = this.reportEndDate();
    const status = this.reportStatus();

    if (start) {
      const startDate = new Date(start);
      students = students.filter(s => s.createdAt && new Date(s.createdAt) >= startDate);
    }
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      students = students.filter(s => s.createdAt && new Date(s.createdAt) <= endDate);
    }
    if (status !== 'ALL') {
      students = students.filter(s => s.applicationStatus === status);
    }

    return students;
  });

  stats = computed(() => {
    const students = this.universityData()?.students || [];
    const actionRequiredCount = this.actionRequiredStudents().length;

    const totalStudents = students.length;
    const admittedCount = students.filter(s =>
      s.applicationStatus === 'ADMISSION_LETTER_GENERATED' ||
      s.admissionLetterPath
    ).length;
    const pendingCount = students.filter(s =>
      s.applicationStatus === 'FORWARDED_TO_UNI' ||
      s.applicationStatus === 'CONDITIONAL_OFFER_LETTER_GENERATED' ||
      s.applicationStatus === 'PENDING_ADMISSION_LETTER'
    ).length;
    const visaStamped = students.filter(s => s.applicationStatus === 'VISA_STAMPED').length;

    return {
      totalStudents,
      admittedStudents: admittedCount,
      pendingApplications: pendingCount,
      visaStamped,
      actionRequired: actionRequiredCount
    };
  });

  // Chart Data
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#2c3e50',
          font: { family: 'Inter', size: 12 },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    }
  };

  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [], hoverBackgroundColor: [] }]
  };
  public pieChartType: ChartType = 'pie';

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#546e7a', font: { family: 'Inter', size: 11 } }
      },
      y: {
        min: 0,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#546e7a', font: { family: 'Inter', size: 11 } }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    }
  };

  public barChartData: ChartData<'bar'> = {
    labels: ['Registered', 'Forwarded', 'Admitted', 'Visa Stamped'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        label: 'Student Pipeline',
        backgroundColor: ['#630018', '#8a0f2e', '#c5a059', '#137333'],
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };
  public barChartType: ChartType = 'bar';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private universityService: UniversityService,
    private fileService: FileService
  ) { }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const username = sessionStorage.getItem('userId');
    if (!username) {
      this.router.navigate(['/admin-login']);
      return;
    }

    this.isLoading.set(true);
    const apiUrl = `${environment.apiUrl}/api/universityPerson/username/${username}`;

    this.http.get<UniversityPerson>(apiUrl)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.universityData.set(data);
          this.updateChartData();
          this.loadAnalytics(username);
        },
        error: (err) => {
          console.error('Error fetching data:', err);
          if (err.status === 401 || err.status === 403) {
            this.router.navigate(['/admin-login']);
          }
        }
      });
  }

  updateChartData() {
    const students = this.universityData()?.students || [];

    // Status breakdown for pie chart
    const statusCounts = new Map<string, number>();
    students.forEach(s => {
      const count = statusCounts.get(s.applicationStatus) || 0;
      statusCounts.set(s.applicationStatus, count + 1);
    });

    const labels: string[] = [];
    const data: number[] = [];
    const colors = ['#630018', '#8a0f2e', '#c5a059', '#137333', '#1967d2', '#b06000'];
    const bgColors: string[] = [];
    const hoverColors: string[] = [];

    let colorIndex = 0;
    statusCounts.forEach((count, status) => {
      labels.push(this.formatStatusLabel(status));
      data.push(count);
      bgColors.push(colors[colorIndex % colors.length]);
      hoverColors.push(this.lightenColor(colors[colorIndex % colors.length]));
      colorIndex++;
    });

    this.pieChartData = {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        hoverBackgroundColor: hoverColors
      }]
    };

    // Pipeline bar chart
    const registered = students.filter(s => s.applicationStatus === 'REGISTERED').length;
    const forwarded = students.filter(s => s.applicationStatus === 'FORWARDED_TO_UNI').length;
    const admitted = students.filter(s => s.applicationStatus === 'ADMISSION_LETTER_GENERATED' || s.admissionLetterPath).length;
    const visaStamped = students.filter(s => s.applicationStatus === 'VISA_STAMPED').length;

    this.barChartData = {
      labels: ['Registered', 'Forwarded', 'Admitted', 'Visa Stamped'],
      datasets: [{
        data: [registered, forwarded, admitted, visaStamped],
        label: 'Student Pipeline',
        backgroundColor: ['#630018', '#8a0f2e', '#c5a059', '#137333'],
        borderRadius: 8,
        borderSkipped: false
      }]
    };
  }

  formatStatusLabel(status: string): string {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  lightenColor(color: string): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  }

  loadAnalytics(username: string) {
    this.universityService.getDashboardStats(username).subscribe(stats => {
      this.dashboardStats.set(stats);
    });

    this.universityService.getStatusBreakdown(username).subscribe(data => {
      this.statusBreakdown.set(data);
    });

    this.universityService.getAdmittedStudents(username).subscribe(students => {
      this.admittedStudentsList.set(students);
    });
  }

  refreshData() {
    this.isRefreshing.set(true);

    setTimeout(() => {
      this.loadData();
      setTimeout(() => {
        this.isRefreshing.set(false);
        this.cdr.detectChanges();
      }, 100);
    }, 1900);
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(collapsed => !collapsed);
  }

  setActiveSection(section: string) {
    this.activeSection.set(section);
  }

  // Computed Lists
  actionRequiredStudents = computed(() => {
    const students = this.universityData()?.students || [];
    const query = this.searchQuery().toLowerCase();
    return students.filter(s =>
      s.action === 'UPLOAD_ADMISSION_LETTER' &&
      (s.actionOnUser === 'UniversityCoordinator' || s.actionOnUser === 'UNIVERSITY_COORDINATOR') &&
      (s.fullName.toLowerCase().includes(query) ||
        s.passportNo.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.appliedFor.toLowerCase().includes(query))
    );
  });

  inPipelineStudents = computed(() => {
    const students = this.universityData()?.students || [];
    const query = this.searchQuery().toLowerCase();
    return students.filter(s =>
      s.applicationStatus !== 'VISA_STAMPED' &&
      s.applicationStatus !== 'REGISTERED' &&
      (s.fullName.toLowerCase().includes(query) ||
        s.passportNo.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.appliedFor.toLowerCase().includes(query))
    );
  });

  admissionLetterGeneratedStudents = computed(() => {
    const students = this.universityData()?.students || [];
    const query = this.searchQuery().toLowerCase();
    return students.filter(s =>
      (s.applicationStatus === 'ADMISSION_LETTER_GENERATED' || s.admissionLetterPath) &&
      (s.fullName.toLowerCase().includes(query) ||
        s.passportNo.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.appliedFor.toLowerCase().includes(query))
    );
  });

  allStudents = computed(() => {
    const students = this.universityData()?.students || [];
    const query = this.searchQuery().toLowerCase();
    return students.filter(s =>
      s.fullName.toLowerCase().includes(query) ||
      s.passportNo.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.appliedFor.toLowerCase().includes(query)
    );
  });

  filteredAdmittedStudents = computed(() => {
    const students = this.admittedStudentsList();
    const query = this.admittedStudentsSearch().toLowerCase();
    return students.filter(s =>
      s.fullName.toLowerCase().includes(query) ||
      s.passportNumber.toLowerCase().includes(query) ||
      s.courseName.toLowerCase().includes(query)
    );
  });

  courseBreakdown = computed(() => {
    const students = this.universityData()?.students || [];
    const counts = new Map<string, number>();
    students.forEach(s => {
      const course = s.appliedFor || 'Unknown';
      counts.set(course, (counts.get(course) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / (students.length || 1)) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  });

  intakeBreakdown = computed(() => {
    const students = this.universityData()?.students || [];
    const counts = new Map<string, number>();
    students.forEach(s => {
      const intake = s.intake || 'Unknown';
      counts.set(intake, (counts.get(intake) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / (students.length || 1)) * 100) }))
      .sort((a, b) => b.count - a.count);
  });

  performanceMetrics = computed(() => {
    const students = this.universityData()?.students || [];
    if (students.length === 0) return { admissionRate: 0, visaRate: 0, thisMonthCount: 0, growth: 0, isPositiveGrowth: true };

    const total = students.length;
    const admitted = students.filter(s =>
      s.applicationStatus === 'ADMISSION_LETTER_GENERATED' ||
      s.applicationStatus === 'VISA_STAMPED' ||
      s.admissionLetterPath
    ).length;
    const admissionRate = Math.round((admitted / total) * 100);

    const visaStamped = students.filter(s => s.applicationStatus === 'VISA_STAMPED').length;
    const visaRate = admitted > 0 ? Math.round((visaStamped / admitted) * 100) : 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let thisMonthCount = 0;
    let lastMonthCount = 0;

    students.forEach(s => {
      if (!s.createdAt) return;
      const date = new Date(s.createdAt);
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        thisMonthCount++;
      } else if (date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear) {
        lastMonthCount++;
      }
    });

    let growth = 0;
    if (lastMonthCount > 0) {
      growth = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
    } else if (thisMonthCount > 0) {
      growth = 100;
    }

    return {
      admissionRate,
      visaRate,
      thisMonthCount,
      growth,
      isPositiveGrowth: growth >= 0
    };
  });

  // Upload Logic
  openUploadModal(student: Student) {
    this.selectedStudentForUpload.set(student);
    this.selectedFile.set(null);
    this.uploadSuccess.set(false);
    this.isUploadModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedStudent.set(null);
  }

  closeUploadModal() {
    if (!this.isUploading()) {
      this.isUploadModalOpen.set(false);
      this.selectedStudentForUpload.set(null);
      this.selectedFile.set(null);
      this.uploadSuccess.set(false);
    }
  }

  closeSuccessModal() {
    this.isSuccessModalOpen.set(false);
    this.uploadMessage.set('');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (file.size > maxSize) {
        alert('File size must be less than 5MB');
        return;
      }

      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert('Only PDF, JPG, and PNG files are allowed');
        return;
      }

      this.selectedFile.set(file);
    }
  }

  uploadAdmissionLetter() {
    this.submitAdmissionLetter();
  }

  submitAdmissionLetter() {
    const student = this.selectedStudentForUpload();
    const file = this.selectedFile();
    const username = sessionStorage.getItem('userId');

    if (!student || !file || !username) return;

    this.isUploading.set(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('universityPersonUsername', username);

    const apiUrl = `${environment.apiUrl}/api/universityPerson/upload-admission-letter/${student.id}`;

    this.http.post(apiUrl, formData)
      .pipe(finalize(() => this.isUploading.set(false)))
      .subscribe({
        next: (response) => {
          this.updateLocalDataAfterUpload(student.id);

          // Close upload modal immediately (don't use closeUploadModal as it checks isUploading)
          this.isUploadModalOpen.set(false);
          this.selectedStudentForUpload.set(null);
          this.selectedFile.set(null);
          this.uploadSuccess.set(false);

          // Show success modal
          this.uploadMessage.set(`Admission letter uploaded successfully for ${student.fullName}`);
          this.isSuccessModalOpen.set(true);

          setTimeout(() => {
            this.refreshData();
          }, 2000);
        },
        error: (err) => {
          console.error('Upload failed', err);
          alert('Upload failed. Please try again.');
        }
      });
  }

  private updateLocalDataAfterUpload(studentId: number) {
    this.universityData.update(current => {
      if (!current) return null;
      const updatedStudents = current.students.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            action: null,
            actionOnUser: null,
            applicationStatus: 'ADMISSION_LETTER_GENERATED'
          };
        }
        return s;
      });
      return { ...current, students: updatedStudents };
    });
  }

  // Document Viewer
  openDocViewer(student: Student) {
    this.selectedStudentForDocs.set(student);
    this.isDocViewModalOpen.set(true);
  }

  closeDocViewer() {
    this.isDocViewModalOpen.set(false);
    this.selectedStudentForDocs.set(null);
  }

  downloadDocument(path: string, fileName: string) {
    if (!path) return;
    const fullUrl = this.fileService.getFileUrl(path);
    window.open(fullUrl, '_blank');
  }

  getDocumentIcon(path: string): string {
    if (!path) return 'file';
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return 'image';
    return 'file';
  }

  // Logout
  logout() {
    this.isLoggingOut.set(true);

    setTimeout(() => {
      sessionStorage.clear();
      this.router.navigate(['/AdminLogin']);
    }, 2000);
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  getDocumentFileName(path: string): string {
    if (!path) return 'N/A';
    return path.split('/').pop() || 'Document';
  }

  formatPercentage(value: number, total: number): string {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  }

  getCollegeLogo(): string | null {
    const path = this.universityData()?.college?.logoUrl;
    if (path) {
      return this.fileService.getFileUrl(path);
    }
    return null;
  }

  // Reports Actions
  exportToExcel() {
    const data = this.filteredReportStudents().map(s => ({
      'Application ID': s.applicationId || 'N/A',
      'Full Name': s.fullName,
      'Passport No.': s.passportNo,
      'Email': s.email,
      'Applied For': s.appliedFor,
      'Intake': s.intake,
      'Status': s.applicationStatus,
      'Applied Date': s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `University_Report_${new Date().getTime()}.xlsx`);
  }

  exportToPdf() {
    window.print();
  }

  updateFilter(filterName: string, event: Event) {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    if (filterName === 'reportStartDate') this.reportStartDate.set(input.value);
    if (filterName === 'reportEndDate') this.reportEndDate.set(input.value);
    if (filterName === 'reportStatus') this.reportStatus.set(input.value);
  }

  clearFilters() {
    this.reportStartDate.set('');
    this.reportEndDate.set('');
    this.reportStatus.set('ALL');
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  getCurrentDate(): string {
    return new Date().toLocaleString();
  }
}