import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NewsService, NewsDTO } from '../../../services/news.service';
import { AdminAuthService } from '../../../services/admin-auth-service';

@Component({
  selector: 'app-news-dashboard',
  standalone: false,
  templateUrl: './news-dashboard.html',
  styleUrls: ['./news-dashboard.css']
})
export class NewsDashboard implements OnInit {

  allNews: NewsDTO[] = [];
  filteredNews: NewsDTO[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Stats
  totalCount = 0;
  activeCount = 0;
  inactiveCount = 0;
  expiredCount = 0;

  // Filters
  statusFilter: 'all' | 'active' | 'inactive' | 'expired' = 'all';
  userFilter = 'ALL';
  searchQuery = '';

  // Available options
  userOptions = ['ALL', 'AGENT', 'STUDENT', 'UNIVERSITY_PERSON', 'ACCOUNTANT', 'DOC_PERSON', 'TELEX_MAN', 'VISA_MAN'];
  tagOptions = ['announcement', 'update', 'urgent', 'info', 'maintenance', 'feature'];

  // Modal State
  showNewsModal = false;
  isEditing = false;
  isSaving = false;
  selectedNews: NewsDTO | null = null;

  // Form Data
  newsForm: Partial<NewsDTO> = {
    heading: '',
    content: '',
    tag: 'announcement',
    forUser: 'ALL',
    activeFrom: '',
    tillDate: '',
    active: true
  };

  // Confirmation Modal
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmType: 'soft' | 'hard' = 'soft';
  confirmAction: (() => void) | null = null;

  currentUsername = '';

  constructor(
    private newsService: NewsService,
    private authService: AdminAuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const userData = this.authService.getUserData();
    this.currentUsername = userData?.username || 'admin';
    this.loadAllNews();
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard/news-management']);
  }

  loadAllNews(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.newsService.getAllNews().subscribe({
      next: (data) => {
        this.allNews = data;
        this.calculateStats();
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load news', err);
        this.errorMessage = 'Failed to load news. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateStats(): void {
    const today = new Date().toISOString().split('T')[0];
    this.totalCount = this.allNews.length;
    this.activeCount = this.allNews.filter(n => n.active && n.tillDate >= today).length;
    this.inactiveCount = this.allNews.filter(n => !n.active).length;
    this.expiredCount = this.allNews.filter(n => n.tillDate < today).length;
  }

  applyFilters(): void {
    const today = new Date().toISOString().split('T')[0];
    let result = [...this.allNews];

    // Status filter
    if (this.statusFilter === 'active') {
      result = result.filter(n => n.active && n.tillDate >= today);
    } else if (this.statusFilter === 'inactive') {
      result = result.filter(n => !n.active);
    } else if (this.statusFilter === 'expired') {
      result = result.filter(n => n.tillDate < today);
    }

    // User filter
    if (this.userFilter !== 'ALL') {
      result = result.filter(n => n.forUser === this.userFilter || n.forUser === 'ALL');
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(n => n.heading.toLowerCase().includes(query));
    }

    this.filteredNews = result;
    this.cdr.detectChanges();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  // CRUD Operations
  openCreateModal(): void {
    this.isEditing = false;
    this.selectedNews = null;
    this.newsForm = {
      heading: '',
      content: '',
      tag: 'announcement',
      forUser: 'ALL',
      activeFrom: new Date().toISOString().split('T')[0],
      tillDate: '',
      active: true
    };
    this.showNewsModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(news: NewsDTO): void {
    this.isEditing = true;
    this.selectedNews = news;
    this.newsForm = {
      heading: news.heading,
      content: news.content,
      tag: news.tag,
      forUser: news.forUser,
      activeFrom: news.activeFrom,
      tillDate: news.tillDate,
      active: news.active
    };
    this.showNewsModal = true;
    this.cdr.detectChanges();
  }

  closeNewsModal(): void {
    this.showNewsModal = false;
    this.selectedNews = null;
    this.newsForm = {};
    this.cdr.detectChanges();
  }

  saveNews(): void {
    if (!this.newsForm.heading?.trim() || !this.newsForm.content?.trim()) {
      this.showError('Please fill in all required fields');
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    const payload: Partial<NewsDTO> = {
      ...this.newsForm,
      username: this.currentUsername
    };

    if (this.isEditing && this.selectedNews) {
      this.newsService.updateNews(this.selectedNews.id, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeNewsModal();
          this.showSuccess('News updated successfully');
          this.loadAllNews();
        },
        error: (err) => {
          this.isSaving = false;
          console.error('Update failed', err);
          this.showError('Failed to update news');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.newsService.createNews(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeNewsModal();
          this.showSuccess('News created successfully');
          this.loadAllNews();
        },
        error: (err) => {
          this.isSaving = false;
          console.error('Create failed', err);
          this.showError('Failed to create news');
          this.cdr.detectChanges();
        }
      });
    }
  }

  toggleStatus(news: NewsDTO): void {
    const updatedNews = { ...news, active: !news.active };
    this.newsService.updateNews(news.id, updatedNews).subscribe({
      next: () => {
        news.active = !news.active;
        this.calculateStats();
        this.showSuccess('Status updated successfully');
      },
      error: () => this.showError('Failed to update status')
    });
  }

  confirmSoftDelete(news: NewsDTO): void {
    this.confirmTitle = 'Deactivate News?';
    this.confirmMessage = `Are you sure you want to deactivate "${news.heading}"?`;
    this.confirmType = 'soft';
    this.confirmAction = () => {
      this.newsService.softDelete(news.id).subscribe({
        next: () => {
          this.showSuccess('News deactivated successfully');
          this.loadAllNews();
        },
        error: () => this.showError('Failed to deactivate news')
      });
    };
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  confirmHardDelete(news: NewsDTO): void {
    this.confirmTitle = '⚠️ Permanent Delete';
    this.confirmMessage = `This action is irreversible. Permanently delete "${news.heading}"?`;
    this.confirmType = 'hard';
    this.confirmAction = () => {
      this.newsService.hardDelete(news.id).subscribe({
        next: () => {
          this.showSuccess('News permanently deleted');
          this.loadAllNews();
        },
        error: () => this.showError('Failed to delete news')
      });
    };
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  executeConfirmAction(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.closeConfirmModal();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmAction = null;
    this.confirmTitle = '';
    this.confirmMessage = '';
    this.cdr.detectChanges();
  }

  // Helpers
  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  getStatusClass(news: NewsDTO): string {
    const today = new Date().toISOString().split('T')[0];
    if (!news.active) return 'status-inactive';
    if (news.tillDate < today) return 'status-expired';
    return 'status-active';
  }

  getStatusLabel(news: NewsDTO): string {
    const today = new Date().toISOString().split('T')[0];
    if (!news.active) return 'Inactive';
    if (news.tillDate < today) return 'Expired';
    return 'Active';
  }

  getTagClass(tag: string): string {
    const tagMap: { [key: string]: string } = {
      'announcement': 'tag-announcement',
      'update': 'tag-update',
      'urgent': 'tag-urgent',
      'info': 'tag-info',
      'maintenance': 'tag-maintenance',
      'feature': 'tag-feature'
    };
    return tagMap[tag?.toLowerCase()] || 'tag-default';
  }

  isExpired(news: NewsDTO): boolean {
    return news.tillDate < new Date().toISOString().split('T')[0];
  }
}
