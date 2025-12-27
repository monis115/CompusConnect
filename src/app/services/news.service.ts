import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NewsDTO {
    id: number;
    activeFrom: string;       // LocalDate "YYYY-MM-DD"
    tillDate: string;         // LocalDate "YYYY-MM-DD"
    heading: string;
    content: string;
    tag: string;              // e.g., "announcement", "update", "urgent"
    username: string;         // Admin who created/updated
    forUser: string;          // Target audience: "AGENT", "STUDENT", "ALL", etc.
    createdAt: string;        // LocalDateTime
    updatedAt: string;        // LocalDateTime
    active: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class NewsService {
    private API_ENDPOINT = `${environment.apiUrl}/api/news`;

    constructor(private http: HttpClient) { }

    // Get all news items
    getAllNews(): Observable<NewsDTO[]> {
        return this.http.get<NewsDTO[]>(this.API_ENDPOINT);
    }

    // Get specific news by ID
    getNewsById(id: number): Observable<NewsDTO> {
        return this.http.get<NewsDTO>(`${this.API_ENDPOINT}/${id}`);
    }

    // Get currently active news (within date range)
    getActiveNews(): Observable<NewsDTO[]> {
        return this.http.get<NewsDTO[]>(`${this.API_ENDPOINT}/active`);
    }

    // Get news for specific user type
    getNewsForUser(forUser: string): Observable<NewsDTO[]> {
        return this.http.get<NewsDTO[]>(`${this.API_ENDPOINT}/for-user/${forUser}`);
    }

    // Get news by tag
    getNewsByTag(tag: string): Observable<NewsDTO[]> {
        return this.http.get<NewsDTO[]>(`${this.API_ENDPOINT}/tag/${tag}`);
    }

    // Get news created by specific admin
    getNewsByUser(username: string): Observable<NewsDTO[]> {
        return this.http.get<NewsDTO[]>(`${this.API_ENDPOINT}/by-user/${username}`);
    }

    // Create new news
    createNews(news: Partial<NewsDTO>): Observable<NewsDTO> {
        return this.http.post<NewsDTO>(this.API_ENDPOINT, news);
    }

    // Update news
    updateNews(id: number, news: Partial<NewsDTO>): Observable<NewsDTO> {
        return this.http.put<NewsDTO>(`${this.API_ENDPOINT}/${id}`, news);
    }

    // Soft delete (sets active to false)
    softDelete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_ENDPOINT}/${id}`);
    }

    // Permanent delete
    hardDelete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_ENDPOINT}/hard/${id}`);
    }
}
