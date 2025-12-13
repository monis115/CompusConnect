import { Injectable } from '@angular/core';
import {
    HttpEvent,
    HttpInterceptor,
    HttpHandler,
    HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Get the userData from sessionStorage
        const userJson = sessionStorage.getItem('userData');

        if (userJson) {
            try {
                const user = JSON.parse(userJson);

                // Only add headers if user has username and role
                if (user && user.username && user.role) {
                    const clonedRequest = req.clone({
                        setHeaders: {
                            'X-User-Name': user.username,
                            'X-User-Role': user.role
                        }
                    });
                    return next.handle(clonedRequest);
                }
            } catch (error) {
                // If JSON parsing fails, proceed without adding headers
                console.warn('AuthInterceptor: Failed to parse userData from sessionStorage', error);
            }
        }

        // No user found or invalid data, proceed without adding headers
        return next.handle(req);
    }
}
