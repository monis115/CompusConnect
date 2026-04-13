import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-system-users-dashboard',
  standalone: false,
  templateUrl: './system-users-dashboard.html',
  styleUrl: './system-users-dashboard.css',
})
export class SystemUsersDashboard implements OnInit {
  users: any[] = [];
  isLoading = true;
  error: string | null = null;
  
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.isLoading = true;
    this.error = null;
    this.cdr.detectChanges();
    
    console.log('Fetching users from:', `${environment.apiUrl}/api/auth`);
    
    this.http.get<any[]>(`${environment.apiUrl}/api/auth`).subscribe({
      next: (data) => {
        console.log('Received users:', data);
        this.users = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.error = 'Failed to load users. ' + (err.message || '');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
