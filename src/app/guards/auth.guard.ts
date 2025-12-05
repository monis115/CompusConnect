import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {

    constructor(private router: Router) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        // Check if user is logged in by verifying session storage
        // The AdminAuthService stores: userId, userRole, authToken
        const userId = sessionStorage.getItem('userId');
        const userRole = sessionStorage.getItem('userRole');
        const authToken = sessionStorage.getItem('authToken');

        console.log('🔐 AuthGuard checking session:', { userId, userRole, hasToken: !!authToken });

        if (userId && userRole && authToken) {
            // User is authenticated
            // Optionally check if the user has the correct role for this route
            const expectedRole = route.data['role'];

            if (expectedRole) {
                // Normalize both roles to lowercase for comparison
                const normalizedUserRole = userRole.toLowerCase();
                const normalizedExpectedRole = expectedRole.toLowerCase();

                if (normalizedUserRole !== normalizedExpectedRole) {
                    // User doesn't have the required role, redirect to login
                    console.warn(`🚫 Access denied: User role '${userRole}' does not match required role '${expectedRole}'`);
                    this.router.navigate(['/admin-login']);
                    return false;
                }
            }

            console.log('✅ AuthGuard: Access granted');
            return true;
        }

        // User is not authenticated, redirect to login
        console.warn('🚫 Access denied: No active session found');
        this.router.navigate(['/admin-login']);
        return false;
    }
}
