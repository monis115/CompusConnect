import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Location {
  id: number;
  state: string;
  district: string;
}

@Component({
  selector: 'app-manage-locations',
  templateUrl: './manage-locations.html',
  styleUrls: ['./manage-locations.css'],
  standalone: false
})
export class ManageLocations implements OnInit {
  locations: Location[] = [];
  filteredLocations: Location[] = [];
  
  form!: FormGroup;
  editingLocationId: number | null = null;

  isLoading = false;
  isSaving = false;
  successMessage = '';
  errorMessage = '';
  searchQuery = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 12;
  math = Math;

  private apiUrl = environment.apiUrl + '/api/locations';

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initForm();
    this.fetchLocations();
  }

  initForm() {
    this.form = this.fb.group({
      state: ['', [Validators.required, Validators.minLength(2)]],
      district: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  fetchLocations() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.http.get<Location[]>(this.apiUrl).subscribe({
      next: (data) => {
        // Sort locations primarily by State, then recursively by District
        this.locations = data.sort((a, b) => {
          if (a.state === b.state) return a.district.localeCompare(b.district);
          return a.state.localeCompare(b.state);
        });
        this.filterLocations();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Failed to load locations from database.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterLocations() {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredLocations = [...this.locations];
    } else {
      this.filteredLocations = this.locations.filter(loc => 
        loc.state.toLowerCase().includes(q) || 
        loc.district.toLowerCase().includes(q)
      );
    }
    this.currentPage = 1; // Reset pagination on search
    this.cdr.detectChanges();
  }

  get paginatedLocations() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredLocations.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredLocations.length / this.itemsPerPage);
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.detectChanges();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.detectChanges();
    }
  }

  onSearchChange() {
    this.filterLocations();
  }

  editLocation(loc: Location) {
    this.editingLocationId = loc.id;
    this.form.patchValue({
      state: loc.state,
      district: loc.district
    });
    // Scroll to top to ensure user sees the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editingLocationId = null;
    this.form.reset();
  }

  deleteLocation(id: number) {
    if (confirm('Are you absolutely sure you want to completely delete this Location? This may impact relationships and cannot be undone.')) {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => {
          this.fetchLocations();
          this.showToast('Location deleted successfully');
        },
        error: (err) => {
          this.errorMessage = 'Failed to delete location. It may be linked to active Agents or Colleges.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    const payload = this.form.value;

    if (this.editingLocationId) {
      // Update
      this.http.put<Location>(`${this.apiUrl}/${this.editingLocationId}`, payload).subscribe({
        next: (res) => {
          this.showToast('Location updated perfectly.');
          this.cancelEdit();
          this.fetchLocations();
          this.isSaving = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to update location.';
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      // Create
      this.http.post<Location>(this.apiUrl, payload).subscribe({
        next: (res) => {
          this.showToast('New location securely added.');
          this.form.reset();
          this.fetchLocations();
          this.isSaving = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to successfully post new location.';
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  private showToast(msg: string) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:20px;right:20px;background:#10b981;color:white;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:9999;animation:slideIn .3s ease-out;`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }
}
