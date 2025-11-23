// university-person-dashboard.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';

interface College {
  id: number;
  collegeName: string;
  city: string;
  country: string;
}

interface Student {
  id: number;
  fullName: string;
  applicationStatus: string;
  passportNo: string;
  dob: string;
  email: string;
  contactNo: string;
  appliedFor: string;
  intake: string;
  admissionLetterPath?: string | null;
  profileImagePath?: string;
}

interface UniversityPerson {
  id: number;
  userName: string;
  role: string;
  college: College;
  students: Student[];
}

@Component({
  selector: 'app-university-person-dashboard',
  standalone: false,
  templateUrl: './university-person-dashbaord.html',
  styleUrls: ['./university-person-dashbaord.css']

})
export class UniversityPersonDashboard implements OnInit {
  // Data signals
  universityData = signal<UniversityPerson | null>(null);

  // UI State
  activeSection = signal<string>('dashboard');
  sidebarOpen = signal<boolean>(true);
  searchTerm = signal<string>('');

  // Modal State
  isModalOpen = signal<boolean>(false);
  selectedStudent = signal<Student | null>(null);
  selectedFile = signal<File | null>(null);
  isUploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);

  // Toast State
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  // Computed values
  stats = computed(() => {
    const students = this.universityData()?.students || [];
    return {
      total: students.length,
      pending: students.filter(s => s.applicationStatus === 'FORWARDED_TO_UNI').length,
      approved: students.filter(s => s.applicationStatus === 'ADMISSION_LETTER_APPROVED').length,
      processed: students.filter(s =>
        s.applicationStatus === 'ADMISSION_LETTER_GENERATED' ||
        s.applicationStatus === 'ADMISSION_LETTER_APPROVED' ||
        s.applicationStatus === 'VISA_STAMPED'
      ).length
    };
  });

  filteredStudents = computed(() => {
    const students = this.universityData()?.students || [];
    const term = this.searchTerm().toLowerCase();
    if (!term) return students;

    return students.filter(student =>
      student.fullName.toLowerCase().includes(term) ||
      student.passportNo.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term)
    );
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const mockResponse: UniversityPerson = {
      id: 1,
      userName: "UE12345",
      role: "UniversityCoordinator",
      college: {
        id: 1,
        collegeName: "National University of Uzbekistan",
        city: "Tashkent",
        country: "Uzbekistan"
      },
      students: [
        {
          id: 1,
          fullName: "Rohit Verma",
          dob: "2003-11-25",
          applicationStatus: "ADMISSION_LETTER_APPROVED",
          email: "rohit.verma@example.com",
          contactNo: "9876543333",
          passportNo: "P3333333",
          intake: "Sept 2024",
          appliedFor: "MBBS",
          admissionLetterPath: "uploads/admission-letters/...",
          profileImagePath: "uploads/profile/..."
        },
        {
          id: 6,
          fullName: "Mashkoor",
          dob: "2003-11-25",
          applicationStatus: "VISA_STAMPED",
          email: "mashkoor@gmail.com",
          contactNo: "9876543333",
          passportNo: "P3333333",
          intake: "Sept 2024",
          appliedFor: "MBBS",
          profileImagePath: "uploads/profile/..."
        },
        {
          id: 99,
          fullName: "Sarah Jenkins",
          dob: "2004-05-12",
          applicationStatus: "FORWARDED_TO_UNI",
          email: "sarah.j@example.com",
          contactNo: "9988776655",
          passportNo: "X998877",
          intake: "Sept 2024",
          appliedFor: "BDS"
        },
        {
          id: 100,
          fullName: "Amit Kumar",
          dob: "2003-08-15",
          applicationStatus: "FORWARDED_TO_UNI",
          email: "amit.k@example.com",
          contactNo: "9876541234",
          passportNo: "P7654321",
          intake: "Sept 2024",
          appliedFor: "MBBS"
        }
      ]
    };

    this.universityData.set(mockResponse);
  }

  // Helper Methods
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  getStatusClass(status: string): string {
    const baseClass = 'status-';
    return baseClass + status.toLowerCase();
  }

  // Navigation
  setActiveSection(section: string) {
    this.activeSection.set(section);
  }

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  // Search
  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  // Modal Actions
  openUploadModal(student: Student) {
    this.selectedStudent.set(student);
    this.isModalOpen.set(true);
    this.selectedFile.set(null);
    this.uploadProgress.set(0);
  }

  closeModal() {
    if (this.isUploading()) return;
    this.isModalOpen.set(false);
    this.selectedStudent.set(null);
    this.selectedFile.set(null);
  }

  // File Handling
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile.set(event.dataTransfer.files[0]);
    }
  }

  clearFile(event: Event) {
    event.stopPropagation();
    this.selectedFile.set(null);
  }

  // Upload
  submitUpload() {
    if (!this.selectedFile() || !this.selectedStudent()) return;

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    const interval = setInterval(() => {
      const current = this.uploadProgress();
      if (current >= 100) {
        clearInterval(interval);
        this.finishUpload();
      } else {
        this.uploadProgress.set(current + 10);
      }
    }, 200);
  }

  finishUpload() {
    const studentId = this.selectedStudent()?.id;

    this.universityData.update(data => {
      if (!data) return null;
      const updatedStudents = data.students.map(s => {
        if (s.id === studentId) {
          return { ...s, applicationStatus: 'ADMISSION_LETTER_GENERATED' };
        }
        return s;
      });
      return { ...data, students: updatedStudents };
    });

    this.isUploading.set(false);
    this.closeModal();
    this.showToast(`Admission Letter uploaded for ${this.selectedStudent()?.fullName}`, 'success');
  }

  // Toast
  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 4000);
  }
}