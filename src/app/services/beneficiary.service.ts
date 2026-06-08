import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BeneficiaryAccount {
  id?: number;
  beneficiaryType: string;
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  mobileNumber: string;
  emailAddress: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BeneficiaryService {
  private apiUrl = 'http://localhost:8080/api/accountant/beneficiary-accounts';

  constructor(private http: HttpClient) {}

  getAllBeneficiaries(): Observable<BeneficiaryAccount[]> {
    return this.http.get<BeneficiaryAccount[]>(this.apiUrl);
  }

  createBeneficiary(account: BeneficiaryAccount): Observable<BeneficiaryAccount> {
    return this.http.post<BeneficiaryAccount>(this.apiUrl, account);
  }

  updateBeneficiary(id: number, account: BeneficiaryAccount): Observable<BeneficiaryAccount> {
    return this.http.put<BeneficiaryAccount>(`${this.apiUrl}/${id}`, account);
  }
}
