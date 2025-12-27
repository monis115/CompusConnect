import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FileService {

    /**
     * Constructs a URL for viewing/downloading a file through the backend file serving endpoint.
     * Handles both S3 paths (s3://bucket/key) and local paths (uploads/folder/file.pdf).
     * 
     * @param path - The file path as stored in the database (S3 or local path)
     * @returns The full URL to fetch the file through /api/file/serve endpoint
     */
    getFileUrl(path: string | null | undefined): string {
        if (!path) return '';
        return `${environment.apiUrl}/api/file/serve?path=${encodeURIComponent(path)}`;
    }
}
