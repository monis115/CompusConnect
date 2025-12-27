import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApplicationHistory {
    status: string;
    updatedAt: string;
    updatedBy: string;
    remarks: string | null;
}

export interface ApplicationStatusResponse {
    fullName: string;
    applicationId: string;
    currentStatus: string;
    lastUpdated: string;
    history: ApplicationHistory[];
}

@Injectable({
    providedIn: 'root'
})
export class PublicService {

    private apiUrl = `${environment.apiUrl}/api/public/track-application`;

    constructor(private http: HttpClient) { }

    trackApplication(query: string): Observable<ApplicationStatusResponse> {
        return this.http.get<ApplicationStatusResponse>(`${this.apiUrl}?query=${query}`);
    }
}
