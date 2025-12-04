import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TelexApplicationDTO } from '../models/telex-application.model';

@Injectable({
    providedIn: 'root'
})
export class TelexApplicationService {
    private readonly API_URL = 'http://localhost:8080';

    constructor(private http: HttpClient) { }

    submitTelexApplication(
        studentId: number,
        details: TelexApplicationDTO,
        files: {
            visaPhoto?: File,
            visaPassportCopy?: File,
            ttCopy?: File,
            paymentConfirmation?: File
        }
    ): Observable<any> {
        const formData = new FormData();
        formData.append('details', JSON.stringify(details));

        if (files.visaPhoto) {
            formData.append('visaPhoto', files.visaPhoto);
        }
        if (files.visaPassportCopy) {
            formData.append('visaPassportCopy', files.visaPassportCopy);
        }

        if (files.ttCopy) {
            formData.append('ttCopy', files.ttCopy);
        }
        if (files.paymentConfirmation) {
            formData.append('paymentConfirmation', files.paymentConfirmation);
        }

        return this.http.post(
            `${this.API_URL}/api/agents/apply-for-telex/${studentId}`,
            formData
        );
    }
}
