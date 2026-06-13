import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReportRequest {
  category: string;
  reportName: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page: number;
  size: number;
  sort?: string;
}

export interface ColumnDefDTO {
  key: string;
  label: string;
  type: string;
}

export interface ReportSummaryDTO {
  metrics: { [key: string]: any };
}

export interface ReportResponseDTO {
  summary: ReportSummaryDTO;
  columns: ColumnDefDTO[];
  data: any[];
  totalRecords: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  constructor(private http: HttpClient) {}

  public getReportData(request: ReportRequest): Observable<ReportResponseDTO> {
    return this.http.post<ReportResponseDTO>(`${environment.apiUrl}/api/reports/data`, request);
  }

  public exportReport(request: ReportRequest, format: 'pdf' | 'excel'): Observable<Blob> {
    return this.http.post(`${environment.apiUrl}/api/reports/export?format=${format}`, request, {
      responseType: 'blob',
      headers: new HttpHeaders({
        'Accept': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    });
  }
}
