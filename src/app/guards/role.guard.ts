import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = route.data?.['roles'] as Array<string>;

  if (!expectedRoles || expectedRoles.length === 0) {
    return true; // No specific roles required, allow access
  }

  return authService.userRole$.pipe(
    take(1),
    map(userRole => {
      if (userRole && expectedRoles.includes(userRole)) {
        return true;
      } else {
        // Redirect to home or an unauthorized page if role doesn't match
        router.navigate(['/']);
        return false;
      }
    })
  );
};
