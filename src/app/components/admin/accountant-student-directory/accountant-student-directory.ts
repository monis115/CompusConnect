
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountantService, AssignedStudent } from '../../../services/accountant.service';

interface AccountantProfile {
  id: number;
  username: string;
  fullName: string;
  email: string;
  contactNumber: string;
  status: string;
  studentCount: number;
  students: any[]; // We'll map this to AssignedStudent for display
}

@Component({
  selector: 'app-accountant-student-directory',
  standalone: false,
  templateUrl: './accountant-student-directory.html',
  styleUrls: ['./accountant-student-directory.css']
})
export class AccountantStudentDirectory implements OnInit {

  accountantId: number | null = null;
  profile: AccountantProfile | null = null;
  students: any[] = [];

  isLoading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountantService: AccountantService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // In a real app we might get ID from route param.
    // For now, let's assume the user selects an accountant from the previous list 
    // OR this component is designed to view *my* students if logged in as accountant?
    // User request: "Student Directory: View students for payment verification". 
    // This implies looking at ALL students across accountants OR specific to one?
    // Re-reading user request: "3. Get Accountant with Student Details... Endpoint: GET /api/accountant/{id}/with-students"
    // And "Student Directory" card click goes here.
    // If it's a general directory, maybe we need a selector first? 
    // OR maybe this is meant to show *all* students with accountant info?
    // Wait, the "Student Directory" card is in the ADMIN dashboard under "Accountant".
    // It likely means "View a Directory of Accountants and their Students".
    // BUT the previous card "Manage Accountant" handles listing accountants.
    // Maybe "Student Directory" here implies "All Students assigned to ANY Accountant"?
    // OR it re-uses the "Accountant Details" view but for a specific accountant selected?
    // The Route I added was just `accountant-student-directory`. It takes no ID.
    // Let's make this component display a LIST of Accountants first (like a folder view), 
    // and when one is clicked, it expands to show that accountant's students.
    // This matches: "View students for payment verification" -> Drill down by accountant.

    this.loadAccountantsList();
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard/account']);
  }

  // Reuse the logic: List accountants, then drill down.
  accountants: any[] = [];
  selectedAccountant: any | null = null;

  loadAccountantsList() {
    this.isLoading = true;
    this.accountantService.getAllAccountants().subscribe({
      next: (data) => {
        this.accountants = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load accountants', err);
        this.errorMessage = 'Failed to load directory.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewStudents(acc: any) {
    this.isLoading = true;
    this.selectedAccountant = null;
    this.cdr.detectChanges();

    this.accountantService.getAccountantWithStudents(acc.id).subscribe({
      next: (data) => {
        this.profile = data;
        this.students = data.students || [];
        this.selectedAccountant = acc; // Marks as selected view
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load student details', err);
        this.errorMessage = 'Failed to load student details.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  backToList() {
    this.selectedAccountant = null;
    this.profile = null;
    this.students = [];
    this.cdr.detectChanges();
  }

  getStatusClass(status: string): string {
    const map: any = {
      'PAYMENT_RECEIVED': 'status-success',
      'Pending': 'status-warning',
      'Active': 'status-active',
      'Inactive': 'status-inactive'
    };
    return map[status] || 'status-default';
  }
}
