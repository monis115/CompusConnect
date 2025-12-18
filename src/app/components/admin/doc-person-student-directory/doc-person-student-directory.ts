
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DocPersonService, DocPersonDTO, DocPersonWithStudentsDTO, DocPersonStudentDTO } from '../../../services/doc-person.service';

@Component({
  selector: 'app-doc-person-student-directory',
  standalone: false,
  templateUrl: './doc-person-student-directory.html',
  styleUrls: ['./doc-person-student-directory.css']
})
export class DocPersonStudentDirectory implements OnInit {

  docPersons: DocPersonDTO[] = [];
  selectedDocPerson: DocPersonDTO | null = null;
  profile: DocPersonWithStudentsDTO | null = null;
  students: DocPersonStudentDTO[] = [];

  isLoading = true;
  errorMessage = '';

  constructor(
    private docPersonService: DocPersonService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadDocPersonsList();
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard/doc-person']);
  }

  loadDocPersonsList(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.docPersonService.getAllDocPersons().subscribe({
      next: (data) => {
        this.docPersons = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load doc persons', err);
        this.errorMessage = 'Failed to load directory.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewStudents(docPerson: DocPersonDTO): void {
    this.isLoading = true;
    this.selectedDocPerson = null;
    this.cdr.detectChanges();

    this.docPersonService.getDocPersonWithStudents(docPerson.id).subscribe({
      next: (data) => {
        this.profile = data;
        this.students = data.students || [];
        this.selectedDocPerson = docPerson;
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

  backToList(): void {
    this.selectedDocPerson = null;
    this.profile = null;
    this.students = [];
    this.cdr.detectChanges();
  }

  getStatusClass(status: string): string {
    const map: { [key: string]: string } = {
      'DOCS_VERIFIED': 'status-success',
      'DOCS_SUBMITTED': 'status-info',
      'PENDING_DOCS': 'status-warning',
      'DOCS_REJECTED': 'status-danger',
      'Active': 'status-active',
      'Inactive': 'status-inactive'
    };
    return map[status] || 'status-default';
  }

  formatStatus(status: string): string {
    return status ? status.replace(/_/g, ' ') : '';
  }
}
