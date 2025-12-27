import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Transaction {
    id: number;
    amount: number;
    paymentMode: 'CASH' | 'Online' | string;
    transactionId?: string;
    paymentDate: string;
}

export interface PaymentRequest {
    id?: number;
    requesterUsername: string;
    requesterFullName: string;
    requesterRole: string; // "DocPerson" or "VisaMan"
    purpose: string;
    requestedAmount: number;
    requesterPaymentMode: string;
    bankDetails: string;
    qrCode: string; // Base64
    status?: 'PENDING' | 'PAID' | 'PARTIAL' | 'REJECTED';
    amountPaid?: number;
    transactionId?: string;
    accountantPaymentMode?: string;
    createdDate?: string;
    updatedDate?: string;
    createdAt?: string;  // API returns this
    updatedAt?: string;  // API returns this
    remainingAmount?: number;
    transactions?: Transaction[];
}

@Injectable({
    providedIn: 'root'
})
export class PaymentRequestService {
    private apiUrl = `${environment.apiUrl}/api/request-money`;

    constructor(private http: HttpClient) { }

    getAllRequests(): Observable<PaymentRequest[]> {
        return this.http.get<PaymentRequest[]>(`${this.apiUrl}/all`);
    }

    createRequest(request: PaymentRequest): Observable<any> {
        return this.http.post(`${this.apiUrl}/create`, request);
    }

    updateStatus(id: number, payload: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/update-status/${id}`, payload);
    }

    payRequest(id: number, payload: { amountPaid: number; accountantPaymentMode: string; transactionId?: string | null }): Observable<any> {
        return this.http.post(`${this.apiUrl}/pay/${id}`, payload);
    }

    getRequestsByUsername(username: string): Observable<PaymentRequest[]> {
        return this.http.get<PaymentRequest[]>(`${this.apiUrl}/user/${username}`);
    }
}
