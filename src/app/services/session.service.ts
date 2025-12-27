import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Session {
    id: number;
    sessionName: string;
    academicYear: string;
}

@Injectable({
    providedIn: 'root'
})
export class SessionService {

    private apiUrl = `${environment.apiUrl}/api/sessions`;

    constructor(private http: HttpClient) { }

    createSession(session: Session): Observable<Session> {
        return this.http.post<Session>(this.apiUrl, session);
    }

    getAllSessions(): Observable<Session[]> {
        return this.http.get<Session[]>(this.apiUrl);
    }

    getSessionById(id: number): Observable<Session> {
        return this.http.get<Session>(`${this.apiUrl}/${id}`);
    }

    updateSession(id: number, session: Session): Observable<Session> {
        return this.http.put<Session>(`${this.apiUrl}/${id}`, session);
    }

    deleteSession(id: number): Observable<string> {
        // Note: The backend returns a string message, so we expect text response
        return this.http.delete(`${this.apiUrl}/${id}`, { responseType: 'text' });
    }
}
